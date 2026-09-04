REVOKE SELECT ON public.quiz_options FROM authenticated;
GRANT SELECT (option_id, quiz_id, option_label, option_text, created_at) ON public.quiz_options TO authenticated;