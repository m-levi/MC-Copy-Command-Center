-- ========================================
-- DATABASE SETUP VERIFICATION SCRIPT
-- ========================================
-- Run this in Supabase SQL Editor to verify your database is properly configured
-- ========================================

-- Check 1: Verify pgvector extension is enabled
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_extension WHERE extname = 'vector'
        )
        THEN '✓ pgvector extension is enabled'
        ELSE '✗ pgvector extension is NOT enabled - Run DATABASE_MIGRATION.sql'
    END AS pgvector_status;

-- Check 2: Verify brand_documents table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'brand_documents'
        )
        THEN '✓ brand_documents table exists'
        ELSE '✗ brand_documents table does NOT exist - Run DATABASE_MIGRATION.sql'
    END AS brand_documents_table;

-- Check 3: Verify conversation_summaries table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'conversation_summaries'
        )
        THEN '✓ conversation_summaries table exists'
        ELSE '✗ conversation_summaries table does NOT exist - Run DATABASE_MIGRATION.sql'
    END AS conversation_summaries_table;

-- Check 4: Verify match_documents function exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'match_documents'
        )
        THEN '✓ match_documents function exists'
        ELSE '✗ match_documents function does NOT exist - Run DATABASE_MIGRATION.sql'
    END AS match_documents_function;

-- Check 5: Verify messages table has metadata column
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'messages' 
            AND column_name = 'metadata'
        )
        THEN '✓ messages.metadata column exists'
        ELSE '✗ messages.metadata column does NOT exist - Run DATABASE_MIGRATION.sql'
    END AS messages_metadata;

-- Check 6: Verify messages table has edited_at column
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'messages' 
            AND column_name = 'edited_at'
        )
        THEN '✓ messages.edited_at column exists'
        ELSE '✗ messages.edited_at column does NOT exist - Run DATABASE_MIGRATION.sql'
    END AS messages_edited_at;

-- Check 7: Verify RLS is enabled on brand_documents
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'brand_documents' 
            AND rowsecurity = true
        )
        THEN '✓ RLS is enabled on brand_documents'
        ELSE '✗ RLS is NOT enabled on brand_documents - Run DATABASE_MIGRATION.sql'
    END AS brand_documents_rls;

-- Check 8: Verify RLS policies exist for brand_documents
SELECT 
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) >= 4
        THEN '✓ brand_documents has sufficient RLS policies (4+)'
        ELSE '✗ brand_documents is missing RLS policies - Run DATABASE_MIGRATION.sql'
    END AS policy_status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'brand_documents';

-- Check 9: List all existing policies for brand_documents
SELECT 
    policyname,
    cmd as operation,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_status,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'brand_documents'
ORDER BY policyname;

-- Check 10: Verify vector index exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'brand_documents' 
            AND indexname = 'brand_documents_embedding_idx'
        )
        THEN '✓ Vector similarity index exists'
        ELSE '✗ Vector similarity index does NOT exist - Run DATABASE_MIGRATION.sql'
    END AS vector_index_status;

-- ========================================
-- SUMMARY
-- ========================================
-- If all checks show ✓, your database is ready!
-- If any checks show ✗, run DATABASE_MIGRATION.sql
-- ========================================

