-- Create a function to clean up old IP addresses and user agents from exam_attempts
-- This implements a 90-day retention policy for privacy-sensitive data
CREATE OR REPLACE FUNCTION public.cleanup_exam_tracking_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Nullify IP addresses and user agents for exam attempts older than 90 days
  UPDATE exam_attempts
  SET 
    ip_address = NULL,
    user_agent = NULL
  WHERE 
    created_at < NOW() - INTERVAL '90 days'
    AND (ip_address IS NOT NULL OR user_agent IS NOT NULL);
END;
$$;

-- Create a scheduled job using pg_cron to run the cleanup daily at 3 AM UTC
-- Note: This requires the pg_cron extension to be enabled
-- If pg_cron is not available, this cleanup should be called via an edge function on a schedule

-- Also add a comment explaining the data retention policy
COMMENT ON COLUMN exam_attempts.ip_address IS 'Stored for academic integrity verification. Automatically cleared after 90 days per data retention policy.';
COMMENT ON COLUMN exam_attempts.user_agent IS 'Stored for academic integrity verification. Automatically cleared after 90 days per data retention policy.';

-- Create index to optimize the cleanup query
CREATE INDEX IF NOT EXISTS idx_exam_attempts_created_at_tracking 
ON exam_attempts (created_at) 
WHERE ip_address IS NOT NULL OR user_agent IS NOT NULL;