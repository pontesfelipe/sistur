-- Criar tabela de controle de acesso para treinamentos
CREATE TABLE public.edu_training_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id TEXT NOT NULL REFERENCES public.edu_trainings(training_id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('public', 'org', 'user')),
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_access_target CHECK (
    (access_type = 'public' AND org_id IS NULL AND user_id IS NULL) OR
    (access_type = 'org' AND org_id IS NOT NULL AND user_id IS NULL) OR
    (access_type = 'user' AND user_id IS NOT NULL)
  )
);

-- Índices para performance
CREATE INDEX idx_edu_training_access_training ON public.edu_training_access(training_id);
CREATE INDEX idx_edu_training_access_org ON public.edu_training_access(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_edu_training_access_user ON public.edu_training_access(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_edu_training_access_type ON public.edu_training_access(access_type);

-- Índice único para evitar duplicatas
CREATE UNIQUE INDEX idx_edu_training_access_unique_public ON public.edu_training_access(training_id) 
  WHERE access_type = 'public';
CREATE UNIQUE INDEX idx_edu_training_access_unique_org ON public.edu_training_access(training_id, org_id) 
  WHERE access_type = 'org';
CREATE UNIQUE INDEX idx_edu_training_access_unique_user ON public.edu_training_access(training_id, user_id) 
  WHERE access_type = 'user';

-- Enable RLS
ALTER TABLE public.edu_training_access ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage training access"
  ON public.edu_training_access FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Users can view their own access grants"
  ON public.edu_training_access FOR SELECT
  USING (
    user_id = auth.uid() OR
    access_type = 'public' OR
    (access_type = 'org' AND user_belongs_to_org(auth.uid(), org_id))
  );

-- Função para verificar se usuário tem acesso ao treinamento
CREATE OR REPLACE FUNCTION public.user_has_training_access(p_user_id UUID, p_training_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se existe acesso público
  IF EXISTS (
    SELECT 1 FROM edu_training_access
    WHERE training_id = p_training_id 
    AND access_type = 'public'
    AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN TRUE;
  END IF;

  -- Verificar acesso por organização
  IF EXISTS (
    SELECT 1 FROM edu_training_access eta
    WHERE eta.training_id = p_training_id 
    AND eta.access_type = 'org'
    AND user_belongs_to_org(p_user_id, eta.org_id)
    AND (eta.expires_at IS NULL OR eta.expires_at > now())
  ) THEN
    RETURN TRUE;
  END IF;

  -- Verificar acesso individual
  IF EXISTS (
    SELECT 1 FROM edu_training_access
    WHERE training_id = p_training_id 
    AND access_type = 'user'
    AND user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN TRUE;
  END IF;

  -- Verificar se treinamento pertence à org do usuário ou é global
  IF EXISTS (
    SELECT 1 FROM edu_trainings t
    WHERE t.training_id = p_training_id
    AND (t.org_id IS NULL OR user_belongs_to_org(p_user_id, t.org_id))
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;