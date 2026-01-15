-- Table for student learning profiles/interests
CREATE TABLE public.edu_student_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Professional context
  occupation_area TEXT, -- 'tourism', 'hospitality', 'public_sector', 'education', 'other'
  experience_level TEXT, -- 'beginner', 'intermediate', 'advanced'
  job_role TEXT,
  
  -- Learning interests (pillars)
  interest_pillars TEXT[] DEFAULT '{}', -- ['RA', 'OE', 'AO']
  
  -- Specific themes of interest
  interest_themes TEXT[] DEFAULT '{}', -- specific themes like 'sustainability', 'marketing', 'governance'
  
  -- Learning preferences
  preferred_format TEXT, -- 'video', 'reading', 'interactive', 'mixed'
  available_hours_per_week INTEGER,
  
  -- Goals
  learning_goals TEXT[] DEFAULT '{}',
  
  -- Territory context (optional)
  territory_context TEXT,
  destination_id UUID REFERENCES public.destinations(id),
  
  -- Profile completion
  is_complete BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.edu_student_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own profile
CREATE POLICY "Users can view own student profile" 
ON public.edu_student_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own student profile" 
ON public.edu_student_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own student profile" 
ON public.edu_student_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all student profiles" 
ON public.edu_student_profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Table for personalized track recommendations
CREATE TABLE public.edu_personalized_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_id UUID REFERENCES public.edu_student_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Recommendation type
  recommendation_type TEXT NOT NULL, -- 'track', 'course', 'live'
  entity_id TEXT NOT NULL, -- training_id or track_id
  
  -- Relevance scoring
  relevance_score NUMERIC(4,2) DEFAULT 0,
  match_reasons JSONB DEFAULT '[]',
  
  -- Status
  is_dismissed BOOLEAN DEFAULT false,
  is_enrolled BOOLEAN DEFAULT false,
  
  UNIQUE(user_id, recommendation_type, entity_id)
);

-- Enable RLS
ALTER TABLE public.edu_personalized_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own recommendations
CREATE POLICY "Users can view own recommendations" 
ON public.edu_personalized_recommendations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recommendations" 
ON public.edu_personalized_recommendations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations" 
ON public.edu_personalized_recommendations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recommendations"
ON public.edu_personalized_recommendations
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_edu_student_profiles_updated_at
BEFORE UPDATE ON public.edu_student_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();