# Fase 4 — Cálculo + relatório agregado de marca

Objetivo: gerar **scores por unidade** + **consolidação ponderada da marca** num único `assessment_id` multi-unidade, e expor isso no relatório.

## 1. Schema (migration)

Adicionar `unit_id uuid NULL REFERENCES assessment_units(id) ON DELETE CASCADE` em:

- `indicator_scores`
- `pillar_scores`
- `issues`
- `recommendations`

Para cada tabela: criar índice em `(assessment_id, unit_id)` e substituir os índices únicos existentes por **parciais** (`WHERE unit_id IS NULL` para legado + `WHERE unit_id IS NOT NULL` para multi-unidade), espelhando o padrão já usado em `indicator_values`.

Nova tabela `assessment_brand_rollups` (por assessment, agregado de marca):

```text
assessment_brand_rollups
├── assessment_id (PK fk)
├── brand_id
├── pillar ('RA'|'OE'|'AO'|'GLOBAL')
├── score_weighted     -- média ponderada por room_count
├── score_simple       -- média simples
├── stddev             -- dispersão entre unidades
├── unit_count
└── critical_unit_id   -- unidade pior naquele pilar
PK (assessment_id, pillar)
```

GRANT + RLS por `org_id` via `assessment_id`.

## 2. Edge function `calculate-assessment` (refactor)

```text
runCalculationCore(assessment_id)
├── carrega assessment + units = SELECT * FROM assessment_units WHERE assessment_id=?
├── se units.length <= 1 → fluxo atual intocado (compat single-unit)
└── senão (multi-unit enterprise):
      for each unit in units:
          runUnitCalculation(assessment_id, unit)
              ├── busca indicator_values WHERE assessment_id=? AND unit_id=unit.id
              ├── injeta derivados (receita, compliance) usando unit.destination_id e unit.enterprise_profile_id
              ├── normaliza + scoreia → grava indicator_scores/pillar_scores/issues/recommendations COM unit_id
              └── retorna {pillar_scores, critical}
      aggregateBrand(units_results)
          ├── pondera por enterprise_profiles.room_count (fallback 1)
          ├── grava assessment_brand_rollups (RA, OE, AO, GLOBAL)
          └── define pillar/score crítico da marca
```

Bloco de derivados enterprise (receita/compliance/reviews/competitors) passa a iterar por unidade usando `unit.destination_id` / `unit.enterprise_profile_id` em vez do `assessment.destination_id` global.

Resultado retornado: `{ success, mode: 'multi-unit', units: [{unit_id, pillar_scores, critical}], brand: {pillar_scores, critical, stddev} }`. Single-unit mantém o shape atual.

## 3. Hooks/UI

- `useAssessmentResults(assessmentId)` (novo) — devolve `units[]` + `brand` quando multi-unidade; senão devolve o resultado single como hoje.
- `DiagnosticoDetalhe.tsx` — quando multi-unidade: header com card da marca (score consolidado + dispersão), tabs por unidade reusando o painel atual; senão render legado.
- `IntegratedTerritorialView.tsx` — sem mudanças funcionais; recebe `unitId` opcional quando aberto a partir de uma aba.

## 4. Relatório (`process-report-job` / `generate-report` modo empresarial)

Quando `assessment.brand_id` + `assessment_units.count > 1`:

- Capítulo 1: **Marca** — perfil, abrangência (lista de municípios), score consolidado, dispersão por pilar, pilar crítico.
- Capítulo 2..N: **Unidade `unit_name` (`municipio`)** — diagnóstico territorial + diagnóstico da unidade lado a lado.
- Capítulo final: **Comparativo da rede** — ranking interno por pilar, fatores territoriais que explicam gaps, recomendações transversais (marca) × locais (unidade).

LLM recebe payload com `brand_rollup` + array `units[]` (cada uma com pillar_scores, issues top-N, recommendations). Sem mudança no shape single-unit.

## 5. Versão / memória

- Bump `1.97.4` + entrada em `VERSION_HISTORY`.
- Atualizar `mem/features/enterprise/brand-network-model.md` marcando Fase 4 como entregue.

## Compatibilidade

- Assessments antigos (sem unidades, ou com 1 unidade auto-criada): **continuam batendo o caminho atual** — nada de `unit_id` é gravado, índices parciais `WHERE unit_id IS NULL` preservam unicidade legada.
- Toda nova coluna `unit_id` é nullable + sem default.

## Entrega sugerida em 2 passos

1. **Migration + refactor da edge function** (passos 1 e 2 + bump de versão).
2. **UI de resultado multi-unidade + relatório** (passos 3 e 4).

Confirma e eu já entrego o passo 1?
