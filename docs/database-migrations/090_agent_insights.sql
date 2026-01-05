-- Marketing Agent Insights System
-- Tables for agent settings, insight tracking, and scheduling

-- ============================================================================
-- Agent Settings Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Enable/disable features
  daily_enabled BOOLEAN DEFAULT true,
  weekly_enabled BOOLEAN DEFAULT true,
  
  -- Scheduling preferences
  preferred_hour INTEGER DEFAULT 9 CHECK (preferred_hour >= 0 AND preferred_hour < 24),
  timezone TEXT DEFAULT 'America/New_York',
  
  -- Analysis configuration
  topics TEXT[] DEFAULT ARRAY['campaigns', 'strategies', 'trends', 'competitor'],
  
  -- Notification preferences
  email_digest BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One settings record per brand-user combination
  UNIQUE(brand_id, user_id)
);

-- Index for efficient lookups
CREATE INDEX idx_agent_settings_brand ON brand_agent_settings(brand_id);
CREATE INDEX idx_agent_settings_enabled ON brand_agent_settings(brand_id, user_id) 
  WHERE daily_enabled = true OR weekly_enabled = true;

-- ============================================================================
-- Agent Insights Tracking Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  
  -- Insight metadata
  insight_type TEXT NOT NULL CHECK (insight_type IN ('daily', 'weekly', 'manual')),
  trigger_source TEXT DEFAULT 'cron' CHECK (trigger_source IN ('cron', 'manual', 'api')),
  
  -- Data analysis tracking
  data_analyzed JSONB DEFAULT '{}'::jsonb,
  -- Example: {"documents": 15, "conversations": 8, "memories": 5, "webSearches": 3}
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error_message TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Performance metrics
  processing_duration_ms INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN completed_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
      ELSE NULL
    END
  ) STORED
);

-- Indexes for performance
CREATE INDEX idx_agent_insights_brand ON agent_insights(brand_id);
CREATE INDEX idx_agent_insights_conversation ON agent_insights(conversation_id);
CREATE INDEX idx_agent_insights_type_status ON agent_insights(insight_type, status);
CREATE INDEX idx_agent_insights_created ON agent_insights(started_at DESC);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Agent Settings RLS
ALTER TABLE brand_agent_settings ENABLE ROW LEVEL SECURITY;

-- Users can view settings for brands they have access to
CREATE POLICY "Users can view settings for their brands"
  ON brand_agent_settings
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = brand_agent_settings.brand_id
      AND (brands.user_id = auth.uid() OR brands.organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      ))
    )
  );

-- Users can update their own settings
CREATE POLICY "Users can update their own agent settings"
  ON brand_agent_settings
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can insert their own settings
CREATE POLICY "Users can create their own agent settings"
  ON brand_agent_settings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own settings
CREATE POLICY "Users can delete their own agent settings"
  ON brand_agent_settings
  FOR DELETE
  USING (user_id = auth.uid());

-- Agent Insights RLS
ALTER TABLE agent_insights ENABLE ROW LEVEL SECURITY;

-- Users can view insights for brands they have access to
CREATE POLICY "Users can view insights for their brands"
  ON agent_insights
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = agent_insights.brand_id
      AND (brands.user_id = auth.uid() OR brands.organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      ))
    )
  );

-- Service role can manage all insights (for cron jobs)
CREATE POLICY "Service role can manage insights"
  ON agent_insights
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_agent_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS agent_settings_updated_at_trigger ON brand_agent_settings;
CREATE TRIGGER agent_settings_updated_at_trigger
  BEFORE UPDATE ON brand_agent_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_settings_updated_at();

-- Function to get brands with enabled agents (for cron jobs)
CREATE OR REPLACE FUNCTION get_brands_with_enabled_agents(
  insight_type_filter TEXT DEFAULT 'daily'
)
RETURNS TABLE (
  brand_id UUID,
  user_id UUID,
  brand_name TEXT,
  user_email TEXT,
  settings_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id AS brand_id,
    bas.user_id,
    b.name AS brand_name,
    p.email AS user_email,
    bas.id AS settings_id
  FROM brand_agent_settings bas
  JOIN brands b ON b.id = bas.brand_id
  JOIN profiles p ON p.user_id = bas.user_id
  WHERE 
    (insight_type_filter = 'daily' AND bas.daily_enabled = true) OR
    (insight_type_filter = 'weekly' AND bas.weekly_enabled = true)
  ORDER BY b.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE brand_agent_settings IS 'Configuration for marketing agent per brand and user';
COMMENT ON TABLE agent_insights IS 'Tracking table for generated insights and their metadata';
COMMENT ON FUNCTION get_brands_with_enabled_agents IS 'Helper function for cron jobs to get brands with enabled agents';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant appropriate permissions for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON brand_agent_settings TO authenticated;
GRANT SELECT ON agent_insights TO authenticated;

-- Grant full access to service role (for Edge Function)
GRANT ALL ON brand_agent_settings TO service_role;
GRANT ALL ON agent_insights TO service_role;















