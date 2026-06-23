---
name: Enterprise Brand Network Model
description: Hotel chain/network model — brands group multiple enterprise units across municipalities, each unit keeps its own diagnostic
type: feature
---
`enterprise_brands` (RLS por `org_id`) representa uma marca/rede. Tipos: `independent | chain | franchise | collection`. UNIQUE(org_id, name).

`enterprise_profiles` ganhou `brand_id` (FK, nullable), `unit_name` e `is_flagship`. Cada profile é uma **unidade** da marca em 1 município. Index único `(brand_id, destination_id)` impede mesma marca duplicada no mesmo destino. Backfill criou marca "solo" 1:1 para perfis legados, preservando todos os diagnósticos.

Regra: diagnóstico continua **por unidade** (1 assessment = 1 destino). A camada de marca serve para análise consolidada da rede em diferentes territórios — não há média artificial entre municípios.

UI:
- `useEnterpriseBrands` / `useBrandUnits` (src/hooks/)
- `BrandSelector` (combobox + criação inline)
- `BrandManagementPanel` em Configurações → aba "Marcas"
- Card "Identidade do empreendimento e da marca" no topo do Step 4 de NovaRodada Empresarial

Próximas fases planejadas (não implementadas em 1.97.0): visão `/diagnosticos/rede/:brandId` com tabela comparativa + heatmap, e extensão de `generate-report` para análise marca × território.