## Plano faseado — Finalização do Diagnóstico Enterprise

Hoje temos 18 blocos automáticos de pré-preenchimento + CNPJ. O que falta é entregue em 4 fases sequenciais, cada uma com bump de versão e changelog próprios.

---

### Fase 1 — Validação e UX do fluxo atual (v1.83.0) ✅

Foco em deixar os 18 blocos existentes confiáveis antes de adicionar mais.

- **Toasts granulares no "Rodar todos"**: substituir o toast único por um toast por bloco (sucesso/erro), com nome amigável.
- **Retry individual**: badge de erro por bloco na lista de pré-preenchimento + botão "Tentar novamente" que reexecuta só aquele bloco (usando o registry de `autoFillRunner.ts`).
- **Badge de fonte por indicador**: no painel de revisão do Step 4, mostrar a origem (Google, Booking, ANAC, Anatel, derivado, etc.) ao lado de cada `ENT_*` preenchido, lendo de `ENT_AUTOFILL_SOURCE_MAP`.
- **Auditoria de mapeamento**: script de verificação (rodado uma vez) que confere se cada bloco grava todos os `ENT_*` que declara e se não há indicador órfão entre catálogo e blocos.
- **Estado persistente do "Rodar todos"**: progresso fica salvo em `enterprise_profiles` (campo `autofill_run_state` jsonb) para que se o usuário sair e voltar veja o que já rodou.

### Fase 2 — Blocos contextuais extras (v1.84.0) ✅

Cobertura externa marginal — adiciona 3 blocos novos, totalizando 21.

- **Bloco 19 · Conectividade Telecom (Anatel)**: edge function `search-telecom-coverage` consulta `anatel_coverage_cache` por município (4G/5G/fibra) e deriva `ENT_CONECTIVIDADE_TELECOM`.
- **Bloco 22 · Acessibilidade Urbana**: busca via Firecrawl + IBGE/Mapa do Turismo por rampas, calçadas, sinalização tátil e atrativos acessíveis no destino → `ENT_ACESSIBILIDADE_SCORE`.
- **Bloco 23 · Infraestrutura de Saúde do Entorno**: DATASUS por município (leitos, hospitais, pronto-socorro próximo ao destino) → novo `ENT_SAUDE_ENTORNO`.

Cada um se auto-registra via `useAutoFillRunner` e participa do "Rodar todos" e da auto-cascata pós-reviews.

### Fase 3 — Motor de cálculo + Relatório Enterprise (v1.85.0) ✅

Liga os dados coletados ao pipeline existente.

> **Pós-Fase 3 (v1.87.0) — Sincronização do catálogo unificado**: auditoria detectou que 30 dos novos códigos `ENT_*` viviam só em `enterprise_indicators` (catálogo legado). O motor `calculate-assessment` prioriza a tabela unificada `indicators` (`indicator_scope='enterprise'`), então os valores coletados pelos blocos automáticos eram descartados em silêncio. Migration de sincronização populou os 30 códigos no catálogo unificado preservando pilar, benchmarks, peso, tier e unidade. A linhagem de dados (`indicator_calculation_trail`) agora cobre 73 indicadores Enterprise (de 43 anteriores). Indicadores 100% derivados (`ENT_COMMISSION_AVG`, `ENT_DIRECT_SALES_PCT`, `ENT_SEASONALITY_INDEX`, `ENT_COMP_GAP`, `ENT_COMPLIANCE_RATE`) ficam marcados como `data_source='CALCULATED'` — calculados pelo próprio `calculate-assessment` para evitar duplicidade com entrada manual.

- **Normalização min-max** dos 21 blocos: validar/ajustar `enterprise_indicators` (direção, min/max, benchmark) para todos os `ENT_*` que os blocos preenchem.
- **Trigger de cálculo a 50%**: confirmar que `assessment_calc_jobs` enfileira corretamente no modo Enterprise quando ≥50% dos indicadores têm valor (regra já existente para Territorial).
- **Status visual**: garantir que o painel de Status (Adequado ≥67% / Atenção 34–66% / Crítico ≤33%) renderiza para Enterprise nos mesmos componentes do Territorial.
- **Relatório AI no modo Enterprise**: ativar `generate-report` em modo Enterprise, consumindo os 21 blocos + perfil do empreendimento, com a Semantic Layer (`report_semantic_entries` com `applies_to=enterprise`) já existente. Validar trilha de auditoria (`indicator_calculation_trail`) para cada `ENT_*`.
- **Snapshot da rodada**: assegurar que `diagnosis_data_snapshots` grava o estado completo dos 21 blocos na hora do cálculo (regra de "snapshots não retroativos").

