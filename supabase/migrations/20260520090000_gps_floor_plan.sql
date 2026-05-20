-- Step 1: Add geo-bounds + image columns to facility.floors
ALTER TABLE facility.floors
  ADD COLUMN IF NOT EXISTS image_url       text,
  ADD COLUMN IF NOT EXISTS geo_lat_min     numeric(10,7),
  ADD COLUMN IF NOT EXISTS geo_lat_max     numeric(10,7),
  ADD COLUMN IF NOT EXISTS geo_lng_min     numeric(10,7),
  ADD COLUMN IF NOT EXISTS geo_lng_max     numeric(10,7),
  ADD COLUMN IF NOT EXISTS building_name   text,
  ADD COLUMN IF NOT EXISTS level_number    integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS level_label     text    DEFAULT 'Ground Floor';

-- Step 2: Add percentage-based position columns to qr.nodes for QR location pinning
ALTER TABLE qr.nodes
  ADD COLUMN IF NOT EXISTS x_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS y_percent numeric(5,2);

-- Step 3: Live user location table (one row per user, upserted)
CREATE TABLE IF NOT EXISTS public.user_locations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_id      uuid        NOT NULL,
  floor_id         uuid        REFERENCES facility.floors(id),
  lat              numeric(10,7),
  lng              numeric(10,7),
  x_percent        numeric(5,2),
  y_percent        numeric(5,2),
  source           text        CHECK (source IN ('gps','wifi','qr','manual')),
  accuracy_meters  numeric(6,1),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS user_locations_user_id_idx
  ON public.user_locations(user_id);

-- Members can read all locations within their facility
CREATE POLICY "facility_members_see_locations" ON public.user_locations
  FOR SELECT USING (
    facility_id = ANY(
      ARRAY(
        SELECT jsonb_array_elements_text(
          auth.jwt()->'app_metadata'->'active_facility_ids'
        )::uuid
      )
    )
  );

-- Users can only write their own row
CREATE POLICY "own_location_write" ON public.user_locations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "own_location_update" ON public.user_locations
  FOR UPDATE USING (user_id = auth.uid());

-- Step 4: Supabase Storage bucket for floor plan images
INSERT INTO storage.buckets (id, name, public)
  VALUES ('floor-plans', 'floor-plans', true)
  ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "authenticated_upload_floor_plans" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'floor-plans');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "public_read_floor_plans" ON storage.objects
    FOR SELECT USING (bucket_id = 'floor-plans');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 5: Seed Harbourview floor with Sydney CBD geo-bounds for GPS testing
UPDATE facility.floors
SET
  geo_lat_min    = -33.8700,
  geo_lat_max    = -33.8680,
  geo_lng_min    = 151.2080,
  geo_lng_max    = 151.2100,
  building_name  = 'Harbourview',
  level_number   = 4,
  level_label    = 'Level 4'
WHERE facility_id = 'b0000000-0000-0000-0000-000000000001';
