-- Fix custom_access_token_hook: add missing grants and safe function implementation.
--
-- Root cause of 400 on /auth/v1/token: the hook was enabled in the Supabase
-- dashboard but supabase_auth_admin lacked EXECUTE permission and the function
-- had no exception handler, so any query error killed the entire auth request.
--
-- Apply via: supabase db push  (or paste in Supabase SQL editor)

-- 1. Grant schema usage so supabase_auth_admin can see the facility schema
GRANT USAGE ON SCHEMA facility TO supabase_auth_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA facility TO supabase_auth_admin;

-- 2. Replace the hook with a safe, idempotent implementation.
--    Derives platform_role, active_facility_ids, and caps from facility.members.
--    Wrapped in an outer EXCEPTION block so a query failure never blocks auth.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims          jsonb;
  user_id         uuid;
  platform_role   text    := 'resident';
  facility_ids    uuid[]  := ARRAY[]::uuid[];
  caps            text[]  := ARRAY[]::text[];
  top_role        text;
BEGIN
  user_id := (event ->> 'user_id')::uuid;
  claims  := event -> 'claims';

  BEGIN
    -- Highest role across all active facility memberships
    SELECT
      MAX(role ORDER BY
        CASE role
          WHEN 'platform_admin'    THEN 3
          WHEN 'facility_manager'  THEN 2
          ELSE                          1
        END DESC
      ),
      array_agg(facility_id) FILTER (WHERE left_at IS NULL)
    INTO top_role, facility_ids
    FROM facility.members
    WHERE members.user_id = custom_access_token_hook.user_id;

    IF top_role IS NOT NULL THEN
      platform_role := top_role;
    END IF;

    IF facility_ids IS NULL THEN
      facility_ids := ARRAY[]::uuid[];
    END IF;

    -- Capability set derived from the highest role
    caps := CASE platform_role
      WHEN 'platform_admin'   THEN ARRAY[
        'read:all', 'write:all',
        'manage:facilities', 'manage:users', 'manage:incidents'
      ]
      WHEN 'facility_manager' THEN ARRAY[
        'read:facility', 'write:facility',
        'manage:residents', 'manage:incidents', 'create:announcements'
      ]
      ELSE ARRAY['read:facility', 'create:sos']
    END;

  EXCEPTION WHEN OTHERS THEN
    -- Never block auth due to a hook error; fall back to defaults
    RAISE WARNING 'custom_access_token_hook: % (user_id=%)', SQLERRM, user_id;
  END;

  -- Merge custom fields into app_metadata in the JWT claims
  claims := jsonb_set(
    claims,
    '{app_metadata}',
    COALESCE(claims -> 'app_metadata', '{}'::jsonb) ||
    jsonb_build_object(
      'platform_role',       platform_role,
      'active_facility_ids', to_jsonb(facility_ids),
      'caps',                to_jsonb(caps)
    )
  );

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- 3. Grant execute to supabase_auth_admin (the role that invokes hooks)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, anon, authenticated;
