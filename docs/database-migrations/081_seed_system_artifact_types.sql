-- Migration: Seed System Artifact Types
-- Creates the default built-in artifact types that ship with the system

-- Insert system artifact types (only if they don't exist)
INSERT INTO artifact_types (kind, name, description, icon, color, field_schema, supports_variants, supports_sharing, supports_comments, supports_versioning, viewer_type, is_system, is_active, category)
VALUES 
  (
    'email',
    'Email Copy',
    'Marketing email copy with A/B/C variants for testing different approaches',
    'Mail',
    'blue',
    '[]'::jsonb,
    true,
    true,
    true,
    true,
    'email',
    true,
    true,
    'Marketing'
  ),
  (
    'flow',
    'Email Flow',
    'Automated email sequences and drip campaigns with triggers and delays',
    'GitBranch',
    'purple',
    '[
      {"name": "flow_type", "label": "Flow Type", "type": "select", "required": true, "options": ["welcome", "abandoned_cart", "post_purchase", "winback", "custom"]},
      {"name": "trigger_type", "label": "Trigger", "type": "select", "required": true, "options": ["signup", "purchase", "cart_abandon", "date", "custom"]}
    ]'::jsonb,
    false,
    true,
    true,
    true,
    'flow',
    true,
    true,
    'Automation'
  ),
  (
    'campaign',
    'Campaign Plan',
    'Full marketing campaign plans with goals, audience, and multi-channel strategy',
    'Megaphone',
    'orange',
    '[
      {"name": "campaign_type", "label": "Campaign Type", "type": "select", "required": false, "options": ["promotional", "announcement", "seasonal", "newsletter"]},
      {"name": "target_audience", "label": "Target Audience", "type": "text", "required": false},
      {"name": "goals", "label": "Campaign Goals", "type": "long_text", "required": false}
    ]'::jsonb,
    false,
    true,
    true,
    true,
    'generic',
    true,
    true,
    'Marketing'
  ),
  (
    'subject_lines',
    'Subject Lines',
    'Email subject line options with preview text for A/B testing',
    'Type',
    'cyan',
    '[
      {"name": "num_variants", "label": "Number of Variants", "type": "number", "required": false, "default": 5}
    ]'::jsonb,
    true,
    true,
    false,
    true,
    'generic',
    true,
    true,
    'Email'
  ),
  (
    'content_brief',
    'Content Brief',
    'Structured content briefs and outlines for blog posts, articles, and more',
    'FileEdit',
    'green',
    '[
      {"name": "content_type", "label": "Content Type", "type": "select", "required": false, "options": ["blog_post", "article", "guide", "case_study", "whitepaper"]},
      {"name": "target_keywords", "label": "Target Keywords", "type": "text", "required": false},
      {"name": "word_count_target", "label": "Target Word Count", "type": "number", "required": false}
    ]'::jsonb,
    false,
    true,
    true,
    true,
    'generic',
    true,
    true,
    'Content'
  ),
  (
    'template',
    'Template',
    'Reusable templates for emails, flows, and campaigns',
    'FileText',
    'slate',
    '[
      {"name": "template_type", "label": "Template Type", "type": "select", "required": true, "options": ["email", "flow", "campaign"]},
      {"name": "variables", "label": "Template Variables", "type": "text", "required": false, "description": "Comma-separated list of variable names"}
    ]'::jsonb,
    false,
    true,
    false,
    true,
    'generic',
    true,
    true,
    'Templates'
  )
ON CONFLICT (kind) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  field_schema = EXCLUDED.field_schema,
  supports_variants = EXCLUDED.supports_variants,
  supports_sharing = EXCLUDED.supports_sharing,
  supports_comments = EXCLUDED.supports_comments,
  supports_versioning = EXCLUDED.supports_versioning,
  viewer_type = EXCLUDED.viewer_type,
  is_system = EXCLUDED.is_system,
  category = EXCLUDED.category,
  updated_at = NOW();

-- Add some popular custom artifact type examples that users might want
-- These are NOT system types, they're just suggestions that we could show in UI

COMMENT ON TABLE artifact_types IS 'Stores artifact type definitions. System types are built-in, user types are created by users.';

















