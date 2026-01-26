-- Create enterprise profiles table for property metadata
CREATE TABLE public.enterprise_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  
  -- Tipo e Porte
  property_type TEXT NOT NULL DEFAULT 'hotel', -- hotel, resort, pousada, hostel, apart_hotel
  star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),
  room_count INTEGER,
  suite_count INTEGER,
  total_capacity INTEGER, -- max guests
  
  -- Equipe e Operação
  employee_count INTEGER,
  years_in_operation INTEGER,
  seasonality TEXT, -- alta, media, baixa, uniforme
  peak_months TEXT[], -- array of peak months
  
  -- Mercado e Público
  target_market TEXT[], -- corporativo, lazer, familia, eventos, eco
  average_occupancy_rate NUMERIC(5,2), -- percentage
  average_daily_rate NUMERIC(12,2), -- ADR in local currency
  primary_source_markets TEXT[], -- main guest origins
  
  -- Certificações
  certifications TEXT[], -- ISO, sustentabilidade, acessibilidade, etc.
  sustainability_initiatives TEXT[],
  accessibility_features TEXT[],
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(destination_id) -- One profile per destination
);

-- Enable RLS
ALTER TABLE public.enterprise_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies using effective org (supports demo mode)
CREATE POLICY "Users can view enterprise profiles in their effective org"
  ON public.enterprise_profiles
  FOR SELECT
  USING (org_id = public.get_effective_org_id());

CREATE POLICY "Users can create enterprise profiles in their effective org"
  ON public.enterprise_profiles
  FOR INSERT
  WITH CHECK (org_id = public.get_effective_org_id());

CREATE POLICY "Users can update enterprise profiles in their effective org"
  ON public.enterprise_profiles
  FOR UPDATE
  USING (org_id = public.get_effective_org_id());

CREATE POLICY "Users can delete enterprise profiles in their effective org"
  ON public.enterprise_profiles
  FOR DELETE
  USING (org_id = public.get_effective_org_id());

-- Trigger for updated_at
CREATE TRIGGER update_enterprise_profiles_updated_at
  BEFORE UPDATE ON public.enterprise_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();