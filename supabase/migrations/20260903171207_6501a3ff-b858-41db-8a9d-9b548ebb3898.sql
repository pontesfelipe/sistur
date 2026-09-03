GRANT EXECUTE ON FUNCTION public.get_effective_org_id() TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role_in_org(uuid, uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_org(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_org_id(uuid) TO anon;