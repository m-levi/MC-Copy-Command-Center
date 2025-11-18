-- Full-text search migration
-- Adds search_vector columns and GIN indexes for fast text search

-- Enable pg_trgm extension for fuzzy text matching (optional but recommended)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add search_vector column to brands table
ALTER TABLE brands ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search_vector column to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search_vector column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update brand search vector
CREATE OR REPLACE FUNCTION brands_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.brand_details, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.brand_guidelines, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.copywriting_style_guide, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update brand search vector
DROP TRIGGER IF EXISTS brands_search_vector_trigger ON brands;
CREATE TRIGGER brands_search_vector_trigger
  BEFORE INSERT OR UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION brands_search_vector_update();

-- Create function to update conversation search vector
CREATE OR REPLACE FUNCTION conversations_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update conversation search vector
DROP TRIGGER IF EXISTS conversations_search_vector_trigger ON conversations;
CREATE TRIGGER conversations_search_vector_trigger
  BEFORE INSERT OR UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION conversations_search_vector_update();

-- Create function to update message search vector
CREATE OR REPLACE FUNCTION messages_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update message search vector
DROP TRIGGER IF EXISTS messages_search_vector_trigger ON messages;
CREATE TRIGGER messages_search_vector_trigger
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION messages_search_vector_update();

-- Create GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS brands_search_idx ON brands USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS conversations_search_idx ON conversations USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS messages_search_idx ON messages USING GIN(search_vector);

-- Update existing rows to populate search vectors
UPDATE brands SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(brand_details, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(brand_guidelines, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(copywriting_style_guide, '')), 'C')
WHERE search_vector IS NULL;

UPDATE conversations SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B')
WHERE search_vector IS NULL;

UPDATE messages SET search_vector = 
  setweight(to_tsvector('english', COALESCE(content, '')), 'A')
WHERE search_vector IS NULL;

-- Create function for searching brands
CREATE OR REPLACE FUNCTION search_brands(
  query_text TEXT,
  user_id_filter UUID DEFAULT NULL,
  organization_id_filter UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  brand_details TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.brand_details,
    ts_rank(b.search_vector, plainto_tsquery('english', query_text)) AS rank
  FROM brands b
  WHERE 
    b.search_vector @@ plainto_tsquery('english', query_text)
    AND (user_id_filter IS NULL OR b.user_id = user_id_filter)
    AND (organization_id_filter IS NULL OR b.organization_id = organization_id_filter)
  ORDER BY rank DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for searching conversations
CREATE OR REPLACE FUNCTION search_conversations(
  query_text TEXT,
  user_id_filter UUID DEFAULT NULL,
  brand_id_filter UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.description,
    ts_rank(c.search_vector, plainto_tsquery('english', query_text)) AS rank
  FROM conversations c
  WHERE 
    c.search_vector @@ plainto_tsquery('english', query_text)
    AND (user_id_filter IS NULL OR c.user_id = user_id_filter)
    AND (brand_id_filter IS NULL OR c.brand_id = brand_id_filter)
  ORDER BY rank DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for searching messages
CREATE OR REPLACE FUNCTION search_messages(
  query_text TEXT,
  conversation_id_filter UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  content TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.content,
    ts_rank(m.search_vector, plainto_tsquery('english', query_text)) AS rank
  FROM messages m
  WHERE 
    m.search_vector @@ plainto_tsquery('english', query_text)
    AND (conversation_id_filter IS NULL OR m.conversation_id = conversation_id_filter)
  ORDER BY rank DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION search_brands IS 'Full-text search for brands with optional filters';
COMMENT ON FUNCTION search_conversations IS 'Full-text search for conversations with optional filters';
COMMENT ON FUNCTION search_messages IS 'Full-text search for messages with optional filters';




