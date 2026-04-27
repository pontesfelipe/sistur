---
name: Prescription Mode
description: Modo Prescrição (toggle global + aba dedicada) que filtra diagnósticos para indicadores Atenção/Crítico e mostra cursos EDU vinculados
type: feature
---
O Modo Prescrição é uma visualização focada do DiagnosticoDetalhe que isola apenas os indicadores que efetivamente disparam o motor EDU (status Atenção ou Crítico, score ≤ 0,66 — alinhado à regra "Adequado ≥67%").

**Componentes:**
1. **Toggle global** no header do DiagnosticoDetalhe (Switch + Label), persistido em `?prescription=1`. Visível somente quando `isCalculated`. Quando ativo, filtra as abas Indicadores, Gargalos e Tratamento para mostrar apenas itens prescritivos.
2. **Aba dedicada "Prescrição"** (`?tab=prescricao`) com `PrescriptionModeView` (`src/components/diagnostics/PrescriptionModeView.tsx`): cards de KPI (Gatilhos / Com prescrição / Cobertura %) + listagem agrupada por pilar (RA/OE/AO) com cada indicador-gatilho, justificativa e curso vinculado.

**Regras:**
- Filtro: `score <= 0.66` (CRITICO + ATENCAO). Adequado nunca aparece no modo prescrição.
- Cobertura = (gatilhos com prescrição) / (gatilhos totais). Indicadores sem curso correspondente recebem badge 'Sem curso'.
- Não substitui a aba Tratamento (EduRecommendationsPanel) — é uma visão consolidada e cruzada com `usePrescriptions(assessmentId)`.