### Fase 4 — Importação de dados operacionais (PMS/CSV) (v1.86.0) ✅

Última frente: os indicadores internos que hoje são 100% manuais.

- **Tabela `enterprise_pms_imports`** (migration): `id`, `org_id`, `assessment_id`, `source` (`opera`/`cm`/`stays`/`csv_generic`), `period_start`, `period_end`, `raw_payload jsonb`, `parsed_metrics jsonb`, `status`, `imported_by`, `imported_at`, com GRANTs + RLS por `org_id`.
- **Template CSV canônico** documentado: colunas `period_month, occupancy_pct, adr_brl, revpar_brl, goppar_brl, trevpar_brl, room_nights_sold, guest_nights, staff_fte, training_hours, energy_kwh, water_m3, waste_kg, repeat_guest_pct, nps`.
- **UI de importação** em novo Step 4.5 (opcional) do wizard Enterprise: drag-and-drop CSV, parsing client-side (mesmo padrão Brazilian-compatibility do CSV territorial: UTF-8/Latin1, vírgula decimal, ponto-vírgula como separador), preview de linhas, validação de bounds (ex.: occupancy 0–100), commit grava em `enterprise_pms_imports` e popula `enterprise_indicator_values` para `ENT_OCCUPANCY`, `ENT_ADR`, `ENT_REVPAR`, `ENT_GOPPAR`, `ENT_TREVPAR`, `ENT_NPS`, `ENT_STAFF_RATIO`, `ENT_TURNOVER`, `ENT_TRAINING_HOURS`, `ENT_ENERGY`, `ENT_WATER`, `ENT_WASTE`, `ENT_REPEAT_GUEST`.
- **Sem conectores PMS nesta fase**: integração direta com Opera/CM/Stays via API fica fora do escopo desta entrega — o CSV cobre os mesmos dados e funciona com qualquer PMS que exporte planilha.

---

### Detalhes técnicos transversais

- Cada fase tem seu próprio bump de versão (MINOR) em `src/config/version.ts` + entrada em `VERSION_HISTORY`.
- Nenhuma fase quebra as anteriores — todos os blocos novos seguem o padrão `useAutoFillRunner('id', run)`.
- RLS multi-tenant em todas as tabelas novas (`org_id` + `service_role`).
- Memórias do projeto atualizadas em `mem://features/enterprise/auto-fill-catalog` ao final da Fase 2.

### Fora do escopo

- Integração nativa com APIs de PMS (Opera Cloud, Cloudbeds, Stays) — só CSV.
- A/B testing de prompts do relatório Enterprise.
- Ranking público de empreendimentos (vedado por regra).

### Critérios de aceitação por fase

- **Fase 1**: rodar "Rodar todos" e ver um toast por bloco; em falha simulada, retry individual funciona; cada `ENT_*` no painel exibe sua origem.
- **Fase 2**: 3 novos blocos rodam ao digitar nome do hotel; perfil mostra `ENT_CONECTIVIDADE_TELECOM`, `ENT_ACESSIBILIDADE_SCORE`, `ENT_SAUDE_ENTORNO` preenchidos.
- **Fase 3**: ao atingir ≥50% de indicadores, status calcula e relatório AI gera no modo Enterprise com trilha de auditoria.
- **Fase 4**: importar CSV de exemplo popula os 13 indicadores operacionais e o status recalcula automaticamente.

Confirme se posso começar pela **Fase 1** (validação e UX) ou se prefere outra ordem.

---

## Plano de aprimoramento do Relatório Enterprise (Fases 5–7)

### Fase 5 — Camada semântica + auditor Enterprise (v1.88.0) ✅

- 10 regras `applies_to='enterprise'` em `report_semantic_entries`: glossário operacional (ADR/RevPAR/GOP/NPS/TrevPAR), bandas de status calibradas, privacidade de concorrentes (sem nomes/CNPJs), anti-ranking, atribuição PMS vs. reviews, seções obrigatórias (Diagnóstico Operacional, Reputação, Posicionamento Competitivo, Plano 90d) e formatação sem decimais.
- 4 checagens determinísticas no `check-report-semantic` ativadas para Enterprise: escala NPS, expansão de siglas, privacidade de concorrentes, ranking competitivo.

