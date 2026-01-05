-- =====================================================
-- Migration 062: Enhanced Custom Modes - Tool Configuration
-- =====================================================
-- This migration adds tool configuration and artifact type
-- preferences to custom modes, making them more flexible
-- and explicit about their capabilities.

-- Add tool configuration to custom modes
ALTER TABLE custom_modes
ADD COLUMN IF NOT EXISTS enabled_tools JSONB DEFAULT '{
  "create_artifact": {
    "enabled": true,
    "allowed_kinds": null
  },
  "create_conversation": {
    "enabled": true
  },
  "create_bulk_conversations": {
    "enabled": false
  },
  "suggest_action": {
    "enabled": true
  },
  "web_search": {
    "enabled": false,
    "allowed_domains": [],
    "max_uses": 5
  },
  "save_memory": {
    "enabled": true
  }
}'::jsonb;

-- Add primary artifact types that this mode typically creates
ALTER TABLE custom_modes
ADD COLUMN IF NOT EXISTS primary_artifact_types TEXT[] DEFAULT ARRAY['email'];

-- Add comments
COMMENT ON COLUMN custom_modes.enabled_tools IS
'Tool configuration for this mode - controls which tools are available and their settings';

COMMENT ON COLUMN custom_modes.primary_artifact_types IS
'Primary artifact types this mode creates - used for dynamic prompt injection';

-- Update existing custom modes with sensible defaults
UPDATE custom_modes
SET enabled_tools = '{
  "create_artifact": {
    "enabled": true,
    "allowed_kinds": null
  },
  "create_conversation": {
    "enabled": true
  },
  "create_bulk_conversations": {
    "enabled": false
  },
  "suggest_action": {
    "enabled": true
  },
  "web_search": {
    "enabled": false,
    "allowed_domains": [],
    "max_uses": 5
  },
  "save_memory": {
    "enabled": true
  }
}'::jsonb
WHERE enabled_tools IS NULL;

UPDATE custom_modes
SET primary_artifact_types = ARRAY['email']
WHERE primary_artifact_types IS NULL;

-- Create index for querying by artifact types
CREATE INDEX IF NOT EXISTS idx_custom_modes_artifact_types
ON custom_modes USING GIN (primary_artifact_types);
