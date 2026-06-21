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