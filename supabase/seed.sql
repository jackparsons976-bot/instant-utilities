-- =============================================================
-- Instant Utilities — Development Seed
-- Run via: supabase db reset  (applies migrations then this file)
-- Or apply manually in the Supabase SQL editor.
--
-- Seed users (all share password: Password123!)
--   admin@harbourview.dev    → platform_admin  (Jordan Blake)
--   manager@harbourview.dev  → facility_manager (Sam Nguyen)
--   resident@harbourview.dev → resident         (Alex Kim)
--
-- Facility: Harbourview Residential Tower (Sydney)
-- =============================================================

-- ── Auth users ───────────────────────────────────────────────
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@harbourview.dev',
    '$2a$10$hGS9R5XSiZXHIJPPKOtbyepM0W2/mRv6KCRk8bdjROCERFnN/okqW',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Jordan Blake"}',
    now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'manager@harbourview.dev',
    '$2a$10$hGS9R5XSiZXHIJPPKOtbyepM0W2/mRv6KCRk8bdjROCERFnN/okqW',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Sam Nguyen"}',
    now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'resident@harbourview.dev',
    '$2a$10$hGS9R5XSiZXHIJPPKOtbyepM0W2/mRv6KCRk8bdjROCERFnN/okqW',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Alex Kim"}',
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- Required identity rows (Supabase auth internals)
INSERT INTO auth.identities (
  id, user_id, provider_id, provider,
  identity_data, last_sign_in_at, created_at, updated_at
)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'admin@harbourview.dev', 'email',
    '{"sub":"a0000000-0000-0000-0000-000000000001","email":"admin@harbourview.dev"}',
    now(), now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    'manager@harbourview.dev', 'email',
    '{"sub":"a0000000-0000-0000-0000-000000000002","email":"manager@harbourview.dev"}',
    now(), now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000003',
    'resident@harbourview.dev', 'email',
    '{"sub":"a0000000-0000-0000-0000-000000000003","email":"resident@harbourview.dev"}',
    now(), now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- ── Core profiles ─────────────────────────────────────────────
INSERT INTO core.profiles (id, display_name)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Jordan Blake'),
  ('a0000000-0000-0000-0000-000000000002', 'Sam Nguyen'),
  ('a0000000-0000-0000-0000-000000000003', 'Alex Kim')
ON CONFLICT (id) DO NOTHING;

-- ── Platform admin ────────────────────────────────────────────
INSERT INTO public.platform_admins (user_id)
VALUES ('a0000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id) DO NOTHING;

-- ── Facility ──────────────────────────────────────────────────
INSERT INTO facility.facilities (
  id, name, address, city, country, plan_tier, is_active
)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Harbourview Residential Tower',
  '120 Circular Quay East', 'Sydney', 'AU',
  'professional', true
)
ON CONFLICT (id) DO NOTHING;

-- ── Floors ────────────────────────────────────────────────────
INSERT INTO facility.floors (
  id, facility_id, level, name,
  image_url,
  geo_lat_min, geo_lat_max, geo_lng_min, geo_lng_max,
  building_name, level_number, level_label,
  image_width, image_height
)
VALUES
  (
    'b0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    1, 'Ground Floor',
    'https://wqkwdjxpmvluiuvwnldf.supabase.co/storage/v1/object/public/floor-plans/b0000000-0000-0000-0000-000000000001/b0000000-0000-0000-0000-000000000002/plan.svg',
    -33.8700, -33.8680, 151.2080, 151.2100,
    'Harbourview', 1, 'Ground Floor',
    1000, 800
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    2, 'Level 2',
    null,
    null, null, null, null,
    'Harbourview', 2, 'Level 2',
    1000, 800
  )
ON CONFLICT (id) DO NOTHING;

-- ── Members ───────────────────────────────────────────────────
INSERT INTO facility.members (facility_id, user_id, role, unit_number)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'facility_manager', null),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'resident',         '4B')
ON CONFLICT DO NOTHING;

-- ── QR nodes (Ground Floor) ───────────────────────────────────
INSERT INTO qr.nodes (id, facility_id, floor_id, label, node_type, zone, emergency_priority, is_active)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Main Entrance',         'entry',           'entrance_zone', 1, true),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Lobby',                 'floor_anchor',    'lobby_zone',    2, true),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Hallway A',             'hallway',         'central_zone',  5, true),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Hallway B',             'hallway',         'east_zone',     5, true),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Room 101',              'utility',         'north_wing',    5, true),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Room 102',              'utility',         'south_wing',    5, true),
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'North Stairwell',       'stairwell',       'north_wing',    2, true),
  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Lift Lobby',            'elevator',        'lobby_zone',    3, true),
  ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Emergency Assembly A',  'emergency_point', 'east_zone',     1, true),
  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Rear Fire Exit',        'exit',            'east_zone',     1, true)
ON CONFLICT (id) DO NOTHING;
