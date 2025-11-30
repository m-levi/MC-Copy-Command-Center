-- Drop Brand Memories Table Migration
-- ====================================
-- 
-- IMPORTANT: Only run this AFTER successfully migrating data to Supermemory!
-- 
-- Prerequisites:
-- 1. Run the migration script: npx ts-node scripts/migrate-brand-memories-to-supermemory.ts
-- 2. Verify data is in Supermemory
-- 3. Test the application with Supermemory
-- 
-- This migration removes the brand_memories table that was replaced by Supermemory.

-- Step 1: Drop RLS policies first
DROP POLICY IF EXISTS "Users can view brand memories" ON brand_memories;
DROP POLICY IF EXISTS "Users can insert brand memories" ON brand_memories;
DROP POLICY IF EXISTS "Users can update brand memories" ON brand_memories;
DROP POLICY IF EXISTS "Users can delete brand memories" ON brand_memories;

-- Step 2: Drop indexes
DROP INDEX IF EXISTS idx_brand_memories_brand;
DROP INDEX IF EXISTS idx_brand_memories_category;
DROP INDEX IF EXISTS idx_brand_memories_updated;

-- Step 3: Drop the table
DROP TABLE IF EXISTS brand_memories;

-- Done! Brand memories are now managed by Supermemory.

