

## Diagnóstico: o sistema usa parcialmente as fórmulas do documento

### ✅ O que JÁ está implementado corretamente

1. **Indicadores modelados pelo SISTUR existem no catálogo**: IPCR, IIET, IPTL, I_SEMT (composto), % Compras Locais, % Funcionários Locais, CADÚNICO baixa renda, Leitos por Habitante, Densidade Demográfica — todos cadastrados com fórmula, unidade e direção corretas.
2. **Pipeline de normalização (Etapa 1+2 do doc)**: MIN_MAX entre `min_ref`/`max_ref`, com inversão automática para indicadores `LOW_IS_BETTER` (homicídios, mortalidade, baixa renda, etc.). ✅ Corresponde ao documento.
3. **Score por pilar (Etapa 3)**: média ponderada por `weight` dentro de cada pilar (RA/OE/AO). ✅ Corresponde.
4. **Severidade por indicador**: Crítico ≤ 0,33 / Atenção 0,34–0,66 / Adequado ≥ 0,67. ✅ Implementado em `igmaEngine.ts` e `calculate-assessment`.
5. **Indicadores compostos** (I_SEMT) calculados via `igma_composite_rules` com média ponderada. ✅

### ❌ Divergências encontradas

#### Divergência 1 — Score Final SISTUR (Etapa 4) **NÃO EXISTE**
O documento define:
```
Score Final = (RA × 35%) + (OE × 30%) + (AO × 35%)
```
Busca no código por `0.35`, `score_final`, `i_sistur`, `pillar_weight`: **0 resultados**. O sistema calcula scores por pilar mas **nunca consolida em um índice final SISTUR**. A constraint de memória diz "I-SISTUR é interno apenas", mas mesmo internamente o cálculo não existe.

#### Divergência 2 — Classificação Final da Cidade **NÃO EXISTE**
O documento define 5 faixas (Crítico 0–0,39 / Insuficiente 0,40–0,54 / Em desenvolvimento 0,55–0,69 / Bom 0,70–0,84 / Excelente 0,85–1,00). O sistema só usa 3 níveis (Crítico/Atenção/Adequado) **por indicador e por pilar**, nunca para a cidade como um todo.

#### Divergência 3 — Pesos divergem do documento
O documento sugere pesos somando ~100% por pilar (ex: 4% Plano de Turismo, 3% Saúde, 2% Certificações). O banco atual:
- **RA**: 53 indicadores, soma de pesos = **12,71** (média 0,24)
- **OE**: 29 indicadores, soma = **11,1** (média 0,38)
- **AO**: 53 indicadores, soma = **15,3** (média 0,29)

Como o cálculo é média ponderada (divide pelo total), a **proporção relativa funciona**, mas os pesos não refletem os percentuais sugeridos do documento (ex: indicador IPCR com peso 1,0 tem peso relativo ~8% em OE, mas o doc não especifica % para IPCR).

### 🛠 Proposta — 3 etapas para alinhamento total

**Etapa A — Score Final SISTUR + Classificação (alta prioridade)**
- Adicionar coluna `final_score` e `final_classification` em `assessments`.
- Calcular: `final = RA*0.35 + OE*0.30 + AO*0.35` no fim de `calculate-assessment`.
- Mapear classificação em 5 faixas conforme documento.
- Exibir apenas em relatórios e visões internas (respeitando "I-SISTUR internal only").

**Etapa B — Calibração de pesos conforme documento (média prioridade)**
- Criar migração que atualiza `weight` em `indicators` para refletir os percentuais sugeridos do documento (Plano de Turismo=4%, Saúde=3%, etc.).
- Garantir que soma por pilar = 100% (1,0 normalizado).
- Backfill: pesos atuais ficam preservados em `weight_legacy` para auditoria.

**Etapa C — Memória de cálculo do Score Final (baixa prioridade)**
- Estender `indicator_calculation_trail` para registrar também o agregado final (RA*0.35 + OE*0.30 + AO*0.35) com a fórmula textual.
- Incluir `final_score` e `final_classification` no prompt de `generate-report` (3-camadas já existente).

### 📋 Resumo executivo

| Item do documento | Status |
|---|---|
| Fórmulas dos indicadores (IPCR, IIET, IPTL, I_SEMT, etc.) | ✅ Implementado |
| Normalização 0–1 (min-max + inversão) | ✅ Implementado |
| Score por pilar (média ponderada) | ✅ Implementado |
| Severidade por indicador (3 níveis) | ✅ Implementado |
| **Score Final SISTUR (RA×35% + OE×30% + AO×35%)** | ❌ **Faltando** |
| **Classificação final da cidade (5 faixas)** | ❌ **Faltando** |
| **Pesos calibrados conforme documento** | ⚠️ **Parcial** (proporção funciona, mas valores divergem) |

Posso implementar A+B+C em sequência, ou apenas A (que é o gap mais crítico — sem ele não há Score Final visível em relatórios).

