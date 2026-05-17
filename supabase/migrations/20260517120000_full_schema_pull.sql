-- ============================================================
-- Full schema pull — generated from live Supabase project
-- Project: wqkwdjxpmvluiuvwnldf (Instant_)
-- Pulled: 2026-05-17
-- Schemas: public, core, facility, emergency, marketplace,
--           messaging, notification, qr
-- ============================================================

-- ── Schema creation ─────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS facility;
CREATE SCHEMA IF NOT EXISTS emergency;
CREATE SCHEMA IF NOT EXISTS marketplace;
CREATE SCHEMA IF NOT EXISTS messaging;
CREATE SCHEMA IF NOT EXISTS notification;
CREATE SCHEMA IF NOT EXISTS qr;

-- ── Enum types ───────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE emergency.incident_type AS ENUM (
    'sos','fire','medical','security_threat','hazmat','structural','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE emergency.incident_status AS ENUM (
    'active','contained','resolved','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE emergency.hazard_type AS ENUM (
    'fire','smoke','blocked_exit','threat','medical','structural','flood','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── core schema ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS core.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE core.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS core.user_capabilities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES facility.facilities(id) ON DELETE CASCADE,
  capability  text NOT NULL,
  granted_by  uuid REFERENCES auth.users(id),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,
  revoked_at  timestamptz,
  UNIQUE (user_id, facility_id, capability)
);
ALTER TABLE core.user_capabilities ENABLE ROW LEVEL SECURITY;

-- ── facility schema ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facility.facilities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  address    text,
  city       text,
  country    text NOT NULL DEFAULT 'AU',
  plan_tier  text NOT NULL DEFAULT 'standard'
               CHECK (plan_tier IN ('standard','professional','enterprise')),
  settings   jsonb NOT NULL DEFAULT '{}',
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE facility.facilities ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS facility.floors (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id      uuid NOT NULL REFERENCES facility.facilities(id) ON DELETE CASCADE,
  level            integer NOT NULL,
  name             text NOT NULL,
  floor_plan_url   text,
  floor_plan_width numeric,
  floor_plan_height numeric,
  metadata         jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE facility.floors ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS facility.members (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id         uuid NOT NULL REFERENCES facility.facilities(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                text NOT NULL CHECK (role IN ('facility_manager','resident')),
  unit_number         text,
  marketplace_enabled boolean NOT NULL DEFAULT false,
  business_profile_id uuid,
  joined_at           timestamptz NOT NULL DEFAULT now(),
  left_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE facility.members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS facility.household_members (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id       uuid NOT NULL REFERENCES facility.facilities(id) ON DELETE CASCADE,
  primary_member_id uuid NOT NULL REFERENCES auth.users(id),
  user_id           uuid NOT NULL REFERENCES auth.users(id),
  relationship      text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE facility.household_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS facility.maintenance_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   uuid NOT NULL REFERENCES facility.facilities(id) ON DELETE CASCADE,
  submitted_by  uuid NOT NULL REFERENCES auth.users(id),
  assigned_to   uuid REFERENCES auth.users(id),
  title         text NOT NULL,
  description   text,
  category      text,
  status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','in_progress','completed','cancelled')),
  priority      text NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('low','normal','high','urgent')),
  location_note text,
  node_id       uuid,
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz
);
ALTER TABLE facility.maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS facility.announcements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id  uuid NOT NULL REFERENCES facility.facilities(id) ON DELETE CASCADE,
  author_id    uuid NOT NULL REFERENCES auth.users(id),
  title        text NOT NULL,
  body         text NOT NULL,
  target_roles text[] NOT NULL DEFAULT '{}',
  published_at timestamptz,
  expires_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE facility.announcements ENABLE ROW LEVEL SECURITY;

-- ── emergency schema ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emergency.incidents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   uuid NOT NULL REFERENCES facility.facilities(id) ON DELETE CASCADE,
  incident_type emergency.incident_type NOT NULL,
  status        emergency.incident_status NOT NULL DEFAULT 'active',
  origin_node_id uuid,
  reported_by   uuid NOT NULL REFERENCES auth.users(id),
  title         text NOT NULL,
  description   text,
  severity      integer NOT NULL DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz
);
ALTER TABLE emergency.incidents ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS emergency.incident_timeline (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES emergency.incidents(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES facility.facilities(id),
  event_type  text NOT NULL,
  actor_id    uuid REFERENCES auth.users(id),
  node_id     uuid,
  description text NOT NULL,
  metadata    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE emergency.incident_timeline ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS emergency.sos_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     uuid REFERENCES emergency.incidents(id),
  facility_id     uuid NOT NULL REFERENCES facility.facilities(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id),
  node_id         uuid,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','acknowledged','responded','resolved','cancelled')),
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE emergency.sos_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS emergency.hazard_markers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  uuid REFERENCES emergency.incidents(id),
  facility_id  uuid NOT NULL REFERENCES facility.facilities(id) ON DELETE CASCADE,
  floor_id     uuid NOT NULL REFERENCES facility.floors(id),
  node_id      uuid,
  hazard_type  emergency.hazard_type NOT NULL,
  placed_by    uuid NOT NULL REFERENCES auth.users(id),
  coord_x      numeric,
  coord_y      numeric,
  is_active    boolean NOT NULL DEFAULT true,
  confirmed_by uuid REFERENCES auth.users(id),
  metadata     jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz
);
ALTER TABLE emergency.hazard_markers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS emergency.responder_assignments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id    uuid NOT NULL REFERENCES emergency.incidents(id) ON DELETE CASCADE,
  facility_id    uuid NOT NULL REFERENCES facility.facilities(id),
  user_id        uuid NOT NULL REFERENCES auth.users(id),
  responder_role text NOT NULL DEFAULT 'responder'
                   CHECK (responder_role IN ('coordinator','responder','external_service')),
  status         text NOT NULL DEFAULT 'assigned'
                   CHECK (status IN ('assigned','en_route','on_scene','completed','recalled')),
  current_node_id uuid,
  assigned_at    timestamptz NOT NULL DEFAULT now(),
  arrived_at     timestamptz
);
ALTER TABLE emergency.responder_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS emergency.active_routes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id   uuid NOT NULL REFERENCES emergency.incidents(id) ON DELETE CASCADE,
  facility_id   uuid NOT NULL REFERENCES facility.facilities(id),
  from_node_id  uuid NOT NULL,
  to_node_id    uuid NOT NULL,
  route_node_ids uuid[] NOT NULL,
  is_blocked    boolean NOT NULL DEFAULT false,
  block_reason  text,
  computed_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE emergency.active_routes ENABLE ROW LEVEL SECURITY;

-- ── qr schema ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr.nodes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id        uuid NOT NULL REFERENCES facility.facilities(id) ON DELETE CASCADE,
  floor_id           uuid REFERENCES facility.floors(id),
  label              text NOT NULL,
  node_type          text NOT NULL,
  zone               text,
  coord_x            numeric,
  coord_y            numeric,
  emergency_priority integer NOT NULL DEFAULT 5,
  qr_payload         text,
  is_active          boolean NOT NULL DEFAULT true,
  metadata           jsonb NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE qr.nodes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS qr.node_edges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES facility.facilities(id) ON DELETE CASCADE,
  from_node_id uuid NOT NULL REFERENCES qr.nodes(id) ON DELETE CASCADE,
  to_node_id  uuid NOT NULL REFERENCES qr.nodes(id) ON DELETE CASCADE,
  weight      numeric NOT NULL DEFAULT 1,
  is_directed boolean NOT NULL DEFAULT false,
  metadata    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE qr.node_edges ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS qr.scan_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id     uuid NOT NULL REFERENCES qr.nodes(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES facility.facilities(id),
  user_id     uuid REFERENCES auth.users(id),
  scanned_at  timestamptz NOT NULL DEFAULT now(),
  metadata    jsonb NOT NULL DEFAULT '{}'
);
ALTER TABLE qr.scan_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS qr.cached_routes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id  uuid NOT NULL REFERENCES facility.facilities(id) ON DELETE CASCADE,
  from_node_id uuid NOT NULL REFERENCES qr.nodes(id),
  to_node_id   uuid NOT NULL REFERENCES qr.nodes(id),
  route_node_ids uuid[] NOT NULL,
  computed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (facility_id, from_node_id, to_node_id)
);
ALTER TABLE qr.cached_routes ENABLE ROW LEVEL SECURITY;

