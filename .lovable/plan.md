# Plano de Melhoria — Novas Fontes de Dados Públicos

Enriquecer os diagnósticos (pilares RA/OE/AO), o Observatório Turístico e as recomendações com fontes oficiais abertas, em fases independentes (cada fase gera uma versão).

## Fase 1 — Emprego e Finanças (maior valor, APIs fáceis) — v2.26.0

- **Novo CAGED (Ministério do Trabalho):** empregos formais no turismo por município (alojamento, alimentação, transporte, agências). Alimenta o Observatório (série mensal de emprego turístico) e o indicador `igma_empregos_turismo`, hoje dependente de RAIS/CAGED antigo.
- **SICONFI/Tesouro (FINBRA):** despesa municipal realizada na função Turismo e em Cultura/Saneamento. Enriquece o pilar OE (governança e investimento público) com dado orçamentário oficial.

## Fase 2 — Território e Sustentabilidade — v2.27.0

- **SNIS (Saneamento):** cobertura de água, esgoto e coleta de resíduos por município — reforça o pilar RA com indicadores ambientais oficiais.
- **IPHAN/SICG:** bens tombados e patrimônio cultural registrado — qualifica a oferta cultural do destino no pilar RA.

## Fase 3 — Demanda e Percepção — v2.28.0

- **Polícia Federal (via dados abertos/estimativas):** chegadas de turistas internacionais por UF — melhora a estimativa de visitantes internacionais usada na receita per capita e no IPTL.
- **INMET:** normals climáticas (temperatura, chuva) por estação — contextualiza sazonalidade e precificação dinâmica.
- **Google Trends (opcional):** interesse de busca pelo destino — termômetro de demanda no Observatório.

## Fase 4 — Consolidação — v2.29.0

- Painel de saúde das novas fontes na tela de ingestão (IngestionHealthPanel), com cache municipal e fallback de ciclo anterior (mesmo padrão das fontes atuais).
- Atualização da ficha metodológica, docs e memória do projeto com as novas fontes e regras de normalização.

## Detalhes técnicos

- Padrão já existente: edge functions `ingest-*` (service role) + tabela `ingestion_runs` + trigger `trigger-ingestion` (admin). Novas funções: `ingest-caged`, `ingest-siconfi`, `ingest-snis`, `ingest-iphan` (fases 1–2), depois `ingest-pf-turismo`, `ingest-inmet`.
- Tabelas novas com GRANT + RLS: `caged_tourism_employment`, `siconfi_municipal_spending`, `snis_sanitation`, `iphan_heritage` — leitura pública (dados oficiais), escrita só via service role.
- Mapeamento para indicadores existentes segue o pipeline obrigatório de 9 passos e as regras de normalização já definidas; nenhum indicador novo sem fonte/ano/método auditáveis.
- Onde a API oficial não existir (IPHAN, PF), usar download trimestral de CSV/dados abertos com ingestão agendada, mesmo padrão do Cadastur.
- Cada fase: bump MINOR em `src/config/version.ts` + changelog; sem rankings públicos entre municípios (regra do projeto).

## Ordem de entrega

1. CAGED + SICONFI (fase 1).
2. SNIS + IPHAN (fase 2).
3. PF + INMET (+ Trends opcional) (fase 3).
4. Painel de saúde e documentação (fase 4).
