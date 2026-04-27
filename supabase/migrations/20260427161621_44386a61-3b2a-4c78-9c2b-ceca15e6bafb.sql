-- Tighten edu_notifications INSERT policy: only allow users to insert
-- notifications targeting themselves, or admins. Cross-user notifications
-- are produced by SECURITY DEFINER triggers (e.g. notify_classroom_assignment_targets)
-- and edge functions using the service role, both of which bypass RLS — so
-- those flows continue to work without change.

DROP POLICY IF EXISTS "System can insert notifications" ON public.edu_notifications;

CREATE POLICY "Users can insert own notifications"
ON public.edu_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'ADMIN'::app_role)
);
