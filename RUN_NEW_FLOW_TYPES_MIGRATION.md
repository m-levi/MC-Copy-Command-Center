# Database Migration: Add New Flow Types

## Issue
When trying to create new flow types (Browse Abandonment, Site Abandonment, Do Your Research), the database rejects them because of a CHECK constraint that only allows the original 6 flow types.

## Solution
Run the migration to update the database constraint.

## How to Run

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `docs/database-migrations/021_add_new_flow_types.sql`
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see "✅ Migration Complete" message

### Option 2: Using Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db execute --file docs/database-migrations/021_add_new_flow_types.sql
```

### Option 3: Using psql
```bash
psql YOUR_DATABASE_CONNECTION_STRING -f docs/database-migrations/021_add_new_flow_types.sql
```

## What This Migration Does

1. **Drops the old CHECK constraint** on `flow_outlines.flow_type`
2. **Adds a new CHECK constraint** that includes all 9 flow types:
   - welcome_series
   - abandoned_cart
   - **browse_abandonment** ⭐ NEW
   - **site_abandonment** ⭐ NEW
   - post_purchase
   - winback
   - product_launch
   - educational_series
   - **do_your_research** ⭐ NEW

3. **Updates documentation** in the database comments

## Verification

After running the migration, you should be able to:
- Create flow conversations with the new types
- See all 9 flow options in the flow creation modal
- Generate flows without database errors

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Restore original constraint
ALTER TABLE flow_outlines 
DROP CONSTRAINT IF EXISTS flow_outlines_flow_type_check;

ALTER TABLE flow_outlines
ADD CONSTRAINT flow_outlines_flow_type_check
CHECK (
  flow_type IN (
    'welcome_series',
    'abandoned_cart',
    'post_purchase',
    'winback',
    'product_launch',
    'educational_series'
  )
);
```

**Note:** This will prevent using the new flow types, so only rollback if absolutely necessary.




