# Plano de implementação — 3 melhorias de alto impacto

## 1. Sumário Executivo de 1 página (Diagnóstico)

Nova aba/ação no diagnóstico que gera um resumo de uma página, pronto para impressão e exportação.

Conteúdo:
- Cabeçalho: destino/empreendimento, ciclo, data do cálculo, tier.
- Índices dos 3 pilares (RA/OE/AO) com status em percentual (Adequado/Atenção/Crítico).
- Top 5 gargalos (indicadores críticos) e Top 5 pontos fortes.
- Interpretação territorial (Estrutural/Gestão/Entrega) e avisos IGMA em uma linha cada.
- Próximos passos: recomendações e prescrições EDU vinculadas aos gargalos.
- Rodapé com procedência dos dados (fontes oficiais usadas) e versão do sistema.

Ações: imprimir/PDF (via print CSS) e exportar DOCX reaproveitando o utilitário de exportação existente.

## 2. Comparativo entre ciclos lado a lado

Evolui o comparativo atual, que hoje só mostra a rodada anterior automaticamente.

- Seletor de duas rodadas calculadas do mesmo destino (A vs B).
- Tabela indicador a indicador: valor A, valor B, variação em pontos percentuais, mudança de status.
- Filtros por pilar e por tipo de mudança (melhorou / piorou / estável / mudou de status).
- Destaque automático das 5 maiores melhorias e 5 maiores regressões, com o motivo derivado dos dados (valor bruto, fonte e mudança de faixa de normalização).
- Exportação CSV do comparativo.

## 3. Simulador what-if ligado ao diagnóstico real

- Carrega os indicadores reais da rodada selecionada.
- Sliders por indicador (com limites e formato do catálogo) recalculando, no cliente, score normalizado, índice do pilar e status — usando exatamente as mesmas regras do motor atual (faixas 67%/34%, direção do indicador, pesos da organização).
- Painel de resumo: status atual vs simulado por pilar, e quais indicadores dão maior ganho por esforço.
- Nada é gravado no diagnóstico: a simulação é apenas exploratória.
- Ação "criar projeto a partir deste cenário", reaproveitando o fluxo de geração de projeto já existente, levando os indicadores escolhidos como metas.

## Notas técnicas

- Novos componentes em `src/components/diagnostics/` (`ExecutiveSummary.tsx`, `CycleComparisonPanel.tsx`, `WhatIfSimulatorPanel.tsx`) e hooks correspondentes em `src/hooks/`.
- Integração como novas abas em `DiagnosticoDetalhe.tsx`, disponíveis para modo territorial e empresarial (empresarial respeita filtro de unidade/marca).
- Nenhuma mudança de schema: tudo é leitura de `assessments`, `pillar_scores`, `indicator_scores`, `indicator_values` (e equivalentes empresariais), respeitando `effectiveOrgId` e RLS.
- Cálculo da simulação isolado em função pura reutilizando as regras de status já definidas, sem duplicar limites.
- Bump de versão MINOR + entrada no `VERSION_HISTORY`.

## Ordem de entrega

1. Sumário executivo (maior valor imediato, menor risco).
2. Comparativo entre ciclos.
3. Simulador what-if + criação de projeto a partir do cenário.
