
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Tabela privada para secrets internos usados pelo cron (não exposta via Data API)
create table if not exists public.internal_cron_secrets (
  name text primary key,
  value text not null,
  created_at timestamptz not null default now()
);

-- Bloqueia totalmente o acesso via Data API
revoke all on public.internal_cron_secrets from anon, authenticated;
grant all on public.internal_cron_secrets to service_role;
alter table public.internal_cron_secrets enable row level security;

drop policy if exists "no public access" on public.internal_cron_secrets;
create policy "no public access" on public.internal_cron_secrets
  for all to authenticated using (false) with check (false);

-- Insere/atualiza o secret do cron de ingestão do Observatório
insert into public.internal_cron_secrets (name, value)
values ('ingest_observatory_cron_secret', '545f02ab7aa76877865c181979ba905a7602dd4cf91c6eb30d9809370e8aa9a9')
on conflict (name) do update set value = excluded.value;

-- Remove agendamento anterior se existir
do $$
declare j record;
begin
  for j in select jobid from cron.job where jobname = 'ingest-observatory-monthly' loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;

-- Agenda mensal (dia 1, 06:00 UTC)
select cron.schedule(
  'ingest-observatory-monthly',
  '0 6 1 * *',
  $$
  select net.http_post(
    url:='https://enexnpmkhvgufcervjsv.supabase.co/functions/v1/ingest-observatory',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-cron-secret',(select value from public.internal_cron_secrets where name='ingest_observatory_cron_secret')
    ),
    body:='{"triggered_by":"cron"}'::jsonb
  );
  $$
);
