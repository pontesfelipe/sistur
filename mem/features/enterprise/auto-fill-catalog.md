---
name: Enterprise Auto-Fill Catalog
description: Catálogo dos 21 blocos automáticos de pré-preenchimento do Step 4 do diagnóstico Enterprise — fontes, edge functions, colunas JSONB e indicadores ENT_* alimentados
type: feature
---
# Catálogo de Blocos Automáticos — Enterprise Step 4

Cada bloco roda independentemente e persiste em uma coluna JSONB de `enterprise_profiles`, alimentando 1+ indicadores `ENT_*` no diagnóstico.

| # | Bloco | Edge function | Coluna JSONB | Indicadores alimentados | Fonte |
|---|-------|---------------|--------------|--------------------------|-------|
| 1 | Reviews do estabelecimento | search-business-reviews | review_analysis | ENT_NPS, ENT_AVAL_GOOGLE | Firecrawl + LLM |
| 2 | Presença digital | search-digital-presence | digital_presence_analysis | ENT_PRESENCA_WEB | Firecrawl |
| 3 | Contexto municipal | search-destination-context | context_analysis | ENT_CONTEXTO_DESTINO | IBGE/ANAC/ANATEL/Mapa Turismo |
| 4 | CNPJ / Receita Federal | validate-cnpj | cnpj_data | (perfil: razão social, CNAE, anos op.) | BrasilAPI |
| 5 | Reclamações públicas | search-public-complaints | complaints_analysis | ENT_TAXA_SOLUCAO | Reclame Aqui + Procon |
| 6 | Concorrentes | search-competitors | (enterprise_competitors) | ENT_COMP_GAP | Booking/TripAdvisor/Google |
| 7 | Sustentabilidade | search-sustainability-signals | sustainability_analysis | ENT_SUSTENTABILIDADE | Firecrawl |
| 8 | Preço & posicionamento | search-pricing-positioning | pricing_analysis | ENT_POSICAO_PRECO | Firecrawl OTAs |
| 9 | Eventos locais | search-local-events | events_analysis | ENT_DEMANDA_EVENTOS | Firecrawl |
| 10 | Segurança turística | search-tourism-safety | safety_analysis | ENT_SEGURANCA_DESTINO | Firecrawl |
| 11 | Clima/conforto | search-climate-comfort | climate_analysis | ENT_CONFORTO_CLIMATICO | Open-Meteo ERA5 (5 anos) |
| 12 | Transporte intra-destino | search-local-transport | transport_analysis | ENT_TRANSPORTE_COBERTURA | Firecrawl |
| 13 | Força da marca | search-brand-strength | brand_strength_analysis | ENT_FORCA_MARCA | Firecrawl SERP |
| 14 | Demanda / Google Trends | search-demand-trends | demand_trends_analysis | ENT_DEMANDA_INTERESSE | Firecrawl |
| 15 | Reputação OTAs consolidada | search-consolidated-reputation | consolidated_reputation_analysis | ENT_REPUTACAO_CONSOLIDADA | Booking+Google+TripAdvisor+Airbnb |
| 16 | Redes sociais | search-social-media | social_media_analysis | ENT_PRESENCA_DIGITAL | Instagram/FB/TikTok |

**UI:** painel-resumo no topo do Step 4 mostra `X/16` blocos preenchidos com barra de progresso e badges por bloco. Implementado em `src/components/enterprise/EnterpriseProfileStep.tsx` a partir da v1.80.0.

**Secrets necessários:** `FIRECRAWL_API_KEY`, `LOVABLE_API_KEY` (para `beni-chat` em análises com LLM).

**Constraint:** todo valor auto-preenchido deve ser editável pelo usuário antes da persistência final em `enterprise_indicator_values` (provenance = 'auto' até confirmação).
## Blocos 17-18 (v1.82.0)

