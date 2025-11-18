-- Add share_content column to conversation_shares table
-- Allows users to choose between sharing last email only or full conversation

ALTER TABLE conversation_shares 
ADD COLUMN IF NOT EXISTS share_content VARCHAR(20) DEFAULT 'full_conversation'
CHECK (share_content IN ('last_email', 'full_conversation'));

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_conversation_shares_content 
ON conversation_shares(share_content);

-- Add comment
COMMENT ON COLUMN conversation_shares.share_content IS 
'What content to share: last_email (final AI output only) or full_conversation (all messages)';


