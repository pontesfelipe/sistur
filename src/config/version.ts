/**
 * Controle de Versão do SISTUR
 * 
 * Formato: MAJOR.MINOR.PATCH
 * - MAJOR: Mudanças incompatíveis ou grandes reformulações (1.0.0)
 * - MINOR: Novas funcionalidades compatíveis (.1, .2, .3)
 * - PATCH: Correções de bugs e micro ajustes (.0.1, .0.2)
 * 
 * Changelog deve ser atualizado a cada versão
 */

export const APP_VERSION = {
  major: 1,
  minor: 72,
  patch: 0,
  get full() {
    return `${this.major}.${this.minor}.${this.patch}`;
  },
  get short() {
    return `v${this.major}.${this.minor}`;
  }
};

export const VERSION_HISTORY = [
  {
    version: "1.72.0",
    date: "2026-06-20",
    type: "minor" as const,
    changes: [
      "Correção de versionamento — recalculada a numeração para refletir corretamente a política MAJOR.MINOR.PATCH. As 5 frentes de Gerenciamento de Projetos publicadas como 1.66.16–1.66.20 eram, na prática, bumps minor (novas funcionalidades, novas tabelas) e não patches. As entradas históricas foram mantidas como publicadas para preservar a trilha de auditoria; a versão atual passa de 1.67.0 para 1.72.0 para contabilizar: Frente 1 (1.67), Frente 2 (1.68), Frente 3 (1.69), Frente 4 (1.70), Frente 5 (1.71) e Colaboração em equipe (1.72). A partir de agora, qualquer mudança que adiciona tabela, edge function, rota, módulo ou feature visível ao usuário exige bump minor; o patch fica reservado a correções de bug e ajustes micro.",
      "Projetos — colaboração em equipe. Nova aba 'Equipe' no detalhe do projeto: lista de membros com papel Dono/Editor/Visualizador (apenas Donos gerenciam). O criador do projeto vira Dono automaticamente. Atribuição de tarefa agora usa combobox com os usuários reais da organização (assignee_id + nome), em vez de texto livre. Diálogo de edição de tarefa ganha aba 'Equipe e Comentários' com: matriz RACI por usuário (R/A/C/I, adicionar/remover), comentários encadeados (Ctrl+Enter envia, autor pode excluir) e histórico automático de criação, mudança de status e troca de responsável. Kanban exibe responsável no card. Nova página /minhas-tarefas lista todas as tarefas em que o usuário é responsável ou aprovador (RACI R/A) em qualquer projeto da organização, agrupadas por status, com alerta de atraso. RLS de project_tasks refinado: visualizar = qualquer membro da org; criar/editar = Dono ou Editor do projeto (ou Responsável/Aprovador da tarefa, ou ADMIN/ORG_ADMIN); excluir = Dono do projeto e administradores. Projetos legados sem membros mantêm o comportamento atual (compatibilidade). Novas tabelas: project_members, project_task_comments, project_task_activity. Novas funções: can_edit_project_task, can_manage_project, get_project_member_role.",
    ],
  },
  {
    version: "1.66.20",
    date: "2026-06-20",
    type: "minor" as const,
    changes: [
      "Gerenciamento de Projetos (Frente 5) — IA, exportações e portfólio. Novo botão 'IA' no detalhe do projeto abre o diálogo 'Sugerir tarefas com IA', que envia indicadores vinculados, fases e tarefas existentes ao gateway Lovable AI (google/gemini-2.5-flash) e devolve de 4 a 8 sugestões de tarefas com prioridade, fase, horas estimadas e código de indicador-alvo; o usuário seleciona quais importar. Novo botão '.ics' exporta um calendário iCalendar com marcos e tarefas do projeto (para Google/Outlook/Apple). Nova exportação 'CSV do portfólio' na página de Projetos com todas as colunas executivas. Nova edge function 'suggest-project-tasks' (verify_jwt true) com tratamento de 429/402 e parsing robusto de JSON.",
    ],
  },
  {
    version: "1.66.19",
    date: "2026-06-20",
    type: "minor" as const,
    changes: [
      "Gerenciamento de Projetos (Frente 4) — orçamento e vínculos externos. Nova aba 'Orçamento' no detalhe do projeto: linhas por categoria/fase com valores planejado e realizado em BRL, fonte de financiamento, status (Planejado/Aprovado/Empenhado/Executado/Cancelado), totais agregados, saldo e percentual de execução. Nova aba 'Vínculos' que conecta o projeto a Oportunidades de Investimento (mesmo destino), Consórcios regionais, Alertas do Observatório (mesma org, não dispensados) e Issues do diagnóstico — com seleção a partir de itens existentes, evitando duplicação. Novas tabelas: project_budget_lines e project_external_links, ambas com RLS por organização.",
    ],
  },
  {
    version: "1.66.18",
    date: "2026-06-20",
    type: "minor" as const,
    changes: [
      "Gerenciamento de Projetos (Frente 3) — governança e capacitação. Nova aba 'Governança' no detalhe do projeto: matriz RACI por tarefa (Responsável/Aprovador/Consultado/Informado) e checkpoints obrigatórios por pilar (RA/OE/AO/Geral) com fluxo de submissão de evidência → aprovação/rejeição. Nova aba 'Capacitação' com vinculação de cursos EDU ao projeto, marcação de obrigatoriedade, status de matrícula (sugerido → matriculado → em andamento → concluído) e sumário de pendências. Novas tabelas: project_task_raci, project_checkpoints, project_edu_enrollments — todas com RLS por organização.",
    ],
  },
  {
    version: "1.66.17",
    date: "2026-06-20",
    type: "minor" as const,
    changes: [
      "Gerenciamento de Projetos (Frente 2) — visualizações executivas. Nova aba 'Kanban' no detalhe do projeto com drag-and-drop nativo entre colunas (Backlog, A Fazer, Em Progresso, Em Revisão, Concluído, Bloqueado) e atualização instantânea do status. Nova aba 'Timeline' com Gantt simplificado: barras proporcionais das fases com datas planejadas, faixa de marcos posicionados sobre a linha do tempo, e janela total do projeto. Lista de Projetos agora exibe card de Impacto Agregado do Portfólio: total de indicadores vinculados, melhoraram, regrediram e atingiram meta, somando todos os projetos do usuário.",
    ],
  },
  {
    version: "1.66.16",
    date: "2026-06-20",
    type: "minor" as const,
    changes: [
      "Gerenciamento de Projetos (Frente 1) — integração diagnóstico↔projeto com trilha de impacto. Modo Prescrição agora permite selecionar gatilhos (checkbox) e clicar em 'Criar projeto', abrindo o diálogo de criação já travado no diagnóstico de origem. Nova tabela project_indicator_links registra o score-baseline de cada indicador no momento da criação. Aba 'Indicadores' no detalhe do projeto exibe a Trilha de Impacto: baseline vs score atual, delta em pontos percentuais, contadores de Melhoraram/Regrediram/Atingiram meta. Projetos antigos veem estado vazio com instrução para recriar pelo diagnóstico.",
    ],
  },
  {
    version: "1.66.15",
    date: "2026-06-18",
    type: "patch" as const,
    changes: [
      "Modo Prescrição — feedback visual aprimorado. Agora exibe um banner persistente no topo do diagnóstico quando ativado, explicando o critério (score ≤ 66%) e listando explicitamente as abas afetadas (Indicadores, Gargalos, Tratamento). Ao ativar em uma aba que não reage ao filtro (Radiografia, Normalização, Projeto, etc.), o usuário é automaticamente redirecionado para a aba 'Indicadores' para que a mudança seja imediatamente visível.",
    ],
  },
  {
    version: "1.66.14",
    date: "2026-06-17",
    type: "patch" as const,
    changes: [
      "Geração de Relatórios — corrigida truncagem na seção final de Referências. O relatório agora substitui/fecha deterministicamente Referências, Glossário e Apêndice a partir da trilha de auditoria e das fontes oficiais detectadas, evitando bibliografia cortada no meio (ex.: ANAC). Também envia max_tokens explícito para fallback GPT/Gemini no envelope.",
    ],
  },
  {
    version: "1.66.13",
    date: "2026-06-17",
    type: "patch" as const,
    changes: [
      "Geração de Relatórios — corrigida truncagem do envelope no template 'completo' que fazia o relatório parar dentro da seção 10 (Banco de Ações). Orçamento de saída do Claude (envelope) elevado: base 12k → 18k tokens, saturação por densidade de indicadores 80 → 130 (com bônus 35 → 40 tokens/indicador) e cap absoluto 20k → 32k. Diagnósticos com 100+ indicadores agora completam as seções 10 e 11 (Fontes e Referências) sem cortar.",
    ],
  },
  {
    version: "1.66.12",
    date: "2026-06-17",
    type: "patch" as const,
    changes: [
      "Linhagem dos Dados — painel de 'Indicadores neste nó' agora prioriza o nome legível do indicador (ex.: 'Agências de Turismo') em vez do código técnico (ex.: 'igma_agencias_turismo'). Quando o catálogo não traz nome, o código é convertido em rótulo amigável; código completo fica disponível em fonte menor / tooltip.",
    ],
  },
  {
    version: "1.66.11",
    date: "2026-06-17",
    type: "patch" as const,
    changes: [
      "Procedência dos Dados — lista de 'Indicadores calculados' agora exibe o nome legível do indicador (ex.: 'Índice de Permanência do Turista no Local') em vez do código técnico (ex.: 'igma_iptl'). Código fica como tooltip para referência.",
    ],
  },
  {
    version: "1.66.10",
    date: "2026-06-17",
    type: "patch" as const,
    changes: [
      "Procedência dos Dados — corrigida divergência de 1 indicador em relação ao painel de Linhagem (caso Piracaia: 20 vs 21). Indicadores marcados como 'Pré-preenchido (ANA/IBGE/…)' com source_type=MANUAL passam a ser contabilizados como Oficiais (alinhado à classificação já usada em Linhagem dos Dados), em vez de aparecerem indevidamente em 'Manuais'.",
    ],
  },
  {
    version: "1.66.9",
    date: "2026-06-17",
    type: "minor" as const,
    changes: [
      "Auditoria Semântica — refatorada para execução em LOTES paralelos. As regras agora são avaliadas em grupos por categoria (até 6 regras por chamada) em vez de uma única chamada gigante. Reduz risco de o modelo 'pular' regras conforme a camada semântica cresce e diminui o tempo total de auditoria.",
      "Auditoria Semântica — adicionadas 6 checagens DETERMINÍSTICAS (sem custo de IA) executadas antes dos lotes LLM: marcas de truncagem/placeholder (TODO, max_tokens), tabelas markdown duplicadas, régua de classificação oficial, formatação BRL canônica (R$ 1.234,56), expansão obrigatória de IGMA na 1ª ocorrência e proibição de ranking público entre municípios.",
      "Auditoria Semântica — tolerância a falha por lote: se uma chamada falhar por timeout/429/402, apenas aquele lote é marcado como 'warn' com explicação, em vez de derrubar a auditoria inteira. Pool de paralelismo limitado a 6 requisições simultâneas para respeitar rate-limit do gateway.",
      "Auditoria Semântica — resposta passa a incluir contadores 'batches' e 'deterministic_checks' para diagnóstico, mantendo o schema compatível com o painel atual.",
    ],
  },
  {
    version: "1.66.8",
    date: "2026-06-17",
    type: "patch" as const,
    changes: [
      "Relatórios — corrigida truncagem silenciosa do envelope (Banco de Ações cortado no meio da tabela). Agora detectamos `stop_reason=max_tokens` (Claude) e `finish_reason=length` (GPT-5/Gemini) e fazemos fallback automático para o próximo provedor, em vez de persistir conteúdo incompleto marcado como 'concluído' (caso Piracaia / Christiana).",
      "Relatórios — orçamento de saída do envelope elevado (base 9k → 12k tokens; teto 16k → 20k) para acomodar Plano de Ação com 20+ linhas sem cortar em destinos com muitos indicadores.",
    ],
  },
  {
    version: "1.66.7",
    date: "2026-06-17",
    type: "patch" as const,
    changes: [
      "Trilha de Auditoria — agora exibe o nome do indicador (com o código abaixo, em fonte menor), em vez de apenas o código técnico.",
      "Procedência dos Dados — categoria 'Contextuais' incorporada em 'Oficiais' para eliminar a divergência com o painel de Linhagem dos Dados (agora ambos exibem o mesmo total de fontes oficiais).",
    ],
  },
  {
    version: "1.66.6",
    date: "2026-06-17",
    type: "patch" as const,
    changes: [
      "Diagnóstico — Procedência dos Dados: painel agora usa a trilha de auditoria (assessment_indicator_audit) como fonte da verdade, alinhando o total com o número real de indicadores calculados (ex.: 118 em vez de 112). Indicadores derivados (IPCR, I_SEMT, IPTL, leitos por hab., etc.) deixam de aparecer como zero e passam a ser contados corretamente na categoria 'Calculados'. Nova categoria 'Contextuais' para APIs oficiais de referência (PIB nacional, etc.).",
    ],
  },
  {
    version: "1.66.5",
    date: "2026-06-17",
    type: "patch" as const,
    changes: [
      "Diagnóstico — Linhagem dos Dados: os nós (fontes, tipos e pilares) agora são clicáveis. Ao clicar, abre-se logo abaixo do diagrama um painel com a lista completa dos indicadores daquele nó (código, nome e pilar), com cabeçalho contextual, contagem total e botão de fechar. Clicar novamente no mesmo nó fecha o painel.",
    ],
  },
  {
    version: "1.66.4",
    date: "2026-06-17",
    type: "minor" as const,
    changes: [
      "Diagnóstico — Linhagem dos Dados reformulada como um diagrama de fluxo (Sankey-like): conexões em curvas SVG ligam Fontes → Tipo de indicador → Pilares → Score final, com espessura proporcional ao volume de indicadores e cores por tipo (oficial/derivado/manual) e por pilar (RA/OE/AO). Ao passar o mouse sobre qualquer nó, o fluxo correspondente é destacado e os demais ficam atenuados. Cada pilar agora exibe a quebra por tipo de fonte (X of. / Y der. / Z man.) e o card de Resultado lista o score individual de RA/OE/AO. Corrigida a contagem '0 indicadores' nos pilares: agora o pilar é resolvido pelo catálogo de indicadores quando a auditoria não traz o campo, com fallback heurístico pelo código.",
    ],
  },
  {
    version: "1.66.3",
    date: "2026-06-17",
    type: "patch" as const,
    changes: [
      "Diagnóstico — Linhagem dos Dados: corrigida a contagem por pilar (RA/OE/AO), que aparecia como '0 indicadores' por divergência de capitalização entre os dados de auditoria e os scores dos pilares. Coluna 'Fontes' passa a exibir o nome comercial das fontes oficiais (ex.: 'IBGE — Instituto Brasileiro de Geografia e Estatística', 'Mapa do Turismo Brasileiro (MTur)') em vez das siglas.",
    ],
  },
  {
    version: "1.66.2",
    date: "2026-06-17",
    type: "minor" as const,
    changes: [
      "Diagnóstico — aba 'Comentários' reformulada como Revisão técnica: cada comentário pode ser ancorado no diagnóstico, em um pilar (RA/OE/AO) ou em um indicador específico, ter um responsável atribuído e status aberto/resolvido. Inclui filtros por status e por âncora, contadores no cabeçalho e botão de resolver/reabrir (autor, responsável, ADMIN ou ORG_ADMIN/ANALYST da mesma organização). Backend: novas colunas em discussion_comments e RPC set_discussion_comment_status com checagem de autorização.",
    ],
  },
  {
    version: "1.66.1",
    date: "2026-06-17",
    type: "patch" as const,
    changes: [
      "Diagnóstico — corrigido deep-link das abas 'Linhagem' e 'Comentários' (ex.: ?tab=linhagem). As novas abas não estavam na lista de tabs válidos e caíam de volta na Radiografia ao abrir a URL diretamente.",
    ],
  },
  {
    version: "1.66.0",
    date: "2026-06-16",
    type: "minor" as const,
    changes: [
      "Diagnóstico — nova aba 'Linhagem' (Data Lineage) na tela de detalhes do diagnóstico. Visualização em fluxo de 4 colunas (Fontes → Indicadores por tipo → Pilares → Score Final) que rastreia a procedência de cada indicador desde a origem (IBGE, CADASTUR, STN, DATASUS, INEP, manual, derivado) até a composição final do score. Inclui contadores por fonte, distribuição percentual oficial/derivado/manual em cada pilar, barra empilhada por pilar e legenda de cores consistente com o painel de Procedência.",
    ],
  },
  {
    version: "1.65.5",
    date: "2026-06-16",
    type: "patch" as const,
    changes: [
      "Jogos Educacionais — Memória Ecológica: refinamento mobile e consistência visual com os outros jogos. Header com título encurtado para 'Memória' em <640px, ícone Brain com glow, hit areas 40x40, novo botão Reiniciar no header (antes só disponível no game over). HUD em badges semânticos consistentes com Caça ao Tesouro (pontuação âmbar, pares esmeralda, timer com state vermelho <30s). Linha 2 com flex-wrap evita overflow. Contador de jogadas em badge sutil.",
    ],
  },
  {
    version: "1.65.4",
    date: "2026-06-16",
    type: "patch" as const,
    changes: [
      "Jogos Educacionais — Caça ao Tesouro: refinamento HUD em mobile (440px). HUD reorganizado em duas linhas com badges semânticos: linha 1 (saúde + pontuação âmbar + tesouros esmeralda), linha 2 (timer + bússola + perigo + erros + movimentos) com flex-wrap para evitar overflow. Timer com states visuais (vermelho <30s, âmbar quando pausado por enigma). Backdrop blur reforçado (sm → md) e bg-black/30 → /40 para melhor legibilidade sobre o background do bioma. Cada métrica com border + bg sutil para hierarquia visual clara.",
    ],
  },
  {
    version: "1.65.3",
    date: "2026-06-16",
    type: "patch" as const,
    changes: [
      "Jogos Educacionais — RPG (Missão Bioma): refinamento mobile. Header compactado em 440px com botões 'Outro Bioma' e 'Reiniciar' colapsando para ícone-only (texto reaparece em sm+). Hit areas ampliadas (h-8 → h-9). Título e capítulo com truncate para não quebrar layout. Barra de progresso engrossada (h-1.5 → h-2) com gradiente e glow primário sutil. Ambient gradient do bioma reforçado (0.04 → 0.06) + vinheta radial primária no topo. Padding lateral responsivo (px-3 em mobile, px-4 em sm+).",
    ],
  },
  {
    version: "1.65.2",
    date: "2026-06-16",
    type: "patch" as const,
    changes: [
      "Jogos Educacionais — TCG (Guardião do Território): refinamento visual. Top bar mais compacto em mobile (440px) com título encurtado para 'GUARDIÃO', botões com hit area 40x40 e hover state âmbar, badges separados para moedas e turno. Background atmosférico com vinheta radial âmbar no topo. Toast de feedback animado com Framer Motion (spring). Overlays de vitória e derrota com motion + glow âmbar/vermelho, troféu pulsando, caveira sacudindo. Mantida toda a lógica de jogo.",
    ],
  },
  {
    version: "1.65.1",
    date: "2026-06-16",
    type: "patch" as const,
    changes: [
      "Jogos Educacionais — Hub: refinamento mobile (440px). Padding reduzido (p-8 → p-5 em telas pequenas), tipografia escalonada (h1 2xl→3xl, título do card xl→2xl), gap dos cards 4→6, ícone do emoji 12→14, descrição com line-clamp-3 no mobile, tags com flex inline (sem desalinhamento de ícones), borda translúcida, touch-manipulation e active scale para feedback tátil, decoração de fundo do card escalonada 24→32.",
    ],
  },
  {
    version: "1.65.0",
    date: "2026-06-16",
    type: "minor" as const,
    changes: [
      "Professor Beni — nova seção 'O que você pode perguntar' na sidebar da página /beni, listando explicitamente: diagnósticos e relatórios acessíveis (com confirmação de nome), metodologia (RA/OE/AO, IGMA), prescrições/cursos, e turismo sustentável. Inclui também os limites de escopo (não responde sobre programação, saúde, política, religião ou temas fora do turismo/SISTUR).",
    ],
  },
  {
    version: "1.64.13",
    date: "2026-06-16",
    type: "patch" as const,
    changes: [
      "Professor Beni — regra de desambiguação: quando o usuário pedir análise sobre \"um diagnóstico\", \"o relatório\", \"esse\", \"aquele\" ou termos genéricos, Beni agora sempre lista os diagnósticos/relatórios acessíveis pelo nome exato (com destino entre parênteses, em formato TTS-friendly: \"primeira opção...\", \"segunda opção...\") e pergunta qual deles analisar antes de responder. Só pula a confirmação quando o usuário citou o nome exato na mesma frase ou quando há apenas um item acessível (nesse caso confirma com \"você quer que eu analise [nome]?\").",
    ],
  },
  {
    version: "1.64.12",
    date: "2026-06-16",
    type: "patch" as const,
    changes: [
      "Professor Beni agora responde sobre diagnósticos e relatórios do usuário — a edge function beni-chat injeta no prompt os 10 diagnósticos mais recentes (título, destino, tipo, status, score final, pilares com %/severidade e flags IGMA) e os 5 relatórios gerados mais recentes (destino, data, modelo e trecho de até 1500 chars do conteúdo). A consulta usa o JWT do usuário, então RLS limita automaticamente aos itens que ele pode ver na sua organização. Beni é instruído a nunca inventar diagnósticos/relatórios fora dessa lista. Painel Configurações > Beni atualizado para refletir o novo contexto dinâmico.",
    ],
  },
  {
    version: "1.64.11",
    date: "2026-06-16",
    type: "patch" as const,
    changes: [
      "Configurações — nova aba \"Beni\" exibindo as regras de conversa, persona, formato TTS-friendly, base teórica injetada, contexto dinâmico, guardrails de escopo e infraestrutura (modelo Gemini via Lovable AI Gateway) usados pelo Professor Beni Chat. Painel é informativo: o prompt real continua na edge function beni-chat para evitar prompt injection pelo cliente.",
    ],
  },
  {
    version: "1.64.10",
    date: "2026-06-16",
    type: "patch" as const,
    changes: [
      "Conferência de dados — cada divergência citada agora exibe uma flag visual de status: \"Corrigido na auditoria\" (badge verde com data e origem da correção — Autofix ou correção manual via Conferência) ou \"Pendente de fixação\". O botão Autofix passa a mostrar somente o contador pendente e fica desabilitado quando tudo já foi fixado. O resumo do banner também acrescenta \"X já fixadas na tabela de auditoria\" quando aplicável.",
    ],
  },
  {
    version: "1.64.9",
    date: "2026-06-16",
    type: "patch" as const,
    changes: [
      "Hotfix — abrir um relatório no histórico (/relatorios) quebrava com React error #310 (\"Rendered more hooks than during the previous render\"). Causa: na v1.64.7 adicionei `useMemo` + `useQuery` para resolver os nomes dos indicadores DEPOIS do `if (!data) return null` no `ReportValidationBanner`, violando as Rules of Hooks. Movidos os dois hooks para ANTES do early-return.",
    ],
  },
  {
    version: "1.64.8",
    date: "2026-06-16",
    type: "patch" as const,
    changes: [
      "Segurança — bloco de correções: (1) `report_jobs.auth_jwt` deixa de ser legível por usuários autenticados (column-level GRANT, apenas service_role lê o token); (2) `forum_post_likes` e `forum_reply_likes` agora exigem login para SELECT (sem enumeração anônima); (3) edge function `discover-municipal-events` corrigida — checava `profiles.id` em vez de `profiles.user_id`, permitindo que ORG_ADMINs disparassem buscas Firecrawl em qualquer organização; (4) edge function `notify-observatory-alert` agora valida JWT e exige que o chamador seja ADMIN global ou membro da org do alerta antes de enviar e-mails. Memória de segurança atualizada.",
    ],
  },
  {
    version: "1.64.7",
    date: "2026-06-16",
    type: "patch" as const,
    changes: [
      "Conferência de dados — cada indicador citado (ex.: OE007, AO003) agora aparece com o NOME legível ao lado do código, buscado da tabela `indicators`. Adicionada também explicação do termo \"tabela oficial\": é a tabela de auditoria do diagnóstico (`indicator_values`), onde ficam os valores numéricos confirmados pelo usuário ou importados das fontes oficiais (IBGE, CADASTUR, STN, DATASUS, INEP). Quando a IA cita número divergente, o sistema substitui pelo valor dessa tabela automaticamente.",
    ],
  },
  {
    version: "1.64.6",
    date: "2026-06-16",
    type: "patch" as const,
    changes: [
      "Relatórios — o agente IA validador (passo 92%) foi movido para EXECUÇÃO PÓS-PERSISTÊNCIA em background (EdgeRuntime.waitUntil). Antes, mesmo com timeout de 75s + heartbeat, a validação ficava no caminho crítico antes da persistência: se a chamada de rede ao gateway/Anthropic demorasse, podia travar o job em 92%. Agora o fluxo é: (1) validação determinística + auto-correções inline (locais, rápidas, sem rede), (2) persistência imediata do relatório, (3) job marcado como `completed` em 100%, (4) agente IA roda em background e ATUALIZA a linha em `report_validations` quando termina. Resultado: o relatório NUNCA mais fica preso em 92% por causa do validador IA, e o usuário recebe o conteúdo final imediatamente. Nova coluna `report_validations.ai_validation_status` (pending | completed | failed | skipped) rastreia o resultado da validação assíncrona.",
    ],
  },
  {
    version: "1.64.5",
    date: "2026-06-16",
    type: "patch" as const,
    changes: [
      "Relatórios — o agente validador de coerência (passo 92%) agora usa o MESMO modelo escolhido pelo usuário para gerar o relatório (Claude / GPT-5 / Gemini). Antes era sempre gemini-2.5-pro, independentemente da escolha — o que causava troca de provider no meio do pipeline e podia pendurar a validação quando o usuário tinha selecionado Claude/GPT-5. Claude vai direto na Anthropic (claude-sonnet-4-5), GPT-5 e Gemini seguem pelo Lovable Gateway. Mantém o timeout duro de 75s e heartbeat SSE de 20s (v1.64.4). Validação continua não-bloqueante.",
    ],
  },
  {
    version: "1.64.4",
    date: "2026-06-16",
    type: "patch" as const,
    changes: [
      "Relatórios — corrigido travamento em 92% (\"Validando coerência com agente IA\"). O agente validador (gemini-2.5-pro) podia ficar pendurado no gateway por mais tempo que o watchdog do worker (4 min de idle), fazendo o job inteiro ser abortado mesmo com o conteúdo já gerado. Agora a chamada tem timeout duro de 75s (em caso de estouro, a validação é tratada como não-bloqueante e o relatório segue para persistência) e um heartbeat SSE é emitido a cada 20s durante a validação para evitar que o worker considere o stream ocioso. Sintoma reportado em Piracaia (mensagem \"A geração excedeu o tempo limite sem concluir. Última etapa: Validando coerência com agente IA\").",
    ],
  },
  {
    version: "1.64.3",
    date: "2026-06-15",
    type: "patch" as const,
    changes: [
      "Relatórios — corrigido falso \"[auto-cleanup] Worker excedeu o limite\" que marcava como `failed` jobs de geração de relatório ainda em execução. O worker (`process-report-job`) agora envia heartbeat de `last_attempt_at` a cada 30s junto com o progresso, evitando que o cron `cleanup_stuck_report_jobs` (gatilho >15 min) mate jobs vivos durante a validação final pós-pilar — sintoma reportado nos destinos Piracaia, Atibaia e Barretos, onde os 3 pilares (RA/OE/AO) já estavam cacheados em `partial_pillars` mas a coerência final demorava mais que a janela do cleanup.",
    ],
  },
  {
    version: "1.64.2",
    date: "2026-06-15",
    type: "patch" as const,
    changes: [
      "Diagnóstico — corrigida divergência entre o painel \"Validação Pré-Cálculo\" e o formulário de entrada manual. O contador de completude agora considera apenas indicadores compatíveis com o tier (SMALL/MEDIUM/COMPLETE) e o escopo (territorial/enterprise) realmente exibidos no formulário, eliminando o resíduo de ~3% que travava o preenchimento em 97% sem campos visíveis para completar.",
      "Diagnóstico — o checklist pré-cálculo agora lista TODOS os indicadores faltantes por pilar (com código e nome) em vez de truncar em 5, permitindo localizar rapidamente cada campo a preencher na aba Dados (filtro \"Faltantes\").",
    ],
  },
  {
    version: "1.64.1",
    date: "2026-06-05",
    type: "patch" as const,
    changes: [
      "Documentação — adicionadas as novas fontes oficiais consumidas pelo Observatório nas páginas de Configurações (Referências Oficiais) e Metodologia (Referências Bibliográficas): IBGE/SIDRA tabelas 6579 (população estimada anual) e 5938 (PIB municipal — variáveis 37 total e 39 per capita), e Novo CAGED/MTE como base do baseline mensal estimado de empregos formais. Garantia de rastreabilidade e transparência metodológica.",
    ],
  },
  {
    version: "1.64.0",
    date: "2026-06-05",
    type: "minor" as const,
    changes: [
      "Observatório — baseline anualizado: a edge function `ingest-observatory` agora, ao derivar valores de fontes anuais (Cadastur/IGMA/CAGED-RAIS/Tesouro), também popula automaticamente os meses 1–11 com `valor_anual / 12` marcados como `estimativa mensal` no campo `notes` e `source`. Isso elimina gráficos mensais vazios quando só há dado anual disponível. Estimativas são preservadas até serem substituídas por dado real (inserção manual ou ingestão mensal) — nunca sobrescrevem valores reais existentes.",
      "Observatório — integração IBGE/SIDRA: nova edge function `enrich-municipality-sidra` consulta a API pública SIDRA do IBGE (tabelas 6579 população estimada, 5938 PIB municipal var. 37 total e var. 39 per capita) e popula a nova tabela `municipal_socioeconomic_context` por `ibge_code`. Sem credenciais, sem custo, sem fragilidade — API REST oficial. Novo card `SocioeconomicContextPanel` exibe população, PIB total e PIB per capita do município no topo do Observatório, com botão de atualização para admins.",
    ],
  },
  {
    version: "1.63.0",
    date: "2026-06-05",
    type: "minor" as const,
    changes: [
      "Observatório — descoberta automática de eventos: nova edge function `discover-municipal-events` usa Firecrawl (search + JSON extraction) para consultar sites oficiais (prefeitura, secretaria de turismo via `site:gov.br`) e sugerir eventos turísticos do município no ano selecionado. Novo componente `DiscoverEventsDialog` na aba Eventos abre fluxo de aprovação humana: lista candidatos (nome, datas, categoria, descrição, link da fonte), permite seleção múltipla via checkbox e importa em lote para `observatory_events`. A fonte é preservada no campo `description` para auditoria. Nenhuma inserção automática — sempre requer revisão. Bloqueado em modo visualização (admin vendo outro destino)."
    ]
  },
  {
    version: "1.62.16",
    date: "2026-06-05",
    type: "patch" as const,
    changes: [
      "Observatório Turístico — período avaliado visível por indicador: cada métrica agora exibe um badge com o período coberto pelos dados do ano selecionado (ex.: 'Jan/2025', 'Jan–Mar/2025', '2025 (anual)', '5 meses em 2025'). O cálculo deriva das medições reais via novo `useObservatoryMeasurements` na página e do helper `buildPeriodLabel`, sem alterar schema. Facilita identificar lacunas temporais e diferenciar snapshots anuais de séries mensais."
    ]
  },
  {
    version: "1.62.15",
    date: "2026-06-05",
    type: "minor" as const,
    changes: [
      "Observatório Turístico — clareza de escopo: novo cabeçalho mostra o destino vinculado (Nome/UF) com ícone de localização e texto introdutório explicando que o módulo é o monitor permanente do destino (complementar ao diagnóstico cíclico). Adicionado seletor de destino visível apenas para ADMIN/ORG_ADMIN, permitindo alternar a visualização entre destinos sem trocar de conta; em modo visualização, botões de escrita (Registrar/Novo Evento) ficam desativados para evitar gravação em destino errado. Hooks `useObservatorySummary`, `useObservatoryEvents` e `useObservatoryMeasurements` agora aceitam parâmetro opcional `orgIdOverride`."
    ]
  },

  {
    version: "1.62.14",
    date: "2026-06-05",
    type: "patch" as const,
    changes: [
      "Correção do erro React #310 em `/observatorio` — em `src/components/observatorio/RegressionAlertsPanel.tsx`, os hooks `useRef` e `useEffect` estavam declarados depois de um `return` condicional (`if (isLoading) return …`), o que fazia o React executar uma quantidade diferente de hooks entre renders e quebrar a página com tela branca. Os hooks foram movidos para antes de qualquer return, respeitando as Regras dos Hooks."
    ]
  },
  {
    version: "1.62.13",
    date: "2026-06-05",
    type: "minor" as const,
    changes: [
      "Configurações → Documentação — todos os documentos agora geram .docx em conformidade ABNT (Arial 12, A4, margens 3/2/3/2 cm, entrelinha 1,5, numeração de páginas). Foram adicionados quatro novos exportadores: `exportManualUsuarioDocx`, `exportGlossarioIndicadoresDocx`, `exportGuiaEduDocx` e `exportManualDiagnosticosDocx` em `src/lib/exportDocsDocx.ts` (via novo helper compartilhado `buildAndSave`). `src/pages/Configuracoes.tsx` foi atualizado para ligar cada item da lista de Guias e Manuais ao seu exportador e exibir todos com a versão corrente do app — encerrando o estado de \"Documento em preparação\" para Manual do Usuário, Glossário, Guia EDU e Manual de Diagnósticos."
    ]
  },
  {
    version: "1.62.12",
    date: "2026-06-05",
    type: "patch" as const,
    changes: [
      "ErrorBoundary global — adicionado em `src/components/ErrorBoundary.tsx` e envolvendo todas as rotas no `App.tsx`. Substitui a tela totalmente branca (causada por erros de render não capturados) por uma mensagem amigável com o motivo real do erro, botão de recarregar e link para o início. Também loga o erro completo no console para diagnóstico — usado para investigar o sintoma de `/observatorio` 'piscar e ficar em branco' após login."
    ]
  },
  {
    version: "1.62.11",
    date: "2026-06-04",
    type: "patch" as const,
    changes: [
      "Observatório — Página `/observatorio` agora é renderizada dentro do `AppLayout` (header + sidebar). Antes o componente retornava apenas um `<div container>`, o que deixava a tela sem chrome de navegação e parecia 'em branco' depois do login. Padroniza com Diagnósticos/Relatórios e corrige o sintoma 'abre e fica tudo branco'."
    ]
  },
  {
    version: "1.62.10",
    date: "2026-06-04",
    type: "patch" as const,
    changes: [
      "Deep links autenticados (fix) — `Auth.tsx` ignorava o parâmetro `?redirect=` no fluxo de login com email/senha e mandava todo mundo para `/` após autenticar. Agora o handler `handleSignIn` lê e valida o redirect (mesmo origem, prefixo `/`) e navega direto para o destino original, fechando o gap deixado em 1.62.9. Resolve o caso reportado em `sistur.app/observatorio` que continuava caindo na raiz após login."
    ]
  },
  {
    version: "1.62.9",
    date: "2026-06-04",
    type: "patch" as const,
    changes: [
      "Deep links autenticados — rotas protegidas (ex.: /observatorio, /relatorios, /diagnosticos) agora preservam o caminho original via `?redirect=` ao mandar o usuário para /auth. Após o login, o usuário é levado direto para a página solicitada em vez de cair sempre na raiz. Corrige o sintoma 'a URL não leva a lugar nenhum' reportado para sistur.app/observatorio quando o usuário não está autenticado."
    ]
  },
  {
    version: "1.62.8",
    date: "2026-06-04",
    type: "patch" as const,
    changes: [
      "Camada de Contexto do Relatório — o campo de texto `Contexto` na aba Configurações › Contexto agora é somente-leitura por padrão. O usuário deve clicar no botão `Editar` (lápis) para habilitar a edição, e só então pode alterar o conteúdo. Após salvar, o campo volta ao modo somente-leitura. Evita edições acidentais no prompt de persona/audiência/tom/foco/prioridades/restrições."
    ]
  },
  {
    version: "1.62.7",
    date: "2026-06-04",
    type: "minor" as const,
    changes: [
      "Camada de Contexto do Relatório — nova aba `Contexto` em Configurações com editor de persona/audiência/tom/foco/prioridades/restrições aplicado pela IA em todo relatório gerado. Defaults globais (territorial e enterprise) já pré-preenchidos com a contextualização atual. Cada organização pode criar seu próprio contexto, que prevalece sobre o global ao gerar relatórios daquela org. Acesso: ADMIN gerencia tudo, ORG_ADMIN gerencia apenas a própria org.",
      "Nova tabela `report_context_profiles` (org_id nulo = global) com RLS, índice por (scope, active, org_id) e seed inicial.",
      "Edge function `generate-report` — carrega o contexto ativo da organização (com fallback para o global) e injeta-o no systemPrompt da geração monolítica E no envelope/pilares do pipeline paralelo. Contexto é cumulativo com a metodologia SISTUR, a camada semântica e a estrutura canônica — não as substitui."
    ]
  },
  {
    version: "1.62.6",
    date: "2026-06-03",
    type: "minor" as const,
    changes: [
      "Estrutura Canônica do Relatório — nova aba `Estrutura` em Configurações (admin-only) com editor de seções por escopo (territorial/enterprise) e template (completo/executivo/investidor). Cada seção tem título e descrição-contrato, podendo ser reordenada, adicionada, removida ou desativada. Os defaults seedados refletem a ordem oficial SISTUR (Ficha Técnica → Sumário → Contexto → Metodologia → Alertas IGMA → Diagnóstico RA/OE/AO → Análise Integrada → Benchmarks → Prognóstico → Banco de Ações → Fontes → Considerações Finais → Referências). Nova tabela `report_structure_templates` (RLS: leitura autenticada, escrita ADMIN).",
      "Geração de relatório — o systemPrompt (e o envelope do pipeline paralelo) agora recebe a estrutura ativa como CONTRATO numerado com regras anti-loop explícitas: cada seção UMA única vez, sem reescrever, sem voltar a seções anteriores, sem repetir Ficha Técnica/Sumário/Tabela de scores. Resolve o relato da usuária Chris (Atibaia): relatório que repetia tabela → metodologia → resumo e travava regenerando a primeira parte.",
      "Worker de relatórios (`process-report-job`) — auto-retry silencioso removido (MAX_ATTEMPTS=2 → 1) e `partial_content` é zerado ao reivindicar o job. O retry automático fazia o pipeline reexecutar do zero na mesma sessão e o cliente, que faz polling de `partial_content`, enxergava o relatório `voltando a se gerar` — exatamente o sintoma reportado."
    ]
  },
  {
    version: "1.62.5",
    date: "2026-06-02",
    type: "minor" as const,
    changes: [
      "Camada Semântica — Nova aba `Conferir relatório` (Configurações › Semântica): admin envia um arquivo de texto (.txt/.md/.json/.html/.csv) ou cola o conteúdo de um relatório e uma IA confronta o texto com todas as regras ativas da camada semântica, retornando score de conformidade (0–100), resumo e lista de findings categorizados em OK / Alerta / Violação, cada um com regra associada, trecho citado do relatório e sugestão de correção. Filtro por status e escopo (territorial/enterprise/ambos). Backend: nova edge function `check-report-semantic` (admin-only) usando Lovable AI Gateway (google/gemini-2.5-pro, JSON mode)."
    ]
  },
  {
    version: "1.62.4",
    date: "2026-06-02",
    type: "patch" as const,
    changes: [
      "Camada Semântica — Formulário de Nova Regra ampliado: botão `Inserir exemplo` que pré-preenche o draft com uma regra válida canônica (régua de classificação 5 níveis), texto de ajuda contextual abaixo de cada campo (chave, categoria, título, cabeçalho, conteúdo, aplica-se a, ordem de injeção, ativa) e nova aba `Exemplo` exibindo a regra de referência como tabela de campos + markdown + equivalente JSON para importação em lote. Empty-state ganhou CTA secundária `Nova regra`."
    ]
  },
  {
    version: "1.62.3",
    date: "2026-06-02",
    type: "patch" as const,
    changes: [
      "Navegação — `Configurações` voltou para o rodapé do menu lateral (junto com Planos, Ajuda, Licenças, etc.). A `Camada Semântica` deixou de ser link separado e agora é uma aba dentro de `Configurações` (visível apenas para ADMIN), ao lado de Geral, Usuários, Feedback, Logs, Docs e Ferramentas. A rota `/admin/semantica` continua funcionando para acesso direto e links existentes."
    ]
  },
  {
    version: "1.62.2",
    date: "2026-06-02",
    type: "patch" as const,
    changes: [
      "Camada Semântica — Importação por drag-and-drop e histórico de último arquivo. A página `/admin/semantica` agora aceita arquivos JSON/CSV arrastados de qualquer lugar da janela (overlay visual indica a zona de drop). O nome do arquivo, data, quantidade de entradas e modo de importação do último upload são persistidos em `localStorage` e exibidos como badge removível abaixo da zona de drop, facilitando auditoria e rastreabilidade entre sessões."
    ]
  },
  {
    version: "1.62.1",
    date: "2026-06-02",
    type: "patch" as const,
    changes: [
      "Camada Semântica — Export/Import em `/admin/semantica`. Botão **Exportar** gera backup completo (ou apenas o filtro atual) em **JSON** (estrutura `{schema, version, exported_at, entries[]}`) ou **CSV** (com BOM UTF-8 para Excel BR). Botão **Importar** aceita JSON ou CSV, parseia client-side, mostra pré-visualização com badge `inserir`/`atualizar` por chave e dois modos: **Merge** (insere novos + atualiza existentes, preserva os demais) ou **Substituir** (insere/atualiza do arquivo e desativa as entradas ativas ausentes — sem excluir, permitindo reverter). Cada upsert respeita as triggers de versionamento e histórico (`report_semantic_entry_history`), então toda importação fica rastreada. Permite backup, versionamento externo (git) e migração entre ambientes (staging → produção)."
    ]
  },
  {
    version: "1.62.0",
    date: "2026-06-02",
    type: "minor" as const,
    changes: [
      "Camada Semântica de Relatórios — Nova feature administrável em `/admin/semantica` (acesso via Logs de Auditoria → 'Camada Semântica'). Move o conhecimento usado para gerar relatórios (fundamentos Beni, régua de classificação, regras de fontes, atribuição anti-troca, bibliografia canônica, política Zero Alucinação, glossário IGMA, MST opt-in, formatação ABNT/pt-BR) das constantes hardcoded do edge function `generate-report` para a tabela `report_semantic_entries`, com versionamento automático e histórico completo (`report_semantic_entry_history`). ADMIN pode editar, ativar/desativar, criar novas entradas e ajustar a ordem de injeção — alterações entram em vigor no próximo relatório gerado, sem deploy. Edge function carrega a camada por request (territorial vs enterprise), com fallback automático para as constantes embutidas se a tabela estiver vazia ou a query falhar (zero regressão). Seed inicial replica fielmente o conteúdo em produção."
    ]
  },
  {
    version: "1.61.5",
    date: "2026-06-01",
    type: "patch" as const,
    changes: [
      "Dados oficiais — Corrigidas FK violations em `external_indicator_values` para as fontes CADÚNICO e ANAC, que não existiam em `external_data_sources`. Sintoma: o `fetch-official-data` rodava com sucesso (24 indicadores para Atibaia/3504107), mas os valores de população de baixa renda (CADÚNICO) e voos por semana (ANAC) eram silenciosamente descartados no upsert (`violates foreign key constraint external_indicator_values_source_code_fkey`). Agora ambas as fontes estão cadastradas e os indicadores são persistidos corretamente no diagnóstico territorial."
    ]
  },
  {
    version: "1.61.4",
    date: "2026-06-01",
    type: "patch" as const,
    changes: [
      "Catálogo de indicadores — Reclassificação de pilar conforme a Matriz de Parametrização oficial (auditoria comparativa do XLSX 'MATRIZ DE PARAMETRIZAÇÃO - CONFERENCIA'). IPTL (Índice de Pressão Turística Local), IPCR (Índice de Poder de Compra Relativo), IIET (Índice de Intensidade Econômica do Turismo) e I_SEMT (Sustentabilidade Econômica do Mercado Turístico) movidos para o pilar AO › Turismo e Mercado (antes estavam em RA/OE). IDEB renomeado para 'IDEB Consolidado' e movido para AO › Educação (antes em RA › Social). Pesos e fórmulas inalterados; apenas o enquadramento por pilar foi corrigido, refletindo na composição dos scores RA/OE/AO do diagnóstico territorial."
    ]
  },
  {
    version: "1.61.3",
    date: "2026-06-01",
    type: "patch" as const,
    changes: [
      "Dados oficiais — `fetch-official-data` agora resolve a UF do município direto pelo prefixo do código IBGE (ex.: 35 → SP) e faz UMA única chamada a `localidadesDaUfSemShape`, em vez de varrer sequencialmente todas as 27 UFs do `mapa.turismo.gov.br`. A varredura anterior podia baixar 27 × 10 MB de GeoJSON e ultrapassar o timeout de 150 s da edge function, retornando 'Edge function returned a non-2xx status code' (sintoma relatado em Atibaia/SP). Também foi adicionado timeout de 15 s à chamada POST `regionalizacao/pesquisar` (antes sem timeout). Cidades sem cache local agora carregam os dados do Mapa do Turismo em segundos."
    ]
  },
  {
    version: "1.61.2",
    date: "2026-06-01",
    type: "patch" as const,
    changes: [
      "Relatórios — Exportação PDF (via Salvar como PDF do navegador) agora segue ABNT/NBR 14724: papel A4, margens 3cm sup/esq e 2cm inf/dir, Arial 12pt, entrelinha 1,5, parágrafos justificados com recuo de 1,25cm, numeração de página no rodapé direito e cabeçalho de tabela em 10pt com bordas finas. Corrige perda de formatação ABNT relatada ao gerar PDF do relatório.",
      "Relatórios — Exportação Word (.docx): largura das colunas das tabelas agora é distribuída por PESO de conteúdo em vez de igualitária. 'Indicador' (3x), 'Fonte' (1.6x), 'Status' (1.4x), 'Valor' (0.9x), 'Unidade' (0.7x). Colunas descritivas alinhadas à esquerda; status/valor/unidade centralizados. Resolve tabelas desconfiguradas em que o nome do indicador quebrava em 4 linhas enquanto 'Unidade' ficava quase vazia."
    ]
  },
  {
    version: "1.61.1",
    date: "2026-06-01",
    type: "patch" as const,
    changes: [
      "Diagnóstico — Cálculo agora é assíncrono (job + polling) para não travar a interface em diagnósticos COMPLETE com 100+ indicadores. Nova tabela `assessment_calc_jobs` registra cada execução (pending/running/completed/failed). `calculate-assessment` responde 202 imediato com `job_id` e processa em background via `EdgeRuntime.waitUntil`; hook `useCalculateAssessment` faz polling a cada 2s por até 5 min, exibindo toast de progresso e erro real do servidor em caso de falha. Função `expire_stuck_calc_jobs()` marca como falhos jobs presos há mais de 10 min. Resolve o sintoma 'fica carregando para sempre' relatado em Barretos/Foz.",
      "Relatórios — Indicadores BINÁRIOS (OE007 Plano de Turismo, COMTUR, Fundo Municipal, etc.) agora aparecem na TABELA CANÔNICA injetada no LLM como 'SIM (1) — possui' ou 'NÃO (0) — não possui' em vez do número cru. Nova regra dura no prompt proíbe afirmar ausência/presença divergente do valor literal. Corrige relato falso de 'sem Plano de Turismo' para Barretos quando o valor preenchido é 1 (possui)."
    ]
  },
  {
    version: "1.61.0",
    date: "2026-06-01",
    type: "minor" as const,
    changes: [
      "Observatório — Métricas de declínio desejado: `empregos_desligados` marcado com `higher_is_better=false` e adicionadas 4 novas métricas (sazonalidade Gini, reclamações de turistas, cancelamentos de reservas, incidentes de segurança turística) já configuradas para disparar alerta de regressão quando o valor SOBE. A função `detect_observatory_regression` (existente) honra a flag automaticamente.",
      "Observatório — Notificação por e-mail para alertas críticos: nova edge function `notify-observatory-alert` envia template transacional `observatory-critical-alert` para ORG_ADMINs da org + ADMINs globais quando um alerta `severity=critical` é detectado. Idempotente via colunas `email_sent_at` / `email_recipients_count` em `observatory_alerts`. Disparo automático do client via `RegressionAlertsPanel`.",
      "Observatório — Export CSV (separador `;`, BOM UTF-8 para Excel BR) e Export PDF (via motor de impressão do navegador) acessíveis no header da página `/observatorio` para todos os usuários autenticados.",
      "Observatório — Gráfico de série temporal por indicador: novo `MetricHistoryDialog` (Recharts) acessível pelo ícone de gráfico ao lado de cada métrica; mostra todos os anos/meses registrados para a org efetiva, respeitando `effectiveOrgId` (demo mode safe).",
    ],
  },
  {
    version: "1.60.6",
    date: "2026-06-01",
    type: "patch" as const,
    changes: [
      "Consórcios — Gating por plano pago aplicado. Novo prop `requirePaid` em `LicenseRoute` redireciona para `/assinatura` quando o plano efetivo não é Basic, Pro ou Enterprise (trial expirado ou usuário sem licença paga). Rotas `/consorcios` e `/consorcios/:id` agora envoltas em `LicenseRoute requirePaid` (além de `ERPRoute` + `ModuleRoute`), confirmando a regra: feature disponível em todos os planos pagos, indisponível em trial. ADMIN global continua passando por bypass canônico em `LicenseRoute`. Fecha a confirmação pendente do plano ERP Regional / Consórcios.",
    ],
  },
  {
    version: "1.60.5",
    date: "2026-06-01",
    type: "patch" as const,
    changes: [
      "Observatório — Alertas automáticos de regressão. Nova tabela `observatory_alerts` registra quedas (>10%) ou altas indevidas em métricas do Observatório, comparando cada medição com o período anterior (mês ou ano). Trigger `detect_observatory_regression` roda após cada INSERT/UPDATE em `observatory_measurements` e, com base no novo flag `higher_is_better` do catálogo de métricas, classifica como `warning` (>10%) ou `critical` (>25%). Quando o valor retorna ao normal, o alerta correspondente é removido automaticamente. Novo painel `RegressionAlertsPanel` aparece no topo de `/observatorio` para membros da org, permitindo marcar como lido ou dispensar (`is_read`, `is_dismissed`). RLS isola alertas por `effectiveOrgId`/`user_in_org`. Fecha o último item do roadmap do Observatório (backfill, observabilidade, CSV manual e agora alertas).",
    ],
  },
  {
    version: "1.60.4",
    date: "2026-06-01",
    type: "patch" as const,
    changes: [
      "Observatório — Importação manual por CSV para fontes sem API pública. Novo botão 'Importar CSV' no header de `/observatorio` (ADMIN/ORG_ADMIN) abre diálogo com parser client-side: aceita colunas `metric_code, reference_year, reference_month, value, source, notes`, valida cada linha contra o catálogo de métricas, mostra prévia com contagem de válidas vs. erros, e dispara upsert idempotente via `useUpsertMeasurement` (RLS-safe por `effectiveOrgId`). Suporta separador `,` ou `;`, números em formato BR (vírgula decimal) e mês vazio para medições anuais. Inclui botão 'Baixar modelo' com CSV exemplo. Cobre fontes FOHB (ocupação hoteleira), CGE/SECTUR estaduais e qualquer outra que não esteja na ingestão automática.",
    ],
  },
  {
    version: "1.60.3",
    date: "2026-06-01",
    type: "patch" as const,
    changes: [
      "Observatório — Backfill histórico e observabilidade da ingestão. (1) A função `ingest-observatory` agora itera sobre TODOS os anos disponíveis em `external_indicator_values` (não só o ano corrente), populando retroativamente o histórico do Observatório a cada execução. Fontes anuais (IGMA/Cadastur/CAGED/Tesouro) usam sentinela `reference_month=12` (snapshot ano-fim) para evitar colisão por NULL no UNIQUE constraint. (2) A função agora registra cada execução em `ingestion_runs` (running → success/partial/failed) com duração, registros processados e detalhes por métrica — disparos por cron (`triggered_by=cron`) e manuais (`triggered_by=admin`) ficam visíveis. (3) `ingest-observatory` adicionada ao RPC `get_ingestion_health` (cadência mensal, alerta após 40 dias sem rodar) e ao painel `/admin/ingestion-health` (Saúde das Ingestões Oficiais). Próxima execução do cron mensal já populará o histórico completo automaticamente.",
    ],
  },
  {
    version: "1.60.2",
    date: "2026-06-01",
    type: "patch" as const,
    changes: [
      "Observatório — Ampliação dos mapeamentos automáticos de ingestão. Corrigidos códigos IGMA reais (`igma_visitantes_internacionais`, `igma_visitantes_nacionais`) e adicionados novos mapeamentos: CAGED/RAIS via IGMA (`igma_empregos_turismo` → `empregos_formais`) e Tesouro/SEFAZ via IGMA (`igma_arrecadacao_turismo` → `receita_arrecadacao_iss`). Cada métrica preserva a fonte original no campo `source` para auditoria/provenance. O cron mensal e o botão manual no `/observatorio` agora populam automaticamente 5 métricas-chave do painel a partir das ingestões oficiais existentes.",
    ],
  },
  {
    version: "1.60.1",
    date: "2026-06-01",
    type: "patch" as const,
    changes: [
      "Observatório — Cron mensal funcional. Nova tabela privada `internal_cron_secrets` (sem acesso via Data API, somente service_role) guarda um token compartilhado. A função `ingest-observatory` agora aceita autenticação por (a) ADMIN/service_role via JWT (uso manual) OU (b) cabeçalho `x-cron-secret` igual ao valor armazenado em `internal_cron_secrets` (uso pelo cron). Job `ingest-observatory-monthly` agendado em `pg_cron` para rodar todo dia 1 às 06:00 UTC, lendo o token diretamente do banco. Testado em produção com retorno HTTP 200 e payload válido. `verify_jwt = false` adicionado em `supabase/config.toml` para a função, já que a autenticação é feita internamente.",
    ],
  },
  {
    version: "1.60.0",
    date: "2026-06-01",
    type: "minor" as const,
    changes: [
      "Observatório — Ingestão automática a partir das fontes oficiais já integradas. Nova edge function `ingest-observatory` deriva medições do Observatório (`observatory_measurements`) a partir de `external_indicator_values` populado pelas ingestões existentes (Cadastur, ANAC etc.), preservando provenance. Mapeamentos iniciais: Cadastur `OE001` (soma de leitos) → `ocupacao_leitos_disponiveis`; ANAC `igma_passageiros_internacionais` → `fluxo_visitantes_internacionais`; ANAC `igma_passageiros_nacionais` → `fluxo_visitantes_nacionais`. Upsert idempotente por (org, métrica, ano, mês). Novo botão 'Atualizar de fontes oficiais' no header de `/observatorio` (ADMIN/ORG_ADMIN). Função protegida via `requireAdminOrServiceRole` para permitir disparo manual e agendamento por cron quando configurado. Adicionada à allowlist de `trigger-ingestion`.",
    ],
  },
  {
    version: "1.59.0",
    date: "2026-06-01",
    type: "minor" as const,
    changes: [
      "Empacotamento ERP Modular — Gating real aplicado. Novo `OrgModulesProvider` (`src/contexts/OrgModulesContext.tsx`) carrega `org_module_overrides` da org efetiva e expõe `isModuleEnabled(key)`. Novo `ModuleRoute` (`src/components/layout/ModuleRoute.tsx`) bloqueia rotas com tela de 'Módulo não habilitado' quando o override está `false`. Aplicado em `/diagnosticos`, `/diagnosticos/:id`, `/projetos`, `/relatorios`, `/consorcios`, `/consorcios/:id` e `/observatorio`. Sidebar também esconde itens cujo módulo está desabilitado (campo `module` no NavItem). ADMIN global sempre passa, mantendo o bypass canônico. Default segue habilitado quando não há override — comportamento idêntico ao anterior para orgs sem configuração customizada.",
      "Consórcios no Dashboard — Novo card `MyConsortiaCard` (`src/components/consortia/MyConsortiaCard.tsx`) lista os consórcios em que o usuário/org participa, com link direto para o painel regional. Aparece apenas quando há ao menos 1 consórcio (RLS já filtra) e fica abaixo do bloco ERP Stats no Dashboard.",
      "Convites de Consórcio em /configuracoes — Novo painel `PendingConsortiumInvitesPanel` (`src/components/consortia/PendingConsortiumInvitesPanel.tsx`) exibido na aba Geral para `ORG_ADMIN`/`ADMIN`, com convites pendentes da própria organização e botões Aceitar/Recusar. Inclui aviso explícito sobre o impacto do consent (compartilhamento da pontuação por pilar com demais membros). Apenas convites com `accepted_at` e `declined_at` nulos.",
    ],
  },
  {
    version: "1.58.0",
    date: "2026-06-01",
    type: "minor" as const,
    changes: [
      "Observatório Turístico Permanente — Novo módulo separado do diagnóstico, focado em monitoramento contínuo do destino. Catálogo público de 15 métricas (`observatory_metrics`) organizadas em 5 categorias: Fluxo (visitantes totais, nacionais, internacionais, permanência média), Ocupação (taxa hoteleira, diária média, leitos), Eventos (realizados, participantes), Receita (turística total, ISS, gasto médio) e Empregos (formais, admissões, desligamentos). Tabela `observatory_measurements` armazena medições por organização com referência ano/mês (ou anual), valor, fonte e notas. Tabela `observatory_events` mantém calendário de eventos turísticos com público e receita estimada/realizada. RPC `get_observatory_summary(org_id, year)` agrega totais e médias por métrica. Página `/observatorio` (acesso ERP) exibe KPIs por categoria, lista de indicadores com botão de registro rápido por mês, e calendário de eventos com criação/exclusão. RLS: membros da org (via profiles.org_id) e ADMIN global. Produto recorrente anual conforme o roadmap comercial.",
    ],
  },
  {
    version: "1.57.0",
    date: "2026-06-01",
    type: "minor" as const,
    changes: [
      "Empacotamento ERP Modular — Nova tabela `org_module_overrides` permite habilitar/desabilitar módulos individuais do ERP por organização (diagnóstico, indicadores, cadastro, mapa de oportunidades, certificação, projetos, relatórios, consórcios, observatório, EDU). Função `org_has_module(org_id, module)` retorna se o módulo está disponível para a org — override explícito tem precedência sobre o padrão (habilitado). Painel admin em `/admin/empacotamento` permite ao ADMIN configurar pacotes customizados por contrato (ex: ICP A só com diagnóstico). Hook `useOrgHasModule` disponível para integração futura nas rotas/UI. RLS: membros da org veem suas configurações; somente ADMIN altera.",
    ],
  },
  {
    version: "1.56.0",
    date: "2026-06-01",
    type: "minor" as const,
    changes: [
      "Certificação Institucional do Destino (Selo SISTUR) — Novo sistema de selo oficial para destinos turísticos com quatro níveis: Bronze, Prata, Ouro e Diamante. Cada nível tem pontuação mínima geral e por pilar (RA/OE/AO) e validade configurável (12 a 36 meses). Inclui: tabela `destination_certification_levels` com critérios, tabela `destination_certifications` com snapshot das pontuações no momento da emissão, código público de verificação único por certificado, status (ativo/expirado/revogado/suspenso) e motivo de revogação. Avaliação automática de elegibilidade via RPC `evaluate_destination_certification_eligibility` que retorna o maior nível compatível com o diagnóstico mais recente. Página pública `/verificar-certificado/:code` permite a qualquer pessoa validar a autenticidade do selo. Painel admin em `/admin/certificacoes` para emissão e revogação por ADMIN global. RLS: membros da org veem seus certificados; somente ADMIN emite/revoga.",
    ],
  },
  {
    version: "1.55.0",
    date: "2026-06-01",
    type: "minor" as const,
    changes: [
      "ERP Regional / Consórcios (MVP) — Nova entidade para agrupar municípios em consórcios ou regiões turísticas. Inclui: criação por ORG_ADMIN do município-líder, convite e aceite formal de cada município (consent explícito antes de compartilhar diagnóstico), painel comparativo privado por pilar (RA/OE/AO) entre os membros aceitos, gestão de membros e tabelas `consortia`, `consortium_members`, `consortium_user_roles` com RLS. Acessível em `/consorcios`. A comparação é restrita aos membros do próprio consórcio — sem ranking público, alinhado à constraint de privacidade.",
    ],
  },
  {
    version: "1.54.1",
    date: "2026-05-28",
    type: "patch" as const,
    changes: [
      "Relatórios — Retomada de geração: cada pilar (RA/OE/AO) concluído é persistido em `report_jobs.partial_pillars` assim que a IA termina. Em caso de falha por timeout do provedor ou do worker, o retry automático reaproveita os pilares já gerados e refaz só o que faltou — antes, toda falha reiniciava do zero. Pipeline já era paralelo na Fase 1; agora ficou também resiliente entre tentativas.",
      "Relatórios — Mensagem do watcher: falhas transitórias (auto-cleanup, idle/hard timeout, 504/gateway) agora aparecem como aviso (\"demorou mais que o esperado, tente novamente em alguns minutos — os trechos já gerados serão reaproveitados\") em vez de erro genérico.",
    ],
  },
  {
    version: "1.54.0",
    date: "2026-05-18",
    type: "minor" as const,
    changes: [
      "Segurança — Auditoria completa de scan: (a) 18 edge functions agora exigem JWT, papel ADMIN ou service_role conforme o caso (beni-chat, elevenlabs-tts, moderate-image, moderate-kb-upload, generate-project-structure, calculate-assessment, fetch-official-data, process-report-job, ingest-* x6, run-health-check, cleanup-exam-tracking, sync-test-registry) via novo helper `supabase/functions/_shared/auth.ts`. (b) `report_jobs`: SELECT restrito ao criador/ADMIN/ORG_ADMIN e coluna `auth_jwt` revogada de `authenticated`/`anon`. (c) `mapa_turismo_sync_log`: INSERT só para ADMIN/service_role. (d) `assessment_indicator_audit`: INSERT só para service_role (fim do `WITH CHECK true` em public). (e) Storage `forum-attachments`: INSERT/UPDATE limitados à pasta do próprio usuário. (f) Relatórios: HTML gerado por IA agora é sanitizado com DOMPurify (allowlist mínima) antes do `dangerouslySetInnerHTML`, neutralizando XSS armazenado.",
    ],
  },
  {
    version: "1.53.5",
    date: "2026-05-16",
    type: "patch" as const,
    changes: [
      "SEO — Conectado Google Search Console ao domínio publicado (sistur.lovable.app). Meta tag de verificação adicionada ao index.html.",
    ],
  },
  {
    version: "1.53.4",
    date: "2026-05-05",
    type: "patch" as const,
    changes: [
      "Indicadores — Corrigido loop da notificação 'Diagnóstico atualizado com sucesso!' ao salvar todos os valores. O efeito que promove DRAFT → DATA_READY no `DataImportPanel` tinha o objeto `updateAssessment` no array de dependências; após o sucesso, o React Query invalidava a lista de assessments, o objeto era reinstanciado e o efeito disparava de novo antes de o cache refletir o novo status, gerando toasts em cadeia. Agora a promoção é guardada por uma ref por assessment (executa uma única vez) e as deps foram reduzidas a `selectedAssessmentData?.status`.",
    ],
  },
  {
    version: "1.53.3",
    date: "2026-05-05",
    type: "patch" as const,
    changes: [
      "Validação de Dados Oficiais — Corrigido caso em que o status seguia como 'Aguardando revisão' mesmo após o usuário clicar em validar. A política RLS de `external_indicator_values` exigia que o registro pertencesse à organização do usuário; quando ADMIN/ANALYST estava no Modo Demo, os registros eram da org demo e o UPDATE afetava 0 linhas silenciosamente (sem erro). Agora a regra autoriza tanto `user_belongs_to_org` quanto `org_id = get_effective_org_id()`. Adicionalmente, o hook `useValidateIndicatorValues` agora detecta updates bloqueados por RLS (0 linhas) e exibe erro explícito em vez de aparentar sucesso.",
    ],
  },
  {
    version: "1.53.2",
    date: "2026-05-05",
    type: "patch" as const,
    changes: [
      "Diagnósticos — Corrigido erro 'Validação salva com falha parcial: alguns indicadores não puderam ser pré-preenchidos' que ocorria quando ADMIN/ANALYST estava com Modo Demo ativado e tentava salvar valores em um diagnóstico da sua organização real. As políticas RLS de INSERT/UPDATE/DELETE em `indicator_values` agora autorizam por `user_belongs_to_org(auth.uid(), org_id)` em vez de exigir `org_id = get_effective_org_id()`, permitindo gravar nos dados reais da org mesmo enquanto se navega no dataset demo. Leitura dos dados demo continua isolada via SELECT por `get_effective_org_id()`.",
    ],
  },
  {
    version: "1.53.0",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "Indicadores — Normalização global dos pesos por pilar para totalizar 100% mantendo proporções relativas. Antes: RA 232%, OE 220%, AO 164%. Depois: RA/OE/AO ≈ 100% cada. Como o engine `calculate-assessment` já usa média ponderada normalizada `Σ(score×peso)/Σ(pesos)`, scores históricos não mudam (snapshots preservados). Diagnósticos existentes ficam marcados `needs_recalculation` pelo trigger; ao recalcular, o resultado é matematicamente idêntico ao anterior (apenas alinhamento à convenção da UI).",
      "Performance — Ícones `lucide-react` agora são agrupados em um único chunk `vendor-icons`, eliminando ~80 micro-requests (~1KB cada) que inflavam a Network Dependency Tree do Lighthouse.",
      "Performance — Desativada a geração automática de `<link rel=\"modulepreload\">` (Vite `modulePreload: false`). Antes, ~400KB de chunks de rotas lazy (FileSaver, BarChart/recharts, Configuracoes, Subscription etc.) eram pré-carregados na inicialização mesmo quando o usuário não visitava aquelas rotas. Os chunks continuam sendo baixados sob demanda via `React.lazy()`. Sem mudança de UX.",
    ],
  },
  {
    version: "1.52.4",
    date: "2026-05-03",
    type: "patch" as const,
    changes: [
      "Performance — Desativada a geração automática de `<link rel=\"modulepreload\">` no build (Vite `modulePreload: false`). Antes, ~400KB de chunks de rotas lazy (FileSaver, BarChart/recharts, Configuracoes, Subscription etc.) eram pré-carregados na inicialização mesmo quando o usuário não visitava aquelas rotas, gerando o aviso 'Unused JavaScript' do Lighthouse. Os chunks continuam sendo baixados sob demanda quando a rota é visitada via `React.lazy()`. Sem mudança de UX.",
    ],
  },
  {
    version: "1.52.3",
    date: "2026-05-03",
    type: "patch" as const,
    changes: [
      "Performance — Build agora agrupa todos os ícones `lucide-react` em um único chunk `vendor-icons`, eliminando ~80 micro-requests (~1KB cada) que inflavam a árvore de dependências de rede e degradavam a métrica de Network Dependency Tree do Lighthouse. Sem mudanças visuais ou de UX.",
    ],
  },
  {
    version: "1.52.2",
    date: "2026-05-03",
    type: "patch" as const,
    changes: [
      "Indicadores — Normalização global dos pesos por pilar para totalizar 100% mantendo proporções. Antes: RA 232%, OE 220%, AO 164%. Depois: RA/OE/AO ≈ 100% cada. Como o engine `calculate-assessment` já usa média ponderada normalizada `Σ(score×peso)/Σ(pesos)`, scores históricos não mudam (snapshots preservados). Diagnósticos existentes ficam marcados `needs_recalculation` pelo trigger; ao recalcular, o resultado é matematicamente idêntico ao anterior (apenas alinhamento à convenção da UI).",
    ],
  },
  {
    version: "1.52.1",
    date: "2026-05-03",
    type: "patch" as const,
    changes: [
      "Mensagens — `list_message_contacts` agora também inclui membros aprovados da mesma organização (além das turmas), permitindo que professores, administradores e usuários sem turma iniciem conversas. Continuam excluídos: contas pendentes e organizações padrão Autônomo/Temporário.",
    ],
  },
  {
    version: "1.52.0",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "Calendário Acadêmico — Professores podem agendar eventos por turma (aula, prova, prazo, reunião, live, evento) com horário de início/fim, local, link e alarme configurável (no horário, 15min, 30min, 1h, 2h ou 1 dia antes). Nova tabela `classroom_calendar_events` com RLS: professor gerencia os eventos das suas turmas e alunos matriculados visualizam. Trigger `notify_classroom_event_students` envia notificação automática a todos os alunos da turma assim que o evento é criado.",
      "Mensagens — Adicionada lista de contatos para iniciar novas conversas. Botão 'Nova mensagem' abre um diretório com todos os professores e colegas das turmas em que o usuário participa (alunos) ou todos os alunos das turmas que leciona (professores), via RPC `list_message_contacts`.",
    ],
  },
  {
    version: "1.51.1",
    date: "2026-05-03",
    type: "patch" as const,
    changes: [
      "Sidebar — Consolidação do menu Educação em 4 hubs (Minha Jornada, Aprender, Avaliações, Turmas & Mensagens) e do bottom nav (FAQ + Tutorial + Metodologia → Ajuda). Cada hub agora exibe uma sub-navegação por abas no topo da página, mantendo todas as rotas existentes intactas. Mensagens volta a ficar visível sem rolagem.",
    ],
  },
  {
    version: "1.51.0",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "Discussões — Comentários com menções @ em diagnósticos e relatórios. Nova tabela `discussion_comments` (polimórfica via `entity_type`/`entity_id`), com RLS que só permite ler/escrever a membros aprovados (`pending_approval = false`) da mesma organização do conteúdo. Usuários das organizações padrão `Autônomo` e `Temporário`, bem como contas pendentes, ficam impedidos via função `can_comment_on_org`.",
      "Discussões — Menções: novo RPC `list_mentionable_members` (somente membros elegíveis da org). Trigger `notify_comment_mentions` cria notificação in-app (`edu_notifications`, tipo `comment_mention`) com link direto para o diagnóstico (`/diagnosticos/:id`) ou relatório (`/relatorios?reportId=...`).",
      "UI — Nova aba 'Comentários' em `/diagnosticos/:id` e bloco de comentários abaixo do relatório selecionado em `/relatorios`, ambos usando o componente reutilizável `CommentsPanel` com autocomplete de @menção."
    ]
  },
  {
    version: "1.50.0",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "EDU — Visão Geral do Professor: nova aba padrão em `/professor` (`ProfessorOverviewPanel`) consolida métricas agregadas de todas as turmas do professor — total de alunos, XP médio, streaks ativos, alunos em risco (sem atividade há 7+ dias), nota média em provas e taxa de conclusão. Lê via novo RPC `get_professor_classroom_overview` (SECURITY DEFINER, restrito ao próprio professor ou ADMIN).",
      "ADMIN — Ranking de Turmas: nova aba 'Ranking de Turmas' em `/admin/edu` (`OrgClassroomRankingPanel`) lista todas as turmas ativas da organização ordenadas por XP médio, com pódio (1º–3º destacados) e métricas comparativas (alunos, streaks, em risco, conclusão, nota média). Lê via novo RPC `get_org_classroom_ranking` (SECURITY DEFINER, restrito a ADMIN/ORG_ADMIN)."
    ]
  },
  {
    version: "1.49.0",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "EDU — Missões diárias: nova tabela `edu_daily_missions` (RLS por aluno) com 3 desafios rotativos por dia sorteados deterministicamente a partir de `user_id + data` a partir de um catálogo fixo (`MISSION_CATALOG` em `src/hooks/useDailyMissions.ts`). Helper `progressDailyMissions(source)` é chamado em fire-and-forget pelo `awardXP` e avança automaticamente as missões compatíveis com a fonte do XP (módulo, curso, prova, badge). Ao concluir, missão paga XP bônus uma única vez (`bonus_awarded`). Painel `DailyMissionsPanel` adicionado ao topo de `/edu/conquistas`.",
      "EDU — Dashboard admin de Gamificação: nova aba 'Gamificação' em `/admin/edu` (`GamificationAdminDashboard`) consolida totais (alunos com XP, badges concedidas, missões 7d), gráfico de missões diárias concluídas nos últimos 7 dias, ranking Top 10 de XP (com nível e streak) e ranking de badges mais conquistadas. Lê de `edu_user_xp`, `edu_user_badges`, `edu_badges`, `edu_daily_missions` e `profiles`."
    ]
  },
  {
    version: "1.48.0",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "EDU — Streak diário agora é incrementado automaticamente em `awardXP` (campos `current_streak`, `longest_streak`, `last_activity_date` em `edu_user_xp`). Sequência reinicia se o aluno passar mais de um dia sem ganhar XP. Já era exibido em `/edu/conquistas`; agora atualiza em tempo real.",
      "EDU — Recompensas desbloqueáveis: nova tabela `edu_rewards` (avatares e temas) e página `/edu/recompensas` (`EduRecompensas`) com catálogo gating por nível. Aluno pode equipar avatar/tema; preferência salva em `edu_user_xp.equipped_avatar` / `equipped_theme`. Seed com 6 avatares e 4 temas.",
      "EDU — Compartilhamento social de conquistas: utilitário `shareAchievementImage` gera imagem 1080×1080 (canvas) com nível ou badge e dispara Web Share API (com fallback para download). Botões em `/edu/conquistas` para compartilhar progresso geral e cada badge conquistada.",
      "EDU — Notificações por email em marcos: novos templates transacionais `edu-level-up` e `edu-badge-earned` enviados automaticamente quando aluno sobe de nível ou conquista uma badge (idempotência por nível/badge para evitar duplicatas)."
    ]
  },
  {
    version: "1.47.0",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "EDU — Painel admin de Badges: nova aba 'Badges' em `/admin/edu` (`BadgesAdminPanel`) permite criar, editar e remover badges customizadas (código, título, descrição, critério, ícone, XP de recompensa, ativa/inativa). Cache de catálogo invalidado automaticamente para refletir nas páginas dos alunos. Novas badges criadas pelo admin podem ser concedidas via `autoClaimBadge(code)` em qualquer fluxo futuro.",
      "EDU — Histórico mensal de XP em `/edu/conquistas`: novo gráfico de barras (Recharts) mostra XP ganho por mês nos últimos 6 meses, calculado a partir de `edu_xp_events`. Permite ao aluno visualizar progresso e identificar períodos de maior engajamento."
    ]
  },
  {
    version: "1.46.0",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "EDU — Placar semanal opt-in da turma: nova flag `leaderboard_opt_in` em `classroom_students` (padrão desligado, privacy-first). RPC `get_classroom_weekly_leaderboard` retorna ranking de XP dos últimos 7 dias somando apenas alunos que optaram por participar; acesso liberado ao professor dono, ADMIN e alunos opt-in da turma. Componente `ClassroomLeaderboardPanel` com switch de opt-in para o aluno, exibido em `/edu/turmas` (visão aluno) e em cada sala no `/professor/dashboard` (visão professor, sem switch).",
      "EDU — Notificação automática de badge: trigger `notify_badge_earned` em `edu_user_badges` cria notificação in-app (`edu_notifications`) com link para `/edu/conquistas` sempre que uma badge é concedida (manual ou via auto-claim). Aluno é avisado sem precisar atualizar a página."
    ]
  },
  {
    version: "1.45.0",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "EDU — Auto-claim de badges: ao concluir o primeiro módulo de treinamento o aluno recebe `first_course`; ao se matricular em uma trilha adaptativa recebe `path_starter`; ao concluir 100% das etapas obrigatórias recebe `path_finisher`; ao tirar 100% em uma prova recebe `exam_ace`. Helper `autoClaimBadge` (`src/lib/autoClaimBadge.ts`) é idempotente, integrado em `useEnrollInPath`, `useUpdateStepProgress` (trilhas), `submitExam` (provas) e `useProgressMutations.upsertProgress` (módulos). Cada badge concedida soma seu XP de recompensa via `awardXP(source: 'badge_earned')`.",
      "EDU — Calendário Acadêmico unificado: nova página `/edu/calendario` (`EduCalendario`) consolida lives futuras, prazos de atribuições de turma e exames dos próximos 90 dias, agrupados por dia. Botão 'Exportar .ics' gera arquivo iCalendar (RFC 5545) compatível com Google Calendar, Outlook e Apple Calendar via helper `src/lib/icsExport.ts`. Item 'Calendário Acadêmico' adicionado à sidebar de Educação."
    ]
  },
  {
    version: "1.44.0",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "EDU — Gamificação automática: conclusão de módulo de treinamento, etapa de Trilha Adaptativa e prova aprovada agora concedem XP e atualizam nível do aluno automaticamente. Quando todas as etapas obrigatórias de uma trilha são concluídas, a matrícula é fechada (`status = concluida`) e o aluno recebe bônus de 150 XP. Helper `awardXP` (`src/lib/awardXP.ts`) integrado em `useUpdateStepProgress` (trilhas), `submitExam` (provas) e `useProgressMutations.upsertProgress` (módulos). Valores: 25 XP por etapa, 50 XP por módulo, 75 XP por prova aprovada, 150 XP por trilha concluída.",
      "EDU — Painel de Analytics do Professor: nova aba 'Analytics' em `/professor/dashboard` (`ProfessorAnalyticsPanel`) consolida métricas de todas as turmas do professor — conclusão média, nota média, alunos ativos nos últimos 7 dias e contagem de alunos em risco por turma. Identificação automática de risco: alunos sem atividade há 14+ dias, conclusão de atividades abaixo de 30% ou alertas de fraude pendentes. Tabela detalhada lista até 10 alunos em risco por turma com badge de conclusão, última atividade e flags de fraude."
    ]
  },
  {
    version: "1.43.0",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "EDU — Editor admin de Trilhas Adaptativas: nova aba 'Trilhas' em `/admin/edu` (`AdaptivePathEditor`) permite criar, editar (título, descrição, pilar, nível, adaptativa, publicada) e remover trilhas; gerenciar etapas com ordem, curso vinculado, gatilho por status do diagnóstico (Atenção/Crítico/any), nota mínima e flag opcional.",
      "EDU — Gamificação (fundação): novas tabelas `edu_xp_events`, `edu_badges` e `edu_user_badges` (RLS: aluno vê o seu, ADMIN vê tudo; catálogo público para autenticados; gestão restrita ao ADMIN). Seed de 5 badges iniciais (first_course, path_starter, path_finisher, exam_ace, week_streak). Hooks `useMyXP`, `useMyXPEvents`, `useBadges`, `useMyBadges`, `useAwardXP`, `useClaimBadge` com curva de nível `xp = round(100 * level^1.5)`.",
      "EDU — Nova página `/edu/conquistas` (`EduConquistas`) exibe nível atual, XP totais, progresso para o próximo nível, streak de estudo, catálogo completo de badges (conquistadas vs disponíveis com critério) e histórico dos últimos 50 eventos de XP. Item 'Minhas Conquistas' adicionado à sidebar de Educação."
    ]
  },
  {
    version: "1.42.0",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "EDU — Trilhas Adaptativas (fundação): novas tabelas `edu_learning_paths`, `edu_learning_path_steps`, `edu_learning_path_enrollments` e `edu_learning_path_progress` com RLS multi-tenant (autor/ADMIN gerenciam; alunos enxergam suas matrículas e trilhas publicadas). Suporte a pré-requisitos por etapa, nota mínima e gatilho por status do diagnóstico (Atenção/Crítico/any).",
      "EDU — Nova página `/edu/trilhas-adaptativas` (catálogo) e `/edu/trilhas-adaptativas/:id` (detalhe com matrícula, progresso por etapa, desbloqueio sequencial e atalho para o curso da etapa). Item 'Trilhas Adaptativas' adicionado à sidebar de Educação. Hooks `useAdaptivePaths`, `useAdaptivePath`, `useMyEnrollment`, `useEnrollmentProgress`, `useEnrollInPath`, `useUpdateStepProgress`."
    ]
  },
  {
    version: "1.41.0",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "EDU — Anúncios da Turma: nova tabela `classroom_announcements` (título, corpo, fixado, autor) com RLS (professor dono e ADMIN gerenciam; alunos matriculados visualizam). Novo `ClassroomAnnouncementsPanel` integrado ao detalhe da sala em `/professor/dashboard` (professor publica, fixa/desafixa e remove avisos).",
      "EDU — Minhas Turmas (visão do aluno): nova página `/edu/turmas` (`EduMinhasTurmas`) lista as turmas em que o aluno está matriculado e exibe os anúncios do professor selecionado. Item 'Minhas Turmas' adicionado à sidebar de Educação."
    ]
  },
  {
    version: "1.40.0",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "EDU — Mensageria 1:1 aluno↔instrutor: nova página `/edu/mensagens` (`EduMensagens`) com lista de conversas (busca, contagem de não lidas, prévia da última mensagem) e thread de mensagens (envio com Enter, marcação automática como lida ao abrir). Integra a tabela `edu_messages`. Hooks `useConversations`, `useConversationMessages`, `useSendMessage`, `useUnreadMessageCount`. Atalho 'Falar com instrutor' adicionado no detalhe do treinamento (quando o usuário não é o próprio instrutor) e item 'Mensagens' na sidebar de Educação."
    ]
  },
  {
    version: "1.39.1",
    date: "2026-05-03",
    type: "patch" as const,
    changes: [
      "(Reagrupado em 1.40.0)"
    ]
  },
  {
    version: "1.39.0",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "EDU — Consolidação do LMS como sistema educacional completo. Bump MINOR agrupando as novas capacidades entregues nesta linha (anteriormente registradas como patch):",
      "• Plano de Ensino formal por curso (ementa, competências, habilidades, carga horária teórica/prática, metodologia, critérios de avaliação, bibliografia básica/complementar, pré-requisitos) com `SyllabusPanel` no detalhe do treinamento e `SyllabusEditor` no painel administrativo.",
      "• Histórico Escolar / Boletim do aluno em `/edu/boletim` com cursos cursados, status, progresso, melhor nota, tentativas, certificados, carga horária total e média ponderada (RPC `get_student_transcript`).",
      "• Diário de Classe consolidado (`ClassroomDiaryPanel`) no detalhe da sala em `/professor/dashboard`: presença, tempo ativo, atividades concluídas, melhor nota e alertas de fraude por aluno; KPIs e exportação CSV (Excel-BR). RPC `get_classroom_diary`.",
      "• Rubricas de avaliação para questões dissertativas: coluna `rubric` (jsonb) em `quiz_questions`, `RubricEditor` no banco de questões, exibição obrigatória ao corretor e opcional ao aluno antes da resposta.",
      "• Fórum de Dúvidas por curso (`CourseDiscussionsPanel`) com tópicos, respostas em thread, badge de Instrutor e marcação de resposta aceita (fecha como `resolved`). Tabelas `course_discussions` e `course_discussion_replies` com RLS e trigger automático de `reply_count`.",
      "• Fundação para mensageria 1:1 aluno↔professor: tabela `edu_messages` criada com RLS (UI dedicada será entregue na próxima minor)."
    ]
  },
  {
    version: "1.38.77",
    date: "2026-05-03",
    type: "patch" as const,
    changes: [
      "EDU — Fórum de Dúvidas por curso: novo painel `CourseDiscussionsPanel` exibido no detalhe de cada treinamento (`/edu/treinamentos/:id`). Alunos abrem tópicos com título e descrição; instrutores e demais alunos respondem em thread; autor do tópico (ou instrutor/admin) marca uma resposta como ‘aceita’, fechando a dúvida (`status = resolved`). Respostas de instrutor recebem badge `Instrutor`. Novas tabelas `course_discussions` e `course_discussion_replies` com RLS (visível a autenticados, edição/exclusão restrita ao autor/instrutor/ADMIN) e trigger automático de `reply_count`. Também criada `edu_messages` para mensageria 1:1 aluno↔professor (UI dedicada virá no próximo módulo)."
    ]
  },
  {
    version: "1.38.76",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "EDU — Rubricas de avaliação para questões dissertativas. Nova coluna `rubric` (jsonb) em `quiz_questions` com estrutura `{ criteria: [{ name, max_points, descriptors[] }], total_max_points, visible_to_student }`. No banco de questões (`QuestionBankPanel`), ao escolher tipo 'Dissertativa' aparece o `RubricEditor` permitindo definir critérios, pontos e descritores por nível, com toggle de visibilidade ao aluno. O `EssayGradingPanel` exibe a rubrica completa ao corretor (sempre visível). Em `ExamTaking`, o aluno vê os critérios antes de responder quando `visible_to_student` está ativo, eliminando ambiguidade na nota."
    ]
  },
  {
    version: "1.38.75",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "EDU — Diário de Classe consolidado: novo painel `ClassroomDiaryPanel` exibido no detalhe de cada sala (`/professor/dashboard` → Salas → abrir sala). Mostra por aluno: presença (sessões e dias com heartbeat), tempo ativo, atividades concluídas vs atribuídas, melhor nota em provas e alertas de fraude pendentes. KPIs no topo (alunos, ativos 7d, conclusão média, nota média, alertas) e exportação CSV (UTF-8 com BOM, separador `;` p/ Excel-BR). Função RPC `get_classroom_diary(p_classroom_id)` (SECURITY DEFINER) restrita ao professor dono da sala, ADMIN ou ORG_ADMIN — agrega `edu_learning_sessions`, `assignment_progress`, `exam_attempts` e `edu_fraud_flags`."
    ]
  },
  {
    version: "1.38.74",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "EDU — Editor de Plano de Ensino no painel administrativo (`/admin/edu`). Novo componente `SyllabusEditor` adicionado ao dialog de criação/edição de treinamento permite preencher sem SQL: ementa, carga horária teórica/prática, competências, habilidades, pré-requisitos, metodologia, critérios de avaliação e bibliografia básica/complementar (autor/título/ano/link). Os campos são persistidos em `edu_trainings` e renderizados pelo `SyllabusPanel` na página do curso. Hook `useEduAdmin` atualizado (`TrainingFormData` + insert/update mapeando os novos campos)."
    ]
  },
  {
    version: "1.38.73",
    date: "2026-05-03",
    type: "minor" as const,
    changes: [
      "EDU — Plano de Ensino formal nos cursos: novos campos em `edu_trainings` (ementa, competências, habilidades, carga horária teórica/prática, bibliografia básica/complementar, metodologia, critérios de avaliação, pré-requisitos). Renderizado via novo `SyllabusPanel` na página do treinamento.",
      "EDU — Histórico Escolar (boletim): nova página `/edu/boletim` consolida cursos cursados, status, progresso, melhor nota, tentativas e certificados, com KPIs de carga horária total e média ponderada. Função RPC `get_student_transcript` (SECURITY DEFINER) com permissão para o próprio aluno e para ADMIN/ORG_ADMIN/PROFESSOR.",
      "Sidebar — Item 'Histórico Escolar' adicionado na seção Educação."
    ]
  },
  {
    version: "1.38.72",
    date: "2026-05-03",
    type: "patch" as const,
    changes: [
      "Relatórios — Conferência de dados ganhou botão 'Autofix' no Alert e dentro do Dialog 'Ver detalhes'. Ao clicar, o sistema aplica em lote o valor oficial sugerido para cada divergência diretamente em `indicator_values` (upsert por `assessment_id+indicator_id`, fonte 'Autofix — Conferência de dados'), pulando itens cujo valor sugerido não é numérico. Após o autofix basta recalcular o diagnóstico e regenerar o relatório."
    ]
  },
  {
    version: "1.38.71",
    date: "2026-05-03",
    type: "patch" as const,
    changes: [
      "Relatórios — Conferência de dados ganhou ações de correção. No Dialog 'Ver detalhes', cada divergência listada agora oferece dois botões: 'Editar no relatório' (abre editor de markdown do relatório atual e salva direto em `generated_reports.report_content`, refletindo em DOCX/PDF/cópia) e 'Corrigir indicador' (atualiza o valor oficial em `indicator_values` para o indicador citado, com pré-carregamento do valor atual e campo de fonte). Também há um botão 'Editar relatório' direto no Alert. Permissão: dono do relatório (`created_by = auth.uid()`) ou ADMIN — controlado por nova policy de UPDATE em `generated_reports` e auditado em colunas `edited_at`/`edited_by`."
    ]
  },
  {
    version: "1.38.70",
    date: "2026-05-02",
    type: "patch" as const,
    changes: [
      "Navegação — item 'Ingestões' removido da sidebar. O painel de Saúde das Ingestões Oficiais (CADASTUR, ANA, TSE, ANATEL, Mapa do Turismo) foi movido para Configurações → aba Ferramentas (visível apenas para ADMIN), reduzindo poluição do menu lateral. A rota `/admin/ingestoes` continua funcional para links existentes."
    ]
  },
  {
    version: "1.38.69",
    date: "2026-05-02",
    type: "patch" as const,
    changes: [
      "Relatórios — housekeeping automático de jobs travados. Nova função `cleanup_stuck_report_jobs()` (SECURITY DEFINER) marca como 'failed' qualquer job em status 'processing' cujo `last_attempt_at` esteja há mais de 15 minutos sem progresso, anexando mensagem `[auto-cleanup]` ao `error_message` e preenchendo `finished_at`. Agendada via `pg_cron` para rodar a cada 5 minutos (job `cleanup-stuck-report-jobs`). EXECUTE revogado de PUBLIC/anon/authenticated — só roda via cron ou superuser. Resolve o caso do usuário em que o worker era morto pelo proxy a meio do estágio 'Validando coerência com agente IA' e o job ficava preso indefinidamente, deixando a UI em 'Gerando...' eterno sem opção de retry."
    ]
  },
  {
    version: "1.38.68",
    date: "2026-05-02",
    type: "patch" as const,
    changes: [
      "Documentação — auditoria das páginas Metodologia e FAQ contra as últimas evoluções do motor de relatórios IA (v1.38.51 a v1.38.67) revelou lacunas significativas: nenhuma das duas páginas mencionava providers de IA, fila assíncrona, pipeline em 2 fases por pilar, pré-visualização ao vivo, painel de logs administrativo nem badge de modelo no histórico. Atualizações: (1) FAQ ganha 5 novas perguntas no módulo ERP cobrindo 'Qual modelo de IA gera os relatórios', 'Por que a geração roda em segundo plano', 'O que é a pré-visualização ao vivo', 'Como funciona a validação cruzada' e 'Onde acompanho problemas na geração' (com link para /admin/report-logs); (2) FAQ ganha pergunta geral de troubleshooting 'O sistema fica em Carregando...' explicando hard refresh, limpar cache e mencionando o fix da v1.38.67; (3) Metodologia → seção 'Tipos de Relatório' ganha 4 subseções novas: 'Pipeline de geração — providers, fila e streaming' (descreve ordem Claude → GPT-5 → Gemini, fallback global, fase 1 paralela por pilar + fase 2 envelope, calibração dinâmica de max_tokens para Claude, fila report_jobs + worker process-report-job, useReportJobWatcher global) e 'Observabilidade e auditoria' (descreve report_generation_logs com schema completo, painel /admin/report-logs com bloco Pipeline Claude Tempo Real, e campos ai_provider/ai_model em generated_reports). README e CLAUDE.md não exigiram ajuste — README é template padrão Lovable e CLAUDE.md já reflete a arquitetura corretamente."
    ]
  },
  {
    version: "1.38.67",
    date: "2026-05-02",
    type: "patch" as const,
    changes: [
      "Correção crítica de carregamento — após o splash o app ficava preso em 'Carregando...' indefinidamente em rotas protegidas quando o usuário ainda não tinha sessão ativa. Causa raiz: o `useEffect` do `ProfileContext` só disparava `fetchProfile()` quando `user?.id !== lastUserId.current`. No primeiro render com `user = null` e `lastUserId.current = null`, ambos eram iguais, `fetchProfile` nunca rodava, `initialized` permanecia `false`, e os guards (`ProtectedRoute`, `LicenseRoute`, `AdminRoute`) continuavam mostrando o loader 'Carregando...' / 'Verificando licença...' eternamente em vez de redirecionar para `/auth`. Correção: o efeito agora também dispara quando `initialized === false`, garantindo que o estado deslogado seja inicializado corretamente e os guards possam decidir o redirecionamento."
    ]
  },
  {
    version: "1.38.66",
    date: "2026-05-02",
    type: "patch" as const,
    changes: [
      "Relatórios — histórico: badge de provedor IA agora aparece SEMPRE para admins, mesmo quando o relatório não tem `ai_provider`/`ai_model` registrados (relatórios gerados antes da v1.38.62, que introduziu a persistência dessas colunas). Nesses casos exibe 'IA n/d' com tooltip explicativo ('Provedor não registrado (relatório anterior à v1.38.62)'), em vez de simplesmente esconder a tag — comportamento anterior dava impressão de bug, pois admins viam relatórios sem nenhum indicativo de modelo. Relatórios novos continuam exibindo Claude/GPT-5/Gemini normalmente. Sem mudança de schema, edge function ou backend — alteração apenas em `Relatorios.tsx` (`getProviderLabel` retorna 'IA n/d' quando ambos NULL e a renderização da badge perdeu o guard `&&`)."
    ]
  },
  {
    version: "1.38.65",
    date: "2026-05-02",
    type: "patch" as const,
    changes: [
      "Relatórios — pré-visualização ao vivo do relatório enquanto Claude (e qualquer provider que use o pipeline paralelo de pilares) ainda está escrevendo. Antes, o card 'Plano de Desenvolvimento' mostrava só um spinner com tempo decorrido até o relatório inteiro ficar pronto (3–7 min em diagnósticos completos), e o usuário ficava sem saber se algo estava progredindo. Mudanças: (1) nova coluna `partial_content text` em `report_jobs` (migração) atua como buffer transitório; (2) a edge function `generate-report`, em `runTwoPhasePipeline.onSectionReady`, além de emitir SSE pro stream síncrono, agora também faz fire-and-forget UPDATE em `report_jobs.partial_content` com o markdown acumulado a cada seção concluída (RA → OE → AO → envelope). Quando o relatório final é persistido em `generated_reports`, a coluna é zerada (`partial_content: null`) junto com o `status: 'completed'`; (3) no front (`Relatorios.tsx`), o polling de jobs agora seleciona também `partial_content` e mantém um estado `livePartial` que cresce conforme novas seções aparecem (nunca encolhe). O card de geração ganhou uma barra de progresso fina ligada a `progress_pct`, badge animada 'Pré-visualização ao vivo' (com dot pulsante) e troca o spinner solitário pelo markdown parcial renderizado em tempo real. Quando o job completa, troca-se naturalmente para o `report_content` definitivo carregado de `generated_reports`, evitando flicker. PDF e DOCX continuam disponíveis apenas após o relatório final estar persistido (a renderização parcial é só visual — não exporta versões inacabadas). GPT-5 e Gemini também se beneficiam do live preview quando o pipeline paralelo é usado; em fallback monolítico, o card mostra apenas a barra de progresso até o conteúdo final chegar."
    ]
  },
  {
    version: "1.38.64",
    date: "2026-05-02",
    type: "patch" as const,
    changes: [
      "Painel `Logs do Gerador de Relatórios` — novo bloco 'Pipeline Claude — Tempo Real' no topo, exibido quando o filtro de provider é Claude (default) ou Todos. Agrupa os eventos da execução mais recente do Claude por trace_id e mapeia para 4 fases visíveis: Pilares (RA · OE · AO), Envelope, Validação (determinística + IA) e Persistência. Cada cartão mostra status (aguardando/em execução/concluído/erro), último stage emitido pela edge function (`phase1_pillars_start`, `claude_budget_pillar`, `phase2_envelope_done`, `validation_agent_done`, `persist_inserted`, `stream_closed_ok`, etc.) e duração calculada a partir dos timestamps. Barra geral de progresso (n/4 etapas) muda para vermelha em caso de erro e marca 'sem novos eventos' quando o último evento tem >120s sem progresso (sinal típico de stall do stream). Atualização automática a cada 15s acompanha o refetch do painel."
    ]
  },
  {
    version: "1.38.63",
    date: "2026-05-02",
    type: "patch" as const,
    changes: [
      "Relatórios — orçamento dinâmico de `max_tokens` e detecção de janela de contexto para Claude (Anthropic). Antes, todas as chamadas usavam um teto fixo: 16000 tokens no pipeline monolítico (executivo/investidor) e no envelope da pipeline 2-fases, e 8000 fixos por pilar — independente do tamanho real do diagnóstico. Em diagnósticos pequenos isso desperdiçava latência (Claude reservava saída longa que nunca usaria, prolongando o stream e expondo o proxy a idle timeout); em diagnósticos integrais com 100+ indicadores, o envelope às vezes era cortado no meio (resposta parcial). Nova função `pickClaudeBudget(phase, template, tier, indicatorCount, systemPrompt, userPrompt)` calcula o teto recomendado por chamada combinando: tier (essencial 0.55x, estratégico 0.78x, integral 1.0x), template (executivo 0.45x, investidor 0.55x, completo 1.0x), bônus por indicador (35tk/indicador, saturado em 80) e fase do pipeline (pillar=3.5k base, envelope=9k base, monolítico=7k base). O resultado é piso em 2.5k e teto absoluto em 16k. Também estima o tamanho do input (`chars/3.6` aproximação PT-BR + markdown) e, se input + output ameaçar a janela de 200k tokens do Claude Sonnet 4.5, reduz o output até o piso e marca `shouldTruncateInput` para alerta no log. Aplicado nas 3 chamadas Claude: streaming monolítico (executivo/investidor), 3 pillares paralelos (Phase 1) e envelope (Phase 2). Cada decisão emite um stage `claude_budget_*` no painel `Logs do Gerador de Relatórios` com a rationale completa, permitindo auditar o orçamento por trace. GPT-5 e Gemini não são afetados — eles têm comportamento de streaming e janelas diferentes que já cabem no fluxo atual."
    ],
  },
  {
    version: "1.38.62",
    date: "2026-05-02",
    type: "minor" as const,
    changes: [
      "Admin → novo painel `Logs do Gerador de Relatórios` em `/admin/report-logs` (acessível via botão na página de Logs de Auditoria). Mostra eventos e erros da edge function `generate-report` por provedor de IA — filtro padrão é Claude (Anthropic), com chips para GPT-5 e Gemini também. Tabela com nível (info/warn/error), stage, mensagem, trace, com busca livre, dialog de detalhes (metadata + duração + job/report id) e auto-refresh a 15s. Cards de KPI: total, erros, warns, providers selecionados e providers que falharam.",
      "Edge function `generate-report` — logger estruturado agora persiste todos os stages e erros na nova tabela `report_generation_logs` (RLS apenas ADMIN). Cada evento carrega `provider`, `model`, `trace_id`, `job_id`, `report_id`, `org_id`, `user_id`, `duration_ms` e `metadata`. Inserções são fire-and-forget para nunca bloquear o pipeline. Novos stages explícitos `provider_selected` e `provider_failed` cobrem cada tentativa de Claude / GPT-5 / Gemini, permitindo investigar exatamente por que e quando o fallback foi acionado."
    ],
  },
  {
    version: "1.38.61",
    date: "2026-05-02",
    type: "patch" as const,
    changes: [
      "Relatórios — histórico passa a registrar e exibir o provider/modelo de IA usado em cada geração. Novos campos `ai_provider` e `ai_model` em `generated_reports` são preenchidos pelo `generate-report` no momento da persistência (insert e update). No tile do histórico, um badge com ícone de sparkles mostra o nome curto (Claude, GPT-5, Gemini) e o modelo completo aparece no tooltip. O badge é visível APENAS para administradores (ADMIN), seguindo o mesmo padrão do seletor de provider exclusivo de admin já existente na geração."
    ],
  },
  {
    version: "1.38.60",
    date: "2026-05-02",
    type: "patch" as const,
    changes: [
      "Relatórios — correção da geração no provider Claude (Anthropic). No pipeline em 2 fases (template 'completo'), as 3 chamadas paralelas de pilar e a chamada de envelope eram feitas SEM streaming na API da Anthropic com `max_tokens` alto (8000–16000). Como Claude retém todo o output até finalizar e a Anthropic recomenda streaming para gerações longas, a conexão ficava ociosa por minutos sem nenhum byte e o proxy do edge function cortava antes do JSON chegar — sintoma: GPT-5 e Gemini terminavam normalmente, só Claude travava. Correção em `callProviderNonStreaming`: para o provider 'claude', a chamada agora usa `stream: true` com `accept: text/event-stream`, lê os eventos `content_block_delta` e acumula o texto, mantendo a interface não-streaming da função. Mantém o mesmo modelo (`claude-sonnet-4-5-20250929`) e o mesmo `max_tokens`. Fallback global por provider continua intacto."
    ],
  },
  {
    version: "1.38.59",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — correção real do travamento pós-fila: a análise dos jobs mostrou que o disparo via banco chamava o worker, mas a chamada HTTP interna era encerrada em 5s, deixando o job em 'processing' sem conclusão nem erro. O disparo do banco agora usa timeout longo e o endpoint de enfileiramento também acorda o worker por `EdgeRuntime.waitUntil`, com claim atômico no worker para evitar processamento duplicado. Jobs presos foram liberados para nova tentativa. A tela de Relatórios e o watcher global agora exibem falha explícita quando um job excede o limite técnico, em vez de sumir silenciosamente em segundo plano."
    ],
  },
  {
    version: "1.38.58",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — correção do job assíncrono que ficava em processamento e não concluía após a paralelização por pilares. O worker agora passa o `jobId` para a execução interna do `generate-report`, permitindo que o logger da pipeline atualize o próprio registro em `report_jobs` durante as fases longas (pilares, envelope, validação e persistência). Isso evita o estado silencioso em que o relatório era gerado no stream interno, mas o job externo não recebia conclusão/erro visível. Também foram adicionados marcos de progresso reais para Fase 1, Fase 2, validação e persistência."
    ],
  },
  {
    version: "1.38.57",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — correção crítica: jobs ficavam travados em 'processing' (80%) sem nunca terminar nem dar erro. Causa raiz identificada via `net._http_response`: o trigger DB `trg_dispatch_report_job` chamava `/functions/v1/process-report-job` e recebia HTTP 404 ('Requested function was not found') porque a edge function `process-report-job` (criada na v1.38.53) nunca foi propagada para a infraestrutura de edge functions, apesar de existir no repositório e estar declarada em `supabase/config.toml`. Sem worker para executar, o job ficava em 'queued', recebia uma única atualização cosmética para 'processing' e nunca mais era tocado. Correção: bump de versão no header do worker força redeploy da função; job travado existente foi liberado via migration; daqui em diante o trigger consegue acionar o worker e o pipeline assíncrono volta a funcionar de ponta a ponta."
    ],
  },
  {
    version: "1.38.56",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — paralelização por pilar no template 'completo' (territorial e enterprise). Antes a geração era uma única chamada monolítica de IA com prompt de ~50KB e saída de ~2500 palavras, levando 4-7min só na fase de inferência. Agora o pipeline roda em 2 fases coordenadas: Fase 1 dispara 3 chamadas EM PARALELO (uma para o pilar I-RA, uma para I-OE, uma para I-AO), cada uma com system prompt restrito ao escopo do pilar e instruída a escrever apenas a subseção 4.1/4.2/4.3 com a tabela canônica de indicadores e os parágrafos de leitura técnica/implicações; Fase 2 chama o 'envelope' (introdução, ficha técnica, metodologia, alertas IGMA, análise integrada, gargalos consolidados, benchmarks, prognóstico, banco de ações, fontes, considerações finais, referências, glossário, apêndice) recebendo os 3 textos dos pilares como contexto de leitura para garantir COERÊNCIA — cita os mesmos indicadores, respeita os mesmos status, não contradiz scores. O orquestrador substitui o placeholder `<!-- DIAGNOSTICO_PILARES_PLACEHOLDER -->` no envelope pelos 3 textos dos pilares concatenados na ordem RA → OE → AO. Fallback é GLOBAL (todas as chamadas usam o mesmo provider): se qualquer pilar ou o envelope falhar, aborta as outras chamadas em curso e refaz TODO o pipeline no próximo provider da ordem (claude → gpt5 → gemini), preservando consistência de tom narrativo. Streaming SSE para o cliente é sequencial: o usuário vê eventos de stage (`: stage phase1_pillars_start`, `: stage phase2_envelope_done`) em tempo real durante a geração, e o markdown final montado é emitido em chunks SSE compatíveis com o parser do front. Ganho esperado: tempo de inferência cai de ~6min para ~2-3min (3x mais rápido na fase de IA). Templates 'executivo' e 'investidor' continuam no pipeline monolítico (estrutura curta sem subseções por pilar — paralelizar não compensa). Rede de segurança: se o pipeline paralelo falhar em todos os providers, cai automaticamente no pipeline monolítico antigo, evitando regressão total."
    ],
  },
  {
    version: "1.38.55",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — UX da geração em segundo plano resiliente. Antes, quando o relatório demorava mais que ~10min na tela (caso comum no template 'completo' com 100+ indicadores, que pode levar até ~7min só na chamada de IA), o front lançava erro 'Geração demorou mais que o esperado' mesmo com o job ainda rodando normalmente no servidor — confundia o usuário, que via 'erro' apesar de o relatório acabar sendo salvo minutos depois. Correções: (1) deadline do polling inline aumentado de 10min para 15min; (2) ao atingir o deadline, em vez de erro, mostra toast informativo de que a geração continua em segundo plano; (3) novo hook `useReportJobWatcher` global (montado em `App.tsx`) que persiste jobs pendentes em `localStorage` e ressuscita o polling automaticamente quando a app recarrega — assim o usuário recebe toast + Notification do navegador quando o relatório ficar pronto, mesmo se ele fechou a página de Relatórios, mudou de aba do app ou recarregou; (4) permissão de Notification é solicitada de forma silenciosa no clique de 'Gerar Relatório' (uma vez); (5) jobs com mais de 2h são descartados como stale para não alarmar o usuário com sucesso/falha de geração antiga."
    ],
  },
  {
    version: "1.38.54",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Diagnóstico → aba Indicadores → painel 'Procedência dos Dados' — classificação de 'Calculados' agora reconhece também os indicadores listados no catálogo `DERIVED_INDICATORS` (igma_ipcr, igma_ideb, igma_iptl, igma_iiet, igma_isemt, igma_leitos_hospedagem_por_habitante, tourism_revenue_per_capita), independentemente do `source` ou da trilha de auditoria. Antes, se o diagnóstico ainda não tivesse sido recalculado depois das versões que populam audit completo, todos os derivados apareciam como zero mesmo quando o valor existia. Observação: se o painel ainda mostrar 0 calculados após este fix, o diagnóstico precisa ser recalculado (botão 'Recalcular') para que a função `calculate-assessment` gere os valores derivados — eles dependem de inputs oficiais (ex.: PIB, população, visitantes) que precisam estar preenchidos primeiro."
    ],
  },
  {
    version: "1.38.53",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — fallback de IA ampliado para falhas mid-stream. Antes a cadeia Claude → GPT-5 → Gemini só tentava o próximo provedor se a abertura da conexão falhasse; se o stream começasse e morresse no meio (chunk error, abort de rede, conteúdo vazio, [DONE] sem texto útil), o pipeline desistia. Agora cada provedor é envolvido em um wrapper que abre + drena + valida o conteúdo final acumulado; se houver erro de leitura ou conteúdo vazio (<32 chars), o trail é registrado e o próximo provedor da ordem é acionado automaticamente, mantendo a regra de prioridade. O cliente streaming recebe marcadores `: switching_provider` para refletir a troca quando ocorrer.",
      "Relatórios — fila assíncrona reescrita para resistir a timeout do request original. Antes o modo background usava `EdgeRuntime.waitUntil` dentro do mesmo worker da chamada inicial: se a invocação estourasse o timeout do proxy (~150s), o worker era morto e o job ficava preso em 'processing' eternamente. Agora o INSERT em `report_jobs` dispara um trigger DB (`trg_dispatch_report_job` via `pg_net.http_post`) que chama uma nova edge function dedicada `process-report-job` em um worker independente. O endpoint `generate-report` em modo background apenas grava o payload + JWT do criador no job e responde 202 imediatamente; o worker reabre o pipeline interno reusando o JWT (preservando RLS), atualiza progresso/stage durante a execução, faz polling de `generated_reports` para confirmar a persistência e marca 'completed' ou 'failed' com mensagem detalhada incluindo `trace_id` e último stage observado. Suporta retry automático: até 2 tentativas no total antes de desistir, com fire-and-forget para reagendar a si mesmo. Função utilitária `requeue_report_job(uuid)` permite reenfileirar manualmente jobs falhos."
    ],
  },
  {
    version: "1.38.52",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — observabilidade de timeout. A geração de relatório agora emite logs estruturados com `traceId` (= jobId quando em background), `assessmentId`, `reportId` e `stage` em cada etapa do pipeline (criação do job, coleta de dados, montagem do prompt, seleção de provedor, primeiro chunk de IA, fim do streaming, validação determinística, validação por agente IA, persistência em `generated_reports`, gravação de `report_validations` e `audit_events`, abort por idle/hard timeout). O `report_jobs.stage` é atualizado em cada transição importante e ganha um marcador `[trace=<jobId>] <stage>` para facilitar o filtro nos logs do edge function. Quando o watchdog interno aborta o stream (idle 4min ou hard 12min), o motivo é registrado com tempo decorrido em segundos e o último stage conhecido, eliminando a necessidade de adivinhar onde o pipeline travou."
    ],
  },
  {
    version: "1.38.51",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Diagnóstico → aba Indicadores → Procedência dos Dados — correção definitiva para diagnósticos existentes e futuros. Causa raiz: ao pré-preencher valores em modo Demo, alguns `indicator_values` eram salvos com o `org_id` da organização demonstrativa, embora pertencessem a diagnósticos da organização real; pelas regras de acesso, a página do diagnóstico enxergava o diagnóstico, mas não enxergava esses valores, deixando a procedência zerada. Além disso, a trilha `assessment_indicator_audit` antiga havia sido gravada como MANUAL mesmo para fontes `Pré-preenchido (IBGE/DATASUS/STN/MAPA_TURISMO/ANATEL)`. Correções: valores existentes foram realinhados ao `org_id` do diagnóstico; auditorias existentes foram reclassificadas conforme a fonte real; o painel agora também usa a trilha de auditoria como fallback; e os fluxos de gravação passaram a persistir valores usando a organização dona do diagnóstico, não a organização Demo ativa."
    ],
  },
  {
    version: "1.38.50",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — correção estrutural do `IDLE_TIMEOUT` sem apenas aumentar timeout. Causa: o endpoint interno de geração só devolvia a resposta SSE depois de abrir a conexão com o provedor de IA; quando Claude/GPT/Gemini demoravam mais de 150s para entregar headers ou primeiro token, a requisição interna ficava sem nenhum byte e a infraestrutura encerrava com 504 `IDLE_TIMEOUT`. Correção em `generate-report`: o stream SSE agora é retornado imediatamente, antes das chamadas longas de IA, e os heartbeats começam no início do processamento, incluindo seleção/fallback de provedor, geração, validação e persistência. Assim a fila continua assíncrona e o timeout deixa de ocorrer por conexão ociosa."
    ],
  },
  {
    version: "1.38.49",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — correção do timeout na geração em segundo plano. Causa confirmada nos `report_jobs`: a chamada interna do pipeline usava `backgroundRun: true`, fazendo o endpoint interno só responder JSON ao final; durante a geração com IA ficava sem enviar bytes por cerca de 150s e a infraestrutura encerrava a requisição com `IDLE_TIMEOUT`. Correção em `supabase/functions/generate-report/index.ts`: a chamada interna agora usa stream real (`backgroundRun: false`) e o stream envia heartbeats a cada 15s enquanto a IA gera e enquanto a validação/persistência final executa. O job externo continua em modo background com polling, mas a conexão interna deixa de ficar ociosa e não deve mais cair por idle timeout."
    ],
  },
  {
    version: "1.38.48",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Diagnóstico → aba Indicadores → painel 'Procedência dos Dados' aparecia zerado (0 oficiais / 0 calculados / 0 manuais) mesmo em diagnósticos com dados pré-preenchidos via APIs oficiais. Causa: o componente filtrava por `v.value`, mas a tabela `indicator_values` usa `value_raw` — assim a contagem ficava sempre zero; além disso, a detecção de origem oficial buscava prefixos como `IBGE`, `CADASTUR`, `STN`, mas as fontes vêm gravadas como `Pré-preenchido (IBGE)`, `Pré-preenchido (DATASUS)` etc., e portanto nenhuma fonte era reconhecida. Correção em `src/components/diagnostics/DataProvenancePanel.tsx`: o filtro agora aceita `value_raw`, `value` ou `value_text`; a detecção de fontes oficiais usa `includes` em vez de `startsWith` e cobre os tokens `IBGE`, `CADASTUR`, `STN`, `DATASUS`, `MAPA_TURISMO`, `INEP`, `ANATEL`, `TSE`, `ANA`, `ANAC`, `CADUNICO`. A cobertura automática volta a refletir a realidade do diagnóstico."
    ],
  },
  {
    version: "1.38.47",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — eliminação do erro 'A geração foi reutilizada pelo cache interno. Clique em Regenerar para criar uma nova versão.' que aparecia ao gerar relatório em background. Causa: quando o pipeline interno (chamada interna em modo `stream` dentro de `runReportPipeline`) detectava que o último relatório salvo era mais novo que `assessment.calculated_at` e `assessment.updated_at`, retornava `{ skipped: true }`. O `runReportPipeline` lançava esse erro pedindo ação manual de 'Regenerar', mas o usuário já havia clicado em 'Gerar Relatório' (intent explícito de nova geração) e a UI do background não expõe um botão 'Regenerar' nesse momento — o erro travava o fluxo sem saída. Correção em `supabase/functions/generate-report/index.ts`: quando o pipeline interno responde `skipped` e a chamada original NÃO veio com `forceRegenerate`, a edge function refaz a chamada interna automaticamente com `forceRegenerate: true` (transparente para o usuário, sem erro, sem ação manual). O caso degenerado de `skipped` mesmo com `forceRegenerate=true` devolve o `reportId` existente em vez de erro."
    ],
  },
  {
    version: "1.38.46",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — correção do carregamento do Histórico. A consulta deixou de depender de relacionamento embutido com diagnósticos (`assessments(...)`), que podia falhar silenciosamente quando não havia FK explícita ou quando a política do diagnóstico bloqueava o join, impedindo a lista inteira de relatórios salvos de aparecer. Agora o histórico carrega `generated_reports` diretamente, busca os metadados dos diagnósticos em uma segunda consulta não bloqueante e exibe um estado de erro com botão de tentar novamente quando houver falha real."
    ],
  },
  {
    version: "1.38.45",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — `validator_version` da Conferência de dados agora é dinâmico por request. Antes a edge function `generate-report` carimbava `report_validations.validator_version` com uma string hardcoded ('v1.38.39'), que envelhecia a cada release e dava a impressão ao usuário de que o validador estava 'travado' em uma versão antiga mesmo após novas gerações. Agora o cliente envia `appVersion: vX.Y.Z` (lido de `APP_VERSION.full`) no body de cada chamada — modo `background` propaga o valor para o pipeline interno via `runReportPipeline` → fetch interno → handler `stream`, garantindo que toda nova geração registre a versão vigente do app. Validação server-side: aceita apenas formato `v?\\d+\\.\\d+\\.\\d+`, com fallback determinístico para `VALIDATOR_VERSION_FALLBACK` (v1.38.45) caso o cliente omita ou envie valor inválido. Resultado: o banner 'Conferência de dados' e o .txt exportado pelo `ReportValidationBanner` sempre exibem a versão real do validador que rodou naquela geração específica."
    ],
  },
  {
    version: "1.38.44",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — correção do histórico vazio no modo Demo. A lista de relatórios salvos agora busca tanto a organização real do usuário quanto a organização efetiva do Demo, evitando ocultar relatórios pessoais e organizacionais já gerados quando o usuário está visualizando dados demonstrativos. O export PDF do visualizador histórico também passou a usar o conteúdo do relatório selecionado, e não o painel de geração atual."
    ],
  },
  {
    version: "1.38.43",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — correção do rótulo de status truncado (caso 'Autonomia fiscal' do relatório de Foz do Iguaçu, que saía como '🟠 AT' em vez de '🟠 ATENÇÃO'). Causa: o realinhador de linhas conserta a POSIÇÃO das células, mas não o TEXTO interno — quando o LLM emitia a célula já abreviada ('AT', 'CRIT', 'EXC' etc.), o conteúdo errado era propagado para o DOCX e para o preview, mesmo com a tabela em esquadro. Correções: (1) Nova função `normalizeStatusCellText` em `reportStatusStyle.ts` que detecta o emoji de status (🟢🔵🟡🟠🔴⚪) e reconstrói o rótulo canônico ('EXCELENTE/FORTE/ADEQUADO/ATENÇÃO/CRÍTICO/INFORMATIVO') a partir do mapa oficial, preservando o **bold** markdown se presente. Quando não há emoji, tenta `canonicalStatusKey` sobre o texto e reescreve o rótulo. (2) Aplicação no preview HTML (`Relatorios.tsx`) e no exportador DOCX (`exportReportDocx.ts`), garantindo o rótulo correto em ambas as superfícies. (3) Reforço no prompt do `generate-report` proibindo explicitamente abreviar o status ('AT', 'CRIT', 'EXC', 'ADEQ' etc.) e exigindo o rótulo por extenso, com acento e emoji."
    ],
  },
  {
    version: "1.38.42",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — correção do histórico vazio mesmo com relatórios salvos. A consulta deixou de usar join obrigatório com diagnósticos, evitando ocultar relatórios antigos quando o diagnóstico relacionado não está acessível pela política atual. O histórico agora espera o perfil/organização ativa antes de buscar dados, conta apenas relatórios visíveis ao usuário e mostra mensagem específica quando os filtros zeram a lista, além de normalizar os níveis SMALL/MEDIUM/COMPLETE para Essencial/Estratégico/Integral nos filtros e badges.",
      "Relatórios — 'Gerar nova versão' agora cria um novo registro no histórico em vez de sobrescrever o relatório anterior. A checagem de cache e a recuperação do relatório mais recente também passaram a ordenar por data, evitando erro quando há múltiplas versões para o mesmo diagnóstico."
    ],
  },
  {
    version: "1.38.41",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — correção definitiva do desalinhamento de tabelas no DOCX exportado (caso reportado: linhas 'Emissão de gases de efeito estufa', 'População ocupada' e similares no relatório de Foz do Iguaçu apareciam fora de esquadro, com o valor migrando para o nome do indicador, a fonte caindo na coluna Status e o texto 'ATENÇÃO per capita' colando duas células). Causa raiz: o parser de tabela em `exportReportDocx.ts` aplicava `.split('|').map(c=>c.trim()).filter(Boolean)`, descartando silenciosamente células vazias ANTES de o `realignIndicatorRow` poder agir. Quando o LLM emitia uma linha canônica `| Indicador |  | % | 🟠 ATENÇÃO | Manual |` com a coluna Valor em branco, o filtro reduzia para 4 cells e o realinhador recebia uma entrada já corrompida. Correção: o parser agora usa `.split('|').slice(1, -1).map(c=>c.trim())` (mesma estratégia do preview HTML), preservando todas as células — inclusive vazias — para que o realinhador heurístico (que detecta colunas por emoji de status, sigla de fonte e padrão de unidade) possa reposicionar corretamente cada cell e marcar a faltante com '—'. Resultado: o documento Word exportado passa a sair em esquadro mesmo quando a IA omite uma célula, e a evidência da omissão fica visível como '—' na coluna correta.",
      "Relatórios — correção dos quadrados '□' no lugar de emojis de status (🔵 🟡 ⚪) dentro das tabelas exportadas em Word. Causa: a fonte Arial usada nas células não carrega os glifos U+1F535 (círculo azul), U+1F7E1 (círculo amarelo) e U+26AA (círculo branco), então o Word renderizava tofu boxes — apenas 🟢 (U+1F7E2) e 🔴 (U+1F534) apareciam por sorte tipográfica. Correção em `exportReportDocx.ts`: o conteúdo da célula de Status agora é dividido em dois `TextRun`s — um com a glifo do emoji renderizada na fonte 'Segoe UI Emoji' (presente em qualquer Windows moderno e com fallback gracioso para a fonte de emoji do sistema em macOS/Linux), e outro com o rótulo (EXCELENTE/FORTE/ADEQUADO/ATENÇÃO/CRÍTICO/INFORMATIVO) mantido em Arial bold com a cor canônica da paleta de status. O preview HTML, o PDF/print e o cabeçalho da tabela permanecem inalterados — a mudança é cirúrgica e específica para a célula de Status do exportador DOCX.",
    ],
  },
  {
    version: "1.38.40",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — correção do desalinhamento de linhas em tabelas de indicadores (caso reportado: 'Taxa de abandono' em Foz do Iguaçu apareceu fora de esquadro, com a unidade migrando para a coluna Valor, o status para Unidade e a fonte para Status). Causa: o LLM ocasionalmente emite uma linha do template canônico (Indicador|Valor|Unidade|Status|Fonte) com uma célula faltando — geralmente o Valor numérico — e o renderizador montava `<td>`s na ordem em que vinham, deslocando todas as colunas seguintes. Correções: (1) Nova função `realignIndicatorRow` em `reportStatusStyle.ts` que detecta heuristicamente quais colunas estão presentes em uma linha incompleta usando os emojis de status (🟢🔵🟡🟠🔴⚪), as siglas conhecidas de fonte (IBGE/DATASUS/STN/CADASTUR/MTUR/INEP/ANA/ANATEL/TSE/SEEG/MAPA_TURISMO/MANUAL/KB/PESQUISA_LOCAL) e padrões de unidade (%, R$, hab., dias, nota, etc.), reposicionando cada cell na coluna correta e preenchendo as faltantes com '—'. (2) Aplicação da função tanto no preview HTML (`Relatorios.tsx`) quanto no export DOCX (`exportReportDocx.ts`), garantindo que o documento exportado também saia em esquadro. (3) Reforço no prompt do `generate-report` com regra explícita 'INTEGRIDADE DE LINHA' proibindo células vazias, exigindo '[dado não disponível na base validada]' na coluna Valor quando o indicador não tem número auditado, e instruindo a NÃO colapsar variações distintas (ex.: anos iniciais vs anos finais do ensino fundamental) em uma linha única sem valor — devem virar duas linhas separadas. Resultado: mesmo se a IA voltar a omitir uma célula, a tabela renderiza alinhada e a evidência da omissão aparece como '—' visível em vez de quebrar o layout.",
    ],
  },
  {
    version: "1.38.39",
    date: "2026-05-01",
    type: "patch" as const,
    changes: [
      "Relatórios — botão principal passa a gerar nova versão quando já existe relatório salvo para o diagnóstico selecionado, evitando a sensação de que a geração foi concluída rápido demais por reaproveitamento do relatório anterior. O pipeline em background agora também rejeita explicitamente respostas de cache/skip do fluxo interno e só aceita relatórios criados durante a execução atual.",
      "Relatórios — validação de dados fortalecida: a trilha usada no prompt e no agente validador agora é reconstruída de forma canônica combinando `assessment_indicator_audit`, `indicator_values` e `indicator_scores`, preservando fontes pré-preenchidas como IBGE/DATASUS/STN/MAPA_TURISMO quando a auditoria antiga ainda está marcada como MANUAL. O agente validador deixou de truncar a base auditada nos primeiros 80 indicadores e passa a receber todos os indicadores, evitando falsos avisos como '112 no relatório, 98 na base'.",
      "Relatórios — validador atualizado para `v1.38.39` e contexto de documentos nacionais fornecidos incluído na checagem bibliográfica, reduzindo falso positivo para referências realmente carregadas na geração.",
    ],
  },
  {
    version: "1.38.38",
    date: "2026-04-30",
    type: "patch" as const,
    changes: [
      "Relatórios — Integridade da trilha de auditoria (Frente 1): indicadores hidratados a partir de `external_indicator_values` (IBGE, CADASTUR, DATASUS, INEP, STN, ANAC, ANATEL, ANA, TSE, CADUNICO, Mapa do Turismo) e de `compute_derived_indicators` deixam de ser persistidos como `MANUAL` no `assessment_indicator_audit` e passam a ser corretamente classificados como `OFFICIAL_API` ou `DERIVED`, com `source_detail` enriquecido no formato `FONTE (ANO)` (ex.: `IBGE (2022)`). Antes a regex de classificação só checava o tag literal `'external'` contra termos como `ibge|datasus|...` e nunca casava, gerando falsos positivos no validador (fontes oficiais sendo flagueadas como inventadas). Agora a classificação prioriza o tag de origem e cai para o `source_code` da integração quando disponível.",
      "Relatórios — Validador determinístico de referências inventadas (Frente 2): nova função `detectInventedReferences` roda junto com `detectCoherenceWarnings` no pipeline de geração e bloqueia três classes de alucinação antes do agente IA validador: (1) menções a códigos técnicos de indicadores (`igma_*`, `mst_*`) que não existem na trilha de auditoria do diagnóstico, (2) atribuição de fonte oficial (IBGE, DATASUS, CADASTUR, INEP, STN, ANAC, ANATEL, ANA, TSE, CADUNICO, Mapa do Turismo, MTur, IPHAN) a indicadores cuja `source_type` real é MANUAL, e (3) ano de fonte divergente do `reference_year` registrado na auditoria (tolerância de 1 ano para defasagem entre publicação e referência). Os avisos são exibidos no banner 'Conferência de dados' e exportáveis no .txt.",
      "Relatórios — Validador atualizado para `v1.38.38` no campo `validator_version` da tabela `report_validations`, permitindo rastrear quais relatórios foram validados pela nova régua.",
    ],
  },
  {
    version: "1.38.37",
    date: "2026-04-30",
    type: "patch" as const,
    changes: [
      "Relatórios — Conferência de dados ganhou botão 'Baixar' no Dialog 'Ver detalhes'. Gera um arquivo .txt formatado (`conferencia-de-dados-YYYY-MM-DD-HH-MM-SS.txt`) contendo: cabeçalho com data/hora de exportação, versão do validador, IDs do relatório e diagnóstico, contagem de correções automáticas, avisos determinísticos e pontos sinalizados pelo agente IA, e três blocos detalhados — (1) divergências corrigidas automaticamente com Problema/Resolução por indicador, (2) avisos determinísticos para revisão manual, (3) sinalizações do agente IA validador. Útil para anexar a atas, processos administrativos ou compartilhar com a equipe técnica sem precisar do acesso ao sistema. Implementação local no componente `ReportValidationBanner` via `Blob` + `URL.createObjectURL`, sem chamada extra ao backend."
    ]
  },
  {
    version: "1.38.36",
    date: "2026-04-30",
    type: "patch" as const,
    changes: [
      "Relatórios — banner de 'Validação cruzada de fontes' renomeado para 'Conferência de dados' no componente `ReportValidationBanner`. O termo anterior era técnico demais e não comunicava o valor para gestores e técnicos sem formação em metodologia. O novo nome é direto, mantém a seriedade institucional sem virar jargão e combina melhor com o subtítulo dinâmico ('X correções aplicadas, Y pontos para revisão'). Aplicado tanto no título do Alert quanto no título do Dialog 'Ver detalhes'. Nenhuma alteração na lógica de validação, persistência em `report_validations` ou no conteúdo técnico apresentado — apenas o rótulo voltado ao usuário final."
    ]
  },
  {
    version: "1.38.35",
    date: "2026-04-30",
    type: "patch" as const,
    changes: [
      "Relatórios — novo seletor 'Modelo de IA' visível APENAS para usuários com role ADMIN na aba Gerar Relatório (ao lado de Ambiente/Comparativo). Permite escolher manualmente qual provedor de IA usar como PRIMÁRIO para esta geração: Auto (cadeia padrão Claude→GPT-5→Gemini), Claude Sonnet 4.5, GPT-5 ou Gemini 2.5 Pro. Útil para A/B testing de qualidade narrativa, debug de provedor específico em produção e contornar instabilidades pontuais. Implementação: (1) Front (`Relatorios.tsx`) ganhou state `aiProvider` com default 'auto', renderiza Select condicionalmente sob `isAdmin`, envia `aiProvider` no body do POST apenas quando admin escolhe valor diferente de auto. (2) Edge function (`generate-report`) lê `aiProvider` do body e re-valida server-side via `user_roles` (role='ADMIN') — usuários comuns que tentem injetar o campo via DevTools têm o valor silenciosamente reduzido a 'auto', impossibilitando bypass. (3) A cadeia de fallback foi refatorada para ordem dinâmica: a partir do provedor escolhido, os demais entram como rede de segurança na ordem padrão (Claude → GPT-5 → Gemini). Exemplo: se admin escolhe GPT-5 e GPT-5 falha, tenta Claude, depois Gemini. (4) `runReportPipeline` propaga o override para a chamada interna em background. (5) Logs explícitos da ordem aplicada (`AI provider order for this report: ...`) e novo retorno HTTP 503 com lista de erros quando todos os provedores falham, em vez de 500 genérico. Auditoria persistida em `audit_events.metadata.fallback_trail`."
    ]
  },
  {
    version: "1.38.34",
    date: "2026-04-30",
    type: "patch" as const,
    changes: [
      "Relatórios — cadeia de fallback automática de provedores de IA: Claude Sonnet 4.5 → GPT-5 → Gemini 2.5 Pro. Antes, o `generate-report` só tentava Claude quando NÃO era execução em background, então jobs longos (modo background é o padrão atual para evitar timeouts SSE de browser) caíam direto no Gemini sem nunca tentar Claude. Além disso, quando Claude falhava, o pulo era direto para Gemini, ignorando o GPT-5. Diagnóstico do problema com Claude: (a) o adaptador SSE não tratava eventos `type: error` da API Anthropic, então erros de stream (overload, rate-limit no meio da geração) silenciavam o stream em vez de marcar como falha. (b) a restrição `!backgroundRun` nunca ativava Claude em produção. Correções no `generate-report/index.ts`: (1) Removida a restrição `!backgroundRun` — Claude é tentado sempre que `ANTHROPIC_API_KEY` está configurada, inclusive em background. (2) Adicionada cadeia de fallback de 3 níveis: se Claude falhar (erro HTTP, exceção, ou erro no stream adapter), tenta GPT-5 via Lovable AI Gateway; se GPT-5 falhar, cai para Gemini 2.5 Pro como rede de segurança final. Cada tentativa é registrada em `fallbackTrail` e persistida no `audit_events.metadata.fallback_trail` para diagnóstico. (3) Adaptador Claude agora detecta eventos `type: error` da API Anthropic e propaga corretamente para acionar o fallback em vez de travar. (4) Logs explícitos de qual provedor foi usado e o motivo dos pulos, facilitando observabilidade em jobs longos como Foz do Iguaçu. Resultado: relatórios passam a usar Claude (melhor qualidade narrativa) como primeira opção mesmo em jobs longos, com fallback transparente para GPT-5 (qualidade próxima) e só caem em Gemini quando os dois primeiros estão indisponíveis."
    ]
  },
  {
    version: "1.38.33",
    date: "2026-04-30",
    type: "patch" as const,
    changes: [
      "Relatórios — correção do erro `internal-report-stream-idle-timeout` em jobs de background. Diagnóstico nos logs do edge function: o pipeline interno chamado pelo modo background (HTTP ↔ HTTP) emitia o último chunk SSE, salvava o relatório com sucesso (`Report saved successfully`), mas em seguida ficava silencioso por mais de 2 minutos enquanto rodavam validador determinístico, validador IA cruzando com bibliografia canônica e persistência em `report_validations`/`audit_events`. O watchdog de inatividade do wrapper de background (2min) abortava a conexão e marcava o job como `failed`, embora o relatório já estivesse persistido em `generated_reports` — o usuário via 'erro' apesar do trabalho ter terminado corretamente. Correções em `supabase/functions/generate-report/index.ts`: (1) Idle timeout aumentado de 2min → 4min e hard timeout de 8min → 12min, dando folga para a fase pós-stream do pipeline de validação. (2) Recovery automático no `catch` do `runReportPipeline`: antes de propagar qualquer erro de stream (idle-timeout, hard-timeout, conexão fechada pelo proxy), faz uma consulta em `generated_reports` filtrando por `assessment_id` e `created_at >= streamStartedAt-5s`. Se o relatório já estiver salvo, o job é marcado como `completed` em vez de `failed`, com log explícito 'Stream interrompido, mas relatório foi persistido — recuperando job'. Resultado: relatórios longos como Foz do Iguaçu (112 indicadores) deixam de aparecer como falha quando o servidor já produziu o documento — o background passa a refletir o estado real da persistência, não o estado da conexão HTTP intermediária."
    ]
  },
  {
    version: "1.38.32",
    date: "2026-04-30",
    type: "patch" as const,
    changes: [
      "Relatórios — correção do job em background que podia ficar preso em 50–90% após erro de stream do provedor de IA. O modo background agora executa a geração interna em fluxo não-SSE para persistência, usa Gemini diretamente em jobs longos para evitar queda do adaptador Claude, adiciona watchdog de inatividade/tempo máximo e transforma falhas em `status='failed'` com mensagem clara em `report_jobs`, em vez de deixar o usuário olhando uma porcentagem congelada indefinidamente. A UI também passou a informar que jobs sem avanço serão encerrados automaticamente antes de uma nova tentativa."
    ]
  },
  {
    version: "1.38.31",
    date: "2026-04-30",
    type: "minor" as const,
    changes: [
      "Relatórios — geração 100% assíncrona em segundo plano. A edge function `generate-report` ganhou um novo modo `background` (default no front a partir desta versão): em vez de manter uma conexão SSE aberta por minutos enquanto o LLM produz o texto (sujeita a quedas de proxy, troca de aba, suspensão do dispositivo), a função agora cria imediatamente um registro na nova tabela `report_jobs` (status, stage, progresso, report_id final, mensagem de erro), responde HTTP 202 com `{ jobId }` em milissegundos e dispara o pipeline pesado dentro de `EdgeRuntime.waitUntil`. O front faz polling em `report_jobs` a cada 4s, exibe o stage e a porcentagem de progresso, e ao detectar `status='completed'` carrega o `report_content` final via `generated_reports`. Quando o usuário clica Cancelar agora, paramos apenas o acompanhamento local — o servidor continua salvando o relatório em background. Resultado: relatórios longos como Foz do Iguaçu (112 indicadores, 15 gargalos, 35 prescrições, ~4 minutos de LLM) deixam de ser interrompidos por timeouts/quedas de conexão; a UI fica leve, imune a fechar/abrir aba e o relatório aparece de forma confiável quando termina."
    ]
  },
  {
    version: "1.38.30",
    date: "2026-04-30",
    type: "patch" as const,
    changes: [
      "Relatórios — recuperação automática de relatórios cuja conexão SSE caiu durante a geração. Causa observada em Foz do Iguaçu: relatórios longos (112 indicadores, 15 gargalos, 35 prescrições) chegavam a ~4 min de stream e a conexão era encerrada pelo proxy/edge runtime com 'Http: connection closed before message completed', deixando o usuário sem documento na tela apesar da edge function `generate-report` já usar `EdgeRuntime.waitUntil` para finalizar a persistência em background. Solução cliente-side em `src/pages/Relatorios.tsx`: quando o stream cai por idle-timeout, hard-timeout ou erro de rede (mas NÃO quando o usuário clica Cancelar), o front entra em modo de recuperação e faz polling em `generated_reports` filtrando por `assessment_id` a cada 5s por até 3 minutos. Se encontrar um registro com `created_at` posterior ao início desta geração, carrega o conteúdo na tela, exibe toast de sucesso ('Relatório recuperado com sucesso! Foi finalizado em segundo plano.') e invalida as queries de histórico/destinos. Quando nada é recuperado dentro da janela, mostra mensagem clara orientando a checar o histórico em alguns minutos antes de gerar de novo (evita disparar regeneração paralela enquanto o background ainda está salvando). Nenhuma alteração na edge function — o pipeline de streaming + waitUntil já estava correto, faltava apenas o cliente saber tirar proveito dele."
    ]
  },
  {
    version: "1.38.29",
    date: "2026-04-30",
    type: "patch" as const,
    changes: [
      "Diagnósticos — correção da revalidação persistente ao retomar uma rodada. A tela de Validação de Dados Oficiais agora considera o valor já salvo em `indicator_values` do diagnóstico ativo como confirmação válida quando ele coincide com o pré-preenchimento oficial, mesmo que a tabela externa tenha sido regravada posteriormente com `validated=false` por alguma atualização de fonte. Assim, diagnósticos já preenchidos/concluídos, como Foz do Iguaçu, não voltam a mostrar todos os pré-preenchidos como 'Aguardando revisão' ao serem retomados. A ação `Desvalidar` continua funcionando e passa a ter precedência local para liberar o campo para edição manual. O reconciliador de atualização oficial também preserva o ID validado anterior quando uma fonte deixa de retornar temporariamente uma linha, evitando perda silenciosa do estado de confirmação."
    ]
  },
  {
    version: "1.38.28",
    date: "2026-04-30",
    type: "patch" as const,
    changes: [
      "Relatórios — banner de Validação cruzada agora explica claramente o que foi validado e a resolução de cada item. O Dialog 'Ver detalhes' (componente `ReportValidationBanner`) ganhou uma seção introdutória 'O que foi validado' descrevendo as três camadas de checagem (auto-correção numérica determinística contra a tabela oficial de auditoria com fontes IBGE/CADASTUR/STN/DATASUS/INEP, motor de coerência interna e agente IA validador cruzando com a bibliografia canônica Beni/IGMA/PNT/ODS), além de badges com a contagem de itens corrigidos e itens para revisão manual. Cada divergência corrigida automaticamente passa a exibir explicitamente Problema (valor citado pela IA, riscado) e Resolução (substituído pelo valor oficial, já aplicado no texto, sem ação adicional). Avisos determinísticos e do agente IA também ganharam uma frase de Resolução explicando por que ficaram pendentes (não havia valor oficial para substituir / afirmação sem respaldo direto na bibliografia) e o que o usuário deve fazer (confirmar ou ajustar manualmente antes de publicar). O conteúdo do relatório continua limpo — toda essa informação técnica vive exclusivamente na interface."
    ]
  },
  {
    version: "1.38.27",
    date: "2026-04-30",
    type: "patch" as const,
    changes: [
      "Relatórios — banner de 'Validação cruzada' removido do conteúdo do relatório. O documento agora sai limpo (sem aviso técnico no topo nem no rodapé/apêndice), preservando a leitura institucional e mantendo os exports DOCX/PDF e a cópia em texto puro sem qualquer bloco técnico. A informação de validação continua sendo persistida em `report_validations` (status, auto_corrections, deterministic_issues, ai_issues, total_issues) e passou a ser exibida exclusivamente na interface, FORA do bloco do relatório, através de um novo componente `ReportValidationBanner` (Alert do shadcn) renderizado acima do visualizador tanto na aba de geração quanto no histórico. O banner só aparece quando há divergência ou correção automática a comunicar; é silencioso quando todas as fontes batem. Um botão `Ver detalhes` abre um Dialog listando cada autocorreção (indicador, valor anterior → valor aplicado) e os itens remanescentes que exigem revisão manual, com a versão do validador. Edge function `generate-report` deixou de concatenar o `footerBanner` em `finalContent`."
    ]
  },
  {
    version: "1.38.26",
    date: "2026-04-30",
    type: "patch" as const,
    changes: [
      "Relatórios — recuperação do tom narrativo da v1.38.18 sem perder os ganhos de padronização posteriores. Comparando o relatório Territorial de Foz do Iguaçu de 27/04 09:41 (v1.38.18) com o de 29/04 19:36 (v1.38.25), o usuário relatou que o anterior tinha melhor texto e análise. A auditoria mostrou três diferenças principais: (1) a v18 usava parágrafos longos contínuos, enquanto o atual fragmentava o conteúdo em subseções 2.1/2.2/2.3/3.1/3.2/4.1/4.2 obrigatórias, deixando a leitura travada como formulário ABNT; (2) a v18 não tinha banner amarelo de 'Validação cruzada' antes do título institucional, o atual abria com esse aviso técnico atrapalhando a leitura; (3) a v18 não citava página de livro do Beni — o usuário lembrava disso, mas nenhum relatório nunca puxou página real porque a Base de Conhecimento armazena apenas metadados (file_name, description, category), sem texto extraído nem nº de página. Correções aplicadas no `generate-report`: (a) Nova regra `ESTRUTURA FLEXÍVEL DE SUBSEÇÕES` no system prompt do Territorial — explicita que as subseções numeradas do template são GUIAS de cobertura, não cabeçalhos obrigatórios, instruindo o LLM a preferir blocos narrativos contínuos de 2-3 parágrafos em vez de fragmentar análise coesa em 4 microsseções de 2 frases. (b) Banner de Validação Cruzada (v1.38.8) reposicionado para o RODAPÉ do relatório — o corpo agora começa direto pelo título 'Relatório SISTUR', estilo v18; o banner segue presente para auditoria, mas como apêndice ao final, não como cabeçalho. (c) Nova regra dura nº 13 da política Zero Alucinação: citação de página (ex.: 'BENI, 1997, p. 145') só permitida se o trecho do livro estiver LITERALMENTE presente em BASE DE CONHECIMENTO ou DOCUMENTOS DE REFERÊNCIA com a página explicitamente registrada — caso contrário, omitir página e citar apenas autor+ano. Resultado: novos relatórios passam a abrir como o de 27/04 09:41 (título → ficha técnica → Resumo em prosa fluida), mantêm citações canônicas (BENI, 1997 / 2007 — não mais o erro 'BENI, 2001' do v18), preservam tabelas canônicas de 5 colunas + status colorido (🔴🟠🟡🟢🔵⚪) introduzidos na v1.38.19, e ganham porta aberta para citação de página real quando o pipeline de extração de texto do KB for implementado."
    ]
  },
  {
    version: "1.38.25",
    date: "2026-04-30",
    type: "patch" as const,
    changes: [
      "Fluxo de diagnóstico — persistência correta entre pré-preenchimento e preenchimento manual. A etapa de Validação de Dados Oficiais agora espelha diretamente o estado salvo em `external_indicator_values.validated`, então ao voltar para a fase ou retomar um diagnóstico os indicadores já validados aparecem como confirmados e não exigem nova validação. A validação também persiste imediatamente os valores em `indicator_values` do diagnóstico ativo, garantindo que todos os dados oficiais confirmados apareçam na etapa manual. Foi adicionada a ação `Desvalidar`, que remove o status validado e libera o campo para edição/revalidação. A etapa de preenchimento manual continua exibindo todos os indicadores do nível selecionado, preservando valores já salvos e permitindo alterar existentes ou completar vazios, e ganhou filtro `Não preenchidos` para visualizar rapidamente o que ainda falta. O catálogo manual agora respeita a opção Mandala/MST do diagnóstico, evitando indicadores extras quando a extensão não foi ativada."
    ]
  },
  {
    version: "1.38.24",
    date: "2026-04-30",
    type: "patch" as const,
    changes: [
      "CADÚNICO/MDS — População de baixa renda agora vem AUTOMATICAMENTE da fonte oficial mensal, sem dependência de token federal e sem fallback IBGE. Antes, o indicador `igma_populacao_de_baixa_renda` era preenchido pela tabela 36/30246 do IBGE (Incidência de Pobreza, censo 2010, valor estático e desatualizado) porque a API REST oficial do Cadastro Único exige token MDS solicitado por portal próprio. Solução implementada usando a API pública SAGI Solr (`aplicacoes.mds.gov.br/sagi/servicos/misocial`), que não requer chave: (1) Nova tabela `cadunico_municipio_cache` armazena, por código IBGE de 6 dígitos, métricas oficiais do Cadastro Único — total de famílias e pessoas cadastradas, famílias e pessoas em situação de baixa renda, famílias em extrema pobreza, população de referência e percentual calculado de população em baixa renda — com mês/ano de referência. Tabela auxiliar `cadunico_ingestion_runs` registra cada execução (status, linhas processadas, municípios atualizados, erros). (2) Nova edge function `ingest-cadunico` detecta dinamicamente o último mês com dados populados via probe Solr (`anomes_s desc` filtrado por `cadun_qtd_familias_cadastradas_i:[1 TO *]`) e baixa todos os ~5570 municípios de uma vez em formato CSV streaming, parseando linha-a-linha e fazendo upsert em lotes de 500. Roda como background task via `EdgeRuntime.waitUntil` para responder ao chamador em milissegundos. (3) `fetch-official-data` ganhou `fetchCADUNICOFromCache` que lê o cache e devolve `pct_pop_baixa_renda` como `igma_populacao_de_baixa_renda` com source='CADUNICO' e `real=true`, sobrepondo o IBGE quando disponível. (4) Job pg_cron `ingest-cadunico-monthly` agendado para o dia 7 de cada mês às 04:00 UTC. (5) Seed inicial disparado: tanto `ingest-cadunico` quanto `ingest-anac` foram executados manualmente para popular os caches imediatamente, sem esperar o próximo ciclo agendado. Resultado: novos diagnósticos passam a vir com população em baixa renda atualizada mensalmente, com fonte oficial MDS, sem perder o fallback IBGE para municípios eventualmente ausentes do Solr."
    ]
  },
  {
    version: "1.38.23",
    date: "2026-04-30",
    type: "patch" as const,
    changes: [
      "ANAC — Conectividade Aérea (OE003) agora é COLETADA AUTOMATICAMENTE via cache mensal. Antes, o CSV oficial de 353 MB (`Dados_Estatisticos.csv`) era inviável para baixar/parsear na edge function a cada diagnóstico (limite de memória), então o indicador caía como MANUAL e ficava em branco/zerado. Solução implementada: (1) Nova tabela `anac_air_connectivity` armazena, por código IBGE, métricas agregadas dos últimos 12 meses (voos totais/domésticos/internacionais, passageiros, aeroportos ICAO, voos por semana — calculado como coluna gerada). (2) Nova edge function `ingest-anac` baixa o CSV via streaming linha-a-linha (decoder Latin-1, parser CSV com aspas), agrega em memória apenas contadores por município (mapeando aeródromo→IBGE pelo `aerodromos.csv` de 900 KB), filtra os últimos 12 meses pelo cabeçalho ano/mês, faz upsert em lotes de 500. Roda como background task (`EdgeRuntime.waitUntil`) para responder ao chamador em milissegundos enquanto processa em segundo plano. Toda execução é logada na tabela `anac_ingestion_runs` (status, linhas processadas, bytes baixados, municípios atualizados, erro). (3) Job pg_cron `ingest-anac-monthly` agendado para o dia 5 de cada mês às 03:00 UTC, dispara o edge function via pg_net. (4) `fetch-official-data` ganhou nova função `fetchANACFromCache` que lê o cache: se existe registro, devolve `voos/semana` como valor de OE003 com source='ANAC' e `real=true`; se não existe (município sem aeroporto comercial), grava 0 voos/semana também como dado real (em vez de marcar como MANUAL). Resultado: novos diagnósticos passam a vir com OE003 automaticamente preenchido, sem download recorrente de 353 MB e sem promessa quebrada de coleta automática."
    ]
  },
  {
    version: "1.38.22",
    date: "2026-04-29",
    type: "patch" as const,
    changes: [
      "Restauração de fontes oficiais e do tom narrativo do relatório. (1) DATASUS — Leitos hospitalares: nova função `fetchDATASUSLeitos` no edge `fetch-official-data` consome a API DEMAS oficial (`apidadosabertos.saude.gov.br/assistencia-a-saude/hospitais-e-leitos`), pagina por offset (até 8 páginas × 1000 hospitais), filtra pelo `codigo_ibge_do_municipio` e agrega `quantidade_total_de_leitos_do_hosptial` e `_sus_do_hosptial`. Resultado popula automaticamente `igma_leitos_por_habitante` (sobrepondo o IBGE com source='DATASUS') e `igma_leitos_hospitalares_sus_por_mil_habitantes` (que estava sem coleta automática). (2) ANAC — Conectividade Aérea (OE003): mantida como MANUAL no MVP; o único endpoint público disponível é um CSV de 353 MB (`Dados_Estatisticos.csv`) inviável de baixar/parsear em edge function (limite de memória). Solução pragmática para evitar promessa quebrada — manter o indicador como entrada manual com link direto ao portal ANAC nas próximas iterações. (3) CADÚNICO — População de baixa renda: a API oficial em `gov.br/conecta/catalogo/apis/cadunico-servicos` exige token federal MDS que precisa ser solicitado por portal próprio; mantém-se o fallback IBGE Pesquisas tabela 36/30246 (Incidência de Pobreza) já em produção, marcado como source='IBGE' até o token MDS ser obtido. (4) Tom narrativo restaurado no prompt do `generate-report` — nova regra obrigatória pedindo PARÁGRAFOS CORRIDOS de 3-6 frases nas seções de análise (Resumo, Diagnóstico por Eixo, Conclusão), proibindo substituir prosa por bullets soltos, e exigindo 1-2 parágrafos interpretativos após cada tabela de indicadores conectando dado → causa → impacto → decisão. Restaura o estilo do relatório-referência de Foz do Iguaçu de 27/04/2026 09:41 sem abrir mão da padronização de tabelas/cores/colunas da v1.38.19."
    ]
  },
  {
    version: "1.38.21",
    date: "2026-04-29",
    type: "patch" as const,
    changes: [
      "Watchdog anti-travamento na geração de relatórios. Causa do bug: quando a stream SSE do `generate-report` parava de enviar chunks (rede flutua, edge function ainda finalizando, browser perde foco), o `reader.read()` no cliente ficava bloqueado indefinidamente — `isGenerating` nunca voltava a `false`, o botão ficava 'Gerando…' para sempre, e o usuário acabava disparando 3–4 gerações paralelas (todas concluíam no servidor, mas a UI continuava travada). Correção em `src/pages/Relatorios.tsx`: (1) `AbortController` envolvendo o fetch SSE com timeout duro de 240s e watchdog de inatividade de 90s — se nenhum chunk chegar nesse intervalo, a conexão é abortada com motivo `idle-timeout` e a UI é destravada; (2) Botão 'Cancelar' visível durante a geração, permitindo o usuário interromper sem precisar recarregar a página; (3) Contador de tempo decorrido no botão ('Gerando… 47s') e no card do relatório, com aviso amarelo a partir de 60s pedindo paciência e proibindo novo clique; (4) Toast diferenciado quando o erro é `idle-timeout` ou `hard-timeout`, orientando o usuário a checar o histórico antes de tentar de novo (porque o relatório provavelmente foi salvo no servidor mesmo assim) e invalidando a query `generated-reports` para refletir o novo registro automaticamente; (5) Reset garantido de `isGenerating`, timers e AbortController no `finally`, eliminando o cenário em que a UI travava em estado de geração após erro de rede silencioso."
    ]
  },
  {
    version: "1.38.20",
    date: "2026-04-29",
    type: "patch" as const,
    changes: [
      "Correção do indicador 'Densidade Demográfica' (e demais contextuais — População e Área Territorial) que aparecia como '0% — Crítico' no painel e nos relatórios. Causa raiz: a coluna `indicator_scores.score` era `NOT NULL`, então quando o `calculate-assessment` tentava gravar `null` para indicadores com peso 0 (contextuais — apenas caracterizam o território, não pontuam), o Postgres rejeitava o insert ou o código upstream caía no fallback `0`, fazendo a densidade real (ex.: 468,51 hab/km²) virar score=0/Crítico. Correção em duas frentes: (1) Migração de schema — `indicator_scores.score`, `value_normalized` e `score_pct` agora aceitam `NULL`; novo CHECK `score IS NULL OR (score BETWEEN 0 AND 1)`; constraint preservada para os pontuáveis. (2) Limpeza retroativa — todos os registros de indicadores com peso=0 (densidade, população, área) tiveram score/normalized/pct setados para NULL e `normalization_method='contextual'`, eliminando os falsos críticos legados nos snapshots. Comentário documental adicionado à coluna. Resultado: densidade aparece com seu valor real e rótulo INFORMATIVO (⚪) tanto no painel quanto nos relatórios; deixa de poluir a média do pilar RA com zero falso."
    ]
  },
  {
    version: "1.38.19",
    date: "2026-04-29",
    type: "patch" as const,
    changes: [
      "Padronização visual canônica de relatórios (Word, PDF e visualização na tela). Antes, cada geração apresentava colunas, ordens e cores diferentes — alguns vinham com 'Score', outros com 'Valor', alguns coloridos, outros monocromáticos. Agora há um único template forçado em três camadas: (1) Prompt LLM (`generate-report`) — toda tabela de indicadores DEVE usar EXATAMENTE 5 colunas nesta ordem: `Indicador | Valor | Unidade | Status | Fonte`. Status sempre com emoji+rótulo canônico (🟢 EXCELENTE | 🔵 FORTE | 🟡 ADEQUADO | 🟠 ATENÇÃO | 🔴 CRÍTICO | ⚪ INFORMATIVO). Proibido criar colunas extras — benchmark/evidência vão em parágrafo abaixo. Aplica-se também ao Enterprise (Diagnóstico por Categoria Funcional). (2) Renderizador DOCX (`exportReportDocx`) — H1/H2 e cabeçalho de tabela passam a usar a `primaryColor` da Personalização do Relatório (institucional). Células de Status são detectadas e coloridas automaticamente (verde/azul/amarelo/laranja/vermelho/cinza) com texto em negrito centralizado. (3) Preview on-screen + PDF/print (`Relatorios.tsx`) — `renderMarkdown` colore H1/H2 com a cor institucional, `<th>` ganha fundo institucional + texto branco, e células de Status recebem o mesmo esquema de cores fixas (HEX, garantindo paridade com print que não carrega CSS variables). Novo módulo compartilhado `src/lib/reportStatusStyle.ts` é a fonte única da verdade para mapeamento status→cor e detecção de coluna canônica — usado pelo DOCX e pela preview. Resultado: todo relatório, independente de modelo (Claude/Gemini), template (Completo/Executivo/Investidor) ou modo (Territorial/Enterprise), sai com a MESMA estrutura de colunas, MESMA paleta institucional e MESMO sistema de cores de status."
    ]
  },
  {
    version: "1.38.18",
    date: "2026-04-29",
    type: "patch" as const,
    changes: [
      "Correção dos 20 GAPs apontados na auditoria do relatório (v1.38.13). (1) NORMALIZAÇÃO 0–1 (GAPs #1–#6, #15, #19, #20): `calculate-assessment/normalizeValue` agora detecta automaticamente quando o usuário insere um índice em escala 0–1 (ex.: 0,58 para ESG) em indicadores cujo catálogo define faixa 0–100 (ESG, Segurança Hídrica, IEC-M, Transparência, Gestão de Riscos). Antes: 0,58 → (0,58−0)/(100−0) = 0,58% → CRÍTICO falso. Agora: o valor é reescalado linearmente para a faixa do range antes do MIN_MAX, produzindo 58% → ATENÇÃO correto. Heurística: range ≥ 10 + valor ∈ (0,1]. (2) INDICADORES CONTEXTUAIS (GAPs #7, #8): indicadores com peso 0 (População, Área Territorial, Densidade Demográfica) agora são classificados como CONTEXTUAL — não recebem score, status nem entram na média ponderada do pilar. O `source_type` na auditoria recebe o sufixo `_CONTEXTUAL` para que o LLM apresente apenas na ficha técnica como dados informativos. (3) ATRIBUIÇÃO DE FONTE (GAPs #9, #14, #17): novas regras duras no system prompt do `generate-report` mapeando explicitamente Leitos de Hospedagem → CADASTUR (nunca DATASUS), Leitos hospitalares SUS → DATASUS, CAPAG → STN. Coluna 'Evidência' agora deve ser preenchida com fonte real + ano da trilha quando não houver value_text — proibido o placeholder genérico para dados que existem na auditoria. (4) DIVERGÊNCIA DE VALORES (GAPs #11–#13): nova 'TABELA CANÔNICA DE VALORES' injetada no prompt como fonte única da verdade — cada número do relatório deve bater EXATAMENTE com esta tabela (CAPAG B≠C, permanência 2,3 dias≠2,5 dias, GEE 2,4≠2 tCO₂eq/hab.). (5) IGMA EXPANDIDO (GAP #18): primeira menção no relatório obrigatoriamente expande 'Índice de Gestão Municipal Ambiental (IGMA)'. (6) COMPARATIVO OPT-IN (GAP #16): bloco de comparação com rodada anterior agora só é injetado quando o cliente passa `enableComparison: true`. Novo toggle 'Comparativo' na tela de geração (Relatórios → Gerar) com tooltip explicativo, default desativado. Resultado: relatórios de Foz e similares deixam de mostrar status crítico falso, deixam de comparar rodadas sem solicitação e passam a respeitar literalmente os valores validados pelo usuário."
    ]
  },
  {
    version: "1.38.17",
    date: "2026-04-29",
    type: "patch" as const,
    changes: [
      "Logs — recuperação dos relatórios gerados antes da correção de auditoria. Foi realizado backfill dos registros existentes em `generated_reports` para `audit_events`, fazendo com que relatórios já salvos apareçam em Configurações → Logs. Como esses relatórios antigos foram criados antes da captura do provedor LLM, a interface agora mostra 'Modelo não registrado' e um badge 'histórico sem modelo' em vez de atribuir incorretamente Claude ou Gemini. Novas gerações continuam registrando o modelo real usado."
    ]
  },
  {
    version: "1.38.16",
    date: "2026-04-29",
    type: "patch" as const,
    changes: [
      "Logs — correção do registro de auditoria de geração de relatório. Em v1.38.15 o evento `report_generated` não estava sendo gravado em `audit_events` porque o bloco assíncrono que persiste o relatório (generated_reports + report_validations + audit_events) era interrompido quando o cliente fechava a conexão SSE ao terminar o stream. Agora a tarefa de pós-processamento é mantida viva via `EdgeRuntime.waitUntil(...)`, garantindo que o insert do audit chegue ao banco mesmo após o usuário receber o relatório completo. Resultado: a aba Configurações → Logs passa a exibir corretamente cada geração com o modelo LLM utilizado (Claude Sonnet 4.5 ou Gemini 2.5 Pro) e eventual badge de fallback."
    ]
  },
  {
    version: "1.38.15",
    date: "2026-04-29",
    type: "patch" as const,
    changes: [
      "Logs (Configurações → Logs) — auditoria de geração de relatórios com modelo LLM utilizado. A edge function `generate-report` agora insere um evento `report_generated` em `audit_events` ao final de cada geração bem-sucedida, com metadata contendo: `provider` (claude|gemini), `model` (anthropic/claude-sonnet-4-5-20250929 ou google/gemini-2.5-pro), `fallback_reason` (preenchido quando Claude falhou e caiu para Gemini), `template` (completo/executivo/investidores), `destination_name`, `assessment_id`, `validation_status` e `total_issues`. O painel `LogAnalytics` na aba Logs exibe esses eventos com ícone próprio (FileText), cor indigo, badge colorido do provedor (laranja para Claude, azul para Gemini), nome do destino, template usado e — quando aplicável — badge âmbar com o motivo do fallback. Resultado: o ADMIN consegue auditar em tempo real qual modelo gerou cada relatório e quando houve fallback automático para Gemini."
    ]
  },
  {
    version: "1.38.14",
    date: "2026-04-29",
    type: "patch" as const,
    changes: [
      "Geração de Relatórios — Claude Sonnet 4.5 como modelo primário, Gemini como fallback automático. A edge function `generate-report` agora tenta primeiro Anthropic Claude (`claude-sonnet-4-5-20250929`) via API direta com a chave `ANTHROPIC_API_KEY` configurada como secret. O stream SSE da Anthropic é adaptado em tempo real para o formato OpenAI-compatível (`data: {choices:[{delta:{content}}]}`) consumido pelo parser downstream — preservando intactas todas as camadas posteriores (auto-correção determinística, detecção de coerência, agente IA validador `gemini-2.5-pro`, persistência em `report_validations`, banner de validação cruzada). Em caso de erro HTTP, indisponibilidade, créditos esgotados ou exceção de rede do lado Anthropic, o sistema cai automaticamente para o Lovable AI Gateway (`google/gemini-2.5-pro`) sem interromper o usuário — o motivo do fallback é logado (`provider: gemini (fallback after Claude: ...)`). A chave Anthropic NUNCA é exposta no frontend, fica apenas como secret server-side. Resultado: maior rigor factual e qualidade narrativa do Claude para texto analítico longo, com resiliência total via Gemini sempre que necessário."
    ]
  },
  {
    version: "1.38.13",
    date: "2026-04-29",
    type: "patch" as const,
    changes: [
      "Validação Oficial — persistência definitiva do estado validado entre sessões. Removida a operação destrutiva em `useFetchOfficialData` que zerava `validated=false` em TODA a tabela `external_indicator_values` daquele município/org sempre que o usuário (ou o auto-fetch) acionava 'Atualizar' ou 'Buscar Dados'. Antes, qualquer refetch apagava silenciosamente todas as confirmações anteriores e o usuário era forçado a revalidar o pré-preenchimento ao retomar o diagnóstico. Agora a função tira um snapshot dos valores validados ANTES do fetch e reconcilia depois: linhas cujo `raw_value` retorna idêntico mantêm o flag `validated=true` (re-stamped por segurança); apenas linhas cujo valor mudou de fato são marcadas como `validated=false` para revisão pontual. `DataValidationPanel.handleSelectAll` também foi ajustado para não re-selecionar linhas já confirmadas, evitando re-stamps desnecessários. Combinado com as correções de v1.38.11 (seed de `confirmedIds` a partir do banco + skip de auto-fetch quando há cache) e v1.38.12 (autosave do DataImportPanel), o fluxo de retomar agora preserva integralmente: validações oficiais, pré-preenchimento e indicadores manuais salvos."
    ]
  },
  {
    version: "1.38.12",
    date: "2026-04-29",
    type: "patch" as const,
    changes: [
      "Diagnóstico — persistência reforçada na entrada de indicadores. Implementado autosave debounced (2s após a última edição) no `DataImportPanel`: cada valor digitado e validado é gravado automaticamente via `bulkUpsertValues` (upsert seguro) sem exigir clique em 'Salvar' ou 'Salvar Todos'. Indicadores com erro de validação ficam pendentes até correção (não são salvos com lixo). Adicionado guard `beforeunload` que avisa o usuário se ele tentar sair da aba com edições não persistidas, e flush automático ao desmontar o componente. A troca de assessment no Select agora também executa flush antes de mudar — evitando perda silenciosa de rascunhos ao alternar entre diagnósticos. Indicador visual ('Salvando rascunho…' / 'Rascunho salvo' / 'Falha no autosave' / 'Alterações pendentes…') exibido junto ao botão Salvar Todos para feedback contínuo ao usuário."
    ]
  },
  {
    version: "1.38.11",
    date: "2026-04-29",
    type: "patch" as const,
    changes: [
      "Diagnóstico — correção de duas regressões graves no preenchimento de indicadores. (1) `useIndicators.bulkUpsertValues` (acionado pelo botão 'Salvar Todos' do DataImportPanel) NÃO apaga mais todas as linhas existentes da `indicator_values` daquele assessment antes de inserir as editadas. Antes, qualquer indicador previamente salvo unitariamente — ou pré-preenchido pela validação oficial — era silenciosamente destruído. Agora a operação é um upsert com onConflict='assessment_id,indicator_id': as linhas editadas são atualizadas in place e as demais permanecem intactas. (2) `DataValidationPanel` agora preserva o estado de validação entre sessões: o auto-fetch das fontes oficiais só dispara quando NÃO existe nenhum valor em cache para o destino+org (antes refazia o fetch a cada montagem, descartando validações anteriores). Além disso, o conjunto `confirmedIds` é semeado a partir dos valores que já estão marcados como `validated=true` na base, de modo que ao retomar um diagnóstico o usuário não precisa revalidar o que já tinha confirmado. Resultado: o fluxo de retomar diagnóstico mantém pré-preenchimento + validação + valores manuais salvos."
    ]
  },
  {
    version: "1.38.10",
    date: "2026-04-28",
    type: "patch" as const,
    changes: [
      "Metodologia — nova seção 'Tipos de Relatório' documentando explicitamente as diferenças entre Completo (técnico-acadêmico, ≥2.500 palavras, ABNT integral, 12 seções), Executivo (síntese decisória, 800–1.200 palavras, 5 blocos para alta gestão) e Investidores (atratividade econômica, 1.200–1.800 palavras, foco em ROI/BRL/risco-mitigador). Inclui também a variante Enterprise (substitui RA/OE/AO por categorias funcionais para empreendimentos) e lista as garantias comuns aos três templates: política Zero Alucinação, auto-correção determinística contra `assessment_indicator_audit`, validação por agente IA (gemini-2.5-pro), banner de validação cruzada sempre visível, persistência em `report_validations` e padrão BRL canônico."
    ]
  },
  {
    version: "1.38.9",
    date: "2026-04-28",
    type: "patch" as const,
    changes: [
      "Política 'Zero Alucinação' na geração de relatórios. (1) `CANONICAL_REFERENCES` reescrito com 12 regras duras: proíbe inventar/estimar/extrapolar qualquer número, ano, fonte ou citação que não esteja no contexto injetado (TABELA DE AUDITORIA / VALORES BRUTOS / BENCHMARKS OFICIAIS / BASE DE CONHECIMENTO / BIBLIOGRAFIA CANÔNICA); obriga usar literalmente '[dado não disponível na base validada]' quando faltar lastro; veta 'aproximadamente/cerca de/estima-se' sem fonte; veta comparações regionais sem benchmark oficial; veta tendência sem dois pontos no tempo; obriga ano de referência da auditoria; obriga fonte exata (proíbe disfarçar MANUAL como IBGE). (2) System prompts territorial e enterprise agora abrem com bloco prioritário 'POLÍTICA ZERO ALUCINAÇÃO' que sobrepõe qualquer outra regra de redação. (3) Agente IA validador (`runReportValidatorAgent`) endurecido — promovido para `gemini-2.5-pro`, limite de issues elevado de 10 para 20, e instruções reescritas com 10 categorias específicas a flagar (números sem lastro, anos divergentes, citações fora da bibliografia canônica, fontes trocadas, status invertido, comparações sem benchmark, frases evasivas que escondem invenção etc.). (4) Mantida toda a infra de auto-correção determinística + persistência em `report_validations` + banner sempre presente — agora com agente bem mais agressivo na detecção. Resultado: relatórios não podem mais 'preencher de qualquer jeito' onde faltam dados — ou citam o valor auditado, ou marcam explicitamente como indisponível."
    ]
  },
  {
    version: "1.38.8",
    date: "2026-04-28",
    type: "patch" as const,
    changes: [
      "Validação cruzada na geração de relatórios — sempre roda + auto-correção + persistência. (1) Nova etapa de auto-correção determinística no `generate-report` ANTES da validação: `applyAutoCorrections` percorre cada linha de `assessment_indicator_audit` com valor numérico, localiza citações próximas ao código do indicador no texto gerado e, quando a divergência > 5% (com tolerância para escala percentual ↔ decimal), substitui o número citado pelo valor canônico formatado em pt-BR. As substituições viram entradas `[auto-corrigido] indicator: from → to` no banner. (2) Banner SEMPRE injetado no topo do relatório (antes era só quando havia divergência) — mostra ✅ 'Validação cruzada — sem inconsistências' quando passa limpo, ou ⚠️ com a lista combinada de auto-correções + warnings determinísticos + achados do agente IA quando há ocorrências. (3) Nova tabela `report_validations` (RLS: ADMIN global, ORG_ADMIN da org dona do diagnóstico, service role manage) persistindo para cada geração: report_id, assessment_id, org_id, status (clean/warnings/auto_corrected), deterministic_issues, ai_issues, auto_corrections, total_issues e validator_version. Trilha histórica completa para auditoria, regressão e revisão. (4) Validação determinística e agente IA agora rodam sobre o texto JÁ corrigido, evitando duplicar avisos para divergências que a auto-correção resolveu. Não bloqueante — falha em qualquer etapa apenas loga e segue."
    ]
  },
  {
    version: "1.38.7",
    date: "2026-04-28",
    type: "patch" as const,
    changes: [
      "Agente validador de relatórios + bibliografia canônica anti-alucinação. (1) Bloco `CANONICAL_REFERENCES` injetado no system prompt do generate-report (territorial e enterprise) com datas/títulos canônicos das obras de Mario Beni — Análise Estrutural do Turismo (SENAC, 1997, 1ª ed., origem do modelo SISTUR; e 2007, 13. ed. revisada), Globalização do Turismo (Aleph, 2003), Política e Planejamento de Turismo no Brasil (Aleph, 2006) — corrigindo a alucinação recorrente que datava o SISTUR como 2021. Regra dura: NUNCA atribuir o modelo SISTUR a ano diferente de 1997/2007. (2) `detectCoherenceWarnings` expandido com três novas checagens determinísticas: detecção de citações `(BENI, ANO)` com ano fora do conjunto canônico; detecção de SISTUR atribuído a ano errado fora de citação parentética; validação cruzada de números — para cada linha de `assessment_indicator_audit`, procura citações próximas ao código do indicador no texto e sinaliza se o número diverge mais de 5% do valor auditado (com tolerância para escala percentual ↔ decimal). (3) Novo agente IA `runReportValidatorAgent` (segunda passagem, não bloqueante) — recebe relatório + audit trail compacto + bibliografia canônica e devolve JSON com até 10 divergências factuais objetivas (números, anos, autores, status, fontes trocadas). (4) Banner de validação cruzada agora mescla as duas camadas — `[determinístico]` e `[agente IA]` — e é prefixado ao relatório salvo, com o aviso de que a tabela de auditoria é a fonte de verdade. Resultado: chega de relatório dizendo 'BENI, 2021' e de números narrativos divergindo do diagnóstico."
    ]
  },
  {
    version: "1.38.6",
    date: "2026-04-28",
    type: "patch" as const,
    changes: [
      "Conformidade ABNT estendida ao template e tratamento de fontes do relatório gerado. (1) `exportReportDocx.ts` agora detecta a seção '## Referências' e renderiza cada item conforme NBR 6023:2018 — alinhamento à esquerda (não justificado), entrelinha simples (1,0) e espaço duplo (after: 240) ENTRE referências, sem recuo de primeira linha e sem marcador de bullet, mesmo quando o LLM lista as referências como itens '- '. O toggle é reativado/desativado a cada novo heading, garantindo que apenas a seção Referências siga essa regra. (2) Reconhecimento de títulos de tabela ABNT — linhas no formato 'Tabela N — Título' (ou 'Tabela N - Título') agora são renderizadas centralizadas, em negrito 10pt ACIMA da tabela seguinte, complementando o tratamento já existente de 'Fonte:' ABAIXO (NBR 14724). (3) O prompt do `generate-report` (system + user) já exigia integralmente as normas MEC/ABNT (NBR 14724/6024/6023/6028/10520), seção de Referências em ordem alfabética, citação de fonte em cada dado, tabelas com coluna 'Fonte', formatação numérica brasileira e estrutura textual numerada — agora a renderização DOCX honra essas regras visualmente."
    ]
  },
  {
    version: "1.38.5",
    date: "2026-04-28",
    type: "patch" as const,
    changes: [
      "Conformidade ABNT restaurada nos exportadores .docx. (1) Novo módulo `src/lib/abntStyle.ts` centraliza constantes MEC/ABNT (NBR 14724/6024/6023): A4, margens 3/2/3/2 cm, Arial 12pt corpo / 14pt H1, entrelinha 1,5, recuo de primeira linha 1,25 cm, títulos em preto e numeração de páginas no rodapé direito. (2) `exportTechnicalDocx.ts` (Documento Técnico): margens trocadas de 1\" (1440 DXA, ~2,54 cm em todos os lados) para o padrão ABNT, corpo migrado de 11pt (size 22) para 12pt (size 24) com entrelinha 1,5, títulos H1/H2/H3 normalizados em preto (não mais azul institucional) e com `outlineLevel` p/ sumário, capa reformulada conforme NBR 14724 (instituição em caixa-alta, título centralizado, natureza do documento à direita, cidade/ano centralizados), parágrafos justificados com recuo de 1,25 cm. Tabelas e diagramas mantêm cores de apoio (permitidos como ilustrações). (3) `exportDocsDocx.ts` (Metodologia + FAQ): mesmas correções — margens, fonte, entrelinha, títulos em preto e parágrafos com recuo. Rodapé com numeração à direita em algarismos arábicos. (4) `exportReportDocx.ts` (Relatórios) já estava conforme — apenas deixado como referência canônica."
    ]
  },
  {
    version: "1.38.4",
    date: "2026-04-28",
    type: "patch" as const,
    changes: [
      "UX — campos calculados claramente sinalizados no painel de pré-preenchimento. (1) DataImportPanel: indicadores derivados (IPCR, IDEB, IPTL, leitos/hab, receita per capita, IIET, I_SEMT) agora exibem badge inline 🧮 Calculado ao lado do nome — visível sem precisar expandir o item — com tooltip mostrando a fórmula e aviso 'Não preencha manualmente'. (2) O input numérico (ou Select) desses indicadores fica desabilitado, com fundo emerald, cursor not-allowed e placeholder '🧮 Calculado automaticamente', impedindo edição acidental. (3) IndicadoresTable (visão mobile): badge 🧮 Calculado adicionado ao card do indicador quando collectionType === 'DERIVED', alinhando com o que o desktop já exibia. Mantido o banner explicativo completo (fórmula + insumos + unidade) na seção expandida e no diálogo de detalhe."
    ]
  },
  {
    version: "1.38.3",
    date: "2026-04-28",
    type: "patch" as const,
    changes: [
      "Consolidação de indicadores duplicados. (1) Novos campos `deprecated_at` e `replaced_by_code` na tabela `indicators` permitem marcar indicadores substituídos preservando histórico de diagnósticos antigos. (2) 8 indicadores depreciados: `igma_agencias_turismo`→`igma_agencias_por_10k`, `igma_guias_turismo`→`igma_guias_por_10k`, `igma_meios_hospedagem`→`igma_hospedagem_por_10k`, `OE001` (leitos absoluto)→`igma_leitos_hospedagem_por_habitante`, `igma_despesa_turismo`→`igma_despesa_turismo_per_capita`, `RA006` (taxa emprego turismo)→`igma_empregos_turismo_por_1k`, `igma_visitantes_por_habitante`→`igma_iptl`, `RA002_ARCHIVED`→`ana_iqa`. (3) Reclassificados como CALCULATED (data_source enum estendido): `igma_ideb` (média anos iniciais+finais INEP), `igma_iptl` (visitantes÷população) e `igma_leitos_hospedagem_por_habitante` (leitos CADASTUR÷pop×1000). (4) Função `compute_derived_indicators` estendida para gerar automaticamente esses 3 novos derivados — IDEB com fallback caso só um componente exista. (5) `useIndicators` filtra `deprecated_at IS NULL` para esconder duplicados de novos diagnósticos. (6) Catálogo `src/data/derivedIndicators.ts` documenta as novas fórmulas. (7) Todos os assessments calculados marcados com `needs_recalculation=true` para incorporar os novos valores no próximo cálculo."
    ]
  },
  {
    version: "1.38.2",
    date: "2026-04-28",
    type: "patch" as const,
    changes: [
      "Indicadores derivados (calculados automaticamente) agora exibem um banner verde claro no painel de pré-preenchimento e no detalhe do indicador, mostrando: (1) a fórmula em português, (2) os insumos necessários (com origem oficial quando aplicável), (3) a unidade do resultado e (4) aviso explícito 'Não preencha manualmente'. Cobre IPCR, I_SEMT, IPTL, IIET e tourism_revenue_per_capita. Novo catálogo central em `src/data/derivedIndicators.ts` consolida fórmulas e dependências, evitando dúvidas sobre qual unidade ou valor o usuário deve fornecer."
    ]
  },
  {
    version: "1.38.1",
    date: "2026-04-28",
    type: "patch" as const,
    changes: [
      "IPCR (Índice de Poder de Compra Relativo) agora é calculado automaticamente. Nova tabela `national_reference_values` armazena valores oficiais de referência nacional (IBGE Contas Regionais — PIB per capita Brasil 2020-2023). A função `compute_derived_indicators` foi estendida para gerar `igma_ipcr` deterministicamente: PIB per capita do município (igma_pib_per_capita, IBGE) ÷ PIB per capita do Brasil × 100, marcado com source_code 'IBGE_PIB_PER_CAPITA+REF_NACIONAL'. Caso o ano municipal não tenha referência nacional, faz fallback para o ano mais recente disponível. Diagnósticos calculados foram marcados como `needs_recalculation = true` para incorporar o IPCR automaticamente no próximo cálculo. Resultado: o IPCR sai do preenchimento manual e passa a ter procedência derivada (nível 5), igual aos outros indicadores per capita do CADASTUR/IBGE."
    ]
  },
  {
    version: "1.38.0",
    date: "2026-04-27",
    type: "minor" as const,
    changes: [
      "Fechamento dos 3 últimos gaps do relatório técnico. (1) Schema dos indicadores: adicionados campos `formula` (texto da fórmula de cálculo) e `evidence_url` (link da fonte oficial) à tabela `indicators`; campos solicitados que já existiam sob outros nomes — `direction` (polaridade), `data_source`/`collection_type` (tipo de dado: API_OFICIAL/MANUAL/CALCULADO/ESTIMADO), `notes` (observação) e `reliability_score` (gerado de collection_type) — receberam COMMENTs explicitando o uso. (2) Renomeação semântica de leitos: o indicador CADASTUR `igma_leitos_por_habitante` foi renomeado para `igma_leitos_hospedagem_por_habitante` (e nome para 'Leitos de Hospedagem por Habitante') para evitar ambiguidade com o indicador hospitalar SUS `igma_leitos_hospitalares_sus_por_mil_habitantes` (DATASUS); referências em external_indicator_values e assessment_indicator_audit foram migradas. (3) Trava de coerência LLM no generate-report: novo helper determinístico `detectCoherenceWarnings` valida o texto gerado pela IA contra os valores numéricos auditados — detecta afirmações falsas sobre cumprimento dos mínimos constitucionais de saúde (CF Art.198, 15%) e educação (CF Art.212, 25%), confusão entre leitos CADASTUR e DATASUS, e contradições de status (ex: 'Adequado' afirmado quando o score é Crítico). Quando há contradições, um banner de aviso é prefixado ao relatório salvo, sinalizando ao leitor que os valores da tabela de auditoria são a fonte de verdade."
    ]
  },
  {
    version: "1.37.0",
    date: "2026-04-27",
    type: "minor" as const,
    changes: [
      "Operacional Fase 5 — Observabilidade das ingestões oficiais. (1) Nova tabela `ingestion_runs` (histórico unificado de execuções das edge functions ingest-*: function_name, triggered_by cron|manual|admin|system, status running|success|failed|partial, records_processed/failed, duration_ms, error_message, metadata JSON). RLS restrita a ADMIN. (2) Nova RPC `get_ingestion_health()` consolida última execução por função com cadência esperada (CADASTUR/Mapa do Turismo trimestral, ANA anual, TSE bienal, ANATEL mensal) e classifica health em healthy/partial/failed/stale/never_run conforme idade vs janela esperada. (3) Nova RPC `get_mtur_reference_freshness()` para lembrete anual de revisão da `tourism_spending_reference` (sinaliza needs_review quando latest_reference_year < ano-corrente − 2). (4) Nova edge function `trigger-ingestion` com guarda ADMIN — recebe { function_name } da whitelist (5 ingest-*), grava linha 'running' em ingestion_runs, invoca a função-alvo via service-role, atualiza status final + métricas + erro. (5) Nova página admin `/admin/ingestoes` (AdminIngestionHealth) com card de freshness MTur, grid de status por função (badge healthy/partial/failed/stale + botão Smoke test) e tabela das 50 últimas execuções (auto-refresh 30s). Link 'Ingestões' adicionado ao sidebar admin. (6) Filtros clicáveis no AssessmentAuditTrail: cada badge de procedência (OFFICIAL_API/DERIVED/MANUAL/ESTIMADA) agora é um toggle que filtra a tabela; cores migradas para tokens semânticos `severity-good/moderate`, `pillar-oe`, `primary` (sem emerald/violet/blue/amber crus do Tailwind)."
    ]
  },
  {
    version: "1.36.0",
    date: "2026-04-27",
    type: "minor" as const,
    changes: [
      "Fase 5 — Polimento final: (1) Tokens semânticos `--severity-strong` (HSL 152 65% 32%) e `--severity-excellent` (HSL 158 75% 24%) adicionados ao design system (index.css + tailwind.config.ts); SEVERITY_INFO.FORTE/EXCELENTE e componentes EnterpriseCategoriesView/PillarGauge migrados de `bg-emerald-600/700` (cor crua Tailwind) para classes semânticas `bg-severity-strong/excellent`. (2) Seed completo da `tourism_spending_reference` para as 27 UFs (MTur/Embratur 2023): valores calibrados por região — Norte/Centro-Oeste com permanência menor, Nordeste com maior tempo de estadia internacional (BA/CE/PE ~11–12 dias), Sudeste com maior gasto diário (RJ R$420/dia nacional, R$680/dia internacional). Total: 56 linhas (27 UFs × 2 origens + fallback BR). A função compute_tourism_revenue_per_capita agora usa parâmetros locais reais em vez de cair sempre no fallback BR. (3) Cron jobs (pg_cron + pg_net) agendados para todas as ingestões oficiais: ingest-cadastur (trimestral, 1º de jan/abr/jul/out 03:00 UTC), ingest-mapa-turismo (trimestral 04:00 UTC), ingest-ana (anual, 1º de fevereiro 05:00 UTC), ingest-tse (bienal, 1º de maio 06:00 UTC), ingest-anatel (mensal, dia 5 02:00 UTC). (4) Suíte de testes Vitest para `getSeverityFromScore` (escala 0-1 e 0-100), `getLegacySeverityFromScore` (colapso para 3 níveis) e validação de que SEVERITY_INFO usa apenas tokens `text-severity-*`/`bg-severity-*`. 9 novos testes — todos passam."
    ]
  },
  {
    version: "1.35.0",
    date: "2026-04-27",
    type: "minor" as const,
    changes: [
      "Fase 5 — Etapa 4: Motor de relatório com audit trail + BRL canônico. (1) generate-report agora consome `assessment_indicator_audit` (trilha de procedência populada pelo engine calculate-assessment) e injeta tabela markdown com Pilar/Indicador/Valor/Score/Origem/Peso/Detalhe no prompt do LLM, logo após VALORES BRUTOS. (2) Nova instrução obrigatória no prompt: toda conclusão deve citar a origem do dado (OFFICIAL_API → IBGE/DATASUS/STN/CADASTUR/INEP/ANA, DERIVED → fórmula determinística, MANUAL → autodeclarada, ESTIMADA → estimativa interna), com prioridade analítica para fontes oficiais e derivadas. Dados MANUAL/ESTIMADA ficam explicitamente sinalizados como tal no relatório. (3) Padrão BRL canônico reforçado: prefixo R$, vírgula decimal, ponto de milhar (ex: R$ 1.234.567,89) — vetando 'BRL', '$' e notação científica. Os formatadores formatRawIndicatorValue (CURRENCY/CURRENCY_THOUSANDS/CURRENCY_MILLIONS) já emitiam o padrão; agora a regra é também imposta ao LLM via system instruction."
    ]
  },
  {
    version: "1.34.0",
    date: "2026-04-27",
    type: "minor" as const,
    changes: [
      "Fase 5 — Etapas 2 e 3: Normalizações específicas + Ingestão automática (IQA & Receita Turística). (1) Engine calculate-assessment ganha helper `normalizeSpecific(code, value)` que tem precedência sobre MIN_MAX/BANDS/BINARY: CAPAG mapeia A=1,0 / B=0,75 / C=0,40 / D=0,10 (STN); mínimos constitucionais aplicam bonificação por cumprimento — saúde CF Art.198 (12%→0,50, 15%→0,85, 25%→1,0) e educação CF Art.212 (20%→0,50, 25%→0,85, 35%→1,0); IQA usa faixas oficiais ANA (Ótima ≥79=0,95 / Boa 51–79=0,75 / Aceitável 36–51=0,55 / Ruim 19–36=0,30 / Péssima <19=0,10). (2) Receita turística determinística — nova tabela `tourism_spending_reference` (UF/segmento/origem com gasto médio diário em BRL e permanência média; seed MTur 2023: nacional R$320/4,2 dias, internacional R$540/11,5 dias) e função `compute_tourism_revenue_per_capita(ibge)` calculando (visitantes_nac × gasto_nac × estada_nac + visitantes_intl × gasto_intl × estada_intl) ÷ população, com fallback UF→BR. (3) Pipeline de derivados (`compute_derived_indicators`) agora emite automaticamente `igma_receita_turistica_per_capita` quando há dados de visitantes + população. (4) IQA — função edge ingest-ana já existente passa a alimentar o pipeline; normalização centralizada no engine garante interpretação correta sem dependência de min/max manuais. RLS: tabela de referência tem leitura pública e escrita restrita a ADMIN."
    ]
  },
  {
    version: "1.33.0",
    date: "2026-04-27",
    type: "minor" as const,
    changes: [
      "Fase 5 — Etapa 1: Régua oficial SISTUR de 5 níveis (substituição global no engine). (1) Banco: enum public.severity_type estendido com FORTE e EXCELENTE preservando snapshots históricos (CRITICO/MODERADO/BOM continuam válidos); nova função SQL `get_severity_5_levels(numeric)` como referência canônica para queries diretas. (2) Tipo TS `Severity` em src/types/sistur.ts agora cobre os 5 níveis; helper canônico `getSeverityFromScore` retorna EXCELENTE (≥0,90), FORTE (0,80–0,89), BOM/Adequado (0,67–0,79), MODERADO/Atenção (0,34–0,66), CRITICO (<0,34); novo helper `getLegacySeverityFromScore` para pontos que ainda operam em 3 níveis (prescrições/IGMA). SEVERITY_INFO ganha labels Forte/Excelente com tons emerald-600/700. (3) Componentes Dashboard atualizados — EnterpriseCategoriesView, MandalaDestino, PillarGauge — para suportar os 5 níveis sem quebrar styling. (4) Edge function calculate-assessment v1.33.0: tipo SeverityType expandido; getSeverity grava 5 níveis em pillar_scores; severityLabels e severityOrder cobrem Forte/Excelente; classificação final do Score SISTUR alinhada com getSeverity (elimina labels divergentes 'INSUFICIENTE'/'EM_DESENVOLVIMENTO' que agora colapsam para MODERADO). (5) IGMA — bloqueio de Marketing (Regra 5) agora dispara em CRITICO ou ATENÇÃO baixa (<0,40) em RA/AO, com novo helper `isCriticalOrLowAttention`; cadência de revisão estendida (15m em BOM, 18m em FORTE/EXCELENTE). (6) Migração de dados: assessments com final_classification legado normalizados para MODERADO."
    ]
  },
  {
    version: "1.32.1",
    date: "2026-04-27",
    type: "patch" as const,
    changes: [
      "Unificação da nomenclatura de severidade — eliminação de incongruências entre engine (CRITICO/MODERADO/BOM) e UI (Crítico/Atenção/Adequado). (1) Novos helpers canônicos `getSeverityFromScore` e `getSeverityLabel` em `src/types/sistur.ts` como única fonte de verdade para classificar score→severidade e exibir labels — limites oficiais ≤0,33 Crítico, 0,34–0,66 Atenção, ≥0,67 Adequado. (2) Refatorados componentes que duplicavam mapeamento manual: EnterpriseCategoriesView (corrigido também limite incorreto 0.4→0.34), PublicDestinationCard, IndicatorSimulator, NormalizationCalculator, RoundComparisonView, useDashboardData, useEnterpriseDashboardData, pages/Index.tsx — todos agora consomem `getSeverityFromScore` + `SEVERITY_INFO`. (3) Corrigido PrescriptionModeView (criado em v1.32.0) que usava strings inexistentes 'ATENCAO'/'ADEQUADO' fora do enum — agora usa Severity canônica. (4) Marcado `getSeverityFromScore` no igmaEngine.ts como helper interno do motor IGMA, com nota apontando para o canônico em types/sistur. Decisão arquitetural: enum DB permanece CRITICO/MODERADO/BOM (preserva snapshots históricos e prescriptions); apenas a camada de exibição é unificada para Crítico/Atenção/Adequado. Zero mudança no engine de cálculo, prescrições ou IGMA."
    ]
  },
  {
    version: "1.32.0",
    date: "2026-04-27",
    type: "minor" as const,
    changes: [
      "Fase 4 — Etapa 2: Modo Prescrição. Novo toggle global 'Modo Prescrição' no header do DiagnosticoDetalhe (visível quando o diagnóstico está calculado), com persistência via querystring (?prescription=1) para preservar o estado em refresh e deep-links. Quando ativado, as abas Indicadores, Gargalos e Tratamento são filtradas para mostrar apenas indicadores em Atenção/Crítico (score ≤ 0,66) — gatilhos efetivos do motor de prescrição EDU. A aba Indicadores exibe um Alert informando 'X de Y indicadores' filtrados, e a aba Tratamento usa o mesmo subset para alimentar o EduRecommendationsPanel. Nova aba dedicada 'Prescrição' (Target icon) com componente PrescriptionModeView consolidado: cabeçalho explicativo, KPIs (Gatilhos identificados, Com prescrição EDU, Cobertura %), e listagem agrupada por pilar (RA/OE/AO) mostrando cada indicador disparador com badge de severidade, código, score, justificativa e curso EDU vinculado (com link direto). Indicadores sem curso correspondente recebem badge 'Sem curso' destacando lacunas no catálogo. TabsList ajustado para 7 colunas (territorial) / 8 colunas (enterprise)."
    ]
  },
  {
    version: "1.31.0",
    date: "2026-04-27",
    type: "minor" as const,
    changes: [
      "Fase 4 — Etapa 1: Pesos Customizáveis por Organização. Novas tabelas org_pillar_weights (RA/OE/AO com soma=100%) e org_indicator_weights (sobreposições por indicador, peso 0–10), ambas multi-tenant com RLS escopada a ADMIN global e ORG_ADMIN local. Quatro novas RPCs: get_org_pillar_weights e get_org_indicator_weights (leitura com fallback ao padrão), set_org_pillar_weights (atomic, valida soma=1.0) e set_org_indicator_weight (passa null para limpar override). Toda alteração de peso marca automaticamente os diagnósticos calculados da org como needs_recalculation=true. Edge function calculate-assessment agora carrega ambos os mapas no início do cálculo e: (a) substitui indicator.weight pelo override no loop principal, no audit trail e nas pillarData.weights; (b) aplica wRA/wOE/wAO customizados no Score Final SISTUR (default mantido em 0.35/0.30/0.35). Nova aba 'Pesos' no painel admin de Indicadores com OrgWeightsPanel: sub-aba 'Pesos por Pilar' com 3 sliders (validação visual de soma=100% com semáforo verde/vermelho) + botões Restaurar padrão / Salvar; sub-aba 'Pesos por Indicador' com filtros por pilar, tabela mostrando peso padrão vs efetivo e badge 'Personalizado' para overrides, edição inline com Enter ou botão. Acesso restrito a ADMIN/ORG_ADMIN."
    ]
  },
  {
    version: "1.30.17",
    date: "2026-04-27",
    type: "patch" as const,
    changes: [
      "Fase 3 fechada — Auditoria & Qualidade dos Dados Oficiais. (1) Nova tabela assessment_indicator_audit que registra a procedência de cada indicador em cada cálculo (MANUAL, DERIVED, OFFICIAL_API, ESTIMADA), com valor bruto, score normalizado, fonte detalhada e peso utilizado. RLS restringe leitura a ADMIN global e ORG_ADMIN local. Edge function calculate-assessment agora popula auditEntries durante o loop de indicadores e composites, persistindo via DELETE+INSERT a cada recálculo. (2) Nova RPC get_assessment_audit(p_assessment_id) que retorna a trilha completa para o assessment (apenas para admins do escopo). Novo componente AssessmentAuditTrail integrado na aba 'Indicadores' do DiagnosticoDetalhe, exibindo tabela com indicador, pilar, valor, score%, badge colorido de procedência, detalhe da fonte e peso, mais resumo de contagem por tipo de fonte no header. (3) Novo painel admin de Qualidade dos Dados Oficiais (ExternalDataQualityPanel) na nova aba 'Qualidade' do IndicadoresPanel, alimentado pela RPC get_external_data_quality. Mostra cards por fonte (IBGE, CADASTUR, STN, DATASUS, INEP, SISMAPA) com: total de registros, municípios distintos, última coleta, idade em dias com badge semafórico (≤30d Recente / ≤180d Aceitável / >180d Defasado) e barra de cobertura municipal calculada contra destinos com ibge_code. Acesso restrito a ADMIN/ORG_ADMIN."
    ]
  },
  {
    version: "1.30.16",
    date: "2026-04-27",
    type: "patch" as const,
    changes: [
      "Recálculo afetados & comparativo temporal — três melhorias médias. (1) Nova aba 'Recálculo' no painel admin de Indicadores (StaleAssessmentsPanel) que lista todos os diagnósticos marcados com needs_recalculation=true via RPC get_stale_assessments (escopo ADMIN global / ORG_ADMIN local), com botão 'Recalcular todos' em lote (progressivo) e ação individual por linha. Edge function calculate-assessment agora limpa needs_recalculation=false ao concluir o cálculo. (2) Banner stale no topo do DiagnosticoDetalhe quando o assessment está calculado mas needs_recalculation=true, com CTA 'Recalcular agora'. (3) Comparativo temporal no generate-report: busca a rodada anterior calculada do mesmo destination_id e injeta no prompt um bloco COMPARATIVO TEMPORAL com deltas de pilares (I-RA/I-OE/I-AO em pontos percentuais), Score Final e classificação, mais top 8 maiores variações por indicador (≥1 pp) ordenadas por magnitude, com instruções para o LLM dedicar uma seção à evolução, destacar conquistas (≥3 pp) e regressões (≥2 pp), sem inventar comparações entre municípios. Nova RPC clear_assessment_stale_flag(assessment_id) disponível para uso futuro."
    ]
  },
  {
    version: "1.30.15",
    date: "2026-04-27",
    type: "patch" as const,
    changes: [
      "Transparência admin & frescor de dados — três melhorias curtas. (1) Coluna 'Confiab.' (1–5★) na tabela de Indicadores admin: badge determinístico baseado na coleta efetiva (5★ Automático/API, 4★ Calculado/derivado, 3★ Manual, 2★ Estimado), com tooltip explicando a escala. (2) Filtro 'Calculado' adicionado ao seletor de Coleta no IndicadoresPanel, permitindo isolar os 7 indicadores derivados (igma_guias_por_10k, igma_hospedagem_por_10k, igma_agencias_por_10k, igma_empregos_turismo_por_1k, igma_despesa_turismo_per_capita, igma_arrecadacao_turismo_per_capita, igma_visitantes_por_1k) — eles agora aparecem com badge violeta 'CALCULADO' ao lado do nome. (3) Trigger automático mark_assessments_stale_on_external_data em external_indicator_values: sempre que dados oficiais (IBGE, CADASTUR, STN, MTur) são inseridos ou atualizados para um município, todos os assessments calculados de destinos daquele IBGE são marcados com needs_recalculation=true e data_updated_at=now(), permitindo que o sistema sinalize diagnósticos desatualizados após coletas/refresh de fontes oficiais. Novas colunas em assessments: needs_recalculation (boolean) e data_updated_at (timestamptz), com índice parcial idx_assessments_needs_recalc."
    ]
  },
  {
    version: "1.30.14",
    date: "2026-04-27",
    type: "patch" as const,
    changes: [
      "Fase 3 — UX de Transparência & Relatórios: novo painel 'Procedência dos Dados' (DataProvenancePanel) na aba Indicadores do diagnóstico, com cobertura automática (% via fontes oficiais + derivados), cards Oficiais/Calculados/Manuais e listagem dos indicadores derivados com fonte combinada (CADASTUR+IBGE, STN+IBGE, MAPA_TURISMO+IBGE). Motor de relatórios (generate-report) atualizado: rótulos das fontes derivadas no bloco PROVENIÊNCIA DOS DADOS e marcação 'Tipo: CALCULADO (derivado de fontes oficiais)' nos VALORES BRUTOS para que a narrativa do LLM diferencie indicadores oficiais de derivados.",
    ]
  },
  {
    version: "1.30.13",
    date: "2026-04-27",
    type: "patch" as const,
    changes: [
      "Fase 3 — Bloco B (Indicadores Derivados): adicionados 7 indicadores calculados automaticamente a partir das fontes oficiais já carregadas. Pacote A — Densidade da oferta turística (pilar OE): igma_guias_por_10k (CADASTUR÷IBGE×10k), igma_hospedagem_por_10k, igma_agencias_por_10k, igma_empregos_turismo_por_1k (Mapa do Turismo÷IBGE×1k). Pacote B — Fluxo & pressão (pilares AO e RA): igma_despesa_turismo_per_capita (STN×1000÷IBGE), igma_arrecadacao_turismo_per_capita (Mapa do Turismo÷IBGE), igma_visitantes_por_habitante / Taxa de Turistificação (visitantes nacionais+internacionais÷IBGE). Todos marcados como collection_type=ESTIMADA, fonte combinada (ex.: 'CADASTUR+IBGE'), com benchmarks nacionais (min/max/target) e peso ativo (0.020–0.025). Criada função SQL public.compute_derived_indicators(ibge_code, org_id) que devolve os valores calculados a partir de external_indicator_values validados, e o edge function calculate-assessment foi atualizado para chamar essa RPC após o merge dos dados oficiais — os derivados entram automaticamente no cálculo dos pilares com a flag _source='derived'. Função restrita a usuários autenticados (REVOKE para anon). Sem alterações em pesos pilar (RA 35% / OE 30% / AO 35%)."
    ]
  },
  {
    version: "1.30.12",
    date: "2026-04-27",
    type: "patch" as const,
    changes: [
      "Fase 2 do plano de relatórios — Bloco A (motor de dados): reclassificação de 76 indicadores IGMA que estavam marcados como MANUAL (preenchimento via formulário) para suas fontes oficiais brasileiras corretas. Distribuição final: 63 → IBGE (sustentabilidade, infraestrutura, mobilidade, socioeconômico, segurança pública), 13 → DATASUS (saúde e bem-estar: cobertura vacinal, expectativa de vida, óbitos evitáveis, desnutrição, atenção primária, gasto saúde, mínimo constitucional), 4 → INEP (educação: taxa de escolarização, ensino médio, ensino superior), 2 → STN (finanças públicas), e 2 índices proprietários SISTUR (IPTL e IIET) marcados como ESTIMADA/calculados (derivados de outros indicadores, não digitados manualmente). Impacto: a automação dos indicadores territoriais sobe de ~23% para ~70%; a UI do diagnóstico passará a mostrar 'Fonte oficial: IBGE/DATASUS/INEP/STN' (procedência nível 5) em vez de campo de input manual nesses indicadores; o motor de cálculo (calculate-assessment) já busca esses valores em external_indicator_values automaticamente — agora a metadata bate com o comportamento real. Bloco B (indicadores derivados, ex.: guias por 10 mil habitantes calculados a partir de CADASTUR ÷ IBGE) e Bloco C (pesos por indicador) ficam para iterações seguintes; pesos pilar (RA 35% / OE 30% / AO 35%) permanecem inalterados.",
    ],
  },
  {
    version: "1.30.11",
    date: "2026-04-27",
    type: "patch" as const,
    changes: [
      "Fase 1 do plano de relatórios — motor textual (generate-report): (1) pillarLabel agora normaliza scores em escala 0-1 ou 0-100 antes de classificar, eliminando o relato de usuário de percentuais quebrados (ex.: '6730%') quando o pilar vinha em escala alternativa; (2) toda formatação numérica do prompt enviado à IA passa a usar locale brasileiro — substituição completa de .toFixed() por formatNumberBR/formatPctBR/formatRawIndicatorValue em pipeline 3-camadas (raw → normalized → score%), evidências de gargalos, snapshots de proveniência e benchmarks externos (IBGE/DATASUS/STN/CADASTUR); (3) terminologia oficial padronizada — 'BOM' eliminado em todas as funções e prompts (territorial e enterprise), substituído por 'ADEQUADO' conforme régua canônica; (4) régua oficial de 5 níveis (Crítico/Atenção/Adequado/Forte/Excelente) ativada na ficha técnica e nos system prompts, com cores oficiais 🔴🟠🟡🔵🟢; (5) mapping de final_classification cobre tanto valores legados (BOM, EM_DESENVOLVIMENTO, INSUFICIENTE) quanto rótulos novos; (6) ordem dos pilares na ficha técnica corrigida para RA → OE → AO (canônica), antes estava RA → AO → OE; (7) IGMA flags agora distinguem 'ainda não calculadas' de 'calculadas e sem flags ativas', removendo ambiguidade textual. Próximas fases: motor de dados/origem, templates Executivo/Investidores, modo de prescrição configurável.",
    ],
  },
  {
    version: "1.30.10",
    date: "2026-04-27",
    type: "patch" as const,
    changes: [
      "Segurança: política de inserção da tabela edu_notifications restrita. Antes, qualquer usuário autenticado podia criar notificações apontando para qualquer outro user_id (WITH CHECK = true), abrindo brecha para falsificar avisos de prova/prazo/certificado para colegas. Agora, inserções diretas pela API só são aceitas se auth.uid() = user_id ou se o autor for ADMIN. Os fluxos automáticos (notify_classroom_assignment_targets, extend_assignment_due_date, grant_extra_attempts e demais triggers/funções) continuam funcionando porque rodam como SECURITY DEFINER e bypassam RLS. Nenhuma mudança de UI necessária.",
    ],
  },
  {
    version: "1.30.9",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Fase de preenchimento manual agora exibe alerta âmbar com link à fonte oficial para indicadores cuja coleta automática falhou. O DataImportPanel carrega os placeholders MANUAL deixados pelas edge functions ingest-tse e ingest-anatel (registros em external_indicator_values com raw_value=null e collection_method=MANUAL) e renderiza um quadro destacado abaixo do nome do indicador, com a nota explicativa e o link clicável para o portal oficial da fonte (TSE, Anatel, etc.). Antes, esses indicadores apareciam mudos no formulário — o operador não sabia que precisava buscar o dado em fonte externa nem para onde ir. Foco em MST_TSE_TURNOUT e MST_5G_WIFI (Mandala da Sustentabilidade no Turismo), mas o mecanismo é genérico e cobre qualquer indicador com placeholder MANUAL.",
    ],
  },
  {
    version: "1.30.8",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Calibração de 13 indicadores IGMA estruturais que estavam sem normalização (min_ref/max_ref nulos), causando score 0 ou indefinido. Três deles foram reclassificados como descritores estruturais com peso zerado (População, Área Territorial, Densidade Demográfica) — permanecem visíveis para contexto territorial mas não pontuam no I-SISTUR, pois são características do território e não métricas de desempenho. Os outros 10 receberam benchmarks oficiais brasileiros: IDH (PNUD 0,4–0,9, meta 0,8), IDEB (INEP 2–8, meta 6), Taxa de Escolarização (PNE 70–100%, meta 98%), Cobertura de Saúde (SUS 30–100%, meta 80%), Leitos por Habitante (OMS 0,5–6 por mil, meta 3), CADASTUR (Agências/Hospedagem/Guias por 10 mil habitantes), Despesa com Turismo (% executado, meta 2%) e Receita Própria (% receita total, meta 30% para autonomia fiscal).",
    ],
  },
  {
    version: "1.30.7",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Correção crítica MST: as fontes TSE e ANATEL foram inseridas em external_data_sources, eliminando o erro de FK constraint que impedia ingest-tse e ingest-anatel de persistirem valores em external_indicator_values. Antes desse patch, mesmo as 15 capitais âncora pré-populadas no cache não chegavam ao painel de pré-preenchimento — os erros ficavam apenas nos logs das edge functions (code 23503: 'Key (source_code)=(TSE) is not present in table external_data_sources').",
      "Documentação MST atualizada (FAQ, Metodologia e DOCX exportável) para refletir o estado real da automação: cobertura limitada a 15 destinos âncora, scraping sob demanda como tentativa de melhor esforço, e fallback manual com link à fonte oficial como caminho padrão para municípios fora do cache. Nova entrada no FAQ explica as 3 causas possíveis para 'não vejo indicadores MST no pré-preenchimento' (opt-in desligado, scraping falhou para município pequeno, ou bug FK pré-1.30.7).",
    ],
  },
  {
    version: "1.30.6",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Cache TTL inteligente para scraping MST: ingest-tse e ingest-anatel agora consultam tse_turnout_cache (reuso quando election_year >= 2024, último pleito municipal) e anatel_coverage_cache (TTL de 90 dias) ANTES de chamar Firecrawl. Cache hit retorna em <100ms sem custo de créditos. Cache miss aciona scrape e persiste o resultado para próximas rodadas. Como o disparo já acontecia no diagnóstico (DataValidationPanel quando includeMandala=true), os dados ficam sempre frescos para a rodada em curso e baratos para rodadas subsequentes do mesmo município.",
    ],
  },
  {
    version: "1.30.5",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Tentativa de scraping sob demanda via Firecrawl para MST_TSE_TURNOUT e MST_5G_WIFI: edge functions ingest-tse e ingest-anatel agora chamam o Firecrawl com candidatos de URL agregadores (G1 Eleições para TSE; Teleco para Anatel) ao criar destino. QUANDO o scraping consegue extrair o número (regex tolerante: comparecimento direto, abstenção, cobertura 5G/4G), o valor é gravado como AUTOMATIC com confidence 4 e cache em anatel_coverage_cache. Resultado prático: a maioria dos municípios cai no fallback MANUAL porque as agregadoras não publicam % por município em página estática (TSE expõe via SPA com hash routing; Anatel via painel Leaflet) — o sistema mantém o placeholder MANUAL com link à fonte oficial nesses casos. Para destinos onde a agregadora publica o número (ex: capitais com cobertura editorial pesada), a ingestão automática funciona.",
    ],
  },
  {
    version: "1.30.4",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Indicadores MST_TSE_TURNOUT e MST_5G_WIFI passam a ser tratados como MANUAIS após verificação de que TSE (cdn.tse.jus.br, divulga, dados.gov.br) e Anatel (sistemas, paineis, dados abertos) bloqueiam acesso programático de edge functions e do Firecrawl. As funções ingest-tse e ingest-anatel agora criam um placeholder vazio (raw_value: null) no painel de pré-preenchimento com nota explicativa e link direto para a fonte oficial, em vez de prometer ingestão automática que não existia.",
    ],
  },
  {
    version: "1.30.3",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Pré-preenchimento MST: edge functions ingest-tse e ingest-anatel agora persistem MST_TSE_TURNOUT (comparecimento eleitoral) e MST_5G_WIFI (cobertura 5G/4G/Wi-Fi público) em external_indicator_values quando org_id é fornecido. Antes os dados ficavam apenas no cache e nunca chegavam à tela de validação",
      "useFetchOfficialData ganha parâmetro includeMandala que dispara ingest-tse e ingest-anatel em paralelo com IBGE/CADASTUR/Mapa do Turismo/ANA. Diagnósticos sem o opt-in MST continuam sem invocar essas fontes (sem custo extra)",
      "DataValidationPanel: badge '🌀 MST' adicionado nas linhas da tabela para indicadores com prefixo MST_, com tooltip explicando a origem (Tasso, Silva & Nascimento, 2024). SOURCE_INFO ganha entradas TSE (🗳️) e ANATEL (📡)",
      "AssessmentCard: novo badge '🌀 MST' no cabeçalho dos cards de diagnóstico quando expand_with_mandala = true, tornando visível em /diagnosticos quais rodadas estão usando a extensão Mandala",
      "NovaRodadaDialogs e DiagnosticoDetalhe: prop includeMandala propagada para DataValidationPanel para que o pré-preenchimento respeite o opt-in da rodada",
    ],
  },
  {
    version: "1.30.2",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Autopreenchimento do indicador AO001 (Fluxo Turístico Anual): a edge function fetch-official-data agora deriva automaticamente AO001 = visitantes nacionais + visitantes internacionais a partir do Mapa do Turismo, tanto na rota REST API quanto no fallback de banco. Antes o agregado nunca era criado e o indicador aparecia vazio na tela de preenchimento mesmo com os dados-fonte (igma_visitantes_nacionais e igma_visitantes_internacionais) já ingeridos",
      "Backfill aplicado em 6 municípios que já tinham visitantes ingeridos (3505500, 3507100, 3509700, 3522109, 4108304, 5002209) — AO001 calculado e gravado em external_indicator_values com source MAPA_TURISMO e validated=false para revisão pelo gestor",
    ],
  },
  {
    version: "1.30.1",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Roteamento pós-login por papel: ao acessar '/', usuários ESTUDANTE (sem ERP) vão direto para '/edu' (Minha Jornada), PROFESSOR (sem ERP) vão para '/professor' (Gestão de Turmas) e ADMIN/ORG_ADMIN/usuários com acesso ERP continuam no Dashboard ERP. Antes apenas estudantes eram redirecionados, professores caíam em telas inadequadas",
      "ProtectedRoute: ORG_ADMIN agora também faz bypass da checagem de licença (igual ao ADMIN), evitando que administradores de organização sejam empurrados para a página de assinatura caso a licença esteja momentaneamente indisponível",
    ],
  },
  {
    version: "1.30.0",
    date: "2026-04-17",
    type: "minor" as const,
    changes: [
      "Mandala MST integrada ao motor de cálculo: os 9 indicadores complementares (MST_ACC_NBR9050, MST_TBC, MST_5G_WIFI, MST_PNQT_QUAL, MST_TSE_TURNOUT, MST_INCLUSAO_GESTAO, MST_SENSIBILIZACAO, MST_BIGDATA, MST_DIGITAL_PROMO) agora participam do cálculo de pilar com peso igual aos demais e geram issues + prescrições automaticamente quando o opt-in expand_with_mandala estiver ativo",
      "Mapeamento EDU para MST: 14 entradas adicionadas em edu_indicator_training_map ligando cada indicador MST a treinamentos existentes (acessibilidade, governança regional, transformação digital, comunitário) ou a 4 novos treinamentos placeholder MST (TBC, Sensibilização, Big Data Turístico, Promoção Digital) — gargalos MST agora produzem recomendações de capacitação como qualquer outro indicador",
      "generate-report: BASE_METHODOLOGY ganha bloco MST que orienta a IA a marcar gargalos MST com '🌀 [MST]' e citar a dimensão (Acessibilidade, TBC, Conectividade, etc.). Diagnósticos sem opt-in continuam sem qualquer menção à Mandala",
      "generate-project-structure: prompt instrui a IA a prefixar tarefas derivadas de indicadores MST com '🌀 MST:' e elevar a prioridade para pelo menos 'high' quando o status for CRITICO — projetos gerados por IA agora cobrem dimensões da Mandala explicitamente",
      "Cobertura completa do ciclo: ativando MST no Step 3 da Nova Rodada, o destino tem cálculo, gargalos, prescrições EDU, projeto gerado por IA e relatório PDF cobrindo automaticamente as 9 dimensões complementares da Mandala da Sustentabilidade no Turismo",
    ],
  },
  {
    version: "1.29.1",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Documentação: página Metodologia ganha seção dedicada à Mandala da Sustentabilidade no Turismo (MST) com os 9 indicadores complementares mapeados em RA/OE/AO, automação via TSE/Anatel/CADASTUR e nota sobre a Mandala do Destino",
      "FAQ: 4 novas perguntas cobrindo o que é a MST, como ativar via opt-in no Step 3 da Nova Rodada, quais indicadores são automatizados nos 15 destinos âncora e o que é o componente Mandala do Destino no Dashboard",
      "Sem mudanças funcionais — apenas atualização de documentação e FAQ para alinhar a base de conhecimento com as features lançadas em v1.28.0 e v1.29.0",
    ],
  },
  {
    version: "1.29.0",
    date: "2026-04-17",
    type: "minor" as const,
    changes: [
      "Caches oficiais MST: novas tabelas tse_turnout_cache (comparecimento eleitoral por município/ano) e anatel_coverage_cache (cobertura 5G/4G/Wi-Fi público) — populadas com 15 destinos turísticos âncora (capitais + Foz do Iguaçu, Olinda, Ribeirão Preto, Uberlândia)",
      "Edge functions ingest-tse e ingest-anatel agora retornam dados reais via cache (collection_method='AUTOMATIC') em vez de exigir entrada manual para esses 15 municípios",
      "Filtro 'Mandala' adicionado ao painel de Indicadores: 'Núcleo SISTUR' vs '🌀 Mandala MST' para visualização segregada do catálogo",
      "DiagnosticoDetalhe agora respeita assessment.expand_with_mandala: indicadores MST só aparecem quando o opt-in foi ativado na criação da rodada — diagnósticos legados continuam vendo apenas o núcleo SISTUR",
      "Novo componente MandalaDestino no Dashboard Territorial: visualização circular dos 3 conjuntos de Mario Beni (RA/OE/AO) com seus subsistemas explícitos (Ecológico/Social/Econômico/Cultural, Superestrutura/Infraestrutura, Mercado/Oferta/Demanda/Distribuição). Quando MST está ativo, anel externo mostra Tecnologia, Inclusão, TBC e Sensibilização",
      "Score Final SISTUR exibido no centro da Mandala como média dos pilares — sem ranking público, em conformidade com a constraint i-sistur-internal-only",
    ],
  },
  {
    version: "1.28.0",
    date: "2026-04-17",
    type: "minor" as const,
    changes: [
      "Mandala da Sustentabilidade no Turismo (MST): expansão opcional do diagnóstico baseada em Tasso, Silva & Nascimento (2024). Toggle no Step 3 do fluxo Nova Rodada permite incluir 9 indicadores complementares (4 RA, 3 OE, 2 AO) cobrindo acessibilidade NBR 9050, comparecimento eleitoral, qualificação PNQT, conectividade 5G/Wi-Fi, promoção digital, Big Data turístico, TBC, inclusão na gestão e sensibilização",
      "Banco: novas colunas indicators.is_mandala_extension e assessments.expand_with_mandala (não-destrutivo, default false). Diagnósticos antigos não são afetados",
      "Edge functions de automação: ingest-tse (comparecimento eleitoral), ingest-anatel (conectividade 5G/Wi-Fi) e ingest-cadastur estendido para extrair MST_PNQT_QUAL e MST_ACC_NBR9050",
      "useIndicators ganha parâmetro includeMandala para filtrar/incluir indicadores MST conforme contexto. Tabela de indicadores exibe badge '🌀 MST' nos 9 indicadores da extensão",
      "Score Final SISTUR e classificação preservados sem MST para garantir comparabilidade entre diagnósticos com/sem expansão",
    ],
  },
  {
    version: "1.27.3",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Configurações > Ferramentas: novo painel 'Ajuste de Pesos dos Indicadores' (admin-only) para calibrar pesos por pilar (RA/OE/AO) com edição inline, validação de soma 100%, ações Igualar / Normalizar 100% / Reverter / Salvar e indicação visual de pilares editados",
    ],
  },
  {
    version: "1.27.2",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Etapa A — Score Final SISTUR (FORMULAS_MATEMÁTICAS.docx): novas colunas assessments.final_score e assessments.final_classification populadas automaticamente em cada cálculo. Fórmula canônica: Final = (RA × 0,35) + (OE × 0,30) + (AO × 0,35)",
      "Classificação em 5 faixas conforme documento metodológico: Crítico (0,00–0,39), Insuficiente (0,40–0,54), Em Desenvolvimento (0,55–0,69), Bom (0,70–0,84), Excelente (0,85–1,00)",
      "Etapa B — Calibração de pesos: indicators.weight normalizado para somar exatamente 1,0 por pilar (RA/OE/AO), com proporção relativa preservada. Pesos originais arquivados em indicators.weight_legacy para auditoria",
      "Etapa C — Memória de cálculo: generate-report passa a incluir o Score Final SISTUR e classificação na tabela de identificação do relatório, com nota metodológica explícita (uso interno, sem ranking público, em conformidade com a constraint i-sistur-internal-only)",
      "Edge function calculate-assessment retorna final_score e final_classification no payload de resposta para uso direto no frontend",
    ],
  },
  {
    version: "1.27.1",
    date: "2026-04-17",
    type: "patch" as const,
    changes: [
      "Validação E2E: motor 'calculate-assessment' agora popula automaticamente as 3 camadas de dados (value_raw, value_normalized, score_pct) + metadados (polarity, normalization_method, confidence_level) em cada cálculo — antes apenas o backfill histórico estava preenchido",
      "Confidence level dinâmico no recálculo: indicadores de fontes API (IBGE, DATASUS, CADASTUR, SISMAPA, INEP, STN) recebem 1.0 e fontes manuais recebem 0.7 automaticamente",
      "Indicadores compostos (ex: I_SEMT, IIET) ganharam metadata explícita: normalization_method='composite_weighted' e confidence_level=0.85",
    ],
  },
  {
    version: "1.27.0",
    date: "2026-04-17",
    type: "minor" as const,
    changes: [
      "Etapa 3 (Fontes Turismo): indicador 'Leitos por Habitante' (igma_leitos_por_habitante) corrigido de DATASUS → CADASTUR — refere-se a leitos de meios de hospedagem, não a leitos hospitalares SUS. Indicador hospitalar renomeado para 'Leitos hospitalares SUS por mil habitantes' para eliminar ambiguidade",
      "Etapa 4 (Confiança): backfill aplicado em indicator_scores.confidence_level (Automática=1.0, Manual=0.7, Estimada=0.4) + populadas as colunas polarity e normalization_method a partir do indicador-mãe",
      "Etapa 5 (Padronização): novo indicador canônico cadunico_baixa_renda_pct (RA, polaridade LOW_IS_BETTER, fonte CADUNICO/MDS, faixa 0–60%) elimina a ambiguidade de 'população baixa renda' que estava como Manual genérico",
      "Nova view indicator_scores_enriched (security_invoker): consolida pipeline raw→normalized→score, polaridade aplicada, fonte e selo de auditoria (verificado / auditoria_pendente / baixa_confianca) — pronta para uso em dashboards e relatórios",
      "Etapa 6 (Relatório): generate-report agora envia ao prompt da IA, para cada indicador, três camadas explícitas: Bruto (com unidade formatada), Índice (0–1) e Score% (0–100), além de Polaridade aplicada, Fonte e selo visual de auditoria (✓ verificado / ⚠ auditoria pendente / ✗ baixa confiança) — corrige as divergências de Foz do Iguaçu",
      "Resultado prático: o LLM e o leitor humano agora distinguem claramente IDH 0,751 (índice) de 0,8% (porcentagem) e veem se a fonte é Cadastur, IBGE ou entrada manual pendente de validação",
    ]
  },
  {
    version: "1.26.0",
    date: "2026-04-17",
    type: "minor" as const,
    changes: [
      "Etapa 1 (Fundação Auditável): tabela indicator_scores expandida com value_raw (valor original), value_normalized (escala 0-1), score_pct (0-100), polarity (HIGH/LOW_IS_BETTER) e normalization_method aplicado — fim da confusão entre 'IDH 0,751' e '0,8%'",
      "Coluna confidence_level adicionada para sinalizar fontes manuais (0.7) vs automáticas (1.0) vs estimadas (0.4) — base para selos de auditoria",
      "Etapa 2 (Memória de Cálculo): nova tabela indicator_calculation_trail com fórmula textual, variáveis usadas (JSONB), fontes consultadas, ano/data de referência e snapshot das 3 etapas do pipeline (raw → normalized → score) — padrão acadêmico auditável",
      "Backfill automático: scores existentes copiados para value_normalized + score_pct preservando histórico calculado",
      "RLS multi-tenant aplicada a indicator_calculation_trail (visualização por org/demo, escrita restrita a ANALYST/ADMIN)",
      "Próximas etapas: 3 (migrar fontes turismo p/ Cadastur+SISMAPA), 4 (selos de confiança na UI), 5 (CADUNICO baixa renda), 6 (relatório com 3 colunas Bruto/Índice/Score)",
    ]
  },
  {
    version: "1.25.0",
    date: "2026-04-16",
    type: "minor" as const,
    changes: [
      "Nova flag interna value_format nos indicadores (13 categorias: PERCENTAGE, RATIO, INDEX_SCORE, CURRENCY, CURRENCY_THOUSANDS, CURRENCY_MILLIONS, COUNT, RATE_PER_CAPITA, DURATION, AREA, BINARY, CATEGORICAL, NUMERIC) — define como cada número deve ser interpretado em relatórios, dashboards e formulários",
      "Auto-inferência aplicada aos 130+ indicadores existentes a partir da unidade já cadastrada (% → PERCENTAGE, R$ → CURRENCY, IQA → INDEX_SCORE, etc.)",
      "Motor de relatório (generate-report) agora formata cada valor bruto seguindo a flag (R$ X,XX para moeda, X,X% para porcentagem, X mi para milhões) e inclui o formato como metadado no prompt da IA — fim das interpretações ambíguas (ex: 0,75 lido como 75% vs 0,75 unidades)",
      "Formatador centralizado em src/lib/indicatorValueFormat.ts (formatIndicatorValue, formatIndicatorValueWithUnit) — single source of truth para exibição numérica em todo o sistema",
      "formatIndicatorValueBR refatorado para delegar à flag value_format quando presente; mantém fallback por unidade para retrocompatibilidade",
    ]
  },
  {
    version: "1.24.3",
    date: "2026-04-16",
    type: "patch" as const,
    changes: [
      "Correção do IQA (Índice de Qualidade da Água): cadastrado o indicador 'ana_iqa' no catálogo territorial — agora os valores capturados pela integração ANA/Hidroweb passam a ser injetados corretamente no preenchimento do diagnóstico (caso reportado: Itanhaém/SP)",
      "Arquivamento do indicador duplicado 'RA002' (IQA manual) para evitar duplicidade — valores históricos foram migrados para 'ana_iqa' preservando o IQA de diagnósticos anteriores",
      "Auditoria completa de escopo: 26 indicadores ENT_* corretamente classificados como 'enterprise' e 107 indicadores 'territorial' (sem mais escopo 'both' incorreto)",
    ]
  },
  {
    version: "1.24.2",
    date: "2026-04-16",
    type: "patch" as const,
    changes: [
      "Correção de escopo: 6 indicadores Enterprise (ENT_REVIEW_SCORE, ENT_NPS, ENT_HORAS_TREINO, ENT_FORNECEDORES_LOCAIS, ENT_EMPREGO_LOCAL, ENT_CERTIFICACAO_AMB) deixaram de aparecer no diagnóstico Territorial — esses indicadores são exclusivos da análise empresarial (hospedagem/empresa) e não fazem sentido para a avaliação agregada do destino",
    ]
  },
  {
    version: "1.24.1",
    date: "2026-04-16",
    type: "patch" as const,
    changes: [
      "Documentação: Metodologia atualizada para 8 fontes oficiais integradas (inclusão da ANA/Hidroweb/Qualiágua para IQA municipal alimentando o pilar RA)",
      "FAQ ERP: nova pergunta sobre integração ANA/IQA e atualização da pergunta de fontes oficiais (8 fontes, 25+ indicadores)",
      "FAQ EDU: 5 novas perguntas cobrindo o fluxo completo de provas — agendamento pelo professor, acesso via Minhas Atividades, painel Acompanhar com KPIs e ações em massa, provas finais por pilar nas trilhas, e sistema anti-fraude",
    ]
  },
  {
    version: "1.24.0",
    date: "2026-04-16",
    type: "minor" as const,
    changes: [
      "Professor: novo painel 'Acompanhar' por atividade — drill-down com KPIs (conclusão, aprovação, nota média) e status individual por aluno (não iniciou, em andamento, aguarda correção, reprovado, esgotou tentativas, aprovado)",
      "Professor: filtro por status clicando nos chips de breakdown",
      "Ações em massa: enviar lembrete (todos pendentes / não iniciaram / não entregaram), prorrogar prazo, liberar tentativas extras",
      "RPCs server-authoritative: get_assignment_progress, extend_assignment_due_date, grant_extra_attempts, send_assignment_reminder",
      "Notificações automáticas em edu_notifications para alunos-alvo em prorrogação, tentativas extras e lembretes",
    ]
  },
  {
    version: "1.23.0",
    date: "2026-04-16",
    type: "minor" as const,
    changes: [
      "Professor: novo diálogo de atribuição de provas/trilhas/treinamentos com agendamento data+hora (liberação e prazo)",
      "Professor: atribuição individual — selecionar alunos específicos da turma ou enviar para todos",
      "Professor: regras específicas opcionais por prova (tempo, tentativas, nota mínima) sem alterar o ruleset global",
      "Aluno: nova página /edu/minhas-atividades listando todas as atribuições com janela, prazo e status",
      "Segurança: RPC server-authoritative can_student_start_assignment valida matrícula, alvo, janela e tentativas antes de iniciar prova",
      "Notificações: alunos-alvo recebem aviso automático na central ao serem atribuídos",
      "RLS: aluno só vê atividades em que está matriculado E é alvo (target_user_ids)",
    ]
  },
  {
    version: "1.22.0",
    date: "2026-04-16",
    type: "minor" as const,
    changes: [
      "EDU: trilhas formativas agora podem ter prova final por pilar coberto (RA/OE/AO)",
      "Nova tabela edu_track_exam_rulesets liga cada trilha a um ruleset por pilar (20 questões, 70% nota mínima, 60min, 2 tentativas)",
      "Backfill automático: todas as trilhas pré-prontas existentes receberam provas finais por pilar",
      "Novo checkbox 'Gerar provas finais automaticamente' (marcado por padrão) ao criar trilha — opcional",
      "Botão 'Gerar provas' no detalhe da trilha permite gerar/regenerar provas a qualquer momento (admin/criador)",
      "Painel 'Provas Finais da Trilha' lista provas disponíveis por pilar com config (questões/nota/tempo)",
    ]
  },
  {
    version: "1.21.15",
    date: "2026-04-16",
    type: "patch" as const,
    changes: [
      "Removidas políticas RLS permissivas (anon/true) em test_flow_registry, system_health_checks e test_registry_sync_log",
      "Acesso a tabelas de sistema restrito a ADMIN e service_role exclusivamente",
      "Removido SELECT público em lms_certificates — verificação pública via RPC verify_certificate_by_code",
      "Removido SELECT direto de org_admin em investor_profiles — acesso PII restrito ao dono do perfil (view segura mantida)",
      "Simplificada extração de indicadores em generate-project-structure (consistência código/objeto)",
    ]
  },
  {
    version: "1.21.14",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Adicionadas dicas de preenchimento ('Como obter') abaixo de cada indicador territorial no formulário de preenchimento",
      "Expandido catálogo de orientações (INDICATOR_GUIDANCE) com 25+ indicadores territoriais: saneamento, educação, saúde, economia, governança, IGMA, finanças e segurança",
      "Indicadores Enterprise e Territorial agora possuem orientação uniforme durante o preenchimento",
    ]
  },
  {
    version: "1.21.13",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Motor de cálculo agora cria automaticamente snapshots de proveniência (diagnosis_data_snapshots) ao calcular diagnósticos",
      "Todos os dados oficiais integrados (IBGE, SIDRA, CADASTUR, Mapa do Turismo, DATASUS, STN) são persistidos para uso em relatórios e análises",
      "Relatórios agora reconhecem fontes IBGE_CENSO, IBGE_SIDRA e INEP nos rótulos de proveniência",
      "Eliminada dependência de congelamento manual: proveniência é registrada automaticamente no cálculo",
    ]
  },
  {
    version: "1.21.12",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Novos indicadores automáticos via SIDRA/IBGE: Abastecimento de água (rede geral %) e Coleta de lixo domiciliar (%)",
      "Dados do Censo 2010 (tabela 3217) integrados ao pré-preenchimento de diagnósticos territoriais",
      "Edge function fetch-official-data agora consulta API SIDRA em paralelo com IBGE Pesquisas e Mapa do Turismo",
    ]
  },
  {
    version: "1.21.11",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Campos binários e categóricos no preenchimento agora usam lista de seleção em vez de input numérico",
      "Indicadores como Plano de Turismo, Conselho de Turismo e Região Turística passaram a validar por opções válidas",
      "Pré-preenchimento oficial e formulário principal exibem rótulos legíveis como Sim/Não e categorias A-E",
    ]
  },
  {
    version: "1.21.10",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Filtros no Histórico de Relatórios: tipo (Territorial/Enterprise), nível (Essencial/Estratégico/Integral) e autor (meus/todos)",
      "Badge de tipo de diagnóstico e nível nos relatórios salvos",
    ]
  },
  {
    version: "1.21.9",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Formatação numérica agora contextual: analisa unidade e tipo do indicador para escolher decimais",
      "Indicadores inteiros (hab, un, qtd) exibidos sem casas decimais (ex: 1.000 em vez de 1.000,00)",
      "Percentuais formatados com até 1 casa decimal (ex: 85,5%)",
      "Valores monetários (R$) com exatamente 2 casas decimais (ex: 375,00)",
      "Demais indicadores com até 2 casas decimais, removendo zeros desnecessários",
      "Função formatIndicatorValueBR centralizada e reutilizada nos painéis Territorial e Enterprise",
    ],
  },
  {
    version: "1.21.8",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Pré-preenchimento territorial e Enterprise agora normaliza e exibe números no padrão pt-BR em todos os campos atualizados",
      "Campos convertem visualmente valores com ponto para vírgula ao perder foco",
      "Validação e parsing aceitam formatos mistos e persistem os números internamente de forma consistente",
      "Metas, dicas de validação e inputs de pré-preenchimento alinhados ao padrão brasileiro de decimais",
    ],
  },
  {
    version: "1.21.7",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Campos de indicadores no pré-preenchimento agora exibem valores com vírgula decimal (padrão brasileiro)",
      "Input alterado de type=number para type=text com inputMode=decimal para aceitar vírgula",
      "Dicas de validação (mín/máx) formatadas em pt-BR com vírgula decimal",
      "Conversão automática de vírgula para ponto ao salvar valores internamente",
    ],
  },
  {
    version: "1.21.6",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Formatação numérica padrão brasileiro em relatórios: vírgula decimal e ponto de milhar",
      "Todos os percentuais, scores e valores numéricos nos dados do relatório usam formato pt-BR",
      "Instrução explícita no prompt da IA para nunca usar formato americano (ponto decimal)",
      "Exemplos: 65,3% (correto) em vez de 65.3%, 45.321 hab. em vez de 45,321",
    ],
  },
  {
    version: "1.21.5",
    date: "2026-04-15",
    type: "minor" as const,
    changes: [
      "Relatórios seguem recomendações do MEC e normas ABNT (NBR 14724, 6024, 6023, 6028, 10520)",
      "Capa institucional ABNT no DOCX com instituição, título, natureza do trabalho, cidade e ano",
      "Estrutura textual MEC: Resumo com palavras-chave, seções numeradas progressivamente",
      "Referências em formato ABNT NBR 6023:2018 (ordem alfabética com padrão institucional)",
      "Glossário de termos técnicos SISTUR e Apêndice com documentos da KB",
      "Linguagem impessoal (3ª pessoa) e citações no formato (SOBRENOME, ano)",
      "Tabelas com título numerado acima e fonte abaixo conforme ABNT",
      "Template Enterprise atualizado com mesmas regras MEC/ABNT",
      "Certificados EDU com base legal MEC (Art. 32 LDB, Resolução CNE/CES nº 1/2001)",
    ],
  },
  {
    version: "1.21.3",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Relatórios DOCX agora exportados no formato ABNT (NBR 14724 / NBR 6024)",
      "Margens: superior e esquerda 3cm, inferior e direita 2cm",
      "Espaçamento entrelinhas 1.5, recuo de parágrafo 1.25cm, texto justificado",
      "Títulos em caixa alta (H1), subtítulos em negrito, tabelas centralizadas com fonte 10pt",
      "Página A4, fonte Arial 12pt padrão, numeração de página à direita",
    ],
  },
  {
    version: "1.21.2",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Corrigido botão 'Calcular Índices' bloqueado para diagnósticos DRAFT com dados preenchidos",
      "Auto-promoção de DRAFT para DATA_READY na página de detalhes do diagnóstico quando dados suficientes",
      "Condição de habilitação do cálculo agora baseada em dados reais (indicadores preenchidos) em vez de status",
    ],
  },
  {
    version: "1.21.1",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Validação de campos no formulário territorial: limites min/max, inteiros e percentuais baseados no tipo de indicador",
      "Erros de validação exibidos em tempo real com destaque visual e bloqueio de salvamento",
      "Indicações de faixa válida (mín/máx) exibidas junto a cada indicador no formulário",
      "Atributos HTML min/max/step adicionados aos inputs para reforçar restrições no navegador",
    ],
  },
  {
    version: "1.21.0",
    date: "2026-04-15",
    type: "minor" as const,
    changes: [
      "Novo Dashboard 'Minha Jornada' (/edu) com visão consolidada de progresso, XP, streak e atividades recentes",
      "Catálogo de treinamentos movido para /edu/catalogo com navegação dedicada no menu",
      "Sistema de progresso granular: rastreamento por módulo, posição de vídeo e tempo de estudo (edu_detailed_progress)",
      "Sistema de gamificação: XP, níveis, streaks diários e 10 conquistas desbloqueáveis (edu_user_xp, edu_user_achievements)",
      "Notificações EDU em tempo real: prazos, resultados de exames, certificados emitidos (edu_notifications)",
      "Widget de avaliação/rating de treinamentos com estrelas e comentários (edu_training_ratings)",
      "Painel de anotações pessoais vinculadas a treinamentos e timestamps de vídeo (edu_notes)",
      "Calendário de estudos com aulas ao vivo e eventos futuros",
      "Relatório individual do aluno para professores: progresso por pilar, tempo de estudo e histórico de exames",
      "Importação CSV de alunos para turmas com preview e validação",
    ],
  },
  {
    version: "1.20.1",
    date: "2026-04-15",
    type: "patch" as const,
    changes: [
      "Removidas rotas duplicadas do módulo EDU: /cursos (legado), /learning e /admin/cursos (redirect)",
      "Item 'Quizzes' removido do menu lateral — funcionalidade integrada como aba dentro de Admin EDU",
      "Rotas legadas redirecionam automaticamente para equivalentes atuais (/cursos→/edu, /learning→/edu)",
    ],
  },
  {
    version: "1.20.0",
    date: "2026-04-14",
    type: "minor" as const,
    changes: [
      "Visual overhaul Apple-like: sombras difusas, cantos arredondados (rounded-2xl/3xl) e transições suaves de 200-300ms",
      "Botões com micro-animações: hover eleva (-translate-y-1px + shadow), active escala (0.97), font-semibold",
      "Cards com hover shadow-lg + translate-y e ícones com group-hover:scale-110",
      "StatCards redesenhados: tipografia maior (text-4xl), tracking-tight, espaçamento vertical refinado",
      "Login redesenhado: glassmorphism no card, gradiente decorativo com orbes blur, pattern de pontos sutil",
      "Tipografia global: h1-h3 com tamanhos responsivos, letter-spacing -0.025em, font-smoothing aprimorado",
      "Bottom nav mobile com frosted glass (backdrop-blur-2xl + backdrop-saturate-150 + borda translúcida)",
      "Novo token shadow-xl para elevações profundas e shadow-glow refinado",
      "Border-radius base aumentado de 0.625rem para 0.875rem (estética iOS)",
    ],
  },
  {
    version: "1.19.9",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "13 screenshots anotados adicionados aos tutoriais com setas e numeração indicando onde clicar",
      "Imagens ilustrativas para: login, onboarding, aprovação, trial, dashboard, alertas, diagnósticos, indicadores, cálculo, projetos, relatórios, catálogo EDU e Professor Beni",
      "Cada screenshot mostra anotações visuais (setas vermelhas numeradas) guiando o usuário passo a passo",
    ],
  },
  {
    version: "1.19.8",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "Sidebar reorganizada em 3 grupos colapsáveis: ERP, Educação e Recursos",
      "Grupos abrem automaticamente quando contêm a rota ativa",
      "Labels de grupo com ícone, nome e chevron de expansão/colapso",
      "Modo recolhido (ícones) mantém itens flat sem grupos para acesso rápido",
      "Redução visual de ~12 itens soltos para 3 seções organizadas",
    ],
  },
  {
    version: "1.19.7",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "Skeleton loaders com formato contextual (cards de diagnóstico, gauges de pilar, cards de treinamento) em vez de retângulos genéricos",
      "Componente EmptyState reutilizável com ícone, descrição e CTA para estados vazios",
      "Stepper mobile vertical colapsável no wizard Nova Rodada — substitui scroll horizontal de 700px",
      "Barra de progresso compacta com indicador de etapa atual no mobile",
      "Link 'Pular para o conteúdo' acessível no AppLayout (visível apenas com foco do teclado)",
      "aria-labels em botões de etapa do stepper e aria-current='step' na etapa ativa",
      "role='main' adicionado ao elemento main do layout",
    ],
  },
  {
    version: "1.19.6",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "Correção de erros de build em edge functions (TS type narrowing para catch blocks)",
      "Correção de dissertativas: lógica de correção + emissão de certificado centralizada no servidor via RPC finalize_essay_grading",
      "Removida inserção direta em lms_certificates pelo cliente (bloqueada por REVOKE INSERT)",
      "RPCs review_exam_answers, submit_exam_attempt e admin_list_quiz_options com cast temporário até sync de tipos",
    ],
  },
  {
    version: "1.19.5",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "Removido feedback da comunidade (fórum) dos relatórios — dados de fórum não são fonte analítica",
      "KB (Base de Conhecimento) agora estritamente isolada por organização nos relatórios — org_id filtrado explicitamente",
      "Corrigido uso de supabaseAdmin para KB no relatório, garantindo que organizações não vejam KB de outras orgs",
      "Numeração de seções dos templates de relatório corrigida após remoção da seção de comunidade",
    ],
  },
  {
    version: "1.19.4",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "Relatórios integram snapshots de proveniência, valores Enterprise e metadados do destino",
      "Seção 'Proveniência dos Dados' com rastreabilidade completa por fonte oficial",
      "Valores brutos Enterprise com benchmarks e categorias funcionais incluídos nos relatórios empresariais",
      "Metadados do destino (região turística, categoria, PDT) enriquecem a contextualização",
      "Prompts de IA atualizados para citar fontes específicas em cada dado e incluir seção de Fontes e Referências",
      "KB do destino e referências globais com instruções reforçadas para citação no relatório",
    ],
  },
  {
    version: "1.19.3",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "Painel visual de fontes de dados no pré-preenchimento: mostra quais bases alimentaram cada indicador",
      "Cards agrupados por fonte (IBGE, Mapa do Turismo, CADASTUR, DATASUS, STN) com contagem e tooltip detalhado",
      "Tooltip lista indicadores específicos capturados por cada fonte oficial",
      "Indicadores manuais contabilizados separadamente com aviso visual",
    ],
  },
  {
    version: "1.19.2",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "Busca de Reviews agora auto-preenche campos do perfil (estrelas, tipo, nº de UHs) além dos indicadores",
      "Removida duplicação do componente BusinessReviewSearch entre Passo 4 e Passo 5 Enterprise",
      "IA da edge function search-business-reviews agora extrai metadados do estabelecimento (property_metadata)",
      "Dados de reviews são persistidos no Passo 4 e repassados ao Passo 5 via initialAutoFillValues",
    ],
  },
  {
    version: "1.19.1",
    date: "2026-04-14",
    type: "patch" as const,
    changes: [
      "Corrigida navegação duplicada no passo 5 Enterprise (botões do painel + botões do wizard)",
      "Botão 'Voltar ao Perfil' adicionado no passo 5 Enterprise para navegação consistente",
      "orgId corrigido para usar effectiveOrgId (compatibilidade com modo Demo)",
    ],
  },
  {
    version: "1.19.0",
    date: "2026-04-13",
    type: "minor" as const,
    changes: [
      "Sistema de rastreamento de sessões EDU para compliance AVA (certificação MEC)",
      "Heartbeat a cada 30s: presença ativa, tempo de atividade e inatividade por sessão",
      "Log granular de interações: cliques, scrolls, play/pause vídeo, troca de aba, respostas em prova",
      "Detecção automática de inatividade (2 min sem interação) e encerramento de sessões ociosas (5 min)",
      "Flags automáticas de comportamento suspeito: sessões longas sem cliques, >80% inatividade, padrões de bot",
      "Painel de Compliance no Dashboard do Professor com estatísticas por aluno e drill-down de sessões",
      "Visualização detalhada de cada sessão com timeline completa de interações",
      "Workflow de revisão de alertas: professor pode confirmar fraude ou descartar com justificativa",
      "Tabelas edu_learning_sessions, edu_interaction_logs e edu_fraud_flags com RLS por papel",
      "Integração automática nas páginas de treinamento e prova (ExamTaking, EduTrainingDetalhe)",
    ],
  },
  {
    version: "1.18.6",
    date: "2026-04-13",
    type: "patch" as const,
    changes: [
      "Download da Metodologia e FAQ em formato Word (.docx) com formatação profissional",
      "FAQ atualizado com perguntas sobre o Mapa do Turismo Brasileiro e novos indicadores",
      "Botão 'Baixar em Word' adicionado às páginas de Metodologia e FAQ",
    ],
  },
  {
    version: "1.18.5",
    date: "2026-04-13",
    type: "patch" as const,
    changes: [
      "Metodologia atualizada com fonte Mapa do Turismo Brasileiro (API REST mapa.turismo.gov.br)",
      "Novos indicadores documentados: empregos, estabelecimentos, visitantes, arrecadação e conselho municipal",
      "Referência bibliográfica do Mapa do Turismo adicionada às referências da metodologia",
    ],
  },
  {
    version: "1.18.4",
    date: "2026-04-13",
    type: "patch" as const,
    changes: [
      "API REST do Mapa do Turismo integrada como fonte primária para ingestão de dados (3059 municípios)",
      "6 novos indicadores do Mapa do Turismo no pré-preenchimento: empregos, estabelecimentos, visitantes, arrecadação e conselho",
      "Edge function fetch-official-data com lookup em tempo real via API do Ministério do Turismo",
      "Fallback automático de API REST para CKAN CSV quando API não responde",
    ],
  },
  {
    version: "1.18.3",
    date: "2026-04-13",
    type: "patch" as const,
    changes: [
      "Indicadores do Mapa do Turismo integrados ao pré-preenchimento automático de diagnósticos",
      "Novo indicador igma_categoria_mapa_turismo: converte categoria A-E para escala numérica 1-5",
      "Novo indicador igma_regiao_turistica: indica se município pertence a região turística oficial",
      "Fonte MAPA_TURISMO adicionada ao enum data_source e ao catálogo de fontes externas",
      "Edge function fetch-official-data agora consulta mapa_turismo_municipios por código IBGE",
      "Painel de validação exibe dados do Mapa do Turismo com ícone 🗺️ e badge teal",
    ],
  },
  {
    version: "1.18.2",
    date: "2026-04-13",
    type: "patch" as const,
    changes: [
      "Integração Firecrawl como fonte primária para scraping do Mapa do Turismo Brasileiro",
      "Estratégia dupla: Firecrawl (scraping inteligente) com fallback automático para CSVs do CKAN",
      "Firecrawl descobre CSVs atualizados via map/search e extrai dados estruturados via scrape",
      "Toggle na UI para ativar/desativar Firecrawl — quando desativado, usa apenas CKAN estático",
      "Seletor de ano exibido apenas no modo CKAN (Firecrawl busca dados mais recentes automaticamente)",
      "Dados importados via Firecrawl são marcados com ano corrente e fonte rastreável",
    ],
  },
  {
    version: "1.18.1",
    date: "2026-04-13",
    type: "patch" as const,
    changes: [
      "Integração com Mapa do Turismo Brasileiro (dados.turismo.gov.br) via CKAN API",
      "Importação de regiões turísticas, categorização de municípios (A-E) e classificação por tipo",
      "Edge function ingest-mapa-turismo para ingestão de dados abertos do Ministério do Turismo",
      "Vinculação automática dos dados importados aos destinos cadastrados no SISTUR (por nome + UF)",
      "Painel de visualização com estatísticas, distribuição por categoria, filtros por UF e histórico de sincronização",
      "Tabela mapa_turismo_municipios com dados de 3059 municípios em 361 regiões turísticas",
    ],
  },
  {
    version: "1.18.0",
    date: "2026-04-13",
    type: "minor" as const,
    changes: [
      "Sistema completo de provas: histórico de tentativas, revisão detalhada e recurso/contestação",
      "Página 'Minhas Provas' no menu lateral EDU com estatísticas, filtros e histórico completo",
      "Revisão pós-prova: aluno visualiza respostas corretas/erradas, explicações e feedback do professor",
      "Sistema de recursos: aluno pode questionar resultado com justificativa detalhada",
      "Painel de gestão de provas no Dashboard do Professor com visão de todas as tentativas e recursos",
      "Admin/Professor resolve recursos com resposta e aceita/rejeita o pedido",
      "Agendamento de provas: campos available_from e available_until nos rulesets",
      "Campo grader_comment para feedback individualizado em questões dissertativas",
      "Tabela exam_appeals com RLS por papel (aluno cria, professor/admin gerencia)",
    ],
  },
  {
    version: "1.17.1",
    date: "2026-04-13",
    type: "patch" as const,
    changes: [
      "Registro dinâmico de testes (test_flow_registry): testes são auto-descobertos a partir do schema do banco, edge functions e rotas",
      "Edge function sync-test-registry escaneia tabelas, functions, buckets e rotas e atualiza o registro automaticamente",
      "Botão 'Sincronizar Testes' na UI para atualizar o registro a cada novo commit/deploy",
      "Health check agora lê testes do registro ao invés de lista hardcoded — novos componentes são testados automaticamente",
      "Log de sincronização com versão do app, testes adicionados/removidos e detalhamento por categoria",
    ],
  },
  {
    version: "1.17.0",
    date: "2026-04-13",
    type: "minor" as const,
    changes: [
      "Novo serviço de Verificação de Saúde do Sistema com testes de banco de dados, edge functions, storage e integridade de dados",
      "Monitoramento client-side automático: captura erros JS, rejeições de Promise e falhas de API em tempo real",
      "Botão 'Executar Verificação' em Configurações > Ferramentas para rodar testes sob demanda",
      "Cron job diário (4h UTC) executa verificação automaticamente e gera bug report em caso de falhas",
      "Histórico de verificações com status visual e detalhamento por categoria",
      "Tabelas system_health_checks e client_error_reports com RLS por organização",
      "Edge function run-health-check com 25+ checks distribuídos em 5 categorias",
    ],
  },
  {
    version: "1.16.0",
    date: "2026-04-13",
    type: "minor" as const,
    changes: [
      "Novo painel de gestão de usuários para ORG_ADMIN com criação, bloqueio, remoção e troca de papel/sistema",
      "ORG_ADMIN pode convidar membros diretamente para sua organização via formulário ou código de indicação",
      "Edge function manage-users atualizada com escopo restrito por org_id para ORG_ADMIN",
      "Banco de questões expandido para 50 itens distribuídos entre pilares RA, OE e AO",
      "Opção 'Conteúdo próprio' removida do formulário de nova atividade no painel do Professor",
      "Navegação e rotas atualizadas para permitir acesso de ORG_ADMIN a Configurações",
    ],
  },
  {
    version: "1.15.2",
    date: "2026-04-04",
    type: "patch" as const,
    changes: [
      "Gestão de Conteúdo (treinamentos, questões, provas, certificados) movida de /edu para /professor",
      "Catálogo EDU simplificado: sem aba de administração, foco no conteúdo do aluno",
      "AdminTrainingsPanel integrado como aba 'Gestão de Conteúdo' no ProfessorDashboard",
    ],
  },
  {
    version: "1.15.1",
    date: "2026-04-04",
    type: "patch" as const,
    changes: [
      "Tab 'Administração' renomeada para 'Gestão de Treinamento' no SISTUR EDU",
      "ORG_ADMIN agora tem acesso à aba de gestão de treinamento no catálogo EDU",
      "Nova aba 'Provas' adicionada ao painel de gestão com ExamBuilder integrado",
      "Tabs reorganizadas: Treinamentos, Questões, Provas, Certificados",
    ],
  },
  {
    version: "1.15.0",
    date: "2026-04-04",
    type: "minor" as const,
    changes: [
      "Novo papel ORG_ADMIN: administrador limitado à sua organização com acesso a treinamentos, provas e gestão EDU",
      "Certificação automática ao passar em exame (grading automático): certificado LMS gerado instantaneamente",
      "ORG_ADMIN pode acessar Gestão de Treinamentos e todas as rotas EDU sem restrição de licença",
      "Painel de gerenciamento de usuários atualizado com opção ORG_ADMIN para ERP e EDU",
      "EduRoute e sidebar atualizados para reconhecer o novo papel ORG_ADMIN",
    ],
  },
  {
    version: "1.14.4",
    date: "2026-04-02",
    type: "patch" as const,
    changes: [
      "Pré-preenchimento revisado para mostrar apenas indicadores realmente disponíveis por município",
      "Registros legados de taxa_escolarizacao automática reclassificados para o fluxo manual",
      "FAQ, metodologia e relatórios alinhados ao fluxo real das fontes oficiais",
      "Removidas promessas fixas de 17 indicadores; a contagem agora reflete a disponibilidade efetiva das bases",
    ],
  },
  {
    version: "1.14.3",
    date: "2026-04-02",
    type: "patch" as const,
    changes: [
      "Auditoria completa do catálogo de indicadores e metadados de fontes",
      "4 indicadores adicionais catalogados para futura ativação no pré-preenchimento",
      "Enum data_source expandido com INEP, DATASUS e STN para classificação precisa de fontes",
      "4 indicadores duplicados removidos (RA005, OE004, OE005, OE006) — versões igma_ são canônicas",
      "taxa_escolarizacao corrigido de AUTOMATICA para MANUAL (sem API pública disponível)",
      "PIB per capita, IDEB, cobertura saúde, leitos, receita e despesa com fontes corrigidas",
      "Flag integration_available ativada para todos os indicadores com coleta automática",
    ],
  },
  {
    version: "1.14.2",
    date: "2026-04-02",
    type: "patch" as const,
    changes: [
      "Busca IBGE removida da aba Ferramentas (funcionalidade disponível na busca de dados oficiais)",
      "Moderação de Conteúdo movida de Geral para Ferramentas (admin)",
      "Métricas de Performance movidas de Geral para Ferramentas (admin)",
    ],
  },
  {
    version: "1.14.1",
    date: "2026-04-02",
    type: "patch" as const,
    changes: [
      "Aba Ferramentas simplificada: removidos Quick Actions redundantes (links já no menu lateral)",
      "Removido Monitor de Ciclos (disponível na comparação entre rodadas do diagnóstico)",
      "Removido Monitor do Sistema (já presente em Geral > Métricas de Performance)",
      "Removido bloco Integrações de Dados (informação duplicada da aba Docs)",
      "Mantidos: Calculadora de Normalização, Simulador de Indicadores, Exportar Dados, Busca IBGE",
      "Cores dos ícones das ferramentas padronizadas com tokens do design system",
    ],
  },
  {
    version: "1.14.0",
    date: "2026-04-02",
    type: "minor" as const,
    changes: [
      "Página de Monitoramento ERP removida — funcionalidades consolidadas no Dashboard principal",
      "Dashboard com sistema de widgets personalizáveis (13 widgets disponíveis)",
      "Usuário pode ativar/desativar widgets individualmente via botão 'Personalizar'",
      "Widgets de projetos: KPIs, visão de projetos, progresso por pilar, evolução de ciclos, atrasados",
      "Preferências de widgets salvas localmente para persistência entre sessões",
      "Categorização de widgets: Visão Geral, Diagnósticos, Projetos, Capacitação",
    ],
  },
  {
    version: "1.13.5",
    date: "2026-04-01",
    type: "patch" as const,
    changes: [
      "Painel de Métricas de Performance para administradores em Configurações",
      "Monitoramento de latência, uso de banco de dados, conexões e volume de dados",
      "Alertas automáticos com recomendação de upgrade de instância quando necessário",
    ],
  },
  {
    version: "1.13.4",
    date: "2026-04-01",
    type: "patch" as const,
    changes: [
      "Monitoramento ERP refatorado: foco em Projetos (planos de ação removidos da visão principal)",
      "KPIs do ERP atualizados: Total de Projetos, Projetos Ativos, Conclusão de Tarefas, Diagnósticos",
      "Lista de planos recentes removida — projetos atrasados ocupam largura total",
      "Tutorial atualizado com Base de Conhecimento e descrição de relatórios customizáveis",
      "Metodologia atualizada com seção sobre Base de Conhecimento e Referências Globais",
      "Verificação completa de cobertura de indicadores em diagnósticos Territorial e Enterprise",
    ]
  },
  {
    version: "1.13.3",
    date: "2026-04-01",
    type: "patch" as const,
    changes: [
      "Removida opção de download Markdown dos relatórios",
      "Novo dialog de personalização de relatório: logo, cabeçalho, rodapé, cor primária, tamanho de fonte",
      "Personalização aplicada automaticamente nas exportações Word e PDF",
      "Notas adicionais opcionais incluídas como bloco final no relatório",
      "Configurações salvas localmente para reutilização entre sessões",
      "Seletor de visibilidade do relatório: Pessoal (só o criador vê) ou Organização (todos da org veem)",
      "Admins podem gerar relatórios no ambiente Demo com toggle dedicado",
      "Badges de visibilidade e ambiente no histórico de relatórios",
      "Filtro automático: relatórios pessoais aparecem apenas para o criador",
    ]
  },
  {
    version: "1.13.2",
    date: "2026-04-01",
    type: "patch" as const,
    changes: [
      "Base de Conhecimento reorganizada por destino (agrupamento visual com collapsible)",
      "Upload de arquivos agora prioriza seleção de destino (destino-first)",
      "Relatórios e diagnósticos usam automaticamente arquivos KB do destino + globais",
      "Aviso visual no diagnóstico calculado mostrando quais arquivos KB foram utilizados",
      "Coluna kb_file_ids na tabela de relatórios para rastreabilidade",
      "Removido dropdown de diagnóstico — arquivos são associados a destinos",
    ]
  },
  {
    version: "1.13.1",
    date: "2026-04-01",
    type: "patch" as const,
    changes: [
      "Nova seção 'Referências Globais' em Configurações > Ferramentas (admin only)",
      "Documentos de referência (PNT, legislação) são injetados automaticamente nos relatórios gerados por IA",
      "PNT 2024-2027 adicionado como primeiro documento de referência global",
      "Relatórios agora contextualizam indicadores com metas e diretrizes nacionais",
    ]
  },
  {
    version: "1.13.0",
    date: "2026-04-01",
    type: "minor" as const,
    changes: [
      "Nova seção 'Base de Conhecimento' no menu lateral para upload e gestão de documentos de referência",
      "Upload de PDF, DOCX, XLSX, CSV e TXT (até 20MB) com categorização e escopo (global ou por destino)",
      "Filtros por categoria, destino e busca textual para localizar arquivos rapidamente",
      "Download direto e remoção de arquivos com confirmação de segurança",
      "Bucket de armazenamento privado com RLS por organização para isolamento multi-tenant",
      "8 categorias pré-definidas: Plano Diretor, Legislação, Pesquisa, Dados Oficiais, Relatório, etc.",
      "Integração Firecrawl como fallback para descoberta de URLs do CADASTUR quando API CKAN falha",
    ]
  },
  {
    version: "1.12.2",
    date: "2026-04-01",
    type: "patch" as const,
    changes: [
      "Pipeline semi-automático CADASTUR: ingestão de CSVs de Guias e Agências de Turismo do Portal Dados Abertos",
      "Edge function ingest-cadastur com descoberta automática de URLs via API CKAN do dados.gov.br",
      "Parsing e agregação de CSV por município (código IBGE) com suporte a múltiplos delimitadores",
      "Cron job trimestral (1º dia de Jan/Abr/Jul/Out) para atualização automática dos dados CADASTUR",
      "Badge 'CADASTUR' (ciano) nos indicadores igma_guias_turismo e igma_agencias_turismo",
      "Quando dados indisponíveis no portal, sistema preserva último valor e mostra aviso ao operador",
      "Confiança de dados CADASTUR ajustada para 4/5 (dados oficiais via batch) vs 1/5 anterior (manual)",
      "Integração com fetch-official-data: CADASTUR é disparado em paralelo na busca de dados oficiais",
      "Scores formatados como porcentagem (67%) em vez de decimal (0.67) no Simulador e Diagrama de Fluxo",
    ]
  },
  {
    version: "1.12.1",
    date: "2026-04-01",
    type: "patch" as const,
    changes: [
      "Transparência de dados: removidos todos os valores fabricados (estimativas falsas) do sistema",
      "Integração IBGE expandida: 11 indicadores reais via APIs oficiais (Agregados + Pesquisas)",
      "CADASTUR: documentação clara de que a API é restrita a órgãos federais — dados são manuais",
      "Indicadores sem API pública agora aparecem como campos em branco (não mais com valores inventados)",
      "Badge 'Manual' (vermelho) substitui 'Est.' para indicadores que requerem preenchimento pelo operador",
      "Confiabilidade de dados manuais ajustada para 1/5 (anteriormente 3/5 — falsa segurança)",
      "Nova seção 'Fontes de Dados e Transparência' na página de Metodologia",
      "Relatórios agora incluem informações de proveniência dos dados (API vs Manual)",
      "Catálogo de indicadores atualizado com distinção API/Manual correta",
      "Referências bibliográficas incluem IBGE e CADASTUR como fontes oficiais"
    ]
  },
  {
    version: "1.12.0",
    date: "2026-04-01",
    type: "minor" as const,
    changes: [
      "Dashboard de progresso do diagnóstico com 5 etapas visuais (criação → projeto)",
      "Checklist de validação pré-cálculo com breakdown por pilar e indicadores faltantes",
      "Score de qualidade dos dados: completude, frescor e automação (0-100%)",
      "Comparativo entre rodadas: evolução dos pilares vs rodada anterior do mesmo destino",
      "Templates de relatório: Completo, Executivo (resumido) e Investidores (foco ROI)",
      "Exportação PDF dos relatórios via janela de impressão com formatação profissional",
      "Edge function generate-report atualizada com suporte a templates"
    ]
  },
  {
    version: "1.11.3",
    date: "2026-04-01",
    type: "patch" as const,
    changes: [
      "Fix: Motor de prescrições agora gera uma prescrição por indicador (não mais por training_id)",
      "Cobertura completa: todo indicador com score < 0.67 e mapeamento EDU recebe prescrição",
      "Regras IGMA preservadas: pilares bloqueados continuam sem prescrições",
      "Prescrições ordenadas por gravidade (score mais baixo primeiro)"
    ]
  },
  {
    version: "1.11.2",
    date: "2026-03-31",
    type: "patch" as const,
    changes: [
      "Correção: indicadores ignorados agora excluídos de gargalos, recomendações e normalização",
      "Fix: dados externos não reintroduzem indicadores marcados como ignorados no cálculo",
      "Banner de indicadores ignorados com listagem e aviso de impacto na análise",
      "Moderação de conteúdo no fórum com termômetro de restrição (admin)",
      "Suporte a até 6 imagens por post com carrossel e moderação automática via IA",
      "Guardrails no Professor Beni: respostas limitadas a temas de turismo",
      "Admin pode fixar, editar e excluir qualquer post/resposta no fórum"
    ]
  },
  {
    type: "patch" as const,
    changes: [
      "Tutorial integrado à Central de Ajuda como aba 'Tutoriais'",
      "Central de Ajuda reorganizada em 3 abas: Tutoriais, Guia Rápido e Funcionalidades",
      "Novas funcionalidades adicionadas ao mapa de ajuda: Projetos, Monitoramento ERP, Jogos, Professor Beni, Social Turismo",
      "Menu lateral atualizado: 'Ajuda & Tutorial' substitui itens separados",
      "Rota /tutorial redireciona automaticamente para /ajuda"
    ]
  },
  {
    version: "1.11.0",
    date: "2026-03-27",
    type: "minor" as const,
    changes: [
      "Tutorial detalhado com navegação passo-a-passo por tópico",
      "Cada tópico agora tem sub-passos numerados com instruções detalhadas e dicas",
      "Imagens ilustrativas geradas para passos-chave do tutorial",
      "Barra de progresso por tópico com marcação individual de conclusão",
      "Sidebar de navegação lateral nos tutoriais detalhados (desktop)",
      "Rota /tutorial/:topicId para acesso direto a qualquer tópico",
      "Cards do tutorial principal agora mostram tempo estimado e contagem de passos",
      "Seção de dicas expansível em cada passo do tutorial"
    ]
  },
  {
    version: "1.10.0",
    date: "2026-03-26",
    type: "minor" as const,
    changes: [
      "Sistema de Tutorial com conteúdo personalizado por perfil (Admin, Professor, Estudante, ERP)",
      "Wizard de primeiro acesso: aparece automaticamente após onboarding",
      "Página /tutorial permanente com categorias, progresso e marcação de etapas concluídas",
      "Admin pode visualizar tutoriais de todos os perfis via abas",
      "Item 'Tutorial' adicionado ao menu lateral (acessível para todos)",
      "Progresso do tutorial salvo localmente com indicador de percentual"
    ]
  },
  {
    version: "1.9.0",
    date: "2026-03-26",
    type: "minor" as const,
    changes: [
      "Sistema de referência professor → aluno com código único e link de convite",
      "Isenção automática de mensalidade para professor com 5+ alunos ativos",
      "Campo opcional de código de professor no onboarding de estudantes",
      "Painel do Professor com gestão de salas/turmas (CRUD completo)",
      "Turmas com nome, disciplina, período de início/fim",
      "Matrícula de alunos em salas e gestão individual",
      "Atribuição de atividades (trilhas, testes, conteúdo próprio) com prazos",
      "Nova rota /professor no sidebar para professores EDU",
      "Tabelas: professor_referral_codes, student_referrals, classrooms, classroom_students, classroom_assignments",
      "RLS policies completas com funções de segurança (owns_classroom, professor_qualifies_free_license)"
    ]
  },
  {
    version: "1.8.5",
    date: "2026-03-26",
    type: "patch" as const,
    changes: [
      "Fluxo de cancelamento de plano com motivo obrigatório e confirmação",
      "Usuários cancelam seu próprio plano mantendo acesso até o fim do período",
      "Admins podem cancelar licença de qualquer usuário via painel de gestão",
      "Estado 'Cancelado' exibido na página de Planos com mensagem informativa",
      "Licenças canceladas com data futura mantêm acesso até expiração",
      "Exclusão de usuários SISTUR das métricas de licenças externas",
      "Consistência de organizações na aba Cotas por Organização",
      "Correção RLS para ativação de trial por usuários não-admin"
    ]
  },
  {
    version: "1.8.4",
    date: "2026-03-25",
    type: "patch" as const,
    changes: [
      "Auto-expiração de trials via cron job diário (3h UTC)",
      "Notificações in-app de expiração do trial (3 dias, 1 dia, expirado)",
      "Bloqueio visual de funcionalidades restritas no menu (ícone de cadeado)",
      "Relatórios bloqueados para plano trial com redirecionamento para Planos",
      "Novo painel admin 'Controle de Trials' com métricas e funil de conversão",
      "Lista de trials recentes com status visual (saudável, atenção, crítico, expirado)"
    ]
  },
  {
    version: "1.8.3",
    date: "2026-03-25",
    type: "patch" as const,
    changes: [
      "Menu mobile agora exibe a opção Planos para usuários como Renata",
      "Correção do preload para Safari/iPhone sem requestIdleCallback",
      "Fluxo Autônomo restaurado ao remover licença indevida da Renata",
      "Renata volta a ser redirecionada para Planos com opção de ativar trial"
    ]
  },
  {
    version: "1.8.2",
    date: "2026-03-25",
    type: "patch" as const,
    changes: [
      "Metodologia oculta do menu para usuários não-admin",
      "Renomeado 'Assinatura' para 'Planos' no menu e comunicações",
      "Página de Planos com explicação detalhada do trial para novos usuários",
      "Admin pode estender duração do trial na gestão de licenças",
      "Correção do fluxo Autônomo: termos → planos → ativação trial"
    ]
  },
  {
    version: "1.8.1",
    date: "2026-03-25",
    type: "patch" as const,
    changes: [
      "E-mail automático de notificação quando o acesso do usuário é aprovado",
      "Infraestrutura de e-mail transacional com fila durável e retries",
      "Página de cancelamento de inscrição (/unsubscribe)",
      "Template de e-mail com identidade visual do Instituto Mario Beni"
    ]
  },
  {
    version: "1.8.0",
    date: "2026-03-25",
    type: "minor" as const,
    changes: [
      "Sistema de Licenciamento completo (trial, estudante, professor, basic, pro, enterprise)",
      "Termos e condições obrigatórios na primeira utilização",
      "Exportação CSV de usuários com status, licença, termos e acessos",
      "Auditoria e correção de dados: licenças criadas para 15 usuários pendentes",
      "Otimização de performance: QueryClient com staleTime/gcTime, useMemo em contexts",
      "Planos de assinatura EDU (Estudante R$19, Professor R$39) na página de assinatura",
      "Coluna de aceite de termos no gerenciamento de usuários"
    ]
  },
  {
    version: "1.7.16",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Fix: Recomendações agora buscam treinamentos de edu_trainings via training_id",
      "RecommendationCard exibe título, descrição e duração do modelo unificado",
      "Tipos Recommendation e Prescription atualizados com training_id e training",
      "Fallback para legacy courses mantido para compatibilidade"
    ]
  },
  {
    version: "1.7.15",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Fix: Issues Enterprise agora mostram nome da categoria (não UUID)",
      "Coluna training_id (TEXT) adicionada em prescriptions e recommendations",
      "Edge function calculate-assessment usa enterpriseCategoryMap para nomes legíveis"
    ]
  },
  {
    version: "1.7.14",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Correção de 37 mapeamentos EDU órfãos - códigos de indicadores sincronizados",
      "Total de mapeamentos EDU válidos: 94 (anteriormente 60)",
      "6 indicadores agora com escopo 'ambos': NPS, Reviews, Treinamento, Emprego Local, Compras Locais, Certificações",
      "Edge function calculate-assessment corrige nomes de categoria Enterprise nas issues",
      "Documentação atualizada com catálogo unificado e indicadores compartilhados"
    ]
  },
  {
    version: "1.7.13",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Filtro de Escopo (Territorial/Enterprise/Ambos) no painel de Indicadores",
      "Relatório de distribuição de indicadores por Escopo × Pilar × Tier",
      "Gráficos de barras e pizza para visualização da distribuição",
      "Matriz detalhada com contagem de indicadores por combinação",
      "Botão 'Novo Indicador' funcional com formulário completo de cadastro"
    ]
  },
  {
    version: "1.7.12",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Debug logging para investigar toggle Enterprise no Dashboard",
      "Verificação de has_enterprise_access nas organizações SISTUR e Demo"
    ]
  },
  {
    version: "1.7.11",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Dashboard principal com toggle Territorial/Enterprise unificado",
      "KPIs Enterprise no Dashboard: RevPAR, NPS, Taxa Ocupação, Certificações ESG",
      "Novo hook useEnterpriseDashboardData para métricas hoteleiras",
      "Componente EnterpriseKPICards com 8 métricas visuais",
      "Filtro de destinos adaptativo por tipo de diagnóstico"
    ]
  },
  {
    version: "1.7.10",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Adicionado filtro de escopo (Territorial/Enterprise/Ambos) na página de Indicadores",
      "Dashboard ERP atualizado com toggle Territorial/Enterprise para segregar dados",
      "Hooks usePillarProgress e useCycleEvolution agora filtram por diagnostic_type",
      "Badges de escopo visíveis e editáveis inline na tabela de indicadores"
    ]
  },
  {
    version: "1.7.7",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Criada tabela enterprise_indicator_scores para armazenar scores normalizados",
      "Edge function calculate-assessment insere scores na tabela correta por tipo",
      "Hooks useIndicatorScores e useEnterpriseIndicatorValuesForAssessment unificados",
      "DiagnosticoDetalhe detecta diagnostic_type e busca dados da fonte correta",
      "NormalizationView e IndicatorScoresView agora funcionam para diagnósticos Enterprise"
    ]
  },
  {
    version: "1.7.6",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Indicadores agora mostram escopo: Territorial, Enterprise ou Ambos",
      "Nova coluna 'Escopo' na tabela de indicadores com badges coloridos",
      "Organizações com dois toggles independentes: Territorial e Enterprise",
      "Ambos os acessos podem ser habilitados simultaneamente",
      "UI da tabela de organizações mostra badges de acessos habilitados"
    ]
  },
  {
    version: "1.7.5",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Demo Mode agora tem acesso Enterprise habilitado",
      "Diagnóstico demo Enterprise criado (Hotel Gramado 2026) com 25 indicadores",
      "Mapeamento de 23 indicadores Enterprise para treinamentos EDU",
      "Edge function calculate-assessment suporta diagnostic_type = 'enterprise'",
      "Cálculo IGMA unificado para diagnósticos territoriais e enterprise"
    ]
  },
  {
    version: "1.7.4",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Documentação atualizada com módulo Enterprise",
      "FAQ inclui perguntas sobre Enterprise, org_type e indicadores hoteleiros",
      "Ajuda inclui guia rápido e seções Enterprise para admins",
      "Metodologia documenta categorias Enterprise e mapeamento aos 3 pilares"
    ]
  },
  {
    version: "1.7.1",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "UI de Organizações com seletor de tipo (Pública/Privada)",
      "Toggle de Acesso Enterprise por organização",
      "Tabela de organizações exibe tipo e badge Enterprise",
      "Ícones diferenciados: Landmark (pública) vs Hotel (privada)"
    ]
  },
  {
    version: "1.7.0",
    date: "2026-01-23",
    type: "minor" as const,
    changes: [
      "Novo módulo SISTUR Enterprise para setor privado (hotéis, resorts, pousadas)",
      "Classificação de organizações: PUBLIC (governo/município) vs PRIVATE (empresas)",
      "26 indicadores enterprise baseados na metodologia Mario Beni",
      "15 categorias de indicadores: sustentabilidade, governança, operações",
      "Benchmarks e metas por indicador (ex: RevPAR, NPS, Taxa de Ocupação)",
      "Tiers adaptados para contexto enterprise (Essencial, Estratégico, Integral)"
    ]
  },
  {
    version: "1.6.0",
    date: "2026-01-23",
    type: "minor" as const,
    changes: [
      "Unificação do motor de recomendações EDU com modelo canônico",
      "Prescrições agora usam edu_trainings via edu_indicator_training_map",
      "Justificativas dinâmicas com reason_template por indicador",
      "Nomenclatura corrigida: I-RA, I-OE, I-AO na página de autenticação",
      "Fallback para courses legado mantido para compatibilidade"
    ]
  },
  {
    version: "1.5.5",
    date: "2026-01-16",
    type: "patch" as const,
    changes: [
      "Indicadores movido para dentro de Diagnósticos como aba",
      "Menu lateral simplificado - Indicadores removido",
      "Novo componente IndicadoresPanel reutilizável"
    ]
  },
  {
    version: "1.5.4",
    date: "2026-01-16",
    type: "patch" as const,
    changes: [
      "Correção do YouTube player para preencher 100% do frame",
      "Iframe e container interno forçados a ocupar largura/altura completas"
    ]
  },
  {
    version: "1.5.3",
    date: "2026-01-16",
    type: "patch" as const,
    changes: [
      "Novo YouTubePlayer com API IFrame para controle total",
      "Controles customizados abaixo do vídeo (play, seek, volume)",
      "Overlay completo bloqueia clique-direito e interações com YouTube",
      "Clique no vídeo para play/pause funciona normalmente"
    ]
  },
  {
    version: "1.5.2",
    date: "2026-01-16",
    type: "patch" as const,
    changes: [
      "Iframe do YouTube reposicionado com crop para esconder UI nativa",
      "Overlays sólidos no topo e rodapé cobrem título, logo, Share e Watch on YouTube",
      "Bordas pretas nas laterais para esconder elementos cortados",
      "Bloqueio de clique nas áreas de overlay"
    ]
  },
  {
    version: "1.5.1",
    date: "2026-01-16",
    type: "patch" as const,
    changes: [
      "YouTube embed usa domínio privado (youtube-nocookie.com)",
      "Overlay esconde botões 'Watch on YouTube' e 'Share'",
      "Parâmetros modestbranding e rel=0 para reduzir branding",
      "Bloqueio de clique-direito no iframe do YouTube/Vimeo",
      "Vimeo embed com title/byline/badge ocultos"
    ]
  },
  {
    version: "1.5.0",
    date: "2026-01-16",
    type: "minor" as const,
    changes: [
      "Proteção de vídeos com URLs assinadas temporárias (5 min de expiração)",
      "Novo hook useSecureVideoUrl para acesso seguro ao storage",
      "Auto-refresh de URLs antes da expiração",
      "Bloqueio de clique-direito no player de vídeo",
      "Mensagens de erro e loading states aprimorados no VideoPlayer"
    ]
  },
  {
    version: "1.4.0",
    date: "2026-01-16",
    type: "minor" as const,
    changes: [
      "Otimização de navegação do sidebar - elimina 'piscar' ao trocar de página",
      "Novo ProfileContext centralizado para cache de perfil",
      "Melhoria de performance com useMemo nos componentes de navegação",
      "Transições mais suaves entre rotas protegidas"
    ]
  },
  {
    version: "1.3.0",
    date: "2026-01-16",
    type: "minor" as const,
    changes: [
      "Tradução completa da interface para português",
      "Metodologia 'Waterfall' renomeada para 'Cascata'",
      "Descrições de projetos traduzidas para português",
      "Melhorias gerais de localização e terminologia"
    ]
  },
  {
    version: "1.1.0",
    date: "2025-01-16",
    type: "minor" as const,
    changes: [
      "Adicionado escopo de visibilidade em Nova Rodada (Organização ou Pessoal)",
      "Destinos e diagnósticos podem ser compartilhados com a organização ou mantidos privados",
      "RLS policies atualizadas para respeitar visibilidade"
    ]
  },
  {
    version: "1.0.0",
    date: "2025-01-15",
    type: "major" as const,
    changes: [
      "Lançamento inicial do SISTUR",
      "Módulo de Diagnósticos com cálculo IGMA",
      "Módulo EDU com trilhas e treinamentos",
      "Sistema de certificação de destinos",
      "Integração ERP para gestores públicos",
      "Perfil de estudante com recomendações personalizadas"
    ]
  }
];

export type VersionChangeType = "major" | "minor" | "patch";

export interface VersionEntry {
  version: string;
  date: string;
  type: VersionChangeType;
  changes: string[];
}
