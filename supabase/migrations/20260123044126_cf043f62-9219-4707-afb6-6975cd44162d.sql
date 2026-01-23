-- Add enterprise access flag to orgs table
ALTER TABLE public.orgs 
ADD COLUMN has_enterprise_access BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.orgs.has_enterprise_access IS 'Whether this organization has access to Enterprise module (hotel/resort indicators)';