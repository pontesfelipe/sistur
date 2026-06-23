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

**Status (v1.97.3):** Tabs por unidade implementadas nos Steps 4 e 5 do wizard. Step 4 isola pré-preenchimento por unidade; Step 5 carrega/salva `indicator_values` filtrados por `unit_id` usando `useIndicatorValues(assessmentId, unitId)`. Índice único legado `(assessment_id, indicator_id)` virou parcial `WHERE unit_id IS NULL` para liberar coexistência com multi-unit. **Pendente:** Fase 4 — refator do `calculate-assessment` para iterar `assessment_units`, gerar scores por unidade e consolidação ponderada (ex.: por `room_count`) na marca; relatórios com seção comparativa de rede.