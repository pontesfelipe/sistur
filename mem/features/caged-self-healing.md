---
name: CAGED self-healing ingestion
description: CAGED runs on GitHub Actions with 3 cron slots, auto re-run (max 3 attempts), idempotent month check, Python retries, and SISTUR watchdog on day 6
type: feature
---
- Repo pontesfelipe/sistur-caged-ingest: caged.yml cron dia 5 12h/18h UTC + dia 6 12h UTC; caged-retry.yml re-runs failed/cancelled runs after 5 min while run_attempt < 3.
- Script checks GET receive-caged?check=YYYYMM before heavy download (skip if exists; input force=true overrides). FTP/IBGE/POST retry 3x (10s, 30s, 90s).
- Watchdog caged-watchdog: cron dia 6 21h UTC; expected month = today − 2 months; if missing, dispatches caged.yml via GitHub connector and logs 'partial' alert in ingestion_runs.
