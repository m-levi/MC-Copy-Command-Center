-- Create user_settings table to store debug mode preference
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  debug_mode_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create custom_prompts table
CREATE TABLE IF NOT EXISTS custom_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  prompt_type VARCHAR(50) NOT NULL, -- 'design_system', 'design_user', 'letter_system', 'letter_user', 'flow_design', 'flow_letter'
  prompt_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_custom_prompts_user_id ON custom_prompts(user_id);
CREATE INDEX idx_custom_prompts_type ON custom_prompts(prompt_type);
CREATE INDEX idx_custom_prompts_active ON custom_prompts(is_active);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for custom_prompts
CREATE POLICY "Users can view their own prompts"
  ON custom_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prompts"
  ON custom_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompts"
  ON custom_prompts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts"
  ON custom_prompts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_prompts_updated_at
    BEFORE UPDATE ON custom_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to ensure only one active prompt per type per user
CREATE OR REPLACE FUNCTION ensure_single_active_prompt()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        UPDATE custom_prompts
        SET is_active = false
        WHERE user_id = NEW.user_id
          AND prompt_type = NEW.prompt_type
          AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER enforce_single_active_prompt
    BEFORE INSERT OR UPDATE ON custom_prompts
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_active_prompt();



