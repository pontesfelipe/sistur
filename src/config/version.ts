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
  minor: 38,
  patch: 52,
  get full() {
    return `${this.major}.${this.minor}.${this.patch}`;
  },
  get short() {
    return `v${this.major}.${this.minor}`;
  }
};

export const VERSION_HISTORY = [
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
