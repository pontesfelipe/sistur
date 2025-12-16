-- Create alerts table for regression notifications
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  destination_id UUID NOT NULL REFERENCES public.destinations(id),
  pillar public.pillar_type NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'REGRESSION',
  consecutive_cycles INTEGER NOT NULL DEFAULT 2,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assessment_id UUID REFERENCES public.assessments(id)
);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view alerts in their org
CREATE POLICY "Users can view alerts in their org"
ON public.alerts
FOR SELECT
USING (user_belongs_to_org(auth.uid(), org_id));

-- Policy: System can manage alerts
CREATE POLICY "System can manage alerts"
ON public.alerts
FOR ALL
USING (user_belongs_to_org(auth.uid(), org_id) AND (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'ANALYST')));

-- Create index for faster queries
CREATE INDEX idx_alerts_org_id ON public.alerts(org_id);
CREATE INDEX idx_alerts_destination_id ON public.alerts(destination_id);
CREATE INDEX idx_alerts_is_read ON public.alerts(is_read);