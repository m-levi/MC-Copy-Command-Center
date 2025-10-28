-- Migration: Add website_url to brands table and support product search
-- Run this in your Supabase SQL Editor

-- Add website_url column to brands table
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN brands.website_url IS 'Brand website URL used for product search when AI mentions products';

-- Update existing brands to have a placeholder (optional)
-- UPDATE brands SET website_url = '' WHERE website_url IS NULL;

-- Note: The messages table already has a metadata JSONB column that can store productLinks
-- No changes needed to messages table structure

