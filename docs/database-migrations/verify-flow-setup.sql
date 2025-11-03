-- ========================================
-- FLOW FEATURE DIAGNOSTIC SCRIPT
-- ========================================
-- Run this in Supabase SQL Editor to check
-- if your database is properly set up for flows
-- ========================================

-- TEST 1: Check if flow columns exist
SELECT 
  '1. FLOW COLUMNS CHECK' as test_name,
  COUNT(*) as columns_found,
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ PASS - All columns exist'
    WHEN COUNT(*) = 0 THEN '❌ FAIL - No columns found. Run FLOW_DATABASE_MIGRATION.sql'
    ELSE '⚠️ PARTIAL - Some columns missing. Re-run migration.'
  END as status
FROM information_schema.columns 
WHERE table_name = 'conversations' 
AND column_name IN ('is_flow', 'parent_conversation_id', 'flow_type', 'flow_sequence_order', 'flow_email_title');

-- TEST 2: Show column details
SELECT 
  '2. COLUMN DETAILS' as test_name,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'conversations' 
AND column_name IN ('is_flow', 'parent_conversation_id', 'flow_type', 'flow_sequence_order', 'flow_email_title')
ORDER BY column_name;

-- TEST 3: Check if flow_outlines table exists
SELECT 
  '3. FLOW_OUTLINES TABLE' as test_name,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'flow_outlines')
    THEN '✅ PASS - Table exists'
    ELSE '❌ FAIL - Table missing. Run migration.'
  END as status;

-- TEST 4: Check indexes
SELECT 
  '4. FLOW INDEXES' as test_name,
  COUNT(*) as indexes_found,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS - Indexes created'
    ELSE '⚠️ WARNING - Expected 3+ indexes, found ' || COUNT(*)::text
  END as status
FROM pg_indexes 
WHERE tablename = 'conversations' 
AND indexname LIKE '%flow%';

-- TEST 5: Show index details
SELECT 
  '5. INDEX DETAILS' as test_name,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'conversations' 
AND indexname LIKE '%flow%'
ORDER BY indexname;

-- TEST 6: Check RLS on flow_outlines
SELECT 
  '6. RLS ON FLOW_OUTLINES' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM pg_tables 
      WHERE tablename = 'flow_outlines' 
      AND rowsecurity = true
    )
    THEN '✅ PASS - RLS enabled'
    WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'flow_outlines')
    THEN '⚠️ WARNING - Table exists but RLS not enabled'
    ELSE '❌ FAIL - Table does not exist'
  END as status;

-- TEST 7: Check if helper function exists
SELECT 
  '7. HELPER FUNCTION' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM pg_proc 
      WHERE proname = 'get_flow_children'
    )
    THEN '✅ PASS - Function exists'
    ELSE '⚠️ WARNING - Helper function missing (optional)'
  END as status;

-- TEST 8: Count existing flow conversations
SELECT 
  '8. EXISTING FLOWS' as test_name,
  COUNT(*) as flow_count,
  CASE 
    WHEN COUNT(*) > 0 THEN 'Found ' || COUNT(*)::text || ' flow conversation(s)'
    ELSE 'No flows created yet'
  END as status
FROM conversations 
WHERE is_flow = true;

-- TEST 9: Count flow children
SELECT 
  '9. FLOW CHILDREN' as test_name,
  COUNT(*) as child_count,
  CASE 
    WHEN COUNT(*) > 0 THEN 'Found ' || COUNT(*)::text || ' child email(s)'
    ELSE 'No flow children created yet'
  END as status
FROM conversations 
WHERE parent_conversation_id IS NOT NULL;

-- TEST 10: Show any existing flows
SELECT 
  '10. FLOW DETAILS' as test_name,
  id,
  title,
  is_flow,
  flow_type,
  created_at
FROM conversations 
WHERE is_flow = true
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- RESULTS INTERPRETATION
-- ========================================
-- 
-- ✅ ALL PASS → Database is ready, issue is elsewhere
-- ❌ ANY FAIL → Run FLOW_DATABASE_MIGRATION.sql
-- ⚠️ WARNINGS → Run migration again (idempotent)
--
-- Next Steps:
-- 1. If Test 1 shows 0 columns → RUN MIGRATION
-- 2. If Test 1 shows 5 columns → Check application code
-- 3. If Test 8 shows flows exist → Test accordion in UI
-- ========================================

