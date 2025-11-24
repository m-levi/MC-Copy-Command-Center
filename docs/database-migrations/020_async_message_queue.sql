-- Async message queue migration
-- Adds message status tracking and job queue for background processing

-- Create message status enum
DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('queued', 'processing', 'streaming', 'completed', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add status tracking columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status message_status DEFAULT 'completed';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS queued_at TIMESTAMP;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS processing_duration_ms INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Update existing messages to have 'completed' status
UPDATE messages SET status = 'completed' WHERE status IS NULL;

-- Message jobs table (for queue persistence)
CREATE TABLE IF NOT EXISTS message_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status message_status DEFAULT 'queued',
  priority INTEGER DEFAULT 0,  -- Higher = more important
  payload JSONB NOT NULL,  -- Message content, model, brand context, etc.
  result JSONB,  -- AI response (partial or complete)
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_jobs_status ON message_jobs(status);
CREATE INDEX IF NOT EXISTS idx_message_jobs_user ON message_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_message_jobs_created ON message_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_message_jobs_priority ON message_jobs(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_message_jobs_conversation ON message_jobs(conversation_id);

-- Index for finding jobs ready to process (queued, ordered by priority)
CREATE INDEX IF NOT EXISTS idx_message_jobs_ready ON message_jobs(status, priority DESC, created_at ASC)
  WHERE status IN ('queued', 'failed');

-- Index for messages by status
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_status ON messages(conversation_id, status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_message_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS message_jobs_updated_at_trigger ON message_jobs;
CREATE TRIGGER message_jobs_updated_at_trigger
  BEFORE UPDATE ON message_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_message_jobs_updated_at();

-- Function to get next job from queue (for workers)
CREATE OR REPLACE FUNCTION get_next_job(max_concurrent INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  message_id UUID,
  conversation_id UUID,
  user_id UUID,
  payload JSONB,
  priority INTEGER
) AS $$
DECLARE
  job_record RECORD;
BEGIN
  -- Lock and get the next queued job, ordered by priority and creation time
  SELECT j.* INTO job_record
  FROM message_jobs j
  WHERE j.status = 'queued'
    AND (
      -- Check if user has less than max_concurrent processing jobs
      (
        SELECT COUNT(*)
        FROM message_jobs j2
        WHERE j2.user_id = j.user_id
        AND j2.status IN ('processing', 'streaming')
      ) < max_concurrent
    )
  ORDER BY j.priority DESC, j.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF job_record IS NULL THEN
    RETURN;
  END IF;

  -- Update job status to processing
  UPDATE message_jobs
  SET status = 'processing', started_at = NOW()
  WHERE id = job_record.id;

  -- Return the job
  RETURN QUERY
  SELECT 
    job_record.id,
    job_record.message_id,
    job_record.conversation_id,
    job_record.user_id,
    job_record.payload,
    job_record.priority;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark job as completed
CREATE OR REPLACE FUNCTION complete_job(
  job_id UUID,
  result_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE message_jobs
  SET 
    status = 'completed',
    result = result_data,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = job_id;

  -- Update message status
  UPDATE messages
  SET 
    status = 'completed',
    processing_completed_at = NOW(),
    processing_duration_ms = EXTRACT(EPOCH FROM (NOW() - processing_started_at)) * 1000
  WHERE id = (SELECT message_id FROM message_jobs WHERE id = job_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark job as failed
CREATE OR REPLACE FUNCTION fail_job(
  job_id UUID,
  error_text TEXT,
  should_retry BOOLEAN DEFAULT TRUE
)
RETURNS VOID AS $$
DECLARE
  current_retry_count INTEGER;
  max_retries_count INTEGER;
BEGIN
  SELECT retry_count, max_retries INTO current_retry_count, max_retries_count
  FROM message_jobs
  WHERE id = job_id;

  IF should_retry AND current_retry_count < max_retries_count THEN
    -- Retry: set back to queued
    UPDATE message_jobs
    SET 
      status = 'queued',
      retry_count = retry_count + 1,
      error = error_text,
      updated_at = NOW()
    WHERE id = job_id;

    UPDATE messages
    SET 
      status = 'queued',
      retry_count = retry_count + 1,
      error_message = error_text
    WHERE id = (SELECT message_id FROM message_jobs WHERE id = job_id);
  ELSE
    -- Final failure
    UPDATE message_jobs
    SET 
      status = 'failed',
      error = error_text,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = job_id;

    UPDATE messages
    SET 
      status = 'failed',
      error_message = error_text,
      processing_completed_at = NOW()
    WHERE id = (SELECT message_id FROM message_jobs WHERE id = job_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for message_jobs
ALTER TABLE message_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jobs"
  ON message_jobs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create jobs"
  ON message_jobs
  FOR INSERT
  WITH CHECK (true);  -- Application will handle authorization

CREATE POLICY "System can update jobs"
  ON message_jobs
  FOR UPDATE
  USING (true)  -- Workers need to update jobs
  WITH CHECK (true);

CREATE POLICY "Users can delete their own completed/failed jobs"
  ON message_jobs
  FOR DELETE
  USING (
    user_id = auth.uid() AND
    status IN ('completed', 'failed', 'cancelled')
  );

-- Add comments
COMMENT ON TABLE message_jobs IS 'Queue for background processing of AI message generation';
COMMENT ON FUNCTION get_next_job IS 'Gets the next job from queue for processing, respecting concurrency limits';
COMMENT ON FUNCTION complete_job IS 'Marks a job as completed with result data';
COMMENT ON FUNCTION fail_job IS 'Marks a job as failed, with optional retry logic';






