-- ==========================================
-- SISTUR EDU LMS - SPRINT 1: ON-DEMAND & AUDIT
-- Schema 5: On-Demand Requests, ERP Integration, Audit
-- ==========================================

-- ==========================================
-- ON-DEMAND REQUESTS
-- ==========================================

CREATE TYPE public.ondemand_goal_type AS ENUM (
  'course', 'track', 'lesson_plan', 'tcc_outline', 'thesis_outline', 'training_plan'
);

CREATE TYPE public.ondemand_context_type AS ENUM ('academic', 'institutional', 'professional');

CREATE TYPE public.ondemand_status_type AS ENUM (
  'received', 'validated', 'generating', 'generated', 'rejected', 'failed'
);

CREATE TABLE public.ondemand_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
  goal_type ondemand_goal_type NOT NULL,
  context_type ondemand_context_type,
  desired_pillar TEXT CHECK (desired_pillar IN ('RA', 'OE', 'AO', 'INTEGRATED')),
  desired_level INTEGER CHECK (desired_level BETWEEN 1 AND 5),
  topic_text TEXT NOT NULL,
  additional_context TEXT,
  specific_topics TEXT[],
  learning_goals TEXT[],
  status ondemand_status_type DEFAULT 'received',
  processing_time_seconds INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ondemand_requests_user ON public.ondemand_requests(user_id);
CREATE INDEX idx_ondemand_requests_status ON public.ondemand_requests(status);
CREATE INDEX idx_ondemand_requests_created ON public.ondemand_requests(created_at DESC);

-- ==========================================
-- ON-DEMAND OUTPUTS
-- ==========================================

CREATE TYPE public.ondemand_output_type AS ENUM (
  'track_instance', 'course_instance', 'lesson_plan', 'tcc_outline', 'thesis_outline', 'training_plan'
);