### Fase 6 — Contexto injetado em `generate-report` (v1.89.0) ✅

- 5 fontes Enterprise injetadas em paralelo: `enterprise_competitors` (anonimizados como Concorrente A/B/C), `enterprise_distribution_channels` (share + comissão), `enterprise_review_snapshots` (até 6 snapshots), `enterprise_seasonality_months` (12 últimos meses) e `enterprise_pms_imports` (5 últimas importações).
- Após o cálculo, filtra `indicator_calculation_trail` pelos `indicator_id`s dos códigos `ENT_*` e injeta "Trilha de Cálculo Enterprise" com fórmula/fontes/score.
- Blocos respeitam as 11 regras semânticas e os 4 auditores da Fase 5 — concorrentes nunca carregam nome/CNPJ/URL.
- Logger `data_collected` ganha 6 contadores novos para observabilidade.

### Fase 7 — Template estrutural Enterprise (v1.90.0) ✅

- Nova linha em `report_structure_templates` (`scope='enterprise'`, `template='completo'`, `version=2`, `active=true`) com 17 seções; a v1 fica desativada como histórico.
- Seções dedicadas: Diagnóstico Operacional (PMS/CSV), Reputação & Satisfação (NPS -100 a +100), Posicionamento Competitivo (concorrentes anonimizados + mix de canais), Pessoas & Cultura, ESG & Sustentabilidade.
- Plano de Ação 90 dias organizado por área responsável (Comercial, Operações, Pessoas, ESG, Marketing) com marcos em 30/60/90 dias e KPI alvo por ação.
- `loadReportStructure` seleciona automaticamente a versão ativa via `updated_at desc` — nenhum ajuste de código foi necessário no pipeline.

Encerra o plano de aprimoramento do Relatório Enterprise (Fases 5–7).

### Fase 8 — Validação ponta-a-ponta e produtização da auditoria (v1.91.0) ✅

- Corrigidos 2 falso-positivos nos auditores determinísticos do `check-report-semantic`:
  - `structural.no_truncation_markers`: adicionado `\b` em `TODO|TBD` (antes capturava substrings em palavras como "metodologia").
  - `glossary.IGMA_expansion`: passa a ignorar ocorrências de IGMA em códigos de flag (`IGMA_EXTERNALITY_WARNING`, `IGMA_RA_LIMITATION`, etc.) e procura a primeira menção "humana" da sigla.
- `AdminSemanticLayer` (aba Auditoria): novo botão "Carregar relatório salvo" lista os últimos 50 `generated_reports` com filtro Territorial/Enterprise/Todos, faz join com `assessments.diagnostic_type` e, ao selecionar, popula a caixa de auditoria + ajusta `auditScope` automaticamente. Elimina copiar/colar manual.
- Validação executada contra o relatório Enterprise de Foz do Iguaçu (anterior às Fases 5–7): PASS em escala NPS, privacidade, anti-ranking, classificação, BRL e duplicatas; WARN em expansão de glossário (RevPAR sem extenso) — endereçado pelas Fases 5–7 para relatórios novos.

### Fase 9 — Export DOCX Enterprise-aware (v1.92.0) ✅

- `exportReportAsDocx` recebe `scope: 'territorial' | 'enterprise'` (default territorial).
- Capa ABNT do modo Enterprise usa título "RELATÓRIO ENTERPRISE — DIAGNÓSTICO OPERACIONAL & ESTRATÉGICO" e texto de natureza dedicado (PMS/reputação/posicionamento/ESG + aviso de anonimização Concorrente A/B/C).
- Filename: `relatorio-enterprise-<destino>.docx` no modo Enterprise; `relatorio-<destino>.docx` no Territorial.
- `Relatorios.tsx` passa o escopo a partir de `diagnostic_type` nos dois botões Word (aba Gerar e aba Histórico). O corpo das 17 seções (template v2) já era renderizado corretamente pelo parser markdown→DOCX existente; só a capa e o nome do arquivo precisavam de ajuste.

### Fase 10 — Painel comparativo temporal Enterprise (v1.93.0) ✅

