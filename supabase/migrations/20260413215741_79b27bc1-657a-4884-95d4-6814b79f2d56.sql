
-- =============================================
-- EDU Session Tracking & Anti-Fraud System
-- =============================================

-- 1. Learning sessions (heartbeat-based presence tracking)
CREATE TABLE public.edu_learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id),
  session_type TEXT NOT NULL DEFAULT 'training', -- training, exam, track, general
  entity_type TEXT, -- training, exam, track, lesson
  entity_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  active_seconds INTEGER DEFAULT 0, -- time with actual interactions
  idle_seconds INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  user_agent TEXT,
  ip_address TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Interaction logs (granular click/action tracking)
CREATE TABLE public.edu_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.edu_learning_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- click, page_view, video_play, video_pause, video_seek, answer_select, scroll, focus_gain, focus_loss, tab_switch
  element_id TEXT,
  element_label TEXT,
  page_url TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Fraud/suspicion flags
CREATE TABLE public.edu_fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id),
  session_id UUID REFERENCES public.edu_learning_sessions(id) ON DELETE SET NULL,
  flag_type TEXT NOT NULL, -- long_idle_session, no_interactions, rapid_exam, tab_switch_exam, impossible_speed, bot_pattern
  severity TEXT NOT NULL DEFAULT 'warning', -- info, warning, critical
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, reviewed, dismissed, confirmed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_edu_sessions_user ON public.edu_learning_sessions(user_id, started_at DESC);
CREATE INDEX idx_edu_sessions_active ON public.edu_learning_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_edu_sessions_entity ON public.edu_learning_sessions(entity_type, entity_id);
CREATE INDEX idx_edu_interactions_session ON public.edu_interaction_logs(session_id, timestamp);
CREATE INDEX idx_edu_interactions_user ON public.edu_interaction_logs(user_id, timestamp DESC);
CREATE INDEX idx_edu_fraud_flags_user ON public.edu_fraud_flags(user_id, created_at DESC);
CREATE INDEX idx_edu_fraud_flags_status ON public.edu_fraud_flags(status) WHERE status = 'pending';

-- RLS
ALTER TABLE public.edu_learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_interaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_fraud_flags ENABLE ROW LEVEL SECURITY;

-- Sessions: users can insert/view own, admins/professors can view all in org
CREATE POLICY "Users can insert own sessions" ON public.edu_learning_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own active sessions" ON public.edu_learning_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND is_active = true);

CREATE POLICY "Users can view own sessions" ON public.edu_learning_sessions
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'ADMIN')
    OR has_role(auth.uid(), 'PROFESSOR')
    OR has_org_admin_role(auth.uid())
  );

-- Interactions: users can insert own, admins/professors can read
CREATE POLICY "Users can insert own interactions" ON public.edu_interaction_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and admins can view interactions" ON public.edu_interaction_logs
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'ADMIN')
    OR has_role(auth.uid(), 'PROFESSOR')
    OR has_org_admin_role(auth.uid())
  );

-- Fraud flags: admins/professors can manage
CREATE POLICY "Admins can manage fraud flags" ON public.edu_fraud_flags
  FOR ALL TO authenticated USING (
    has_role(auth.uid(), 'ADMIN')
    OR has_role(auth.uid(), 'PROFESSOR')
    OR has_org_admin_role(auth.uid())
  );

CREATE POLICY "Users can view own fraud flags" ON public.edu_fraud_flags
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Function to end stale sessions (heartbeat older than 5 minutes)
CREATE OR REPLACE FUNCTION public.end_stale_edu_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE edu_learning_sessions
  SET 
    is_active = false,
    ended_at = last_heartbeat_at,
    duration_seconds = EXTRACT(EPOCH FROM (last_heartbeat_at - started_at))::INTEGER
  WHERE is_active = true
    AND last_heartbeat_at < NOW() - INTERVAL '5 minutes';
END;
$$;

-- Function to auto-flag suspicious sessions
CREATE OR REPLACE FUNCTION public.flag_suspicious_edu_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Flag sessions with long duration but no interactions
  FOR r IN
    SELECT s.id, s.user_id, s.org_id, s.duration_seconds,
      (SELECT COUNT(*) FROM edu_interaction_logs il WHERE il.session_id = s.id) as interaction_count
    FROM edu_learning_sessions s
    WHERE s.is_active = false
      AND s.ended_at > NOW() - INTERVAL '24 hours'
      AND s.duration_seconds > 1800 -- 30+ minutes
      AND NOT EXISTS (
        SELECT 1 FROM edu_fraud_flags f 
        WHERE f.session_id = s.id AND f.flag_type = 'no_interactions'
      )
  LOOP
    IF r.interaction_count < 3 THEN
      INSERT INTO edu_fraud_flags (user_id, org_id, session_id, flag_type, severity, description, evidence)
      VALUES (
        r.user_id, r.org_id, r.id,
        'no_interactions', 'critical',
        format('Sessão de %s minutos com apenas %s interações', r.duration_seconds / 60, r.interaction_count),
        jsonb_build_object('duration_seconds', r.duration_seconds, 'interaction_count', r.interaction_count)
      );
    END IF;
  END LOOP;

  -- Flag sessions with excessive idle time (>80% idle)
  FOR r IN
    SELECT s.id, s.user_id, s.org_id, s.duration_seconds, s.idle_seconds, s.active_seconds
    FROM edu_learning_sessions s
    WHERE s.is_active = false
      AND s.ended_at > NOW() - INTERVAL '24 hours'
      AND s.duration_seconds > 600 -- 10+ minutes
      AND s.idle_seconds > (s.duration_seconds * 0.8)
      AND NOT EXISTS (
        SELECT 1 FROM edu_fraud_flags f 
        WHERE f.session_id = s.id AND f.flag_type = 'long_idle_session'
      )
  LOOP
    INSERT INTO edu_fraud_flags (user_id, org_id, session_id, flag_type, severity, description, evidence)
    VALUES (
      r.user_id, r.org_id, r.id,
      'long_idle_session', 'warning',
      format('Sessão com %s%% de inatividade (%s min inativo de %s min total)', 
        ROUND(r.idle_seconds::numeric / NULLIF(r.duration_seconds, 0) * 100), 
        r.idle_seconds / 60, r.duration_seconds / 60),
      jsonb_build_object('idle_seconds', r.idle_seconds, 'active_seconds', r.active_seconds, 'duration_seconds', r.duration_seconds)
    );
  END LOOP;
END;
$$;
