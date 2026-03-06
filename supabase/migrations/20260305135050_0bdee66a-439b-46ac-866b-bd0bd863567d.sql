
-- Drop the old two-param function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Create new single-param function that uses auth.uid() internally
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _role
  )
$$;

-- Restrict execution to authenticated users only
REVOKE EXECUTE ON FUNCTION public.has_role(app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(app_role) TO authenticated;
