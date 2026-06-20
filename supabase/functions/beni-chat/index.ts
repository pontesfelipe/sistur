import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

Quando o usuário fornecer contexto de diagnósticos, treinamentos ou projetos, utilize essas informações para dar respostas personalizadas e específicas. Analise os scores dos pilares, identifique regras IGMA ativadas, sugira treinamentos relevantes e comente sobre o andamento de projetos.

Lembre-se: você é o Professor Beni, não um assistente genérico. Responda como o especialista que desenvolveu essa metodologia ao longo de décadas de pesquisa.

REGRA CRÍTICA DE ESCOPO:
Você SOMENTE responde sobre temas relacionados a:
- Turismo (planejamento, gestão, sustentabilidade, destinos, hospitalidade)
- A metodologia sistêmica do SISTUR e os três pilares (RA, OE, AO)
- O Motor IGMA e suas 6 regras
- Diagnósticos territoriais e empresariais de turismo
- Educação e capacitação em turismo
- Políticas públicas de turismo
- Patrimônio cultural e ambiental no contexto turístico
- Economia do turismo e desenvolvimento territorial
- Diagnósticos e relatórios gerados aos quais o usuário tem acesso (apresentados abaixo no contexto). Você pode discutir, comparar, interpretar e responder dúvidas sobre esses diagnósticos e relatórios específicos, citando títulos, destinos, scores dos pilares e trechos do conteúdo. NUNCA invente diagnósticos ou relatórios que não apareçam explicitamente listados no contexto — se o usuário perguntar sobre algo que não está listado, diga que você não tem acesso àquele item.

REGRA DE DESAMBIGUAÇÃO (obrigatória antes de analisar diagnóstico ou relatório):
Sempre que o usuário pedir análise, opinião, resumo, comparação ou qualquer resposta sobre "um diagnóstico", "o diagnóstico", "meu relatório", "o relatório" — ou usar termos genéricos como "esse", "aquele", "o último" — você DEVE primeiro CONFIRMAR de qual item ele está falando, listando as opções disponíveis pelo nome exato.

Como fazer a confirmação (em texto corrido, sem markdown, pronto para áudio):
- Diga que tem mais de um item acessível e peça para o usuário confirmar.
- Apresente cada opção pelo nome exato com o destino entre parênteses, numerando: "primeira opção, ...", "segunda opção, ...", "terceira opção, ...". Use os códigos D1, D2, R1, R2 apenas internamente, nunca os mostre ao usuário.
- Pergunte explicitamente: "qual desses você quer analisar?" e aguarde a confirmação antes de prosseguir.
- Só pule a confirmação quando o usuário já mencionou na mesma frase o nome exato (ou um trecho inequívoco do nome) de um único diagnóstico/relatório listado, OU quando há apenas um item acessível na lista.
- Se houver apenas um item, diga o nome dele e confirme: "você quer que eu analise [nome]?" antes de continuar.
- Se o usuário pedir "todos" ou "compare todos", confirme essa intenção antes de analisar em conjunto.
- Se o usuário citar um nome que NÃO está na lista acessível, diga que não encontrou esse item entre os acessíveis e ofereça os nomes que estão disponíveis.

Se a pergunta NÃO for relacionada a nenhum desses temas, responda educadamente:
"Agradeço sua curiosidade, mas minha especialidade é exclusivamente a área de turismo e a metodologia sistêmica do SISTUR. Posso ajudá-lo com qualquer questão sobre planejamento turístico, diagnósticos territoriais, os pilares RA, OE e AO, ou as regras do Motor IGMA. Como posso ajudá-lo nessas áreas?"