-- ── marketplace schema ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace.service_categories (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL UNIQUE,
  description          text,
  icon_key             text,
  is_emergency_eligible boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE marketplace.service_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS marketplace.business_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id),
  name          text NOT NULL,
  description   text,
  business_type text NOT NULL,
  abn           text,
  contact_email text,
  contact_phone text,
  website_url   text,
  is_active     boolean NOT NULL DEFAULT true,
  is_approved   boolean NOT NULL DEFAULT false,
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE marketplace.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS marketplace.business_services (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id uuid NOT NULL REFERENCES marketplace.business_profiles(id) ON DELETE CASCADE,
  category_id         uuid NOT NULL REFERENCES marketplace.service_categories(id),
  name                text NOT NULL,
  description         text,
  base_price          numeric,
  price_unit          text CHECK (price_unit IN ('fixed','hourly','quote')),
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE marketplace.business_services ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS marketplace.facility_vendors (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id         uuid NOT NULL REFERENCES facility.facilities(id) ON DELETE CASCADE,
  business_profile_id uuid NOT NULL REFERENCES marketplace.business_profiles(id),
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','suspended','removed')),
  trust_level         text NOT NULL DEFAULT 'standard'
                        CHECK (trust_level IN ('standard','preferred','emergency')),
  approved_by         uuid REFERENCES auth.users(id),
  approved_at         timestamptz,
  metadata            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE marketplace.facility_vendors ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS marketplace.quotes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id         uuid NOT NULL REFERENCES facility.facilities(id) ON DELETE CASCADE,
  business_profile_id uuid NOT NULL REFERENCES marketplace.business_profiles(id),
  requested_by        uuid NOT NULL REFERENCES auth.users(id),
  service_id          uuid REFERENCES marketplace.business_services(id),
  title               text NOT NULL,
  description         text,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','submitted','accepted','rejected','expired')),
  amount              numeric,
  currency            text NOT NULL DEFAULT 'AUD',
  valid_until         timestamptz,
  metadata            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE marketplace.quotes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS marketplace.jobs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id         uuid NOT NULL REFERENCES facility.facilities(id) ON DELETE CASCADE,
  business_profile_id uuid NOT NULL REFERENCES marketplace.business_profiles(id),
  quote_id            uuid REFERENCES marketplace.quotes(id),
  created_by          uuid NOT NULL REFERENCES auth.users(id),
  title               text NOT NULL,
  description         text,
  status              text NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  is_emergency_dispatch boolean NOT NULL DEFAULT false,
  scheduled_at        timestamptz,
  started_at          timestamptz,
  completed_at        timestamptz,
  metadata            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE marketplace.jobs ENABLE ROW LEVEL SECURITY;

-- ── messaging schema ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messaging.threads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES facility.facilities(id) ON DELETE CASCADE,
  thread_type text NOT NULL DEFAULT 'direct'
                CHECK (thread_type IN ('direct','announcement','maintenance','emergency','marketplace')),
  subject     text,
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  ref_id      uuid,
  ref_type    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE messaging.threads ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS messaging.thread_participants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid NOT NULL REFERENCES messaging.threads(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES facility.facilities(id),
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  UNIQUE (thread_id, user_id)
);
ALTER TABLE messaging.thread_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS messaging.messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id  uuid NOT NULL REFERENCES messaging.threads(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES facility.facilities(id),
  sender_id  uuid NOT NULL REFERENCES auth.users(id),
  body       text NOT NULL,
  metadata   jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at  timestamptz,
  deleted_at timestamptz
);
ALTER TABLE messaging.messages ENABLE ROW LEVEL SECURITY;

-- ── notification schema ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES facility.facilities(id),
  title       text NOT NULL,
  body        text,
  action_url  text,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notification.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS notification.notification_preferences (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel    text NOT NULL,
  event_type text NOT NULL,
  enabled    boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel, event_type)
);
ALTER TABLE notification.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS notification.push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth_key   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);
ALTER TABLE notification.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ── JWT hook function (public schema) ────────────────────────
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID;
  v_claims        jsonb;
  v_caps          TEXT[];
  v_facility_ids  UUID[];
  v_platform_role TEXT;
