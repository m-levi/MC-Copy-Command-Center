-- =====================================================
-- Migration 063: Artifact Types System
-- =====================================================
-- This migration creates the infrastructure for user-defined
-- artifact types, making the system fully extensible without
-- code changes.

-- Create artifact_types table
CREATE TABLE IF NOT EXISTS artifact_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  kind VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'FileText',
  color VARCHAR(20) DEFAULT 'blue',

  -- Schema definition (JSON Schema format)
  field_schema JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Capabilities
  supports_variants BOOLEAN DEFAULT false,
  supports_sharing BOOLEAN DEFAULT true,
  supports_comments BOOLEAN DEFAULT true,
  supports_versioning BOOLEAN DEFAULT true,

  -- Viewer configuration
  viewer_type VARCHAR(50) DEFAULT 'generic',
  viewer_config JSONB DEFAULT '{}'::jsonb,

  -- System vs User-created
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Ownership
  created_by_user_id UUID REFERENCES auth.users(id),
  organization_id UUID,

  -- Sharing
  is_public BOOLEAN DEFAULT false,

  -- Metadata
  category VARCHAR(50),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Usage stats
  usage_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS
ALTER TABLE artifact_types ENABLE ROW LEVEL SECURITY;

-- System artifact types are visible to everyone
CREATE POLICY "System artifact types are visible to all"
ON artifact_types FOR SELECT
USING (is_system = true AND is_active = true);

-- Users can see their own artifact types
CREATE POLICY "Users can view their own artifact types"
ON artifact_types FOR SELECT
USING (
  auth.uid() = created_by_user_id
  AND is_active = true
);

-- Users can see public artifact types
CREATE POLICY "Users can view public artifact types"
ON artifact_types FOR SELECT
USING (is_public = true AND is_active = true);

-- Users can create artifact types
CREATE POLICY "Users can create artifact types"
ON artifact_types FOR INSERT
WITH CHECK (auth.uid() = created_by_user_id);

-- Users can update their own artifact types
CREATE POLICY "Users can update their own artifact types"
ON artifact_types FOR UPDATE
USING (auth.uid() = created_by_user_id)
WITH CHECK (auth.uid() = created_by_user_id);

-- Users can delete their own artifact types (soft delete via is_active)
CREATE POLICY "Users can delete their own artifact types"
ON artifact_types FOR DELETE
USING (auth.uid() = created_by_user_id AND is_system = false);

-- Create indexes
CREATE INDEX idx_artifact_types_kind ON artifact_types(kind);
CREATE INDEX idx_artifact_types_active ON artifact_types(is_active);
CREATE INDEX idx_artifact_types_system ON artifact_types(is_system);
CREATE INDEX idx_artifact_types_public ON artifact_types(is_public);
CREATE INDEX idx_artifact_types_category ON artifact_types(category);
CREATE INDEX idx_artifact_types_tags ON artifact_types USING GIN(tags);
CREATE INDEX idx_artifact_types_user ON artifact_types(created_by_user_id);

-- Create updated_at trigger
CREATE TRIGGER update_artifact_types_updated_at
  BEFORE UPDATE ON artifact_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE artifact_types IS
'User-configurable artifact types - makes the system extensible without code changes';

COMMENT ON COLUMN artifact_types.kind IS
'Unique identifier for this artifact type (e.g., "email", "linkedin_post")';

COMMENT ON COLUMN artifact_types.field_schema IS
'JSON Schema defining the fields for this artifact type';

COMMENT ON COLUMN artifact_types.viewer_type IS
'Type of viewer to use: "generic" (default), "email", "flow", "custom"';

COMMENT ON COLUMN artifact_types.is_system IS
'System artifact types are built-in and cannot be deleted';

-- =====================================================
-- Seed default artifact types
-- =====================================================

