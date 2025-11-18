-- Migration: Add new flow types to database constraints
-- Date: 2025-11-14
-- Description: Adds browse_abandonment, site_abandonment, and do_your_research flow types

-- Step 1: Update the CHECK constraint on flow_outlines table
-- First, drop the old constraint
ALTER TABLE flow_outlines 
DROP CONSTRAINT IF EXISTS flow_outlines_flow_type_check;

-- Add the new constraint with all flow types
ALTER TABLE flow_outlines
ADD CONSTRAINT flow_outlines_flow_type_check
CHECK (
  flow_type IN (
    'welcome_series',
    'abandoned_cart',
    'browse_abandonment',
    'site_abandonment',
    'post_purchase',
    'winback',
    'product_launch',
    'educational_series',
    'do_your_research'
  )
);

-- Step 2: Update the CHECK constraint on conversations table
-- Drop the old constraint
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS valid_flow_type;

-- Add the new constraint with all 9 flow types
ALTER TABLE conversations
ADD CONSTRAINT valid_flow_type
CHECK (
  flow_type IS NULL OR 
  flow_type IN (
    'welcome_series',
    'abandoned_cart',
    'browse_abandonment',
    'site_abandonment',
    'post_purchase',
    'winback',
    'product_launch',
    'educational_series',
    'do_your_research'
  )
);

-- Step 3: Update comment for documentation
COMMENT ON COLUMN conversations.flow_type IS 'Type of flow: welcome_series, abandoned_cart, browse_abandonment, site_abandonment, post_purchase, winback, product_launch, educational_series, do_your_research';

-- Step 4: Verify the changes
SELECT 
  '✅ Migration Complete' as status,
  'Added 3 new flow types: browse_abandonment, site_abandonment, do_your_research' as details;

-- Step 5: Show all valid flow types
SELECT 
  'Valid Flow Types:' as info,
  unnest(ARRAY[
    'welcome_series',
    'abandoned_cart', 
    'browse_abandonment',
    'site_abandonment',
    'post_purchase',
    'winback',
    'product_launch',
    'educational_series',
    'do_your_research'
  ]) as flow_type;

