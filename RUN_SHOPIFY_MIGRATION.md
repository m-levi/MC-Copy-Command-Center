# Run Shopify MCP Migration

## Quick Start

Run this migration in your Supabase SQL Editor to add Shopify MCP support:

### Option 1: Via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `docs/database-migrations/075_shopify_mcp_integration.sql`
5. Click **Run**

### Option 2: Via Command Line (if you have Supabase CLI)

```bash
# Make sure you're in the project directory
cd /Users/mordechailevi/Desktop/Manual\ Library/MoonCommerce/Dev\ Projects/command_center

# Run the migration
supabase db execute --file docs/database-migrations/075_shopify_mcp_integration.sql
```

### Option 3: Direct SQL

```sql
-- Copy this into Supabase SQL Editor and run:

-- 1. Add shopify_domain column
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS shopify_domain TEXT;

-- 2. Add comment
COMMENT ON COLUMN brands.shopify_domain IS 
'Shopify store domain for MCP integration. Can be myshopify.com subdomain or custom domain.';

-- 3. Auto-populate for existing brands with myshopify.com URLs
UPDATE brands
SET shopify_domain = 
  CASE 
    WHEN website_url LIKE '%myshopify.com%' THEN
      regexp_replace(
        regexp_replace(website_url, '^https?://', ''),
        '/.*$', ''
      )
    ELSE NULL
  END
WHERE shopify_domain IS NULL
  AND website_url LIKE '%myshopify.com%';

-- 4. Create view for brands with Shopify
CREATE OR REPLACE VIEW brands_with_shopify AS
SELECT 
  id,
  name,
  organization_id,
  website_url,
  shopify_domain,
  created_at,
  updated_at
FROM brands
WHERE shopify_domain IS NOT NULL;
```

## Verify Migration

After running, verify it worked:

```sql
-- Check if column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'brands' 
AND column_name = 'shopify_domain';

-- Check if any brands were auto-populated
SELECT id, name, website_url, shopify_domain 
FROM brands 
WHERE shopify_domain IS NOT NULL;

-- Check the view was created
SELECT * FROM brands_with_shopify;
```

## What This Migration Does

1. **Adds `shopify_domain` field** to the `brands` table
2. **Auto-populates** the field for any existing brands with myshopify.com URLs
3. **Creates a view** (`brands_with_shopify`) for easy querying
4. **No breaking changes** - all existing functionality continues to work

## Auto-Detection Feature

The UI now automatically detects Shopify domains:

1. When you enter a website URL containing "myshopify.com"
2. The Shopify domain field auto-fills with the extracted domain
3. The connection status is checked automatically

Example:
- **Website URL**: `https://my-cool-store.myshopify.com/`
- **Auto-fills**: `my-cool-store.myshopify.com`

## Next Steps

After running the migration:

1. ✅ Visit your brand settings
2. ✅ Enter your Shopify store domain (or it may already be there!)
3. ✅ Watch for the green checkmark confirming MCP connection
4. ✅ Test by asking the AI: "Show me products in the summer collection"

## Rollback (if needed)

If you need to undo this migration:

```sql
-- Remove the column
ALTER TABLE brands DROP COLUMN IF EXISTS shopify_domain;

-- Remove the view
DROP VIEW IF EXISTS brands_with_shopify;
```

## Troubleshooting

**Migration fails with permission error:**
- Make sure you're running it as the database owner
- Check that RLS policies allow the operation

**Column already exists error:**
- Safe to ignore - the migration uses `IF NOT EXISTS`
- Or skip to step 3 in the Direct SQL option

**Auto-population doesn't work:**
- The UPDATE query only runs for brands with myshopify.com in their URL
- You can manually set the domain in the UI for custom domains















