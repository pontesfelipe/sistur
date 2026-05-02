-- Revoke column-level SELECT on sensitive audit fields from client roles
REVOKE SELECT (ip_address, user_agent) ON public.edu_learning_sessions FROM authenticated, anon;