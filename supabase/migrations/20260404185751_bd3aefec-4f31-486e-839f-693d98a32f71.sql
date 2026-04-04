-- Fix certificates table: replace blanket public read policy with verification-code-scoped function

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can verify certificates by code" ON public.certificates;

-- Create a security definer function for public certificate verification
CREATE OR REPLACE FUNCTION public.verify_certificate_by_code(p_code text)
RETURNS TABLE(
  certificate_id text,
  user_name text,
  title text,
  description text,
  issued_at timestamptz,
  expires_at timestamptz,
  status text,
  pillar text,
  hours_completed integer,
  score_pct numeric,
  certificate_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.certificate_id,
    c.user_name,
    c.title,
    c.description,
    c.issued_at,
    c.expires_at,
    c.status,
    c.pillar,
    c.hours_completed,
    c.score_pct,
    c.certificate_type
  FROM public.certificates c
  WHERE c.verification_code = p_code
  LIMIT 1;
$$;