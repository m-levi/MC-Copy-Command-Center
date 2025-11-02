# Quick Fix - Brands Query Error

## Error
```
Could not find a relationship between 'brands' and 'profiles' in the schema cache
```

## Cause
The frontend was trying to use Supabase's relationship syntax to join `brands` with `profiles`:
```typescript
.select(`
  *,
  creator:profiles!brands_created_by_fkey(full_name, email)
`)
```

But there's no foreign key constraint between `brands.created_by` and `profiles.user_id`, so Supabase doesn't know about this relationship.

## Fix Applied ✅

Simplified the query to just fetch brands without creator info:

```typescript
// Before (BROKEN)
const { data, error } = await supabase
  .from('brands')
  .select(`
    *,
    creator:profiles!brands_created_by_fkey(full_name, email)
  `)
  .eq('organization_id', org.id)
  .order('created_at', { ascending: false });

// After (FIXED)
const { data, error } = await supabase
  .from('brands')
  .select('*')
  .eq('organization_id', org.id)
  .order('created_at', { ascending: false });
```

## Impact

- ✅ Brand page loads successfully
- ✅ All brands display correctly
- ℹ️ Creator info not shown on brand cards (wasn't being used in UI anyway)

## Alternative Solution (If Creator Info Needed)

If you need to show who created each brand, you could:

1. **Add foreign key constraint** (requires migration):
```sql
ALTER TABLE brands
ADD CONSTRAINT brands_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES profiles(user_id) 
ON DELETE SET NULL;
```

2. **Or fetch creator info separately** (client-side):
```typescript
const brandsWithCreators = await Promise.all(
  brands.map(async (brand) => {
    if (brand.created_by) {
      const { data: creator } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', brand.created_by)
        .single();
      return { ...brand, creator };
    }
    return brand;
  })
);
```

But this would bring back the N+1 query problem we just fixed! So the foreign key constraint is the better approach.

## Status
✅ Fixed - Brand page should load now

