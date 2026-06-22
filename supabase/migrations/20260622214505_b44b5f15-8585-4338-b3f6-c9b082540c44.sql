
-- Desativa a versão 1 do template Enterprise (mantida no histórico)
UPDATE public.report_structure_templates
SET active = false, updated_at = now()
WHERE scope = 'enterprise' AND template = 'completo' AND version = 1;

-- Insere a versão 2 com a estrutura expandida da Fase 7
INSERT INTO public.report_structure_templates (
  scope, template, name, description, sections, active, version
) VALUES (
  'enterprise',
  'completo',
  'Relatório SISTUR Empresarial — Estrutura Expandida (Fase 7)',
  'Estrutura canônica do relatório Empresarial com separação explícita entre Diagnóstico Operacional (Ocupação/ADR/RevPAR/GOP/TrevPAR) e Reputação (NPS/reviews/sentimento), seção dedicada de Posicionamento Competitivo (concorrentes anonimizados), Pessoas & Cultura, ESG/Sustentabilidade e Plano de Ação 90 dias com donos por área.',
  '[
    {"order":1,"title":"Ficha Técnica do Empreendimento","description":"Tabela com nome, CNPJ, segmento, porte, classificação, scores RA/OE/AO e score final."},
    {"order":2,"title":"Sumário Executivo","description":"Síntese estratégica em 2-3 parágrafos cobrindo desempenho operacional, reputação, posicionamento competitivo e top-3 ações prioritárias do Plano 90d."},
    {"order":3,"title":"Perfil do Empreendimento","description":"Tabela Atributo|Valor com dados cadastrais e operacionais; cita capacidade, anos de operação, certificações, acessibilidade e mercados emissores."},
    {"order":4,"title":"Metodologia SISTUR Aplicada ao Setor Privado","description":"Parágrafo único explicando a adaptação dos 3 eixos (RA/OE/AO) ao empreendimento, com bandas de status (Adequado ≥67% / Atenção 34–66% / Crítico ≤33%) e citação à camada semântica Enterprise."},
    {"order":5,"title":"Diagnóstico Operacional","description":"KPIs operacionais EXCLUSIVAMENTE de origem PMS/CSV: Ocupação, ADR, RevPAR, GOP%, TrevPAR, com expansão de siglas na 1ª ocorrência. Tabela período × KPI usando os snapshots de sazonalidade. NÃO misture com NPS/reviews — essas vão na próxima seção."},
    {"order":6,"title":"Reputação & Satisfação do Hóspede","description":"NPS (escala -100 a +100, NUNCA 0-100), nota média consolidada, volume de avaliações, taxa de resposta a reviews, sentimento positivo. Use os Snapshots de Reputação Online e a Análise de Reviews quando houver."},
    {"order":7,"title":"Posicionamento Competitivo","description":"Comparação com concorrentes ANONIMIZADOS (Concorrente A/B/C — nunca cite nomes, CNPJs ou URLs). Mostre gap de preço vs. mediana/p25/p75, share of voice qualitativo e mix de canais de distribuição (% direto vs. OTAs e comissões). PROIBIDO usar ranking público (sem 1º lugar, sem ''melhor da cidade'')."},
    {"order":8,"title":"Pessoas & Cultura","description":"Quadro de pessoal, FTE por UH, turnover, horas de treinamento, programas de capacitação. Conecte com o eixo I-OE quando os indicadores operacionais sinalizarem fragilidade de gestão de pessoas."},
    {"order":9,"title":"ESG & Sustentabilidade","description":"Indicadores ambientais (energia kWh, água m³, resíduos kg), certificações de sustentabilidade, iniciativas declaradas. Conecte com o eixo I-RA e cite o `ENT_SUSTENTABILIDADE_SCORE` quando disponível."},
    {"order":10,"title":"Diagnóstico por Eixo — I-RA","description":"Tabela canônica de indicadores do pilar + 2-3 parágrafos interpretativos com leitura sistêmica (Beni). Use a Trilha de Cálculo Enterprise para justificar fontes/fórmulas."},
    {"order":11,"title":"Diagnóstico por Eixo — I-OE","description":"Mesma estrutura: tabela canônica + interpretação sistêmica + citação à trilha de auditoria."},
    {"order":12,"title":"Diagnóstico por Eixo — I-AO","description":"Mesma estrutura: tabela canônica + interpretação sistêmica + citação à trilha de auditoria."},
    {"order":13,"title":"Análise de Riscos","description":"Tabela Risco|Severidade|Probabilidade|Mitigação. Riscos derivados dos gargalos com severidade crítica/moderada e dos alertas ativos."},
    {"order":14,"title":"Oportunidades de Melhoria","description":"Tabela Oportunidade|Eixo|Investimento Estimado|ROI Indicativo|Prazo. Origem nas Prescrições e nos gargalos prioritários."},
    {"order":15,"title":"Plano de Ação 90 dias","description":"Roadmap operacional dos próximos 90 dias organizado por ÁREA RESPONSÁVEL: Comercial & Receita, Operações & Hospedagem, Pessoas & Cultura, ESG & Sustentabilidade, Marketing & Distribuição. Cada ação traz Dono (Área), Marco em 30/60/90 dias, KPI alvo e custo estimado."},
    {"order":16,"title":"Fontes e Evidências","description":"Origem de cada dado (PMS/CSV, reviews públicos, CADASTUR, IBGE, ANAC, ANATEL, declarado pelo gestor) e Base de Conhecimento consultada. CSV do PMS deve ser citado com data de importação (ex: ''CSV do PMS importado em DD/MM/AAAA'')."},
    {"order":17,"title":"Considerações Finais","description":"Fechamento estratégico em 1-2 parágrafos amarrando diagnóstico, plano 90d e visão sistêmica de Beni para o empreendimento."}
  ]'::jsonb,
  true,
  2
);
