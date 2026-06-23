---
name: Enterprise Brand Network Model
description: Hotel chain/network model — brands group multiple enterprise units across municipalities, each unit keeps its own diagnostic
type: feature
---
`enterprise_brands` (RLS por `org_id`) representa uma marca/rede. Tipos: `independent | chain | franchise | collection`. UNIQUE(org_id, name).

`enterprise_profiles` ganhou `brand_id` (FK, nullable), `unit_name` e `is_flagship`. Cada profile é uma **unidade** da marca em 1 município. Index único `(brand_id, destination_id)` impede mesma marca duplicada no mesmo destino. Backfill criou marca "solo" 1:1 para perfis legados, preservando todos os diagnósticos.

**Regra atualizada (v1.97.1):** 1 diagnóstico empresarial pode cobrir **múltiplas unidades da mesma marca**. `assessments.brand_id` (opcional) + tabela `assessment_units` (1 linha por município/unidade, `is_primary` único por assessment). `indicator_values.unit_id` e `enterprise_indicator_values.unit_id` (opcionais) permitem coletar o mesmo indicador por unidade dentro do mesmo `assessment_id`. Compatibilidade: assessments sem `brand_id` / sem unidades = single-unit (legado intocado). `useAssessments.createAssessment` aceita `brand_id` + `units[]` e materializa as `assessment_units` (auto-inclui o destino principal mesmo no single-unit para uniformizar cálculo futuro).

UI:
- `useEnterpriseBrands` / `useBrandUnits` (src/hooks/)
- `useAssessmentUnits` (src/hooks/) — CRUD das unidades de um assessment
- `BrandSelector` (combobox + criação inline)
- `AssessmentUnitsManager` (lista rascunho de unidades no wizard Step 2)
- `BrandManagementPanel` em Configurações → aba "Marcas"
- Card "Identidade do empreendimento e da marca" no topo do Step 4 de NovaRodada Empresarial

**Status (v1.97.4):** Fase 4 / passo 1 entregue — `calculate-assessment` detecta multi-unit (`brand_id` + 2+ `assessment_units`) e dispara `runCalculationCore` por unidade, com `unitContext` que sobrepõe `destination_id`/`destination` e filtra/etiqueta indicadores por `unit_id`. Tabelas `indicator_scores`, `pillar_scores`, `issues`, `recommendations` ganharam coluna `unit_id` opcional + índices únicos parciais (`WHERE unit_id IS NULL` legado / `WHERE unit_id IS NOT NULL` multi). Brand rollup persistido em `assessment_brand_rollups(assessment_id, pillar)` com `score_weighted` (ponderado por `room_count`), `score_simple`, `stddev` e `critical_unit_id` por pilar (RA/OE/AO/GLOBAL). Modo single-unit / legado segue 100% inalterado. **Pendente:** Fase 4 / passo 2 — hook `useAssessmentResults` + UI multi-unit em `DiagnosticoDetalhe` (tabs por unidade + card de marca) e seção comparativa de rede em `generate-report`/`process-report-job`.