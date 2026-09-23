# Plano: Gêmeo Digital, Geomarketing, ROI/LTV e Precificação Dinâmica

Quatro módulos novos, entregues em fases independentes (cada fase gera uma versão). A ordem vai do que aproveita mais o que já existe ao que exige mais coisa nova.

## Fase 1 — Precificação dinâmica (Empresarial) — v2.11.0
Aproveita a sazonalidade mensal (ocupação, diária média, RevPAR), os canais de distribuição e a pesquisa de tarifas públicas que já existem.
- Nova aba "Precificação" no diagnóstico empresarial.
- Calendário de 12 meses com **diária sugerida** por mês: base = diária média atual, ajustada pela ocupação do mês (alta → sobe, baixa → desce), pelos eventos do Observatório no município e pela referência de mercado (OTAs).
- Faixa mínima/máxima configurável pelo gestor (piso e teto) e limite de variação por mês.
- Cada sugestão mostra a justificativa em texto ("Ocupação 88% + evento X → +12%").
- Estimativa de receita e RevPAR projetados com a tabela sugerida vs. atual.
- É sugestão: nada altera preços em sistemas externos.

## Fase 2 — ROI e LTV — v2.12.0
- **ROI de projetos** (Analítico/Territorial): cada projeto ganha "investimento" (soma do orçamento já cadastrado) e "retorno esperado" (entrada manual ou estimado pelo ganho projetado nos indicadores ligados ao projeto). Exibe ROI %, payback em meses e comparação planejado × realizado.
- **LTV do hóspede** (Empresarial): formulário com gasto médio por estadia, frequência de retorno por ano, tempo médio de relacionamento e margem; custo de aquisição por canal vem da comissão ponderada já calculada. Mostra LTV, CAC, relação LTV/CAC e alerta quando < 3.
- Fórmulas documentadas na ficha metodológica.

## Fase 3 — Geomarketing — v2.13.0
- Nova tela "Geomarketing" com mapa do município e entorno.
- Camadas: concorrentes (já cadastrados), empreendimentos da marca/rede, atrativos e eventos do Observatório, conectividade aérea (ANAC) e origem da demanda (estados/países de origem informados).
- Raio de influência ajustável e contagem de concorrentes/oferta dentro do raio.
- Mapa de calor de densidade de oferta vs. demanda para apontar áreas saturadas ou com oportunidade.
- Respeita a regra do projeto: sem ranking entre municípios; foco no próprio destino/empreendimento.

## Fase 4 — Gêmeo Digital (evolução do Simulador "E se?") — v2.14.0
- Transforma o simulador atual em um modelo de cenários salvos: "Base", "Otimista", "Pessimista" e personalizados.
- Alavancas de alto nível (ex.: +20% leitos, +1 voo semanal, investimento em saneamento, campanha de marketing) que mexem em vários indicadores de uma vez, com efeitos em cadeia entre pilares seguindo as regras sistêmicas do IGMA (ex.: queda em RA limita ganhos em AO).
- Projeção ao longo de 1–5 anos, com gráfico de evolução dos três pilares e da classificação.
- Comparação lado a lado de cenários e botão "Transformar cenário em projeto".
- Continua sem alterar o diagnóstico oficial.

## Detalhes técnicos
- Tabelas novas (com GRANT + RLS por `org_id`): `pricing_rules` e `pricing_suggestions` (fase 1); `project_roi` e `enterprise_ltv_inputs` (fase 2); `geo_points` para pontos sem coordenadas próprias (fase 3); `twin_scenarios`, `twin_levers`, `twin_lever_effects` (fase 4).
- Cálculos determinísticos em funções puras em `src/lib/` com testes Vitest (preço, ROI, LTV, propagação de cenários); IA só para textos de justificativa opcionais, via `openai/gpt-6-astra`.
- Mapa: verificar na fase 3 se já há biblioteca de mapa instalada; senão, usar Leaflet + OpenStreetMap (sem chave). Coordenadas via enriquecimento de município já existente.
- Gating por plano: Precificação/LTV/Geomarketing no Empresarial; ROI e Gêmeo Digital no Analítico (Pro/Enterprise).
- Cada fase: versão em `src/config/version.ts`, changelog, docs, metodologia e memória do projeto.
