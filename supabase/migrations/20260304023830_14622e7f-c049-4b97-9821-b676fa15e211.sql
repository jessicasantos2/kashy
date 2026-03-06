
-- Remove any existing moderator roles
DELETE FROM public.user_roles WHERE role = 'moderator';

-- Drop the has_role function first (depends on enum)
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Recreate enum without moderator
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;

DROP TYPE public.app_role_old;

-- Recreate the has_role function with new type
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