INSERT INTO artifact_types (
  kind,
  name,
  description,
  icon,
  color,
  field_schema,
  supports_variants,
  supports_sharing,
  supports_comments,
  viewer_type,
  is_system,
  is_active,
  category
) VALUES
(
  'email',
  'Email Copy',
  'Email copy with A/B/C variants for testing different approaches',
  'Mail',
  'purple',
  '[
    {
      "name": "email_type",
      "label": "Email Type",
      "type": "select",
      "options": ["design", "letter", "promotional", "transactional"],
      "required": false
    },
    {
      "name": "selected_variant",
      "label": "Selected Variant",
      "type": "select",
      "options": ["a", "b", "c"],
      "default": "a",
      "required": false
    },
    {
      "name": "version_a_content",
      "label": "Version A Content",
      "type": "long_text",
      "required": false
    },
    {
      "name": "version_a_approach",
      "label": "Version A Approach",
      "type": "text",
      "required": false
    },
    {
      "name": "version_b_content",
      "label": "Version B Content",
      "type": "long_text",
      "required": false
    },
    {
      "name": "version_b_approach",
      "label": "Version B Approach",
      "type": "text",
      "required": false
    },
    {
      "name": "version_c_content",
      "label": "Version C Content",
      "type": "long_text",
      "required": false
    },
    {
      "name": "version_c_approach",
      "label": "Version C Approach",
      "type": "text",
      "required": false
    }
  ]'::jsonb,
  true,
  true,
  true,
  'email',
  true,
  true,
  'marketing'
),
(
  'flow',
  'Email Flow',
  'Email automation sequences with multiple steps and conditions',
  'GitBranch',
  'blue',
  '[
    {
      "name": "flow_type",
      "label": "Flow Type",
      "type": "select",
      "options": ["welcome", "abandoned_cart", "post_purchase", "winback", "custom"],
      "required": false
    },
    {
      "name": "trigger",
      "label": "Trigger",
      "type": "object",
      "required": false
    },
    {
      "name": "steps",
      "label": "Steps",
      "type": "array",
      "required": true
    }
  ]'::jsonb,
  false,
  true,
  true,
  'flow',
  true,
  true,
  'automation'
),
(
  'campaign',
  'Campaign Plan',
  'Full marketing campaign plans with goals, audiences, and channels',
  'Megaphone',
  'orange',
  '[
    {
      "name": "campaign_type",
      "label": "Campaign Type",
      "type": "select",
      "options": ["promotional", "announcement", "seasonal", "newsletter"],
      "required": false
    },
    {
      "name": "target_audience",
      "label": "Target Audience",
      "type": "text",
      "required": false
    },
    {
      "name": "goals",
      "label": "Goals",
      "type": "array",
      "required": false
    },
    {
      "name": "channels",
      "label": "Channels",
      "type": "multi_select",
      "options": ["email", "sms", "push"],
      "required": false
    }
  ]'::jsonb,
  false,
  true,
  true,
  'generic',
  true,
  true,
  'strategy'
),
(
  'subject_lines',
  'Subject Lines',
  'Email subject line variants for A/B testing',
  'Type',
  'green',
  '[
    {
      "name": "variants",
      "label": "Variants",
      "type": "array",
      "required": true
    },
    {
      "name": "selected_index",
      "label": "Selected Index",
      "type": "number",
      "default": 0,
      "required": false
    }
  ]'::jsonb,
  true,
  true,
  false,
  'generic',
  true,
  true,
  'marketing'
),
(
  'template',
  'Template',
  'Reusable content templates with variables',
  'FileText',
  'indigo',
  '[
    {
      "name": "template_type",
      "label": "Template Type",
      "type": "select",
      "options": ["email", "flow", "campaign"],
      "required": false
    },
    {
      "name": "variables",
      "label": "Variables",
      "type": "array",
      "required": false
    },
    {
      "name": "category",
      "label": "Category",
      "type": "text",
      "required": false
    }
  ]'::jsonb,
  false,
  true,
  false,
  'generic',
  true,
  true,
  'content'
),
(
  'content_brief',
  'Content Brief',
  'Content briefs and outlines for planning',
  'FileEdit',
  'cyan',
  '[
    {
      "name": "brief_type",
      "label": "Brief Type",
      "type": "select",
      "options": ["email", "campaign", "content"],
      "required": false
    },
    {
      "name": "objectives",
      "label": "Objectives",
      "type": "array",
      "required": false
    },
    {
      "name": "key_messages",
      "label": "Key Messages",
      "type": "array",
      "required": false
    },
    {
      "name": "target_audience",
      "label": "Target Audience",
      "type": "text",
      "required": false
    }
  ]'::jsonb,
  false,
  true,
  true,
  'generic',
  true,
  true,
  'strategy'
);

-- =====================================================
-- Update artifacts table to reference artifact_types
-- =====================================================

-- Add foreign key constraint (soft - allows unknown kinds for backwards compatibility)
ALTER TABLE artifacts
ADD CONSTRAINT fk_artifacts_kind
FOREIGN KEY (kind)
REFERENCES artifact_types(kind)
ON DELETE RESTRICT
NOT VALID;

-- Add comment
COMMENT ON CONSTRAINT fk_artifacts_kind ON artifacts IS
'Soft foreign key to artifact_types - validates kind but allows legacy kinds';
