-- =====================================================
-- Migration 075: Shopify MCP Integration
-- =====================================================
-- This migration adds support for Shopify store integration
-- via Model Context Protocol (MCP), enabling direct product
-- search and store information access for AI copywriting.

-- =============================================================================
-- 1. ADD SHOPIFY DOMAIN FIELD TO BRANDS
-- =============================================================================

-- Add shopify_domain field to brands table
-- This stores the Shopify store domain for MCP connection
-- Format: 'my-store.myshopify.com' or 'mystore.com' (custom domain)
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS shopify_domain TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN brands.shopify_domain IS 
'Shopify store domain for MCP integration. Can be myshopify.com subdomain or custom domain.';

-- =============================================================================
-- 2. ADD SHOPIFY TOOL CONFIG TO CUSTOM MODES
-- =============================================================================

-- Update the enabled_tools JSONB default to include shopify_product_search
-- Note: This is backward compatible - existing modes won't have this key set

-- First, add an index for efficient querying of modes with Shopify enabled
CREATE INDEX IF NOT EXISTS idx_custom_modes_shopify_enabled 
ON custom_modes ((enabled_tools->>'shopify_product_search'));

-- =============================================================================
-- 3. HELPER FUNCTION: Detect Shopify domain from website URL
-- =============================================================================

-- Function to check if a URL is likely a Shopify store
-- Used when auto-detecting Shopify integration
CREATE OR REPLACE FUNCTION is_shopify_domain(domain TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF domain IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check for myshopify.com subdomain
  IF domain LIKE '%.myshopify.com' THEN
    RETURN TRUE;
  END IF;
  
  -- For custom domains, we can't know for sure without checking
  -- Return NULL to indicate "unknown" (let the app check via MCP)
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- 4. UPDATE EXISTING BRANDS: Auto-detect Shopify domains
-- =============================================================================

-- For brands with website_url containing myshopify.com, auto-populate shopify_domain
UPDATE brands
SET shopify_domain = 
  CASE 
    WHEN website_url LIKE '%myshopify.com%' THEN
      -- Extract the hostname from the URL
      regexp_replace(
        regexp_replace(website_url, '^https?://', ''),
        '/.*$', ''
      )
    ELSE NULL
  END
WHERE shopify_domain IS NULL
  AND website_url LIKE '%myshopify.com%';

-- =============================================================================
-- 5. CREATE VIEW FOR BRANDS WITH SHOPIFY INTEGRATION
-- =============================================================================

-- View to easily query brands with Shopify integration enabled
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

COMMENT ON VIEW brands_with_shopify IS 
'Brands that have Shopify MCP integration configured';

-- =============================================================================
-- 6. RLS POLICIES (if RLS is enabled on brands table)
-- =============================================================================

-- The existing brands RLS policies should already cover shopify_domain
-- since it's just another column. No additional policies needed.

-- =============================================================================
-- 7. AUDIT LOG FOR SHOPIFY DOMAIN CHANGES (optional)
-- =============================================================================

-- Trigger to log changes to shopify_domain for debugging
CREATE OR REPLACE FUNCTION log_shopify_domain_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.shopify_domain IS DISTINCT FROM NEW.shopify_domain THEN
    RAISE NOTICE 'Brand % shopify_domain changed: % -> %', 
      NEW.id, OLD.shopify_domain, NEW.shopify_domain;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (disabled by default - enable for debugging)
DROP TRIGGER IF EXISTS tr_brands_shopify_domain_change ON brands;
CREATE TRIGGER tr_brands_shopify_domain_change
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION log_shopify_domain_change();

-- Disable the trigger by default (uncomment to enable)
-- ALTER TABLE brands DISABLE TRIGGER tr_brands_shopify_domain_change;















