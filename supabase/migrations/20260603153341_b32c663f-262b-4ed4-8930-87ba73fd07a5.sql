
-- v1.62.6 — Estrutura canônica do relatório (editável por ADMIN)
CREATE TABLE IF NOT EXISTS public.report_structure_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('territorial','enterprise','both')),
  template TEXT NOT NULL DEFAULT 'completo' CHECK (template IN ('completo','executivo','investidor','any')),
  name TEXT NOT NULL,
  description TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.report_structure_templates TO authenticated;
GRANT ALL ON public.report_structure_templates TO service_role;

ALTER TABLE public.report_structure_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active structures"
  ON public.report_structure_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage structures"
  ON public.report_structure_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE OR REPLACE FUNCTION public.touch_report_structure_templates_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_report_structure_templates ON public.report_structure_templates;
CREATE TRIGGER trg_touch_report_structure_templates
BEFORE UPDATE ON public.report_structure_templates
FOR EACH ROW EXECUTE FUNCTION public.touch_report_structure_templates_updated_at();

-- Seed canônico territorial completo (estrutura definitiva, ordem fixa)
INSERT INTO public.report_structure_templates (scope, template, name, description, sections, active, version)
VALUES (
  'territorial', 'completo',
  'Relatório SISTUR Territorial — Padrão Canônico',
  'Estrutura oficial em ordem fixa. O agente DEVE escrever cada seção UMA ÚNICA VEZ na ordem listada — nunca repetir, nunca voltar a uma seção já escrita.',
  $json$[
    {"order": 1, "title": "Ficha Técnica", "description": "Tabela com nome do destino, UF, data de geração, modelo, scores RA/OE/AO e score final SISTUR. Renderizar UMA única vez no início."},
    {"order": 2, "title": "Sumário Executivo", "description": "2-3 parágrafos curtos resumindo achados principais, gargalos críticos e direção das recomendações. Sem tabelas."},
    {"order": 3, "title": "Contextualização do Município", "description": "1-2 parágrafos com perfil socioeconômico e turístico, citando IBGE quando aplicável."},
    {"order": 4, "title": "Metodologia SISTUR", "description": "Parágrafo único explicando 3 eixos (RA/OE/AO), pesos (35/30/35) e escala de classificação."},
    {"order": 5, "title": "Alertas IGMA", "description": "Lista enxuta de flags IGMA acionadas, em parágrafo ou bullets curtos."},
    {"order": 6, "title": "Diagnóstico por Eixo — I-RA Relações Ambientais", "description": "Tabela canônica de 5 colunas (Indicador|Valor|Unidade|Status|Fonte) + 2-3 parágrafos interpretativos."},
    {"order": 7, "title": "Diagnóstico por Eixo — I-OE Organização Estrutural", "description": "Mesma estrutura: tabela canônica + 2-3 parágrafos interpretativos."},
    {"order": 8, "title": "Diagnóstico por Eixo — I-AO Ações Operacionais", "description": "Mesma estrutura: tabela canônica + 2-3 parágrafos interpretativos."},
    {"order": 9, "title": "Análise Integrada e Gargalos Consolidados", "description": "Síntese cruzando os 3 eixos. Tabela de gargalos com pilar, severidade e evidência."},
    {"order": 10, "title": "Benchmarks Externos", "description": "Tabela de 5 colunas (Indicador|Valor Observado|Valor Oficial|Fonte|Ano) — exceção ao template canônico."},
    {"order": 11, "title": "Prognóstico e Cenários", "description": "Parágrafos curtos com tendência (regressão/estabilidade/melhora) baseada em ciclos comparados."},
    {"order": 12, "title": "Banco de Ações Recomendadas", "description": "Tabela: Ação|Pilar|Prazo|Responsável|Prioridade. Derivada das prescrições e gargalos."},
    {"order": 13, "title": "Fontes e Trilha de Auditoria", "description": "Lista de fontes citadas no documento, agrupadas por origem (OFFICIAL_API, DERIVED, MANUAL)."},
    {"order": 14, "title": "Considerações Finais", "description": "1-2 parágrafos de fechamento institucional."},
    {"order": 15, "title": "Referências (ABNT NBR 6023)", "description": "Lista bibliográfica no padrão ABNT, apenas obras efetivamente citadas."}
  ]$json$::jsonb,
  true, 1
)
ON CONFLICT DO NOTHING;

-- Seed enterprise completo
INSERT INTO public.report_structure_templates (scope, template, name, description, sections, active, version)
VALUES (
  'enterprise', 'completo',
  'Relatório SISTUR Empresarial — Padrão Canônico',
  'Estrutura oficial para empreendimentos privados. Ordem fixa, sem repetição.',
  $json$[
    {"order": 1, "title": "Ficha Técnica do Empreendimento", "description": "Tabela com nome, CNPJ, segmento, scores RA/OE/AO e score final."},
    {"order": 2, "title": "Sumário Executivo", "description": "Síntese estratégica em 2-3 parágrafos."},
    {"order": 3, "title": "Perfil do Empreendimento", "description": "Tabela Atributo|Valor com dados cadastrais e operacionais."},
    {"order": 4, "title": "Metodologia SISTUR Aplicada ao Setor Privado", "description": "Parágrafo único sobre adaptação dos 3 eixos."},
    {"order": 5, "title": "Diagnóstico por Eixo — I-RA", "description": "Tabela canônica de KPIs + 2-3 parágrafos interpretativos."},
    {"order": 6, "title": "Diagnóstico por Eixo — I-OE", "description": "Mesma estrutura."},
    {"order": 7, "title": "Diagnóstico por Eixo — I-AO", "description": "Mesma estrutura."},
    {"order": 8, "title": "Análise de Riscos", "description": "Tabela Risco|Severidade|Mitigação."},
    {"order": 9, "title": "Oportunidades de Melhoria", "description": "Tabela Oportunidade|Investimento|ROI Estimado."},
    {"order": 10, "title": "Roadmap de Implementação", "description": "Tabela Ação|Categoria|Investimento|Prazo|KPI."},
    {"order": 11, "title": "Fontes e Evidências", "description": "Origem dos dados e análise de reviews quando aplicável."},
    {"order": 12, "title": "Considerações Finais", "description": "Fechamento estratégico em 1-2 parágrafos."}
  ]$json$::jsonb,
  true, 1
)
ON CONFLICT DO NOTHING;
