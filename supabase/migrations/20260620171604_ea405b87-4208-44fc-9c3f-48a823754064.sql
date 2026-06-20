CREATE TABLE IF NOT EXISTS public.enterprise_compliance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  enterprise_profile_id uuid NOT NULL REFERENCES public.enterprise_profiles(id) ON DELETE CASCADE,
  item_code text NOT NULL,
  item_label text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  document_url text,
  document_number text,
  issued_at date,
  expires_at date,
  validated_at timestamptz,
  validated_by uuid,
  notes text,
  auto_checked boolean NOT NULL DEFAULT false,
  auto_check_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enterprise_profile_id, item_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_compliance_items TO authenticated;
GRANT ALL ON public.enterprise_compliance_items TO service_role;

ALTER TABLE public.enterprise_compliance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage compliance items"
ON public.enterprise_compliance_items
FOR ALL TO authenticated
USING (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(), 'ADMIN'))
WITH CHECK (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(), 'ADMIN'));

CREATE TRIGGER trg_enterprise_compliance_items_updated_at
BEFORE UPDATE ON public.enterprise_compliance_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_enterprise_compliance_items_profile ON public.enterprise_compliance_items(enterprise_profile_id);
CREATE INDEX idx_enterprise_compliance_items_org ON public.enterprise_compliance_items(org_id);

CREATE TABLE IF NOT EXISTS public.cnpj_validation_cache (
  cnpj text PRIMARY KEY,
  razao_social text,
  nome_fantasia text,
  situacao_cadastral text,
  data_situacao date,
  cnae_principal text,
  cnae_descricao text,
  endereco jsonb,
  cadastur_status text,
  raw_response jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.cnpj_validation_cache TO authenticated;
GRANT ALL ON public.cnpj_validation_cache TO service_role;

ALTER TABLE public.cnpj_validation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read cnpj cache"
ON public.cnpj_validation_cache FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role manages cnpj cache"
ON public.cnpj_validation_cache FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.enterprise_indicators (code, name, description, pillar, category_id, unit, weight, benchmark_min, benchmark_max, benchmark_target, is_active)
SELECT 'ENT_COMPLIANCE_RATE',
  'Taxa de Conformidade Legal',
  'Percentual de itens de conformidade (CADASTUR/Alvará/AVCB/Sanitário/LGPD) válidos e não vencidos. Indicador derivado calculado automaticamente.',
  'OE',
  (SELECT id FROM public.enterprise_indicator_categories WHERE code = 'OE' LIMIT 1),
  '%', 1.0, 0, 100, 100, true
WHERE NOT EXISTS (SELECT 1 FROM public.enterprise_indicators WHERE code = 'ENT_COMPLIANCE_RATE');
