
REVOKE EXECUTE ON FUNCTION public._beni_has_unlimited(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_beni_overview(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_grant_beni_unlimited(uuid, uuid, timestamptz, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_beni_unlimited(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_grant_beni_credits(uuid, uuid, integer, text, text, timestamptz, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_beni_token(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_beni_balance() FROM anon;
