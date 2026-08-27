SELECT cron.unschedule('expire-trial-licenses-daily');

SELECT cron.schedule(
  'expire-trial-licenses-daily',
  '0 3 * * *',
  $$SELECT public.expire_trial_licenses();$$
);