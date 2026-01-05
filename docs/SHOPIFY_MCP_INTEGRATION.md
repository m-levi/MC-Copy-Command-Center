# Shopify MCP Integration

## Overview

This feature enables the AI to directly access Shopify store data via Model Context Protocol (MCP), providing more accurate and structured product information compared to web search.

## How It Works

1. **MCP Endpoint**: Every Shopify store exposes an MCP endpoint at `https://{store-domain}/api/mcp`
2. **Direct Access**: The AI can search products, get pricing, check inventory, and access store policies
3. **Dynamic Loading**: Tools are loaded at runtime based on brand configuration

## Configuration

### Brand Setup

1. Navigate to **Brand Settings → Brand Details**
2. **Option A - Auto-Detect:**
   - Enter your website URL (e.g., `https://my-store.myshopify.com`)
   - Click the **"Auto-Detect"** button
   - The Shopify domain will be automatically extracted
3. **Option B - Manual Entry:**
   - Enter your Shopify store domain directly in the "Shopify Store Integration" field
4. The system will automatically verify the MCP connection

Supported domain formats:
- `your-store.myshopify.com`
- `yourdomain.com` (custom domains)

### Mode Configuration

1. Navigate to **Settings → Modes**
2. Edit any custom mode
3. Go to the **Tools** tab
4. Enable/disable "Shopify Product Search" as needed

## Available Tools

When connected, the AI has access to these Shopify tools:

| Tool | Description |
|------|-------------|
| `shopify_search_products` | Search products by keyword, price range, category |
| `shopify_get_product` | Get detailed info for a specific product |
| `shopify_get_collections` | List product collections/categories |
| `shopify_get_policies` | Access store policies (shipping, returns, etc.) |

## Benefits Over Web Search

- **More Accurate**: Direct access to real-time product data
- **Structured Data**: Prices, variants, inventory as structured data
- **Faster**: No need to parse web pages
- **Reliable**: No risk of finding outdated cached data

## Database Changes

Migration `075_shopify_mcp_integration.sql` adds:

```sql
-- Shopify domain field on brands
ALTER TABLE brands
ADD COLUMN shopify_domain TEXT;
```

## Files Changed

### New Files
- `lib/tools/shopify-mcp-tool.ts` - MCP client and tool management
- `app/api/shopify/check-mcp/route.ts` - Connection verification API
- `docs/database-migrations/075_shopify_mcp_integration.sql` - Database migration

### Modified Files
- `types/index.ts` - Added `shopify_domain` to Brand, `shopify_product_search` to ModeToolConfig
- `lib/tools/index.ts` - Exported Shopify tools, added `getToolsForModeWithShopify`
- `lib/chat/types.ts` - Added `shopify_domain` to BrandContextSchema
- `lib/chat/mode-config.ts` - Added Shopify tool to ToolConfig conversion
- `lib/prompts/root-system-prompt.ts` - Added Shopify tool documentation
- `app/api/chat/route.ts` - Integrated Shopify tools into chat flow
- `components/BrandDetailsTab.tsx` - Added Shopify domain input with connection status
- `components/modes/ModeEditor.tsx` - Added Tools tab for configuring tool availability

## Usage Example

When a brand has Shopify configured, the AI can:

```
User: "Write an email featuring our red dresses under $100"

AI: *Uses shopify_search_products to find matching products*
    *Returns accurate product names, prices, and descriptions*
    *Creates email copy with correct product details*
```

## Fallback Behavior

If MCP connection fails, the AI will:
1. Log a warning
2. Continue without Shopify tools
3. Fall back to web search if enabled

## Troubleshooting

### MCP Connection Shows "Error"

1. Verify the domain is correct
2. Check if the store is on a Shopify plan that supports MCP
3. Ensure the store hasn't blocked MCP access

### Tools Not Appearing

1. Confirm `shopify_product_search` is enabled in the mode
2. Check that the brand has a valid `shopify_domain` set
3. Review server logs for connection errors

## Future Enhancements

- [ ] Support for Shopify Admin API for more data access
- [ ] Cart operations (add to cart, checkout links)
- [ ] Inventory alerts in email copy
- [ ] Product recommendation engine integration

