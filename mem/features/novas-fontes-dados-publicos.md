---
name: Novas fontes de dados públicos
description: Plano em 4 fases de novas fontes oficiais (CAGED, SICONFI, SNIS, IPHAN, PF, INMET) — Fase 1 entregue na v2.26.0
type: feature
---
Plano aprovado em 2026-10-02 (`.lovable/plan/plano-de-melhoria-novas-fontes-de-dados-públicos-2026-10-02.md`):

- **Fase 1 (v2.26.0, entregue):** `ingest-caged` (CSV via secret CAGED_CSV_URL; sem URL registra skipped_no_source) e `ingest-siconfi` (API Tesouro RREO-Anexo 02, funções Turismo/Cultura/Saneamento, só colunas "ATÉ O BIMESTRE"). Tabelas `caged_tourism_employment` e `siconfi_municipal_spending` (leitura autenticada, escrita service_role).
- **Fase 2 (v2.27.0, pendente):** SNIS (saneamento) + IPHAN (patrimônio cultural) → pilar RA.
- **Fase 3 (v2.28.0, pendente):** PF (turistas internacionais por UF), INMET (clima/sazonalidade), Google Trends opcional.
- **Fase 4 (v2.29.0, pendente):** painel de saúde das novas fontes + ficha metodológica.

Detalhe SICONFI: anexo correto é `RREO-Anexo 02` (com hífen); função identificada pelo nome em `conta`, não por cod_conta.