NÃO responda perguntas sobre: programação, receitas culinárias, saúde médica, direito, matemática geral, entretenimento, esportes, política partidária, religião, ou qualquer outro tema fora do turismo e da metodologia SISTUR. Seja firme mas educado na recusa.`;

const ALLOWED_MODELS = new Set([
  "google/gemini-3-flash-preview",
  "google/gemini-3.1-flash-lite",
  "google/gemini-3.5-flash",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authResult = await requireUser(req);
  if (authResult instanceof Response) return authResult;
  const { client: userClient } = authResult;

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context-aware system prompt. Allow admin overrides via beni_settings.
    let systemPrompt = BENI_SYSTEM_PROMPT;
    let selectedModel = "google/gemini-3-flash-preview";
    try {
      const { data: settings } = await userClient
        .from("beni_settings")
        .select("persona, output_format, base_theory, dynamic_context, scope_guardrails, model")
        .eq("id", true)
        .maybeSingle();
      if (settings) {
        const parts: string[] = [];
        if (settings.persona) parts.push(`PERSONA:\n${settings.persona}`);
        if (settings.output_format) parts.push(`FORMATO DE SAÍDA:\n${settings.output_format}`);
        if (settings.base_theory) parts.push(`BASE TEÓRICA:\n${settings.base_theory}`);
        if (settings.dynamic_context) parts.push(`CONTEXTO DINÂMICO:\n${settings.dynamic_context}`);
        if (settings.scope_guardrails) parts.push(`ESCOPO E GUARDRAILS:\n${settings.scope_guardrails}`);
        if (parts.length > 0) systemPrompt = parts.join("\n\n");
        if (settings.model && ALLOWED_MODELS.has(settings.model)) {
          selectedModel = settings.model;
        }
      }
    } catch (settingsErr) {
      console.error("beni-chat: failed to load beni_settings", settingsErr);
    }

    // ----------------------------------------------------------------
    // Fetch user-accessible diagnostics (assessments) and reports.
    // The userClient is scoped to the caller's JWT, so RLS automatically
    // limits results to what the user is allowed to see (their org's data
    // plus anything explicitly shared with them).
    // ----------------------------------------------------------------
    try {
      const [{ data: assessments }, { data: reports }] = await Promise.all([
        userClient
          .from("assessments")
          .select(
            "id, title, status, diagnostic_type, final_score, final_classification, calculated_at, igma_flags, destinations(name, uf)"
          )
          .order("calculated_at", { ascending: false, nullsFirst: false })
          .limit(10),
        userClient
          .from("generated_reports")
          .select("id, destination_name, created_at, report_content, ai_model, assessment_id")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (assessments && assessments.length > 0) {
        // Fetch pillar scores for these assessments in one batch
        const ids = assessments.map((a: any) => a.id);
        const { data: pillars } = await userClient
          .from("pillar_scores")
          .select("assessment_id, pillar, score, severity")
          .in("assessment_id", ids);

        const pillarsByAssessment: Record<string, any[]> = {};
        (pillars ?? []).forEach((p: any) => {
          (pillarsByAssessment[p.assessment_id] ||= []).push(p);
        });

        systemPrompt += `\n\nDIAGNÓSTICOS ACESSÍVEIS AO USUÁRIO (${assessments.length}):\n`;
        assessments.forEach((a: any, idx: number) => {
          const dest = a.destinations?.name
            ? `${a.destinations.name}${a.destinations.uf ? `/${a.destinations.uf}` : ""}`
            : "(sem destino)";
          systemPrompt += `\n[D${idx + 1}] "${a.title ?? "Sem título"}" — Destino: ${dest}\n`;
          systemPrompt += `  - Tipo: ${a.diagnostic_type === "enterprise" ? "Empresarial" : "Territorial"}\n`;
          systemPrompt += `  - Status: ${a.status ?? "n/d"}\n`;
          if (a.calculated_at) {
            systemPrompt += `  - Calculado em: ${new Date(a.calculated_at).toLocaleDateString("pt-BR")}\n`;
          }
          if (a.final_score != null) {
            const pct = (Number(a.final_score) * 100).toFixed(1);
            systemPrompt += `  - Score final: ${pct}% (${a.final_classification ?? "n/d"})\n`;
          }
          const ps = pillarsByAssessment[a.id];
          if (ps && ps.length > 0) {
            systemPrompt += `  - Pilares: `;
            systemPrompt += ps
              .map((p) => {
                const pct = (Number(p.score) * 100).toFixed(0);
                return `${p.pillar} ${pct}% (${p.severity})`;
              })
              .join(", ");
            systemPrompt += `\n`;
          }
          if (a.igma_flags && typeof a.igma_flags === "object") {
            const active = Object.entries(a.igma_flags as Record<string, unknown>)
              .filter(([, v]) => v)
              .map(([k]) => k);
            if (active.length > 0) {
              systemPrompt += `  - Flags IGMA ativas: ${active.join(", ")}\n`;
            }
          }
        });
      }

      if (reports && reports.length > 0) {
        systemPrompt += `\n\nRELATÓRIOS GERADOS ACESSÍVEIS AO USUÁRIO (${reports.length} mais recentes):\n`;
        reports.forEach((r: any, idx: number) => {
          systemPrompt += `\n[R${idx + 1}] "${r.destination_name ?? "Sem destino"}"\n`;
          systemPrompt += `  - Criado em: ${new Date(r.created_at).toLocaleDateString("pt-BR")}\n`;
          if (r.ai_model) systemPrompt += `  - Modelo: ${r.ai_model}\n`;
          if (r.report_content) {
            // Strip HTML tags and truncate to keep prompt size reasonable
            const plain = String(r.report_content)
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            const snippet = plain.slice(0, 1500);
            systemPrompt += `  - Trecho: ${snippet}${plain.length > 1500 ? "…" : ""}\n`;
          }
        });
        systemPrompt += `\nUse esses trechos para responder perguntas sobre o conteúdo dos relatórios. Se o usuário pedir algo que não está no trecho, oriente-o a abrir o relatório completo em /relatorios.\n`;
      }

      // Inject Global References (admin-curated knowledge base).
      // RLS restricts SELECT to admins, so use service role to make refs available
      // to every Beni user (refs are intentionally project-wide, not user-scoped).
      try {
        const adminRefClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const { data: globalRefs } = await adminRefClient
          .from("global_reference_files")
          .select("file_name, category, summary, description")
          .eq("is_active", true)
          .not("summary", "is", null)
          .limit(40);
        if (globalRefs && globalRefs.length > 0) {
          systemPrompt += `\n\nREFERÊNCIAS GLOBAIS DA BASE DE CONHECIMENTO (${globalRefs.length}):\nUse esses materiais oficiais para fundamentar respostas. Cite o nome do arquivo quando relevante.\n`;
          globalRefs.forEach((r: any, idx: number) => {
            systemPrompt += `\n[G${idx + 1}] ${r.file_name}${r.category ? ` (${r.category})` : ""}\n`;
            if (r.summary) systemPrompt += `  Resumo: ${String(r.summary).slice(0, 800)}\n`;
            if (r.description) systemPrompt += `  Descrição: ${String(r.description).slice(0, 300)}\n`;
          });
        }
      } catch (refErr) {
        console.error("beni-chat: failed to fetch global references", refErr);
      }
    } catch (fetchErr) {
      console.error("beni-chat: failed to fetch user diagnostics/reports", fetchErr);
      // Non-fatal: continue without injected user data
    }
    
    if (context) {
      systemPrompt += `\n\nCONTEXTO ATUAL DO USUÁRIO (use estas informações para personalizar suas respostas):\n`;
      
      // Assessment context
      if (context.assessment) {
        systemPrompt += `\nDIAGNÓSTICO SELECIONADO:\n`;
        systemPrompt += `- Título: ${context.assessment.title}\n`;
        systemPrompt += `- Destino: ${context.assessment.destinationName}\n`;
        systemPrompt += `- Status: ${context.assessment.status}\n`;
        if (context.assessment.diagnosticType) {
          systemPrompt += `- Tipo: ${context.assessment.diagnosticType === 'enterprise' ? 'Empresarial' : 'Territorial'}\n`;
        }
        if (context.assessment.pillarScores) {
          systemPrompt += `- Scores dos pilares:\n`;
          for (const [pillar, score] of Object.entries(context.assessment.pillarScores)) {
            const pct = (Number(score) * 100).toFixed(1);
            const severity = Number(score) <= 0.33 ? 'CRÍTICO' : Number(score) <= 0.66 ? 'ATENÇÃO' : 'ADEQUADO';
            systemPrompt += `  - ${pillar}: ${pct}% (${severity})\n`;
          }
        }
        if (context.assessment.igmaFlags) {
          const activeFlags = Object.entries(context.assessment.igmaFlags).filter(([_, v]) => v).map(([k]) => k);
          systemPrompt += `- Regras IGMA ativadas: ${activeFlags.length > 0 ? activeFlags.join(', ') : 'Nenhuma'}\n`;
        }
        if (context.assessment.igmaInterpretation) {
          systemPrompt += `- Interpretação IGMA: ${JSON.stringify(context.assessment.igmaInterpretation)}\n`;
        }
      }
      
      // Trainings context
      if (context.trainings && context.trainings.length > 0) {
        systemPrompt += `\nTREINAMENTOS DISPONÍVEIS (o usuário pode perguntar sobre estes):\n`;
        context.trainings.forEach((t: any) => {
          systemPrompt += `- "${t.title}" (Pilar: ${t.pillar}, Tipo: ${t.type === 'course' ? 'Curso' : 'Live'})\n`;
        });
      }
      
      // Projects context
      if (context.projects && context.projects.length > 0) {
        systemPrompt += `\nPROJETOS DO USUÁRIO:\n`;
        context.projects.forEach((p: any) => {
          systemPrompt += `- "${p.name}" (Status: ${p.status}, Metodologia: ${p.methodology}`;
          if (p.destinationName) systemPrompt += `, Destino: ${p.destinationName}`;
          systemPrompt += `)\n`;
        });
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
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
