---
name: Canonical Report Table Template
description: Single fixed 5-column template for all indicator tables across DOCX, preview and PDF exports
type: feature
---
All report indicator tables (territorial + enterprise) MUST use exactly this canonical template, in this order:

| Indicador | Valor | Unidade | Status | Fonte |

Rules:
- Status MUST use canonical label with emoji: 🟢 EXCELENTE | 🔵 FORTE | 🟡 ADEQUADO | 🟠 ATENÇÃO | 🔴 CRÍTICO | ⚪ INFORMATIVO (peso 0).
- Valor formatted in pt-BR (vírgula decimal, ponto de milhar). Unidade pure (no number repeat).
- Fonte = official sigla from audit trail (IBGE, DATASUS, STN, CADASTUR, MTur, INEP, ANA, Manual, KB...).
- NEVER add extra columns (benchmark, observation, evidência) — those go in paragraph below the table.
- Status text NEVER carries inline color/bold/italic from the LLM — coloring is applied automatically by:
  * DOCX renderer (`src/lib/exportReportDocx.ts`)
  * Preview/print renderer (`src/pages/Relatorios.tsx`)
  Both consume `src/lib/reportStatusStyle.ts` (single source of truth for status→HEX color mapping).
- H1/H2 and table headers use the institutional `primaryColor` from `ReportCustomization` for visual consistency.
- Exception: Benchmark Externos table may use 5 different columns (Indicador | Valor Observado | Valor Oficial | Fonte | Ano).

Why: previously, each report came with different columns, ordering and color usage depending on the LLM provider/template. The canonical template removes that variability and guarantees pixel-equivalent presentation across Word, PDF and on-screen view.
