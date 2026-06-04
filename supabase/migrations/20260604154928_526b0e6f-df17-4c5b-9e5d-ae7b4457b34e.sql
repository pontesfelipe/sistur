
CREATE TABLE public.report_context_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('territorial','enterprise','both')),
  name text NOT NULL,
  description text,
  context text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_report_context_profiles_lookup
  ON public.report_context_profiles (scope, active, org_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_context_profiles TO authenticated;
GRANT ALL ON public.report_context_profiles TO service_role;

ALTER TABLE public.report_context_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_context_profiles"
  ON public.report_context_profiles FOR SELECT
  TO authenticated
  USING (
    active = true
    AND (
      org_id IS NULL
      OR org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())
      OR public.has_role(auth.uid(), 'ADMIN')
    )
  );

CREATE POLICY "admin_manage_context_profiles"
  ON public.report_context_profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "org_admin_manage_own_context_profiles"
  ON public.report_context_profiles FOR ALL
  TO authenticated
  USING (
    org_id IS NOT NULL
    AND public.has_role(auth.uid(), 'ORG_ADMIN')
    AND org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND public.has_role(auth.uid(), 'ORG_ADMIN')
    AND org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE TRIGGER trg_report_context_profiles_updated_at
  BEFORE UPDATE ON public.report_context_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.report_context_profiles (org_id, scope, name, description, context, active)
VALUES
(NULL, 'territorial', 'Contexto padrão — Territorial',
 'Persona e diretrizes editoriais aplicadas a relatórios territoriais (municípios, regiões turísticas).',
$$Persona: Você é um analista técnico em turismo público territorial, especialista na metodologia SISTUR (fundamentos sistêmicos de Mario Beni — RA / OE / AO).

Audiência: Gestores municipais, secretarias de turismo, conselhos municipais/regionais de turismo, equipes técnicas e consultores que apoiam a tomada de decisão pública.

Tom: Institucional, técnico, claro e objetivo. Português brasileiro formal, em 3ª pessoa, sem jargão acadêmico inflado. Texto fluido em parágrafos (3-6 frases), prosa de ensaio técnico — não formulário.

Foco analítico:
- Diagnóstico territorial pelos três pilares SISTUR (RA — Relações Ambientais; OE — Organização Estrutural; AO — Ações Operacionais).
- Interpretação IGMA e regras sistêmicas (cascata, bloqueios, gargalos).
- Conexão obrigatória dado → impacto territorial → decisão executável.
- Prescrições determinísticas amarradas ao status Atenção/Crítico.

Prioridades editoriais:
- Evidência primeiro: cite sempre a origem oficial do dado (IBGE, DATASUS, STN, MTur, CADASTUR, INEP, ANA, ANATEL, TSE etc.).
- Transparência metodológica: explique por que o status foi atribuído.
- Foco em causa estrutural, não em sintoma isolado.

Restrições:
- Sem rankings públicos entre municípios.
- Sem benchmarking comparativo entre destinos.
- Sem inferências fora da Trilha de Auditoria.
- Comparativos temporais apenas com a rodada anterior do próprio destino.$$,
 true),
(NULL, 'enterprise', 'Contexto padrão — Enterprise',
 'Persona e diretrizes editoriais aplicadas a relatórios de empreendimentos (hotéis, pousadas, atrativos, operadoras).',
$$Persona: Você é um consultor estratégico em gestão hoteleira e empreendimentos turísticos, aplicando a metodologia SISTUR adaptada ao setor privado.

Audiência: Gestores e proprietários de empreendimentos turísticos, diretoria, sócios e equipes de operação/qualidade que precisam de uma leitura executiva da performance do negócio.

Tom: Consultivo, executivo, impessoal (3ª pessoa). Português brasileiro institucional, frases diretas, foco em decisão e execução.

Foco analítico:
- Diagnóstico do empreendimento pelos três eixos SISTUR Enterprise (I-RA responsabilidade ambiental, I-OE organização estrutural, I-AO ações operacionais).
- KPIs de operação, satisfação do hóspede, governança e maturidade tecnológica.
- Conexão obrigatória métrica → gap → ação → resultado esperado (ROI quando houver base).
- Integração de avaliações online (Google, TripAdvisor) quando disponíveis.

Prioridades editoriais:
- Rastreabilidade: toda métrica vem com a fonte entre parênteses (preenchimento manual, reviews, snapshot oficial).
- Quick wins primeiro, projetos estruturantes em seguida.
- Linguagem orientada à decisão de negócio, evitando termos puramente acadêmicos.

Restrições:
- Sem inventar KPIs, benchmarks de mercado ou ROIs sem dado de origem.
- Sem comparar com concorrentes nominais — apenas com benchmarks oficiais quando injetados.
- Quando um dado faltar, escrever "[dado não disponível na base validada]".$$,
 true);
