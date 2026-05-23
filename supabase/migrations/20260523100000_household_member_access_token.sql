-- Add access_token column for household member guest links
ALTER TABLE facility.household_members
  ADD COLUMN IF NOT EXISTS access_token text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_household_members_access_token
  ON facility.household_members (access_token)
  WHERE access_token IS NOT NULL;

-- SECURITY DEFINER function: validates token and returns access data for guest view
-- Called by the public /household-access page (anon key)
CREATE OR REPLACE FUNCTION facility.get_household_access_data(p_token text)
RETURNS json
SECURITY DEFINER
SET search_path = facility, emergency, public
LANGUAGE plpgsql AS $$
DECLARE
  v_member  RECORD;
  v_incident RECORD;
BEGIN
  SELECT facility_id, display_name, relationship
  INTO v_member
  FROM facility.household_members
  WHERE access_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT id, title, incident_type, severity
  INTO v_incident
  FROM emergency.incidents
  WHERE facility_id = v_member.facility_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN json_build_object(
    'facility_id', v_member.facility_id,
    'display_name', v_member.display_name,
    'relationship', v_member.relationship,
    'incident', CASE WHEN v_incident.id IS NOT NULL THEN
      json_build_object(
        'id',            v_incident.id,
        'title',         v_incident.title,
        'incident_type', v_incident.incident_type,
        'severity',      v_incident.severity
      )
    ELSE NULL END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION facility.get_household_access_data(text) TO anon, authenticated;
