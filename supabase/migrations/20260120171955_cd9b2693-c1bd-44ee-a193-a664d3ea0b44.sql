
-- Create table for post reports
CREATE TABLE forum_post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE NOT NULL,
  reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  comment TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE forum_post_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
ON forum_post_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON forum_post_reports
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON forum_post_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

-- Admins can update reports
CREATE POLICY "Admins can update reports"
ON forum_post_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

-- Create index for efficient queries
CREATE INDEX idx_forum_reports_post ON forum_post_reports(post_id);
CREATE INDEX idx_forum_reports_status ON forum_post_reports(status);
