-- ========================================
-- SHARING FEATURE VERIFICATION SCRIPT
-- ========================================
-- Run this in Supabase SQL Editor to check
-- if your database has the sharing tables
-- ========================================

-- TEST 1: Check if conversation_shares table exists
SELECT 
  '1. CONVERSATION_SHARES TABLE' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'conversation_shares'
    )
    THEN '✅ PASS - Table exists'
    ELSE '❌ FAIL - Table missing. Run migration 019_conversation_sharing.sql'
  END as status;

-- TEST 2: Check if notifications table exists
SELECT 
  '2. NOTIFICATIONS TABLE' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'notifications'
    )
    THEN '✅ PASS - Table exists'
    ELSE '❌ FAIL - Table missing. Run migration 019_conversation_sharing.sql'
  END as status;

-- TEST 3: Check if conversation_comments table exists
SELECT 
  '3. CONVERSATION_COMMENTS TABLE' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'conversation_comments'
    )
    THEN '✅ PASS - Table exists'
    ELSE '❌ FAIL - Table missing. Run migration 019_conversation_sharing.sql'
  END as status;

-- TEST 4: Check if generate_share_token function exists
SELECT 
  '4. GENERATE_SHARE_TOKEN FUNCTION' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'generate_share_token'
    )
    THEN '✅ PASS - Function exists'
    ELSE '❌ FAIL - Function missing. Run migration 019_conversation_sharing.sql'
  END as status;

-- TEST 5: Check RLS policies on conversation_shares
SELECT 
  '5. CONVERSATION_SHARES RLS POLICIES' as test_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ PASS - Policies configured'
    ELSE '⚠️ WARNING - Expected 4+ policies, found ' || COUNT(*)::text
  END as status
FROM pg_policies 
WHERE tablename = 'conversation_shares';

-- TEST 6: Show all conversation_shares policies
SELECT 
  '6. POLICY DETAILS' as test_name,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'conversation_shares'
ORDER BY policyname;

-- TEST 7: Count existing shares
SELECT 
  '7. EXISTING SHARES' as test_name,
  COUNT(*) as share_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No shares yet (normal for new setup)'
    ELSE '✅ Found ' || COUNT(*)::text || ' shares'
  END as status
FROM conversation_shares;

-- TEST 8: Check shared conversation access policies
SELECT 
  '8. SHARED ACCESS POLICIES' as test_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ PASS - Shared access policy exists'
    ELSE '❌ FAIL - Missing shared access policy. Run migration 019b_fix_shared_conversation_access.sql'
  END as status
FROM pg_policies 
WHERE tablename = 'conversations' 
AND policyname = 'Anyone can view shared conversations';

-- TEST 9: Check shared messages access policies
SELECT 
  '9. SHARED MESSAGES POLICIES' as test_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ PASS - Shared messages policy exists'
    ELSE '❌ FAIL - Missing shared messages policy. Run migration 019b_fix_shared_conversation_access.sql'
  END as status
FROM pg_policies 
WHERE tablename = 'messages' 
AND policyname = 'Anyone can view messages in shared conversations';

-- TEST 10: Show sample shares if any exist (limited to 3)
SELECT 
  '10. SAMPLE SHARES' as test_name,
  id,
  share_type,
  permission_level,
  share_token,
  created_at
FROM conversation_shares
ORDER BY created_at DESC
LIMIT 3;

