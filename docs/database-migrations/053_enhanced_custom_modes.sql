-- =============================================================================
-- Enhanced Custom Modes Migration
-- Adds configuration options for tools, context sources, output, and sharing
-- BACKWARD COMPATIBLE: All new columns have defaults, existing modes continue to work
-- =============================================================================

-- =============================================================================
-- 1. ADD NEW COLUMNS TO CUSTOM_MODES (all with defaults for backward compatibility)
-- =============================================================================

-- Base mode determines core behavior pattern
ALTER TABLE custom_modes 
ADD COLUMN IF NOT EXISTS base_mode VARCHAR(20) DEFAULT 'create'
CHECK (base_mode IN ('chat', 'create', 'analyze'));

-- Tool configuration (what the AI can do in this mode)
ALTER TABLE custom_modes 
ADD COLUMN IF NOT EXISTS tools JSONB DEFAULT '{
  "web_search": true,
  "memory": true,
  "product_search": true,
  "image_generation": false,
  "code_execution": false
}'::jsonb;

-- Context sources (what information to include)
ALTER TABLE custom_modes 
ADD COLUMN IF NOT EXISTS context_sources JSONB DEFAULT '{
  "brand_voice": true,
  "brand_details": true,
  "product_catalog": false,
  "past_emails": false,
  "web_research": false,
  "custom_documents": []
}'::jsonb;

-- Output configuration
ALTER TABLE custom_modes 
ADD COLUMN IF NOT EXISTS output_config JSONB DEFAULT '{
  "type": "freeform",
  "email_format": null,
  "show_thinking": false,
  "version_count": 1
}'::jsonb;

-- Model preferences
ALTER TABLE custom_modes 
ADD COLUMN IF NOT EXISTS model_config JSONB DEFAULT '{
  "preferred": null,
  "allow_override": true,
  "temperature": null
}'::jsonb;

-- Organization and categorization
ALTER TABLE custom_modes 
ADD COLUMN IF NOT EXISTS category VARCHAR(50);

ALTER TABLE custom_modes 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Sharing and templates
ALTER TABLE custom_modes 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

ALTER TABLE custom_modes 
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

ALTER TABLE custom_modes 
ADD COLUMN IF NOT EXISTS parent_mode_id UUID REFERENCES custom_modes(id) ON DELETE SET NULL;

ALTER TABLE custom_modes 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Usage tracking
ALTER TABLE custom_modes 
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

ALTER TABLE custom_modes 
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- =============================================================================
-- 2. CREATE MODE TEMPLATES TABLE (for shared/public templates)
-- =============================================================================

CREATE TABLE IF NOT EXISTS mode_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identity
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT '💬',
  color VARCHAR(20) DEFAULT 'blue',
  category VARCHAR(50),
  tags TEXT[] DEFAULT '{}',
  
  -- Template content (same structure as custom_modes)
  system_prompt TEXT NOT NULL,
  base_mode VARCHAR(20) DEFAULT 'create',
  tools JSONB DEFAULT '{}'::jsonb,
  context_sources JSONB DEFAULT '{}'::jsonb,
  output_config JSONB DEFAULT '{}'::jsonb,
  model_config JSONB DEFAULT '{}'::jsonb,
  
  -- Template metadata
  is_official BOOLEAN DEFAULT false,  -- Created by system/admins
  is_public BOOLEAN DEFAULT true,     -- Visible to all users
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID,               -- If org-specific
  
  -- Stats
  use_count INTEGER DEFAULT 0,
  rating_sum INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mode_templates_category ON mode_templates(category);
CREATE INDEX IF NOT EXISTS idx_mode_templates_public ON mode_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_mode_templates_official ON mode_templates(is_official) WHERE is_official = true;
CREATE INDEX IF NOT EXISTS idx_mode_templates_org ON mode_templates(organization_id) WHERE organization_id IS NOT NULL;

-- =============================================================================
-- 3. CREATE MODE DOCUMENTS TABLE (for custom document context)
-- =============================================================================

CREATE TABLE IF NOT EXISTS mode_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_id UUID REFERENCES custom_modes(id) ON DELETE CASCADE NOT NULL,
  
  -- Document info
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(50) DEFAULT 'text',  -- 'text', 'markdown', 'json'
  
  -- Metadata
  file_size INTEGER,
  word_count INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mode_documents_mode ON mode_documents(mode_id);

