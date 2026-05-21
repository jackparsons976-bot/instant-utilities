-- Feature 1.2: crowd-sourced hazard marker enhancements

-- Add percentage-based position columns
ALTER TABLE emergency.hazard_markers
  ADD COLUMN IF NOT EXISTS x_percent   numeric(5,2),
  ADD COLUMN IF NOT EXISTS y_percent   numeric(5,2),
  ADD COLUMN IF NOT EXISTS marker_type text,
  ADD COLUMN IF NOT EXISTS created_by  uuid REFERENCES auth.users(id);

-- Migrate confirmed_by from uuid to uuid[] for multi-user confirmation
ALTER TABLE emergency.hazard_markers
  ADD COLUMN IF NOT EXISTS confirmed_by_arr uuid[] DEFAULT '{}';

-- Copy existing single confirmed_by value into array (skip nulls)
UPDATE emergency.hazard_markers
  SET confirmed_by_arr = ARRAY[confirmed_by]
  WHERE confirmed_by IS NOT NULL;

-- Drop old single-uuid column and rename array column
ALTER TABLE emergency.hazard_markers
  DROP COLUMN IF EXISTS confirmed_by;

ALTER TABLE emergency.hazard_markers
  RENAME COLUMN confirmed_by_arr TO confirmed_by;

-- resolved_at already exists from full schema pull (created_at also exists)
-- marker_type mirrors hazard_type; populate from hazard_type for existing rows
UPDATE emergency.hazard_markers
  SET marker_type = hazard_type::text
  WHERE marker_type IS NULL;

-- created_by mirrors placed_by for new insert pattern
UPDATE emergency.hazard_markers
  SET created_by = placed_by
  WHERE created_by IS NULL;
