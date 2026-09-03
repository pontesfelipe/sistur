# RBAC hardening smoke tests

Behavioural tests for `supabase/migrations/20260904000000_rbac_hardening.sql`.

`00_stub_schema.sql` recreates just enough of the Supabase schema (roles `anon` /
`authenticated` / `service_role`, `auth.uid()` / `auth.role()`, `orgs`, `profiles`,
`user_roles`, `licenses`, `audit_events` and the pre-existing helper functions and
policies) to apply the migration on a plain PostgreSQL 16 server. It is **not** a
copy of production.

`10_rbac_hardening.test.sql` then impersonates an anonymous caller, a pending user,
an approved member, a platform ADMIN, the service role and a blocked user, and
asserts the access rules described in `docs/lovable/plano-acessos-planos-prompts.md`
(Fase 0). It ends by re-applying the migration to prove idempotency.

```bash
PGHOST=/var/run/postgresql PGPORT=5432 PGUSER=postgres supabase/tests/rbac/run.sh
```

Every line should print `ok - …`; any `FAIL`/`ERROR` line means a regression.
