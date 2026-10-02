---
name: Novas fontes de dados públicos
description: Plano em 4 fases de novas fontes oficiais (CAGED, SICONFI, SNIS, IPHAN, PF, INMET) — todas entregues; agendamento e tracking v2.31.0
type: feature
---
Plano aprovado em 2026-10-02 (`.lovable/plan/plano-de-melhoria-novas-fontes-de-dados-públicos-2026-10-02.md`):

- **Fase 1 (v2.26.0, entregue):** `ingest-caged` (CSV via secret CAGED_CSV_URL; sem URL registra skipped_no_source) e `ingest-siconfi` (API Tesouro RREO-Anexo 02, funções Turismo/Cultura/Saneamento, só colunas "ATÉ O BIMESTRE"). Tabelas `caged_tourism_employment` e `siconfi_municipal_spending` (leitura autenticada, escrita service_role).
- **Fase 2 (v2.27.0, entregue):** `ingest-snis` (secret SNIS_CSV_URL) e `ingest-iphan` (secret IPHAN_CSV_URL), tabelas `snis_sanitation_indicators` e `iphan_heritage_assets`; sem URL → skipped_no_source.
- **Fase 3 (v2.28.0, entregue):** `ingest-pf-turismo` (secret PF_ARRIVALS_CSV_URL → `pf_international_arrivals`) e `ingest-inmet` (secret INMET_NORMALS_CSV_URL → `inmet_climate_normals`); Google Trends adiado (sem API oficial).
- **Fase 4 (v2.29.0, entregue):** get_ingestion_health inclui as 6 novas funções (CAGED/PF mensal, demais anual); Metodologia lista as novas fontes.
- **v2.29.1:** PF sem secret — busca via CKAN dados.turismo.gov.br (dataset chegada-de-turistas-internacionais), formato oficial Via_de_acesso;UF(nome);pais;mes(nome);ano;Chegadas. Carregado 2025–2026.
- **v2.29.2:** INMET lê xlsx oficiais portal.inmet.gov.br/uploads/normais/Normal-Climatologica-{TMEDSECA,TMAX,TMIN,PREC}.xlsx (223 estações). SNIS: SINISA ref.2023 Base Municipal convertido para CSV no bucket privado official-data/snis (IAG0001, IES0001, IES0007, IAG2013; fora de 0–100 → null); resíduos sem dado (arquivo .rar). 

Detalhe SICONFI: anexo correto é `RREO-Anexo 02` (com hífen); função identificada pelo nome em `conta`, não por cod_conta.
- **v2.29.3–v2.30.0:** IPHAN via geoserver WFS oficial; CAGED via GitHub Actions (repo privado pontesfelipe/sistur-caged-ingest, dia 5) → função receive-caged → ingest-caged.
- **v2.29.5:** PF com retry (3 tentativas, só falhas transitórias).
- **v2.31.0:** agendamentos: PF dia 10, IPHAN 12, SICONFI 15, SNIS 18, INMET 20/mar. Saúde das Ingestões (página admin e aba em Configurações) com "Atualizar agora", próxima execução e histórico filtrável. ANAC e CadÚnico ainda chamam direto (sem histórico).
