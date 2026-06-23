# Diagnóstico Empresarial Multi-Unidade (1 marca × N municípios)

Corrigindo o rumo: em vez de 1 diagnóstico por unidade + visão consolidada da rede, vamos tratar **um único diagnóstico empresarial** que cobre **múltiplas unidades da mesma marca em municípios diferentes**. A coleta de dados é feita por unidade (cada município tem seu contexto), mas o resultado é um único relatório com seções por unidade + visão de marca.

## Modelo de dados

```text
assessments (alteração)
└── + brand_id  (uuid, fk enterprise_brands, nullable)
       Quando preenchido + diagnostic_type='enterprise' = diagnóstico de rede.
       destination_id passa a ser o "destino principal" (compatibilidade),
       mas a coleta real usa a tabela abaixo.

assessment_units  (NOVA)
├── id
├── assessment_id (fk assessments)
├── destination_id (fk destinations)
├── enterprise_profile_id (fk, nullable — criado quando o usuário preenche)
├── unit_name           (rótulo da unidade naquele município)
├── is_primary          (bool — só uma por assessment)
├── status              ('pending' | 'data_ready' | 'calculated')
└── created_at / updated_at

UNIQUE (assessment_id, destination_id)
```

`indicator_values` e `enterprise_indicator_values` ganham `unit_id` (uuid, nullable, fk → `assessment_units.id`). Isso permite coletar o mesmo indicador várias vezes no mesmo `assessment_id`, uma por unidade, sem quebrar a chave `(assessment_id, indicator_id)` legada (mantemos legado com `unit_id IS NULL`). Novo índice único: `(assessment_id, indicator_id, COALESCE(unit_id, '...'))`.

Backfill: assessments existentes ficam com `brand_id = NULL` e seguem funcionando exatamente como hoje (uma unidade implícita).

## Fluxo no wizard (Nova Rodada Empresarial)

1. **Step 1 — Escopo**: já existe. Adicionar texto "1 marca pode cobrir múltiplos municípios".
2. **Step 2 — Marca + Unidades**:
   - Selecionar/criar `brand_id` (já temos `BrandSelector`).
   - Lista de **unidades**: usuário adiciona quantos `{ destination, unit_name }` quiser. Marca uma como principal.
   - Reuso do `DestinationCombobox` + botão "Adicionar unidade".
3. **Step 3 — Diagnóstico**: tier, período, título. Sem mudanças.
4. **Step 4 — Pré-preenchimento por unidade**:
   - Abas (Tabs) com 1 aba por unidade. Cada aba renderiza o `EnterpriseProfileStep` atual, já isolado por `destinationId` + `unit_id`.
   - Auto-fill (reviews, OTAs, redes, concorrentes etc.) roda por unidade — usa o nome do hotel daquela unidade.
   - Blocos territoriais (IBGE, ANAC, ANATEL, clima, segurança, transporte) também por unidade — cada município tem o seu.
5. **Step 5 — Preenchimento manual**: mesmo padrão de abas por unidade no `EnterpriseDataEntryPanel`.
6. **Step 6 — Cálculo**: a edge function `calculate-enterprise-assessment` itera as `assessment_units`, calcula indicadores/pilares por unidade, e produz:
   - Scores por unidade (RA/OE/AO + I-SISTUR interno).
   - Score consolidado da marca (média ponderada por capacidade — `room_count`).
   - Dispersão (desvio padrão por pilar) para sinalizar onde a marca é desigual.
7. **Step 7 — Relatório**: relatório único com:
   - Capítulo geral da marca (perfil, abrangência, dispersão por pilar).
   - Capítulo por unidade (diagnóstico territorial + diagnóstico da unidade, lado a lado).
   - Capítulo comparativo: ranking interno das unidades, fatores territoriais que explicam diferenças, recomendações de marca (transversais) × locais (por unidade).

## Mudanças de front-end

- `src/hooks/useAssessmentUnits.ts` (novo) — CRUD das unidades do assessment.
- `src/hooks/useAssessments.ts` — `create` aceita `brand_id` + `units[]`.
- `src/components/enterprise/AssessmentUnitsManager.tsx` (novo) — lista de unidades no Step 2.
- `src/pages/NovaRodadaForm.tsx` — Step 2 com `BrandSelector` + `AssessmentUnitsManager` quando `diagnosticType === 'enterprise'`.
- `src/pages/NovaRodadaDialogs.tsx` — Step 4/5 com `Tabs` por unidade; cada aba passa `unitId` para `EnterpriseProfileStep` / `EnterpriseDataEntryPanel`.
- `src/components/enterprise/EnterpriseProfileStep.tsx` — aceita `unitId` opcional; persiste indicadores com `unit_id`.
- `src/components/diagnostics/IntegratedTerritorialView.tsx` — quando `brand_id` presente, mostra mosaico por unidade.
- `src/pages/DiagnosticoDetalhe.tsx` — render multi-unidade quando aplicável.

## Edge functions

- `calculate-enterprise-assessment` (refactor): aceitar assessments multi-unidade; calcular por unidade e gerar agregação de marca.
- `generate-report` (modo empresarial): aceita assessment com unidades; gera seções comparativas.

## Compatibilidade

- Assessments antigos (`brand_id IS NULL`, sem `assessment_units`): fluxo single-unit continua intocado — todas as queries fallback para `destination_id` quando não houver linhas em `assessment_units`.
- Front-end: se o assessment tem >1 unit, renderiza abas; caso contrário, layout atual.

## Entregáveis por fase

1. **Fase 1 — modelo + API**: migration de `assessments.brand_id`, `assessment_units`, `indicator_values.unit_id`; hook `useAssessmentUnits`; ajuste de `useAssessments`.
2. **Fase 2 — wizard Step 2**: BrandSelector + AssessmentUnitsManager; criação multi-unit.
3. **Fase 3 — wizard Step 4/5**: Tabs por unidade no pré-preenchimento e na entrada manual.
4. **Fase 4 — cálculo + relatório**: edge function e seções comparativas.

Sugiro entregar **Fase 1 + Fase 2** neste ciclo (base + wizard) para que você já consiga criar a estrutura multi-unidade; Fases 3 e 4 (Tabs nas etapas de coleta e cálculo agregado) entram no ciclo seguinte. Confirma para eu começar?
