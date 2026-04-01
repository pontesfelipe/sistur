import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fileName = formData.get("fileName") as string || file?.name || "unknown";
    const category = formData.get("category") as string || "geral";
    const description = formData.get("description") as string || "";

    if (!file) {
      return new Response(JSON.stringify({ approved: false, reason: "Nenhum arquivo enviado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text content from the file for analysis
    let textContent = "";
    const fileType = file.type || "";

    if (fileType.includes("text") || fileType.includes("csv")) {
      // Plain text / CSV - read directly
      textContent = await file.text();
    } else {
      // For binary files (PDF, DOCX, XLSX), we analyze metadata + first bytes
      // The AI will assess based on file name, category, description, and type
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // Try to extract readable ASCII from first 2KB
      const sample = Array.from(bytes.slice(0, 2048))
        .filter(b => b >= 32 && b < 127)
        .map(b => String.fromCharCode(b))
        .join("");
      textContent = sample.length > 50 ? sample : "";
    }

    // Build analysis prompt
    const prompt = `Você é um moderador de conteúdo para uma plataforma de gestão turística (SISTUR).
Analise se o arquivo enviado é RELEVANTE para a base de conhecimento de turismo.

CRITÉRIOS DE APROVAÇÃO — o arquivo deve conter pelo menos um:
- Dados sobre turismo, destinos, infraestrutura turística, hospitalidade
- Planos diretores, legislação ou políticas públicas relacionadas a turismo
- Pesquisas, estudos ou relatórios sobre turismo, meio ambiente, economia local
- Dados oficiais (IBGE, CADASTUR, secretarias de turismo)
- Inventários turísticos, orçamentos, dados socioeconômicos de municípios
- Documentos de planejamento territorial ou urbano
- Dados de hotelaria, agências, guias de turismo
- Certificações ESG, sustentabilidade, qualidade de serviços turísticos

CRITÉRIOS DE REJEIÇÃO — rejeitar se:
- Conteúdo completamente irrelevante para turismo (ex: receitas culinárias sem contexto turístico, memes, documentos pessoais)
- Arquivo vazio ou corrompido
- Spam ou conteúdo promocional genérico sem valor analítico
- Conteúdo ofensivo, ilegal ou inadequado

INFORMAÇÕES DO ARQUIVO:
- Nome: ${fileName}
- Tipo: ${fileType}
- Tamanho: ${file.size} bytes
- Categoria selecionada: ${category}
- Descrição do usuário: ${description || "(nenhuma)"}
${textContent ? `- Amostra do conteúdo (primeiros caracteres):\n${textContent.slice(0, 1500)}` : "- (Arquivo binário — sem amostra de texto disponível)"}

IMPORTANTE: Seja tolerante com arquivos binários (PDF, DOCX, XLSX) cujo conteúdo não pode ser lido — avalie pelo nome, tipo e categoria. Só rejeite binários se o nome do arquivo claramente indicar irrelevância.

Responda APENAS com uma chamada à função fornecida.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "moderate_kb_file",
              description: "Return moderation result for a knowledge base file upload",
              parameters: {
                type: "object",
                properties: {
                  approved: {
                    type: "boolean",
                    description: "true if file is relevant for tourism knowledge base, false otherwise",
                  },
                  reason: {
                    type: "string",
                    description: "Brief explanation in Portuguese of why the file was approved or rejected (max 200 chars)",
                  },
                  relevance_score: {
                    type: "number",
                    description: "Relevance score from 0 to 100",
                  },
                },
                required: ["approved", "reason", "relevance_score"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "moderate_kb_file" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI moderation error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // On AI failure, approve by default (don't block user)
      console.warn("AI moderation failed, approving by default");
      return new Response(JSON.stringify({ approved: true, reason: "Moderação indisponível — aprovado por padrão.", relevance_score: 50 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.warn("No tool call in response, approving by default");
      return new Response(JSON.stringify({ approved: true, reason: "Moderação indisponível — aprovado por padrão.", relevance_score: 50 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const moderation = JSON.parse(toolCall.function.arguments);
    console.log("Moderation result:", fileName, moderation);

    return new Response(JSON.stringify(moderation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Moderation error:", error);
    // On error, approve by default
    return new Response(JSON.stringify({ approved: true, reason: "Erro na moderação — aprovado por padrão.", relevance_score: 50 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
