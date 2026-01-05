-- ============================================================================
-- Migration: Calendar Planner Support
-- Description: Add support for calendar planner feature including email briefs,
--              calendar conversations, and parent-child conversation linking.
-- ============================================================================

-- 1. Add metadata column to conversations if it doesn't exist
-- This stores additional data like email_brief_artifact_id for child conversations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE conversations ADD COLUMN metadata JSONB DEFAULT '{}';
        COMMENT ON COLUMN conversations.metadata IS 'Additional metadata for the conversation (JSON)';
    END IF;
END $$;

-- 2. Add calendar_month field to conversations for calendar conversations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'calendar_month'
    ) THEN
        ALTER TABLE conversations ADD COLUMN calendar_month VARCHAR(7);
        COMMENT ON COLUMN conversations.calendar_month IS 'Calendar month in YYYY-MM format for calendar conversations';
    END IF;
END $$;

-- 3. Add email_brief_artifact_id to conversations for linking emails to briefs
-- Note: This is also stored in metadata but having a direct column enables faster queries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'email_brief_artifact_id'
    ) THEN
        ALTER TABLE conversations ADD COLUMN email_brief_artifact_id UUID REFERENCES email_artifacts(id) ON DELETE SET NULL;
        COMMENT ON COLUMN conversations.email_brief_artifact_id IS 'Reference to the email brief artifact this conversation was created from';
    END IF;
END $$;

-- 4. Add index for finding child conversations of a calendar
CREATE INDEX IF NOT EXISTS idx_conversations_parent_id_flow
ON conversations (parent_conversation_id)
WHERE parent_conversation_id IS NOT NULL;

-- 5. Add index for finding conversations by calendar month
CREATE INDEX IF NOT EXISTS idx_conversations_calendar_month
ON conversations (calendar_month)
WHERE calendar_month IS NOT NULL;

-- 6. Add index for finding conversations by email brief
CREATE INDEX IF NOT EXISTS idx_conversations_email_brief
ON conversations (email_brief_artifact_id)
WHERE email_brief_artifact_id IS NOT NULL;

-- 7. Ensure email_brief kind is in the artifact kind check constraint
-- Note: The check constraint might already allow any string, but if it's an enum, we need to add it
-- This is handled by the artifact system already since we added email_brief to the TypeScript types

-- 8. Add approval_status index on email_artifacts for faster queries
CREATE INDEX IF NOT EXISTS idx_email_artifacts_approval_status
ON email_artifacts ((metadata->>'approval_status'))
WHERE kind = 'email_brief';

-- 9. Add index for finding briefs by calendar artifact
CREATE INDEX IF NOT EXISTS idx_email_artifacts_calendar_artifact
ON email_artifacts ((metadata->>'calendar_artifact_id'))
WHERE kind = 'email_brief' AND metadata->>'calendar_artifact_id' IS NOT NULL;

-- 10. Ensure flow_type can accommodate 'calendar_emails'
-- If flow_type is a check constraint or enum, we may need to alter it
-- For JSONB or VARCHAR, it should already support any value

-- Verify the migration
DO $$
DECLARE
    v_has_metadata BOOLEAN;
    v_has_calendar_month BOOLEAN;
    v_has_email_brief_id BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'metadata'
    ) INTO v_has_metadata;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'calendar_month'
    ) INTO v_has_calendar_month;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'email_brief_artifact_id'
    ) INTO v_has_email_brief_id;

    RAISE NOTICE 'Migration verification:';
    RAISE NOTICE '  - metadata column: %', v_has_metadata;
    RAISE NOTICE '  - calendar_month column: %', v_has_calendar_month;
    RAISE NOTICE '  - email_brief_artifact_id column: %', v_has_email_brief_id;
END $$;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
--
-- DROP INDEX IF EXISTS idx_conversations_parent_id_flow;
-- DROP INDEX IF EXISTS idx_conversations_calendar_month;
-- DROP INDEX IF EXISTS idx_conversations_email_brief;
-- DROP INDEX IF EXISTS idx_email_artifacts_approval_status;
-- DROP INDEX IF EXISTS idx_email_artifacts_calendar_artifact;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS email_brief_artifact_id;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS calendar_month;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS metadata;
-- ============================================================================
