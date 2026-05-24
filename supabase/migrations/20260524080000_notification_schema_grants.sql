-- Grant access to the notification schema for authenticated users.
-- RLS policies already exist and are correct; this was the only missing piece.

GRANT USAGE ON SCHEMA notification TO authenticated;

GRANT SELECT, UPDATE ON notification.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification.notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification.push_subscriptions TO authenticated;
