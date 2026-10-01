create or replace function public.get_user_language_by_email(_email text)
returns text language sql stable security definer set search_path = public as $$
  select p.language from auth.users u join public.profiles p on p.user_id = u.id
  where lower(u.email) = lower(_email) limit 1
$$;
revoke all on function public.get_user_language_by_email(text) from public, anon, authenticated;
grant execute on function public.get_user_language_by_email(text) to service_role;