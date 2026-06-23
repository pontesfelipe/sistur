
-- =====================================================
-- Enterprise Brands (Redes de Hotéis)
-- =====================================================

CREATE TABLE public.enterprise_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand_type text NOT NULL DEFAULT 'independent'
    CHECK (brand_type IN ('independent','chain','franchise','collection')),
  headquarters_uf text,
  website text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_brands TO authenticated;
GRANT ALL ON public.enterprise_brands TO service_role;

ALTER TABLE public.enterprise_brands ENABLE ROW LEVEL SECURITY;

-- Reaproveita o padrão multi-tenant: usuário precisa pertencer à mesma org
CREATE POLICY "Members can view brands of their org"
  ON public.enterprise_brands
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()
      UNION
      SELECT p.viewing_demo_org_id FROM public.profiles p WHERE p.user_id = auth.uid() AND p.viewing_demo_org_id IS NOT NULL
    )
    OR public.has_role(auth.uid(), 'ADMIN'::app_role)
  );

CREATE POLICY "Members can insert brands in their org"
  ON public.enterprise_brands
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()
      UNION
      SELECT p.viewing_demo_org_id FROM public.profiles p WHERE p.user_id = auth.uid() AND p.viewing_demo_org_id IS NOT NULL
    )
    OR public.has_role(auth.uid(), 'ADMIN'::app_role)
  );

CREATE POLICY "Members can update brands of their org"
  ON public.enterprise_brands
  FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'ADMIN'::app_role)
  );

CREATE POLICY "Members can delete brands of their org"
  ON public.enterprise_brands
  FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'ADMIN'::app_role)
  );

CREATE INDEX idx_enterprise_brands_org ON public.enterprise_brands(org_id);

CREATE TRIGGER trg_enterprise_brands_updated_at
  BEFORE UPDATE ON public.enterprise_brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- enterprise_profiles: ligar à marca e nomear a unidade
-- =====================================================

ALTER TABLE public.enterprise_profiles
  ADD COLUMN brand_id uuid REFERENCES public.enterprise_brands(id) ON DELETE SET NULL,
  ADD COLUMN unit_name text,
  ADD COLUMN is_flagship boolean NOT NULL DEFAULT false;

CREATE INDEX idx_enterprise_profiles_brand ON public.enterprise_profiles(brand_id);

-- Backfill: cria uma marca "solo" por perfil existente.
-- Usa o nome do hotel extraído de review_analysis quando disponível;
-- caso contrário usa "Empreendimento <ibge>" para garantir unicidade por org.
DO $$
DECLARE
  r record;
  v_brand_name text;
  v_brand_id uuid;
BEGIN
  FOR r IN
    SELECT ep.id, ep.org_id, ep.destination_id,
           COALESCE(NULLIF(ep.review_analysis->>'business_name',''),
                    NULLIF(ep.review_analysis->>'businessName',''),
                    'Empreendimento ' || substr(ep.id::text,1,8)) AS guessed_name
    FROM public.enterprise_profiles ep
    WHERE ep.brand_id IS NULL
  LOOP
    v_brand_name := r.guessed_name;
    -- Garante unicidade dentro da org
    LOOP
      BEGIN
        INSERT INTO public.enterprise_brands (org_id, name, brand_type)
        VALUES (r.org_id, v_brand_name, 'independent')
        RETURNING id INTO v_brand_id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        v_brand_name := r.guessed_name || ' ' || substr(r.id::text,1,4);
      END;
    END LOOP;

    UPDATE public.enterprise_profiles
       SET brand_id = v_brand_id,
           unit_name = COALESCE(unit_name, v_brand_name),
           is_flagship = true
     WHERE id = r.id;
  END LOOP;
END $$;

-- Mesma marca não pode ter duas unidades no mesmo destino
CREATE UNIQUE INDEX uniq_enterprise_profiles_brand_destination
  ON public.enterprise_profiles(brand_id, destination_id)
  WHERE brand_id IS NOT NULL;