BEGIN
  v_user_id := (event ->> 'user_id')::UUID;
  v_claims  := event -> 'claims';

  SELECT ARRAY_AGG(DISTINCT capability ORDER BY capability)
  INTO v_caps
  FROM core.user_capabilities
  WHERE user_id    = v_user_id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());

  SELECT ARRAY_AGG(DISTINCT facility_id ORDER BY facility_id)
  INTO v_facility_ids
  FROM facility.members
  WHERE user_id = v_user_id
    AND left_at IS NULL;

  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM core.user_capabilities
      WHERE user_id = v_user_id AND capability = 'platform_admin'
        AND facility_id IS NULL AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
    ) THEN 'platform_admin'
    WHEN EXISTS (
      SELECT 1 FROM facility.members
      WHERE user_id = v_user_id AND role = 'facility_manager'
        AND left_at IS NULL
    ) THEN 'facility_manager'
    ELSE 'resident'
  END INTO v_platform_role;

  v_claims := jsonb_set(
    v_claims,
    '{app_metadata}',
    COALESCE(v_claims -> 'app_metadata', '{}'::jsonb) || jsonb_build_object(
      'platform_role',       v_platform_role,
      'active_facility_ids', COALESCE(to_jsonb(v_facility_ids), '[]'::jsonb),
      'caps',                COALESCE(to_jsonb(v_caps), '[]'::jsonb)
    )
  );

  RETURN jsonb_set(event, '{claims}', v_claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, anon, authenticated;

-- ── RLS Policies summary ─────────────────────────────────────
-- All tables above have RLS enabled.
-- Policies are defined in the live database and documented here
-- for reference. All policies use facility.members joins for
-- facility-scoping (more robust than JWT claims alone).
--
-- facility.facilities     — select: member; all: platform_admin
-- facility.members        — select: self or member; insert/update: manager
-- facility.maintenance_requests — insert: member; select/update: submitter or manager
-- facility.announcements  — select: published member; all: manager
-- emergency.incidents     — select/insert: member; update: manager
-- emergency.sos_events    — insert/select: member (own or manager); update: manager
-- emergency.hazard_markers — select/insert: member; update: manager
-- emergency.active_routes  — select: member
-- marketplace.business_profiles — select: approved+active (authenticated); own ops
-- messaging.threads        — select: participant or manager; insert: member
-- messaging.messages       — select/insert: participant; update: sender
-- notification.notifications — select/update: own user only
