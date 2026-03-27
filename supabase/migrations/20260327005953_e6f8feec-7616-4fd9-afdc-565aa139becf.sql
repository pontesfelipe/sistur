-- Remove auto_create_trial_license trigger that violates approval rules
-- Trial licenses should only be created via activate_my_trial RPC after user approval
DROP TRIGGER IF EXISTS trigger_auto_create_trial_license ON profiles;
DROP FUNCTION IF EXISTS auto_create_trial_license();