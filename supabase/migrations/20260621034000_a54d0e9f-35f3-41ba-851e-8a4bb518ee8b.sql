
INSERT INTO public.enterprise_indicators (code, name, category_id, pillar, unit, description, collection_frequency, benchmark_min, benchmark_max, benchmark_target, weight, is_active, minimum_tier)
SELECT v.code, v.name, c.id, v.pillar, v.unit, v.description, 'annual', v.bmin, v.bmax, v.btarget, v.weight, true, 'COMPLETE'
FROM (VALUES
  -- AO · Satisfação / Qualidade
  ('ENT_AVAL_GOOGLE',           'Avaliação Google (média)',                     'AO', 'AO_SATISFACAO', 'score 1-5',   1, 5, 4.5, 0.6, 'Nota média do empreendimento no Google Maps (derivada de reviews públicas).'),
  ('ENT_REVIEW_VOL',            'Volume de Reviews Online',                     'AO', 'AO_SATISFACAO', 'unidades',    0, 5000, 500, 0.4, 'Volume total agregado de reviews (Google + Booking + TripAdvisor).'),
  ('ENT_GUEST_SATISFACTION',    'Satisfação do Hóspede (composta)',             'AO', 'AO_SATISFACAO', 'score 0-100', 0, 100, 80, 0.6, 'Índice composto de satisfação a partir de reviews e NPS.'),
  ('ENT_REPUTACAO_CONSOLIDADA', 'Reputação Consolidada Multi-canal',            'AO', 'AO_QUALIDADE',  'score 0-100', 0, 100, 75, 0.7, 'Reputação ponderada (Google, Booking, TripAdvisor, redes sociais).'),
  ('ENT_REPUTACAO_PUBLICA',     'Reputação Pública (Reclame Aqui / Procon)',    'AO', 'AO_QUALIDADE',  'score 0-100', 0, 100, 70, 0.6, 'Score derivado de reclamações públicas e taxa de solução.'),
  ('ENT_TAXA_SOLUCAO',          'Taxa de Solução de Reclamações Públicas',      'AO', 'AO_QUALIDADE',  '%',           0, 100, 90, 0.5, 'Percentual de reclamações resolvidas em canais públicos.'),
  ('ENT_TAXA_SOLUCAO_RECLAMACOES','Taxa de Solução de Reclamações',             'AO', 'AO_QUALIDADE',  '%',           0, 100, 90, 0.5, 'Sinônimo agregado para resolução de reclamações.'),
  -- AO · Marketing / Comercial
  ('ENT_FORCA_MARCA',           'Força de Marca',                               'AO', 'AO_MARKETING',  'score 0-100', 0, 100, 65, 0.5, 'Score de força/menções de marca on-line.'),
  ('ENT_PRESENCA_DIGITAL',      'Presença Digital',                             'AO', 'AO_MARKETING',  'score 0-100', 0, 100, 70, 0.6, 'Composto de site, OTAs e redes sociais.'),
  ('ENT_PRESENCA_WEB',          'Presença Web',                                 'AO', 'AO_MARKETING',  'score 0-100', 0, 100, 70, 0.4, 'Sinônimo agregado para presença web.'),
  ('ENT_DEMANDA_INTERESSE',     'Demanda / Interesse de Busca',                 'AO', 'AO_MARKETING',  'score 0-100', 0, 100, 60, 0.5, 'Tendência de busca pelo destino (Google Trends).'),
  ('ENT_DEMANDA_EVENTOS',       'Demanda Gerada por Eventos',                   'AO', 'AO_MARKETING',  'score 0-100', 0, 100, 60, 0.5, 'Densidade e relevância de eventos no calendário local.'),
  ('ENT_EVENTOS_DENSIDADE',     'Densidade de Eventos no Destino',              'AO', 'AO_MARKETING',  'score 0-100', 0, 100, 55, 0.4, 'Quantidade ponderada de eventos por mês.'),
  ('ENT_COMMISSION_AVG',        'Comissão Média a OTAs',                        'AO', 'AO_MARKETING',  '%',           0, 30, 15, 0.4, 'Comissão média paga a canais de distribuição.'),
  ('ENT_DIRECT_SALES_PCT',      '% Vendas Diretas',                             'AO', 'AO_MARKETING',  '%',           0, 100, 40, 0.5, 'Sinônimo agregado para reservas diretas.'),
  ('ENT_DIARIA_MEDIA',          'Diária Média (derivada)',                      'AO', 'AO_OCUPACAO',   'R$',          0, 2000, 350, 0.4, 'Diária média estimada a partir de OTAs.'),
  ('ENT_POSICAO_PRECO',         'Posicionamento de Preço vs Concorrência',      'AO', 'AO_OCUPACAO',   'score 0-100', 0, 100, 60, 0.5, 'Posição do preço relativo ao mercado local.'),
  ('ENT_INDICE_PRECO',          'Índice de Preço Relativo',                     'AO', 'AO_OCUPACAO',   'score 0-100', 0, 100, 60, 0.4, 'Índice 0-100 do preço médio frente à média local.'),
  ('ENT_COMP_GAP',              'Gap Competitivo',                              'AO', 'AO_OCUPACAO',   'score 0-100', 0, 100, 50, 0.4, 'Lacuna competitiva agregada (preço x reputação x ocupação).'),
  ('ENT_SAZONALIDADE_TARIFARIA','Amplitude Tarifária Sazonal',                  'AO', 'AO_OCUPACAO',   '%',           0, 200, 60, 0.3, 'Variação % entre tarifa alta e baixa temporada.'),
  ('ENT_SEASONALITY_INDEX',     'Índice de Sazonalidade',                       'AO', 'AO_OCUPACAO',   'score 0-100', 0, 100, 60, 0.3, 'Sinônimo agregado para sazonalidade.'),
  -- OE · Infraestrutura / Governança contextual
  ('ENT_CONTEXTO_DESTINO',      'Contexto Municipal Agregado',                  'OE', 'OE_INFRAESTRUTURA', 'score 0-100', 0, 100, 60, 0.4, 'Score agregado IBGE+ANAC+ANATEL+Mapa do Turismo.'),
  ('ENT_CONFORTO_CLIMATICO',    'Conforto Climático Anual',                     'OE', 'OE_INFRAESTRUTURA', 'score 0-100', 0, 100, 70, 0.4, 'Quantidade de meses confortáveis para turismo.'),
  ('ENT_TRANSPORTE_COBERTURA',  'Cobertura de Transporte Local',                'OE', 'OE_INFRAESTRUTURA', 'score 0-100', 0, 100, 65, 0.5, 'Oferta de transporte público/rodoviário no entorno.'),
  ('ENT_CONECTIVIDADE_AEREA',   'Conectividade Aérea',                          'OE', 'OE_INFRAESTRUTURA', 'score 0-100', 0, 100, 60, 0.5, 'Frequência e diversidade de voos para o destino (ANAC).'),
  ('ENT_SEGURANCA_DESTINO',     'Segurança do Destino',                         'OE', 'OE_INFRAESTRUTURA', 'score 0-100', 0, 100, 75, 0.6, 'Score composto de segurança turística local.'),
  ('ENT_SEGURANCA_SCORE',       'Segurança (score agregado)',                   'OE', 'OE_INFRAESTRUTURA', 'score 0-100', 0, 100, 75, 0.4, 'Sinônimo agregado para segurança turística.'),
  -- RA · Sustentabilidade derivada
  ('ENT_SUSTENTABILIDADE',      'Sustentabilidade (sinais externos)',           'RA', 'RA_CERTIFICACOES', 'score 0-100', 0, 100, 60, 0.5, 'Sinais externos de práticas sustentáveis publicadas.'),
  ('ENT_SUSTENTABILIDADE_SCORE','Sustentabilidade — Score Final',               'RA', 'RA_CERTIFICACOES', 'score 0-100', 0, 100, 60, 0.5, 'Score final ponderado de práticas ESG declaradas/observadas.')
) AS v(code, name, pillar, cat_code, unit, bmin, bmax, btarget, weight, description)
JOIN public.enterprise_indicator_categories c ON c.code = v.cat_code
ON CONFLICT (code) DO NOTHING;
