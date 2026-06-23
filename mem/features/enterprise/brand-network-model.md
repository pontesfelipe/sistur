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

**Status (v1.97.5):** Fase 4 completa para UI. Dispatcher multi-unit também grava `pillar_scores` no nível da marca (`unit_id IS NULL`) + `assessments.final_score`/`final_classification`, então PillarGauge/IGMA do legado continuam funcionando sem branch. Novo `useBrandRollup(assessmentId)` (hook) e `BrandRollupPanel` (componente) renderizam no topo do `DiagnosticoDetalhe` quando o diagnóstico é multi-unit: scores consolidados por pilar (ponderado por `room_count` + dispersão), unidade mais frágil por pilar e ranking interno das unidades. **Pendente (não bloqueia uso):** seção comparativa de rede no relatório (`generate-report`/`process-report-job`) e filtros por unidade nas abas internas (Indicadores/Gargalos/Tratamento).