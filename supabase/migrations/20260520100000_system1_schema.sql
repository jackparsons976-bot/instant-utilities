-- System 1 + 2 schema additions

-- Facility address + emergency contacts for 000 brief
ALTER TABLE facility.facilities
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS emergency_contacts text[] DEFAULT '{}';

-- Floor plan dimensions (spec uses image_width/height)
ALTER TABLE facility.floors
  ADD COLUMN IF NOT EXISTS image_width  integer DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS image_height integer DEFAULT 800;

-- Grant authenticated users access to user_locations
GRANT SELECT, INSERT, UPDATE ON public.user_locations TO authenticated;

-- Resident invitations (System 2.1)
CREATE TABLE IF NOT EXISTS facility.invitations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid        NOT NULL REFERENCES facility.facilities(id) ON DELETE CASCADE,
  invited_by  uuid        NOT NULL REFERENCES auth.users(id),
  email       text        NOT NULL,
  role        text        NOT NULL DEFAULT 'resident'
    CHECK (role IN ('resident','facility_manager')),
  unit_number text,
  token       text        UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  accepted_at timestamptz,
  expires_at  timestamptz DEFAULT now() + interval '7 days',
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE facility.invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers_manage_invitations" ON facility.invitations
  FOR ALL USING (
    facility_id = ANY(ARRAY(
      SELECT jsonb_array_elements_text(
        auth.jwt()->'app_metadata'->'active_facility_ids')::uuid))
    AND (auth.jwt()->'app_metadata'->>'platform_role')
      IN ('platform_admin','facility_manager')
  );

-- Household member enhancements (System 2.2)
ALTER TABLE facility.household_members
  ADD COLUMN IF NOT EXISTS display_name        text,
  ADD COLUMN IF NOT EXISTS relationship        text,
  ADD COLUMN IF NOT EXISTS can_trigger_sos     boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_on_emergency boolean DEFAULT true;

-- Facility_vendors trust level (System 3.6)
ALTER TABLE marketplace.facility_vendors
  ADD COLUMN IF NOT EXISTS trust_level       text DEFAULT 'standard'
    CHECK (trust_level IN ('standard','preferred','emergency')),
  ADD COLUMN IF NOT EXISTS approved_by       uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approval_notes    text,
  ADD COLUMN IF NOT EXISTS contract_expires_at timestamptz;

-- Business profile enhancements (System 3.1)
ALTER TABLE marketplace.business_profiles
  ADD COLUMN IF NOT EXISTS abn                    text,
  ADD COLUMN IF NOT EXISTS contact_name           text,
  ADD COLUMN IF NOT EXISTS contact_phone          text,
  ADD COLUMN IF NOT EXISTS contact_email          text,
  ADD COLUMN IF NOT EXISTS description            text,
  ADD COLUMN IF NOT EXISTS insurance_verified     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS response_time_hours    integer DEFAULT 24,
  ADD COLUMN IF NOT EXISTS service_radius_km      integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS is_emergency_provider  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'
    CHECK (status IN ('pending','approved','suspended'));

-- Quote negotiation (System 3.2)
ALTER TABLE marketplace.quotes
  ADD COLUMN IF NOT EXISTS vendor_response      text,
  ADD COLUMN IF NOT EXISTS vendor_price         numeric(10,2),
  ADD COLUMN IF NOT EXISTS vendor_available_from timestamptz,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'
    CHECK (status IN ('pending','quoted','accepted','rejected','completed','cancelled')),
  ADD COLUMN IF NOT EXISTS responded_at         timestamptz;

-- Jobs enhancements (System 3.3)
ALTER TABLE marketplace.jobs
  ADD COLUMN IF NOT EXISTS scheduled_at        timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS access_instructions text,
  ADD COLUMN IF NOT EXISTS manager_notes       text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  ADD COLUMN IF NOT EXISTS rating              integer CHECK (rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS review_text         text;

-- Resident marketplace opt-in (System 3.4)
ALTER TABLE facility.members
  ADD COLUMN IF NOT EXISTS marketplace_enabled   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_profile_id   uuid
    REFERENCES marketplace.business_profiles(id);
