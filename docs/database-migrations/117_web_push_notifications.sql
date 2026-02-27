-- Web Push Notifications support
-- Adds push subscription storage and push delivery tracking fields.

-- ============================================================================
-- Push subscriptions
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  device_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view their own push subscriptions"
  ON push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can insert their own push subscriptions"
  ON push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can update their own push subscriptions"
  ON push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete their own push subscriptions"
  ON push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- ============================================================================
-- User preferences: push notification toggles
-- ============================================================================

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS push_notifications JSONB DEFAULT '{
  "enabled": true,
  "comment_added": true,
  "comment_assigned": true,
  "comment_mention": true,
  "review_requested": true,
  "review_completed": true,
  "team_invite": true
}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_user_preferences_push_notifications
  ON user_preferences USING gin (push_notifications);

-- ============================================================================
-- Notification push delivery tracking
-- ============================================================================

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS push_status TEXT CHECK (push_status IN ('pending', 'sent', 'failed')),
ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS push_attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS push_last_error TEXT;

UPDATE notifications
SET push_status = 'pending'
WHERE push_status IS NULL;

ALTER TABLE notifications
ALTER COLUMN push_status SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_notifications_push_status_created
  ON notifications(push_status, created_at DESC);

COMMENT ON TABLE push_subscriptions IS 'Browser Web Push subscriptions for each user/device';
COMMENT ON COLUMN notifications.push_status IS 'Push delivery state: pending | sent | failed';
COMMENT ON COLUMN user_preferences.push_notifications IS 'JSON object containing push notification preferences';