CREATE TABLE public.ondemand_outputs (
  output_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.ondemand_requests(request_id) ON DELETE CASCADE,
  output_type ondemand_output_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  payload JSONB NOT NULL,
  file_uri TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ondemand_outputs_request ON public.ondemand_outputs(request_id);

-- ==========================================
-- ON-DEMAND OUTPUT SOURCES (Audit Trail)
-- ==========================================

CREATE TABLE public.ondemand_output_sources (
  output_id UUID REFERENCES public.ondemand_outputs(output_id) ON DELETE CASCADE,
  content_id TEXT REFERENCES public.content_items(content_id) ON DELETE RESTRICT,
  source_locator TEXT NOT NULL,
  usage_context TEXT,
  PRIMARY KEY (output_id, content_id, source_locator)
);

-- ==========================================
-- TRACK INSTANCES (Navigable generated tracks)
-- ==========================================

CREATE TABLE public.track_instances (
  track_instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.ondemand_requests(request_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pillar_scope TEXT NOT NULL,
  level INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.track_instance_items (
  track_instance_id UUID REFERENCES public.track_instances(track_instance_id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('course', 'module', 'lesson')),
  item_id UUID NOT NULL,
  order_index INTEGER NOT NULL,
  PRIMARY KEY (track_instance_id, item_type, item_id)
);

CREATE INDEX idx_track_instance_items_track ON public.track_instance_items(track_instance_id, order_index);

-- ==========================================
-- ERP DIAGNOSTICS (Integration)
-- ==========================================

CREATE TABLE public.erp_diagnostics (
  diagnostic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
  entity_ref TEXT NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('municipality', 'government', 'company')),
  pillar_priority TEXT CHECK (pillar_priority IN ('RA', 'OE', 'AO')),
  indicators_data JSONB,
  igma_warnings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_erp_diagnostics_org ON public.erp_diagnostics(org_id);
CREATE INDEX idx_erp_diagnostics_created ON public.erp_diagnostics(created_at DESC);

-- ==========================================
-- LEARNING PRESCRIPTIONS (ERP → EDU)
-- ==========================================

CREATE TABLE public.learning_prescriptions_lms (
  prescription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id UUID REFERENCES public.erp_diagnostics(diagnostic_id) ON DELETE CASCADE,
  recommended_track_id UUID REFERENCES public.lms_tracks(track_id),
  recommended_courses JSONB,
  target_roles JSONB,
  reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_prescriptions_lms_diagnostic ON public.learning_prescriptions_lms(diagnostic_id);

-- ==========================================
-- ERP EVENT LOG
-- ==========================================

CREATE TABLE public.erp_event_log (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'diagnostic_received', 'prescription_sent', 'certification_status_sent', 'progress_update_sent'
  )),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_erp_event_log_org ON public.erp_event_log(org_id);
CREATE INDEX idx_erp_event_log_type ON public.erp_event_log(event_type);
CREATE INDEX idx_erp_event_log_created ON public.erp_event_log(created_at DESC);

-- ==========================================
-- LMS AUDIT LOGS (Immutable for government)
-- ==========================================

CREATE TABLE public.lms_audit_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lms_audit_logs_org ON public.lms_audit_logs(org_id);
CREATE INDEX idx_lms_audit_logs_user ON public.lms_audit_logs(user_id);
CREATE INDEX idx_lms_audit_logs_entity ON public.lms_audit_logs(entity_type, entity_id);
CREATE INDEX idx_lms_audit_logs_created ON public.lms_audit_logs(created_at DESC);

-- Prevent modification/deletion of audit logs
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER prevent_lms_audit_log_update
  BEFORE UPDATE OR DELETE ON public.lms_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

-- ==========================================
-- HELPER FUNCTION: Create Audit Log
-- ==========================================

CREATE OR REPLACE FUNCTION public.create_lms_audit_log(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  SELECT org_id INTO v_org_id
  FROM public.profiles 
  WHERE user_id = v_user_id
  LIMIT 1;

  INSERT INTO public.lms_audit_logs (
    org_id, user_id, action, entity_type, entity_id,
    old_values, new_values, metadata
  ) VALUES (
    v_org_id, v_user_id, p_action, p_entity_type, p_entity_id,
    p_old_values, p_new_values, p_metadata
  )
  RETURNING log_id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE public.ondemand_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ondemand_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ondemand_output_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_instance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_prescriptions_lms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_audit_logs ENABLE ROW LEVEL SECURITY;

-- On-Demand Requests
CREATE POLICY "Users can view their own requests"
  ON public.ondemand_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own requests"
  ON public.ondemand_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- On-Demand Outputs
CREATE POLICY "Users can view their own outputs"
  ON public.ondemand_outputs FOR SELECT
  USING (request_id IN (SELECT request_id FROM public.ondemand_requests WHERE user_id = auth.uid()));

-- Track Instances
CREATE POLICY "Users can view their own track instances"
  ON public.track_instances FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own track instances"
  ON public.track_instances FOR ALL
  USING (user_id = auth.uid());

-- Track Instance Items
CREATE POLICY "Users can view their track instance items"
  ON public.track_instance_items FOR SELECT
  USING (track_instance_id IN (SELECT track_instance_id FROM public.track_instances WHERE user_id = auth.uid()));

-- ERP Diagnostics
CREATE POLICY "Org members can view diagnostics"
  ON public.erp_diagnostics FOR SELECT
  USING (org_id IS NOT NULL AND user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Admins can manage diagnostics"
  ON public.erp_diagnostics FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Learning Prescriptions
CREATE POLICY "Org members can view prescriptions"
  ON public.learning_prescriptions_lms FOR SELECT
  USING (
    diagnostic_id IN (SELECT diagnostic_id FROM public.erp_diagnostics WHERE org_id IS NOT NULL AND user_belongs_to_org(auth.uid(), org_id))
  );

-- ERP Event Log
CREATE POLICY "Org members can view event log"
  ON public.erp_event_log FOR SELECT
  USING (org_id IS NOT NULL AND user_belongs_to_org(auth.uid(), org_id));

-- Audit Logs (viewable by admins only)
CREATE POLICY "Admins can view audit logs"
  ON public.lms_audit_logs FOR SELECT
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- On-Demand Output Sources
CREATE POLICY "Users can view output sources"
  ON public.ondemand_output_sources FOR SELECT
  USING (
    output_id IN (
      SELECT output_id FROM public.ondemand_outputs 
      WHERE request_id IN (SELECT request_id FROM public.ondemand_requests WHERE user_id = auth.uid())
    )
  );