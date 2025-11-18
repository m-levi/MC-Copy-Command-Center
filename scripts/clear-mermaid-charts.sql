-- Clear all existing Mermaid charts so they will be regenerated on next view
-- This forces the system to use the new fixed mermaid-generator.ts code

-- Clear all mermaid charts
UPDATE flow_outlines 
SET mermaid_chart = NULL;

-- Show what was cleared
SELECT 
  COUNT(*) as cleared_count,
  'Mermaid charts cleared - they will be regenerated on next view' as message
FROM flow_outlines
WHERE mermaid_chart IS NULL;

