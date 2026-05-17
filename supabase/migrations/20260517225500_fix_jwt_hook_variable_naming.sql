-- Fix 42P01 error in custom_access_token_hook.
-- Root cause: local DECLARE variable named 'user_id' (same name as table columns)
-- caused the SQL parser to treat 'custom_access_token_hook.user_id' as a table alias
-- reference rather than a local variable, triggering "missing FROM-clause entry".
-- Note: function_name.variable_name syntax only resolves function PARAMETERS, not
-- local DECLARE variables. Fix: rename local variable to 'v_user_id'.
-- Also fixed: MAX(role ORDER BY ...) is invalid syntax for regular aggregates;
-- replaced with MAX(CASE ...) which correctly prioritises facility_manager.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims          jsonb;
  v_user_id       uuid;
  platform_role   text    := 'resident';
  facility_ids    uuid[]  := ARRAY[]::uuid[];
  caps            text[]  := ARRAY[]::text[];
  top_role        text;
  is_admin        boolean := false;
BEGIN
  v_user_id := (event ->> 'user_id')::uuid;
  claims    := event -> 'claims';

  BEGIN
    SELECT EXISTS(
      SELECT 1 FROM public.platform_admins WHERE platform_admins.user_id = v_user_id
    ) INTO is_admin;

    IF is_admin THEN
      platform_role := 'platform_admin';
      caps := ARRAY['read:all','write:all','manage:facilities','manage:users','manage:incidents'];
      SELECT array_agg(id) INTO facility_ids
        FROM facility.facilities WHERE is_active = true;
      IF facility_ids IS NULL THEN facility_ids := ARRAY[]::uuid[]; END IF;

    ELSE
      SELECT
        MAX(CASE role WHEN 'facility_manager' THEN 'facility_manager' ELSE 'resident' END),
        array_agg(facility_id) FILTER (WHERE left_at IS NULL)
      INTO top_role, facility_ids
      FROM facility.members
      WHERE members.user_id = v_user_id;

      IF top_role IS NOT NULL THEN platform_role := top_role; END IF;
      IF facility_ids IS NULL THEN facility_ids := ARRAY[]::uuid[]; END IF;

      caps := CASE platform_role
        WHEN 'facility_manager' THEN ARRAY[
          'read:facility','write:facility',
          'manage:residents','manage:incidents','create:announcements'
        ]
        ELSE ARRAY['read:facility','create:sos']
      END;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'custom_access_token_hook: % (SQLSTATE=%, v_user_id=%)', SQLERRM, SQLSTATE, v_user_id;
  END;

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

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, anon, authenticated;