- Novo `PillarTrendPanel` plota I-RA / I-OE / I-AO de até 24 rodadas calculadas para o mesmo destino/empreendimento, filtrando estritamente por `diagnostic_type` (territorial vs. enterprise não se misturam).
- Renderizado em `DiagnosticoDetalhe` na aba Visão Geral, abaixo do `RoundComparisonView`, em ambos os modos (Territorial/Enterprise). Empty state quando há <2 rodadas.
- Comparação 100% intra-destino — sem ranking entre municípios ou empreendimentos, alinhado às restrições `no-public-rankings` e `i-sistur-internal-only`.

### Fase 11 — Frentes complementares Enterprise (v1.94.0) ✅

Cobertura dos 4 vetores selecionados pelo usuário ("todos os acima"):

- **11.1 Alertas de regressão Enterprise** (`EnterpriseRegressionAlerts`): detecta quedas >2pp em I-RA/I-OE/I-AO por 2 rodadas consecutivas (regra `regression-detection-alerts`). Painel âmbar renderizado em `DiagnosticoDetalhe` (Territorial e Enterprise). Sem disparo de e-mail nesta fase — apenas visual.
- **11.2 Benchmark intra-org Enterprise** (`EnterpriseOrgBenchmark`): média/mediana por pilar dos demais empreendimentos Enterprise da mesma org, totalmente anonimizado (N + estatística). Exibido apenas em Enterprise; respeita `no-public-rankings`.
- **11.3 PDF Enterprise-aware**: `downloadPDF` e `buildPrintHTML` recebem `scope`; PDF Enterprise ganha faixa identificadora ('Relatório Enterprise … concorrentes anonimizados A/B/C') antes do corpo ABNT. Botões PDF (aba Gerar e Histórico) propagam o escopo via `diagnostic_type`.
- **11.4 Recomendações EDU Enterprise**: `EduRecommendationsPanel` já é renderizado em Enterprise via `displayedIndicatorScores`. A sincronização Pós-Fase 3 (v1.87.0) dos códigos `ENT_*` na tabela unificada `indicators` habilita recomendações automaticamente assim que `edu_indicator_training_map` receber mapeamentos `ENT_*` → curso. Sem alteração de código necessária — gap puramente de dados.

### Pós-Fase 11 — Cobertura EDU Enterprise (v1.94.1) ✅

- Migração popula 30 mapeamentos `ENT_*` → curso na tabela `edu_indicator_training_map`, complementando os 26 já existentes. Cobertura total agora abrange RA (energia, água, resíduos, certificação, acessibilidade física), OE (financeiro, compliance, manutenção, tecnologia, parcerias, sazonalidade) e AO (reputação, NPS, revenue management, service recovery, presença digital).
- Indicadores contextuais externos (saúde do entorno, conectividade aérea/telecom, segurança do destino, clima, eventos, transporte, demanda) ficam intencionalmente fora — não são acionáveis pelo empreendimento e não comportam prescrição.
- Encerra o último gap pendente da Fase 11.

### Fase 12 — Alertas por e-mail + Benchmark setorial (v1.95.0) ✅

- **12.1 Alertas de regressão por e-mail** (fecha o gap visual da Fase 11.1): novo template `enterprise-regression-alert` registrado em `_shared/transactional-email-templates/registry.ts`. O painel `EnterpriseRegressionAlerts` agora exibe botão 'Notificar por e-mail' que dispara via `send-transactional-email` para o usuário logado, com dedupe por `localStorage` (`regression-email-<assessmentId>`) e idempotencyKey próprio. Vale para Territorial e Enterprise.
- **12.2 Benchmark setorial anônimo** (extensão da Fase 11.2): novo `EnterpriseSectorBenchmark` compara o empreendimento contra a base SISTUR filtrada pelo mesmo `property_type` + faixa `star_rating` ±1, com média/mediana/Q1–Q3. Mínimo N=3 pares para exibir (privacidade), sem nomes nem ordenação. Renderizado apenas em Enterprise abaixo do benchmark intra-org.
- **12.3 Onboarding guiado Enterprise** (v1.95.1) ✅: novo `EnterpriseOnboardingTour` em dialog de 5 passos (Bem-vindo, Identificação/CNPJ, Rodar 21 blocos, Importar CSV PMS, Calcular & gerar relatório). Auto-abre na 1ª visita (via `localStorage`) e é reabrível pelo botão 'Tour' no header do progresso, ao lado de 'Rodar todos'.