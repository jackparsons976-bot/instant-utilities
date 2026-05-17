-- Step 2: Update custom_access_token_hook to check platform_admins first.
-- Platform admins have no row in facility.members (that table only allows
-- 'facility_manager' | 'resident'), so they were always returning 'resident'.
-- Now: check public.platform_admins first; if found, set full admin claims.

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
  is_admin        boolean := false;
BEGIN
  user_id := (event ->> 'user_id')::uuid;
  claims  := event -> 'claims';

  BEGIN
    -- Check platform_admins first
    SELECT EXISTS(
      SELECT 1 FROM public.platform_admins WHERE user_id = custom_access_token_hook.user_id
    ) INTO is_admin;

    IF is_admin THEN
      platform_role := 'platform_admin';
      caps := ARRAY['read:all','write:all','manage:facilities','manage:users','manage:incidents'];
      SELECT array_agg(id) INTO facility_ids
        FROM facility.facilities WHERE is_active = true;
      IF facility_ids IS NULL THEN facility_ids := ARRAY[]::uuid[]; END IF;

    ELSE
      -- Existing facility.members lookup for non-admin users
      SELECT
        MAX(role ORDER BY CASE role WHEN 'facility_manager' THEN 2 ELSE 1 END DESC),
        array_agg(facility_id) FILTER (WHERE left_at IS NULL)
      INTO top_role, facility_ids
      FROM facility.members
      WHERE members.user_id = custom_access_token_hook.user_id;

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

-- Re-grant in case the function was recreated
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, anon, authenticated;
