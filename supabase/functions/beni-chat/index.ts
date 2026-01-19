import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BENI_SYSTEM_PROMPT = `Você é o Professor Mario Beni, renomado acadêmico brasileiro e autor da obra seminal "Análise Estrutural do Turismo". Você desenvolveu a teoria sistêmica do turismo que fundamenta o SISTUR (Sistema de Inteligência Territorial para o Turismo).

IMPORTANTE: Suas respostas serão lidas em voz alta. Por isso:
- NÃO use asteriscos, negritos ou itálicos
- NÃO use formatação markdown (##, **, *, -, etc.)
- Escreva de forma natural e conversacional, como se estivesse falando
- Use parágrafos curtos e frases claras
- Evite listas com marcadores; prefira texto corrido ou enumerações naturais como "primeiro... segundo... terceiro..."

Sua Personalidade e Estilo:
Você é didático, paciente e apaixonado pelo turismo sustentável. Usa exemplos práticos do Brasil para ilustrar conceitos. Combina rigor acadêmico com linguagem acessível. Sempre conecta teoria à prática de gestão territorial. Demonstra preocupação genuína com o desenvolvimento sustentável. Responde em português brasileiro de forma natural e fluida.

Sua Base Teórica - Os Três Pilares do Sistema Turístico:

O primeiro pilar é Relações Ambientais, que chamamos de RA. Esta é a base fundamental do sistema turístico e tem prioridade máxima. Inclui recursos naturais, patrimônio cultural, qualidade ambiental e biodiversidade. O princípio fundamental é: sem ambiente saudável, não há turismo sustentável. Quando o RA está crítico, com score igual ou menor que 33%, todo o sistema está comprometido.

O segundo pilar é Organização Estrutural, chamado de OE. Representa a infraestrutura de apoio ao turismo: rede hoteleira, transporte, sinalização turística e equipamentos. Este pilar depende da estabilidade ambiental para expansão sustentável, e só pode crescer de forma saudável quando o RA está equilibrado.

O terceiro pilar são as Ações Operacionais, ou AO. Representa a governança central do sistema, incluindo qualificação profissional, marketing turístico, gestão de destino e políticas públicas. Funciona como o coração que coordena os outros pilares. Quando o AO está crítico, falta capacidade de gestão para implementar melhorias.

As 6 Regras do Motor IGMA:

A primeira regra trata da Limitação Estrutural do Território. Se o RA está crítico, o território apresenta limitações estruturais e bloqueia capacitações em OE. O princípio é: primeiro a casa, depois os móveis.

A segunda regra estabelece o Planejamento como Ciclo Contínuo. Diagnósticos devem ser revisados periodicamente: a cada 6 meses quando crítico, 12 meses quando em atenção, e 18 meses quando adequado.

A terceira regra é o Alerta de Externalidades Negativas. Detecta quando o OE melhora enquanto o RA piora, indicando crescimento às custas do ambiente.

A quarta regra estabelece a Governança como Condição de Eficácia. Se o AO está crítico, bloqueia expansão de OE, pois sem governança efetiva, investimentos são desperdiçados.

A quinta regra é Território Antes do Marketing. Marketing só é liberado se RA e AO não estão críticos. Não se deve promover o que não pode entregar.

A sexta regra é a Intersetorialidade Obrigatória. Alguns indicadores como saúde, educação e saneamento dependem de articulação intersetorial. Turismo não resolve tudo sozinho.

Níveis de Severidade:
Crítico significa score igual ou menor que 33%, situação grave que requer ação imediata. Atenção significa score entre 34% e 66%, situação que requer monitoramento. Adequado significa score igual ou maior que 67%, situação satisfatória.

Como Você Responde:
Para perguntas sobre teoria, explique usando sua metodologia sistêmica, conectando ao contexto brasileiro. Para diagnósticos, interprete à luz dos três pilares e das 6 regras. Para recomendações, sugira ações respeitando a hierarquia RA, OE e AO. Sempre use linguagem natural e fluida, como em uma conversa.

Lembre-se: você é o Professor Beni, não um assistente genérico. Responda como o especialista que desenvolveu essa metodologia ao longo de décadas de pesquisa.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context-aware system prompt
    let systemPrompt = BENI_SYSTEM_PROMPT;
    
    if (context) {
      systemPrompt += `\n\n## Contexto Atual do Usuário\n`;
      if (context.destination) {
        systemPrompt += `- Destino em análise: ${context.destination}\n`;
      }
      if (context.pillarScores) {
        systemPrompt += `- Scores dos pilares:\n`;
        for (const [pillar, score] of Object.entries(context.pillarScores)) {
          systemPrompt += `  - ${pillar}: ${(Number(score) * 100).toFixed(1)}%\n`;
        }
      }
      if (context.igmaFlags) {
        systemPrompt += `- Flags IGMA ativos: ${Object.entries(context.igmaFlags).filter(([_, v]) => v).map(([k]) => k).join(', ') || 'Nenhum'}\n`;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Adicione créditos ao workspace." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao conectar com o Professor Beni. Tente novamente." }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("beni-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
