ALTER TABLE emergency.hazard_markers
  ADD COLUMN IF NOT EXISTS floor text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
