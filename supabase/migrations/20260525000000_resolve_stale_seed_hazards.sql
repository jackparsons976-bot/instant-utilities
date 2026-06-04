-- Deactivate any hazard markers older than 24 hours that are still active (seed data cleanup).
UPDATE emergency.hazard_markers
SET is_active = false,
    resolved_at = now()
WHERE is_active = true
  AND created_at < now() - interval '24 hours';
