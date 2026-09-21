CREATE OR REPLACE FUNCTION public.restore_municipal_official_cache(p_ibge_code text, p_org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;
  IF NOT (public.user_belongs_to_org(auth.uid(), p_org_id) OR public.has_role(auth.uid(), 'ADMIN')) THEN
    RAISE EXCEPTION 'Sem permissão para a organização informada';
  END IF;

  WITH latest AS (
    SELECT DISTINCT ON (e.indicator_code)
      e.indicator_code,
      e.source_code,
      e.raw_value,
      e.raw_value_text,
      e.reference_year,
      e.confidence_level
    FROM public.external_indicator_values e
    WHERE e.municipality_ibge_code = p_ibge_code
      AND e.org_id <> p_org_id
      AND e.raw_value IS NOT NULL
      AND e.collection_method <> 'MANUAL'
      AND NOT EXISTS (
        SELECT 1 FROM public.external_indicator_values x
        WHERE x.org_id = p_org_id
          AND x.municipality_ibge_code = p_ibge_code
          AND x.indicator_code = e.indicator_code
          AND x.raw_value IS NOT NULL
      )
    ORDER BY e.indicator_code, e.reference_year DESC NULLS LAST, e.collected_at DESC
  )
  INSERT INTO public.external_indicator_values (
    indicator_code, municipality_ibge_code, source_code, raw_value, raw_value_text,
    reference_year, collection_method, confidence_level, validated, org_id, notes
  )
  SELECT
    l.indicator_code,
    p_ibge_code,
    l.source_code,
    l.raw_value,
    l.raw_value_text,
    l.reference_year,
    'BATCH'::external_collection_method,
    GREATEST(1, l.confidence_level - 1),
    false,
    p_org_id,
    'Reaproveitado do cache municipal (ano ' || COALESCE(l.reference_year::text, 'n/d') ||
      '): fonte oficial indisponível no momento da coleta.'
  FROM latest l
  ON CONFLICT (org_id, municipality_ibge_code, indicator_code) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$function$;

REVOKE ALL ON FUNCTION public.restore_municipal_official_cache(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_municipal_official_cache(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_municipal_official_cache(text, uuid) TO service_role;

COMMENT ON FUNCTION public.restore_municipal_official_cache(text, uuid) IS
  'Resiliência de fontes oficiais: reaproveita o último valor oficial automático já coletado para o mesmo município quando a API oficial falha, sem sobrescrever dados existentes da organização.';