-- =============================================================================
-- 4. UPDATE MODE_VERSIONS TO TRACK ALL CONFIG CHANGES
-- =============================================================================

ALTER TABLE mode_versions
ADD COLUMN IF NOT EXISTS tools JSONB;

ALTER TABLE mode_versions
ADD COLUMN IF NOT EXISTS context_sources JSONB;

ALTER TABLE mode_versions
ADD COLUMN IF NOT EXISTS output_config JSONB;

ALTER TABLE mode_versions
ADD COLUMN IF NOT EXISTS model_config JSONB;

-- =============================================================================
-- 5. ADD NEW INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_custom_modes_category ON custom_modes(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_modes_shared ON custom_modes(is_shared) WHERE is_shared = true;
CREATE INDEX IF NOT EXISTS idx_custom_modes_template ON custom_modes(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_custom_modes_org ON custom_modes(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_modes_parent ON custom_modes(parent_mode_id) WHERE parent_mode_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_modes_usage ON custom_modes(usage_count DESC);

-- GIN index for searching tags
CREATE INDEX IF NOT EXISTS idx_custom_modes_tags ON custom_modes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_mode_templates_tags ON mode_templates USING GIN(tags);

-- =============================================================================
-- 6. UPDATE RLS POLICIES FOR SHARING
-- =============================================================================

-- Allow viewing shared modes from any user
DROP POLICY IF EXISTS "Users can view shared modes" ON custom_modes;
CREATE POLICY "Users can view shared modes"
  ON custom_modes FOR SELECT
  USING (is_shared = true OR auth.uid() = user_id);

-- Mode templates RLS
ALTER TABLE mode_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public templates"
  ON mode_templates FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own templates"
  ON mode_templates FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own templates"
  ON mode_templates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates"
  ON mode_templates FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates"
  ON mode_templates FOR DELETE
  USING (auth.uid() = created_by);

-- Mode documents RLS (access through mode ownership)
CREATE POLICY "Users can manage documents for their modes"
  ON mode_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM custom_modes
      WHERE custom_modes.id = mode_documents.mode_id
      AND custom_modes.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 7. HELPER FUNCTIONS
-- =============================================================================

-- Increment usage count
CREATE OR REPLACE FUNCTION increment_mode_usage(p_mode_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE custom_modes
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = p_mode_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clone a mode (for "use template" functionality)
CREATE OR REPLACE FUNCTION clone_mode(
  p_source_mode_id UUID,
  p_new_name VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  INSERT INTO custom_modes (
    user_id, name, description, icon, color, system_prompt,
    base_mode, tools, context_sources, output_config, model_config,
    category, tags, parent_mode_id, is_active
  )
  SELECT 
    v_user_id,
    COALESCE(p_new_name, name || ' (Copy)'),
    description,
    icon,
    color,
    system_prompt,
    base_mode,
    tools,
    context_sources,
    output_config,
    model_config,
    category,
    tags,
    p_source_mode_id,
    true
  FROM custom_modes
  WHERE id = p_source_mode_id
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clone from template
CREATE OR REPLACE FUNCTION use_mode_template(
  p_template_id UUID,
  p_new_name VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Increment template usage
  UPDATE mode_templates SET use_count = use_count + 1 WHERE id = p_template_id;
  
  INSERT INTO custom_modes (
    user_id, name, description, icon, color, system_prompt,
    base_mode, tools, context_sources, output_config, model_config,
    category, tags, is_active
  )
  SELECT 
    v_user_id,
    COALESCE(p_new_name, name),
    description,
    icon,
    color,
    system_prompt,
    base_mode,
    tools,
    context_sources,
    output_config,
    model_config,
    category,
    tags,
    true
  FROM mode_templates
  WHERE id = p_template_id
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 8. GRANT PERMISSIONS
-- =============================================================================

GRANT ALL ON mode_templates TO authenticated;
GRANT ALL ON mode_documents TO authenticated;
GRANT EXECUTE ON FUNCTION increment_mode_usage TO authenticated;
GRANT EXECUTE ON FUNCTION clone_mode TO authenticated;
GRANT EXECUTE ON FUNCTION use_mode_template TO authenticated;

-- =============================================================================
-- 9. INSERT DEFAULT TEMPLATES
-- =============================================================================

INSERT INTO mode_templates (name, description, icon, color, category, system_prompt, base_mode, tools, context_sources, output_config, is_official, is_public)
VALUES 
  (
    'Email Copywriter',
    'Professional email copywriter that generates multiple versions with different approaches',
    '✍️',
    'purple',
    'email',
    'You are a senior email copywriter. You write compelling, brand-aligned email copy that converts. Always provide 3 versions with different angles.',
    'create',
    '{"web_search": true, "memory": true, "product_search": true, "image_generation": false, "code_execution": false}',
    '{"brand_voice": true, "brand_details": true, "product_catalog": true, "past_emails": true, "web_research": false, "custom_documents": []}',
    '{"type": "email", "email_format": "design", "show_thinking": false, "version_count": 3}',
    true,
    true
  ),
  (
    'Research Assistant',
    'Helps research topics, competitors, and trends for your brand',
    '🔍',
    'blue',
    'research',
    'You are a research assistant. You help gather and synthesize information about topics, competitors, and market trends. Be thorough and cite sources.',
    'analyze',
    '{"web_search": true, "memory": true, "product_search": false, "image_generation": false, "code_execution": false}',
    '{"brand_voice": false, "brand_details": true, "product_catalog": false, "past_emails": false, "web_research": true, "custom_documents": []}',
    '{"type": "analysis", "email_format": null, "show_thinking": true, "version_count": 1}',
    true,
    true
  ),
  (
    'Brand Voice Coach',
    'Helps refine and maintain consistent brand voice across all communications',
    '🎯',
    'green',
    'brand',
    'You are a brand voice coach. You help ensure all communications align with the brand voice. Provide feedback on tone, language, and messaging consistency.',
    'chat',
    '{"web_search": false, "memory": true, "product_search": false, "image_generation": false, "code_execution": false}',
    '{"brand_voice": true, "brand_details": true, "product_catalog": false, "past_emails": true, "web_research": false, "custom_documents": []}',
    '{"type": "freeform", "email_format": null, "show_thinking": false, "version_count": 1}',
    true,
    true
  ),
  (
    'Subject Line Generator',
    'Generates compelling email subject lines optimized for open rates',
    '📧',
    'orange',
    'email',
    'You are a subject line specialist. Generate 10 compelling subject lines for any email campaign. Consider curiosity, urgency, personalization, and brand voice.',
    'create',
    '{"web_search": false, "memory": true, "product_search": false, "image_generation": false, "code_execution": false}',
    '{"brand_voice": true, "brand_details": true, "product_catalog": false, "past_emails": true, "web_research": false, "custom_documents": []}',
    '{"type": "structured", "email_format": null, "show_thinking": false, "version_count": 10}',
    true,
    true
  ),
  (
    'Campaign Planner',
    'Strategic campaign planning and scheduling assistant',
    '📅',
    'indigo',
    'strategy',
    'You are a campaign planning strategist. Help plan email campaigns with timing, audience targeting, and content themes. Consider seasonality and brand calendar.',
    'analyze',
    '{"web_search": true, "memory": true, "product_search": true, "image_generation": false, "code_execution": false}',
    '{"brand_voice": true, "brand_details": true, "product_catalog": true, "past_emails": true, "web_research": true, "custom_documents": []}',
    '{"type": "analysis", "email_format": null, "show_thinking": true, "version_count": 1}',
    true,
    true
  ),
  (
    'Product Description Writer',
    'Writes compelling product descriptions and features',
    '🛍️',
    'pink',
    'product',
    'You are a product copywriter. Write compelling product descriptions that highlight benefits, features, and emotional appeal. Match the brand voice.',
    'create',
    '{"web_search": false, "memory": true, "product_search": true, "image_generation": false, "code_execution": false}',
    '{"brand_voice": true, "brand_details": true, "product_catalog": true, "past_emails": false, "web_research": false, "custom_documents": []}',
    '{"type": "structured", "email_format": null, "show_thinking": false, "version_count": 3}',
    true,
    true
  )
ON CONFLICT DO NOTHING;

