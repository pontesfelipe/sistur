#!/usr/bin/env bash
# Smoke-tests supabase/migrations/20260904000000_rbac_hardening.sql against a
# scratch PostgreSQL database using a minimal Supabase-like stub schema.
#
# Usage: PGHOST=... PGPORT=... PGUSER=postgres supabase/tests/rbac/run.sh
# Requires psql/createdb/dropdb; the target server must allow creating databases.
set -euo pipefail
cd "$(dirname "$0")"
DB="${RBAC_TEST_DB:-rbac_smoke}"
dropdb --if-exists "$DB"
createdb "$DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f 00_stub_schema.sql
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f ../../migrations/20260904000000_rbac_hardening.sql
psql -v ON_ERROR_STOP=1 -d "$DB" -f 10_rbac_hardening.test.sql 2>&1 | grep -E "ok -|FAIL|ERROR" | sed 's/.*NOTICE:  //'
