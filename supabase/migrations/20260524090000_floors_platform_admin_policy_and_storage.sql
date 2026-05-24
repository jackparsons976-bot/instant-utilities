-- Platform admins need full access to floors (previously only member-based policies existed).
CREATE POLICY floors_all_as_platform_admin ON facility.floors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM core.user_capabilities uc
      WHERE uc.user_id = auth.uid()
        AND uc.capability = 'platform_admin'
        AND uc.facility_id IS NULL
        AND uc.revoked_at IS NULL
        AND (uc.expires_at IS NULL OR uc.expires_at > now())
    )
  );

-- Create the floor-plans storage bucket used by the floor plan admin upload feature.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'floor-plans',
  'floor-plans',
  true,
  10485760,  -- 10 MB
  ARRAY['image/png','image/jpeg','image/jpg','image/svg+xml','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Platform admins can upload and overwrite floor plan images.
CREATE POLICY floor_plans_admin_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'floor-plans'
    AND EXISTS (
      SELECT 1 FROM core.user_capabilities uc
      WHERE uc.user_id = auth.uid()
        AND uc.capability = 'platform_admin'
        AND uc.facility_id IS NULL
        AND uc.revoked_at IS NULL
        AND (uc.expires_at IS NULL OR uc.expires_at > now())
    )
  );

CREATE POLICY floor_plans_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'floor-plans'
    AND EXISTS (
      SELECT 1 FROM core.user_capabilities uc
      WHERE uc.user_id = auth.uid()
        AND uc.capability = 'platform_admin'
        AND uc.facility_id IS NULL
        AND uc.revoked_at IS NULL
        AND (uc.expires_at IS NULL OR uc.expires_at > now())
    )
  );

-- Anyone can read floor plan images (they are rendered publicly in the dashboard map).
CREATE POLICY floor_plans_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'floor-plans');
