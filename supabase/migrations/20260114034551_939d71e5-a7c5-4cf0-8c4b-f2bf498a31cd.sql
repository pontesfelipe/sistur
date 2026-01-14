-- Add new roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ESTUDANTE';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'PROFESSOR';

-- Create system access type enum
DO $$ BEGIN
  CREATE TYPE public.system_access_type AS ENUM ('ERP', 'EDU');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add system_access column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS system_access public.system_access_type DEFAULT NULL;

-- Add pending_approval status to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pending_approval boolean DEFAULT false;

-- Add approval_requested_at timestamp
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS approval_requested_at timestamp with time zone DEFAULT NULL;

-- Update handle_new_user function to NOT auto-create org for pending users
-- Users will choose their access type after first login
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_org_id UUID;
  user_full_name TEXT;
BEGIN
  -- Get full name from metadata
  user_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Create a new organization for the user
  INSERT INTO public.orgs (name)
  VALUES (user_full_name || '''s Organization')
  RETURNING id INTO new_org_id;
  
  -- Create profile with pending_approval = true (user needs to choose access type)
  INSERT INTO public.profiles (user_id, org_id, full_name, pending_approval, approval_requested_at)
  VALUES (NEW.id, new_org_id, user_full_name, true, now());
  
  -- Don't assign role yet - user will choose access type first
  -- Role will be assigned after they select ERP/EDU access
  
  RETURN NEW;
END;
$$;

-- Create function to complete user onboarding (assign role based on access type)
CREATE OR REPLACE FUNCTION public.complete_user_onboarding(
  _user_id uuid,
  _system_access public.system_access_type,
  _role public.app_role DEFAULT 'VIEWER'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _org_id uuid;
BEGIN
  -- Get user's org_id
  SELECT org_id INTO _org_id FROM public.profiles WHERE user_id = _user_id;
  
  IF _org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update profile with system access
  UPDATE public.profiles 
  SET 
    system_access = _system_access,
    pending_approval = false,
    updated_at = now()
  WHERE user_id = _user_id;
  
  -- Insert role if not exists
  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (_user_id, _org_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN true;
END;
$$;

-- Create function to check if user has system access
CREATE OR REPLACE FUNCTION public.has_system_access(_user_id uuid, _access public.system_access_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id 
    AND (system_access = _access OR system_access IS NULL)
    AND pending_approval = false
  )
$$;

-- Create function for admins to get all users (for admin dropdown)
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  org_id uuid,
  org_name text,
  role public.app_role,
  system_access public.system_access_type
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow admins to call this
  IF NOT has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    au.email::text,
    p.org_id,
    o.name as org_name,
    ur.role,
    p.system_access
  FROM public.profiles p
  LEFT JOIN public.orgs o ON o.id = p.org_id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  LEFT JOIN auth.users au ON au.id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;