| # | Bloco | Edge function | Coluna JSONB | Indicadores | Fonte |
|---|-------|---------------|--------------|-------------|-------|
| 17 | Conectividade Aérea | search-air-connectivity | air_connectivity_analysis | ENT_CONECTIVIDADE_AEREA | ANAC (tabela anac_air_connectivity) |
| 18 | Sazonalidade Tarifária | (derivada client-side) | tariff_seasonality_analysis | ENT_SAZONALIDADE_TARIFARIA | Cruzamento demand + events + pricing |

## Blocos 19-21 (v1.84.0 — Fase 2)

| # | Bloco | Edge function | Coluna JSONB | Indicadores | Fonte |
|---|-------|---------------|--------------|-------------|-------|
| 19 | Conectividade Telecom | search-telecom-coverage | telecom_coverage_analysis | ENT_CONECTIVIDADE_TELECOM | Anatel (tabela anatel_coverage_cache) — composto 50% 4G + 30% 5G + 20% Wi-Fi público |
| 20 | Acessibilidade Urbana | search-urban-accessibility | urban_accessibility_analysis | ENT_ACESSIBILIDADE_SCORE | Firecrawl /v2/search em 5 dimensões (calçada, piso tátil, atrativos PCD, transporte, banheiro adaptado) |
| 21 | Infra. de Saúde do Entorno | search-health-infrastructure | health_infrastructure_analysis | ENT_SAUDE_ENTORNO | DATASUS/CNES (tabela datasus_health_cache) — composto 50% leitos/1k (ref. OMS 3/1k) + 30% PS 24h + 20% nº hospitais |

Todos os 3 retornam `{ no_data: true, reason }` quando a fonte está vazia; o componente lança `NoDataError(reason)` e o orquestrador mostra badge âmbar "sem informações disponíveis — {causa}" (reuso da v1.83.2).

## Sincronização do catálogo unificado (v1.87.0)

A Fase 3 cadastrou 30 indicadores `ENT_*` derivados/contextuais APENAS em `enterprise_indicators` (catálogo legado). O motor `calculate-assessment` prioriza a tabela unificada `public.indicators` filtrando por `indicator_scope IN ('enterprise','both')`, então valores coletados pelos blocos automáticos para esses códigos eram descartados silenciosamente (não entravam em score por pilar nem na linhagem `indicator_calculation_trail`).

**Correção (v1.87.0):** migration de sincronização populou os 30 códigos em `public.indicators` copiando do catálogo legado:
- Pilar (RA/OE/AO), benchmarks (min/max/target), peso e tier preservados.
- `data_source = 'CALCULATED'`, `collection_type = 'AUTOMATICA'`, `indicator_scope = 'enterprise'`.
- `theme` = nome da categoria Enterprise (Satisfação do Hóspede, Marketing & Vendas, Ocupação & Receita, Infraestrutura, Sustentabilidade).
- Operação idempotente (`NOT EXISTS`) — não altera indicadores já presentes.

**Total Enterprise no catálogo unificado:** 73 códigos `ENT_*` (43 anteriores + 30 sincronizados).

**Indicadores 100% derivados (calculados pelo próprio `calculate-assessment`):** `ENT_COMMISSION_AVG`, `ENT_DIRECT_SALES_PCT`, `ENT_SEASONALITY_INDEX`, `ENT_COMP_GAP`, `ENT_COMPLIANCE_RATE`. Esses são injetados em tempo de cálculo a partir de `enterprise_distribution_channels`, `enterprise_seasonality_months`, `enterprise_competitors` e `enterprise_compliance_items` — **não exigem entrada manual nem auto-fill via Firecrawl** (evita duplicidade). A flag `data_source='CALCULATED'` no catálogo serve de sinal para a UI marcar esses campos como informativos.

**Regra anti-duplicidade:** códigos `ENT_*` com `data_source='CALCULATED'` ou `'AUTOMATICA'` não devem ser editados manualmente pelo usuário — a fonte autoritativa é o bloco automático (provenance gravada em `enterprise_indicator_values.source`) ou a derivação do motor.
