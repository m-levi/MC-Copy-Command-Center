-- Migration: Add mermaid_chart column to flow_outlines table
-- Date: 2025-01-XX
-- Description: Adds column to store auto-generated Mermaid flowchart syntax for flow visualization

-- Step 1: Add mermaid_chart column to flow_outlines table
ALTER TABLE flow_outlines 
ADD COLUMN IF NOT EXISTS mermaid_chart TEXT;

-- Step 2: Add comment for documentation
COMMENT ON COLUMN flow_outlines.mermaid_chart IS 
'Auto-generated Mermaid flowchart syntax describing the email flow sequence. Generated automatically when outline is created or updated.';

-- Step 3: Verify the changes
SELECT 
  '✅ Migration Complete' as status,
  'Added mermaid_chart column to flow_outlines table' as details;

