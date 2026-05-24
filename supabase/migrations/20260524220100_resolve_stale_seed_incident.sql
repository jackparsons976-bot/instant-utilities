-- Resolve any incidents older than 24 hours that are still marked active (seed data cleanup).
UPDATE emergency.incidents
SET status = 'resolved'
WHERE status = 'active'
  AND created_at < now() - interval '24 hours';
