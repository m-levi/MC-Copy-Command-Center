-- Add attachments support to conversation_comments
-- Run this migration to enable file attachments on comments

-- Add attachments column (JSONB array of attachment objects)
ALTER TABLE conversation_comments 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add comment on the column
COMMENT ON COLUMN conversation_comments.attachments IS 'Array of attachment objects: [{url, name, type, size}]';

-- Create storage bucket for comment attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comment-attachments',
  'comment-attachments',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for comment attachments

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload comment attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comment-attachments');

-- Allow public read access to attachments
CREATE POLICY "Public read access for comment attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'comment-attachments');

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete own comment attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'comment-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add read_status tracking table for unread comments
CREATE TABLE IF NOT EXISTS comment_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES conversation_comments(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_comment_read_status_user ON comment_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_read_status_comment ON comment_read_status(comment_id);

-- RLS for read status
ALTER TABLE comment_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own read status"
ON comment_read_status FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own read status"
ON comment_read_status FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own read status"
ON comment_read_status FOR UPDATE
TO authenticated
USING (user_id = auth.uid());



