---
name: Novas fontes de dados públicos
description: Plano em 4 fases de novas fontes oficiais (CAGED, SICONFI, SNIS, IPHAN, PF, INMET) — Fases 1-2 entregues (v2.26.0, v2.27.0)
type: feature
---
Plano aprovado em 2026-10-02 (`.lovable/plan/plano-de-melhoria-novas-fontes-de-dados-públicos-2026-10-02.md`):

- **Fase 1 (v2.26.0, entregue):** `ingest-caged` (CSV via secret CAGED_CSV_URL; sem URL registra skipped_no_source) e `ingest-siconfi` (API Tesouro RREO-Anexo 02, funções Turismo/Cultura/Saneamento, só colunas "ATÉ O BIMESTRE"). Tabelas `caged_tourism_employment` e `siconfi_municipal_spending` (leitura autenticada, escrita service_role).
- **Fase 2 (v2.27.0, entregue):** `ingest-snis` (secret SNIS_CSV_URL) e `ingest-iphan` (secret IPHAN_CSV_URL), tabelas `snis_sanitation_indicators` e `iphan_heritage_assets`; sem URL → skipped_no_source.
- **Fase 3 (v2.28.0, entregue):** `ingest-pf-turismo` (secret PF_ARRIVALS_CSV_URL → `pf_international_arrivals`) e `ingest-inmet` (secret INMET_NORMALS_CSV_URL → `inmet_climate_normals`); Google Trends adiado (sem API oficial).
- **Fase 4 (v2.29.0, entregue):** get_ingestion_health inclui as 6 novas funções (CAGED/PF mensal, demais anual); Metodologia lista as novas fontes. Plano concluído; pendente só configurar URLs das planilhas.

Detalhe SICONFI: anexo correto é `RREO-Anexo 02` (com hífen); função identificada pelo nome em `conta`, não por cod_conta.
