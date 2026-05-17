-- Step 1: platform_admins table for JWT hook to identify platform-level admins.
-- facility.members only allows 'facility_manager' | 'resident'; platform_admin
-- users have no row there so the hook always fell back to 'resident'.

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- No regular user can read or write this table; only service_role can
CREATE POLICY "service_role_only" ON public.platform_admins USING (false);

-- supabase_auth_admin needs SELECT so the JWT hook (SECURITY DEFINER) can query it
GRANT SELECT ON public.platform_admins TO supabase_auth_admin;

-- Seed the existing admin user
INSERT INTO public.platform_admins (user_id)
SELECT id FROM auth.users WHERE email = 'admin@harbourview.dev'
ON CONFLICT DO NOTHING;
