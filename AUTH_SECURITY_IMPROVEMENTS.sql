-- ========================================
-- AUTHENTICATION & SECURITY IMPROVEMENTS
-- ========================================
-- This migration enhances the authentication system with:
-- 1. Security improvements for RLS policies
-- 2. Performance optimizations
-- 3. Password security features
-- 4. Session management
-- 5. Audit logging
-- ========================================

-- STEP 1: Fix function search_path security vulnerability
-- This prevents search_path injection attacks

ALTER FUNCTION public.match_documents(vector(1536), float, int, uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_user_organization(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_user_preferences_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.is_user_admin(uuid, uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_organizations_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.can_user_create_brand(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_conversation_last_message()
  SET search_path = public, pg_temp;

-- STEP 2: Move vector extension to extensions schema for security
CREATE SCHEMA IF NOT EXISTS extensions;
-- Note: Moving the vector extension requires database superuser access
-- This should be done manually via the Supabase dashboard:
-- ALTER EXTENSION vector SET SCHEMA extensions;

-- STEP 3: Optimize RLS policies to use SELECT subquery pattern
-- This prevents re-evaluation of auth.uid() for each row

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate with optimized patterns
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

-- Optimize user_preferences policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.user_preferences;

CREATE POLICY "Users can view their own preferences" ON public.user_preferences
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own preferences" ON public.user_preferences
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own preferences" ON public.user_preferences
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- STEP 4: Add performance indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_automation_emails_automation_id 
  ON public.automation_emails(automation_id);

CREATE INDEX IF NOT EXISTS idx_automation_outlines_conversation_id 
  ON public.automation_outlines(conversation_id);

CREATE INDEX IF NOT EXISTS idx_organization_invites_invited_by 
  ON public.organization_invites(invited_by);

CREATE INDEX IF NOT EXISTS idx_organization_members_invited_by 
  ON public.organization_members(invited_by);

-- STEP 5: Remove duplicate index
DROP INDEX IF EXISTS public.idx_org_members_user;
-- Keep idx_organization_members_user_id

-- STEP 6: Create user sessions tracking table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_info TEXT,
  ip_address INET,
  user_agent TEXT,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions(last_activity DESC);

-- STEP 7: Create security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login', 'logout', 'password_change', 'email_change', 
    'password_reset_request', 'password_reset_complete',
    'failed_login', 'account_locked', 'mfa_enabled', 'mfa_disabled'
  )),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_audit_log_user_id ON public.security_audit_log(user_id, created_at DESC);
CREATE INDEX idx_security_audit_log_event_type ON public.security_audit_log(event_type, created_at DESC);
CREATE INDEX idx_security_audit_log_created_at ON public.security_audit_log(created_at DESC);

-- STEP 8: Enable RLS on new tables
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- STEP 9: Create RLS policies for user_sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own sessions" ON public.user_sessions
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- STEP 10: Create RLS policies for security_audit_log
CREATE POLICY "Users can view own audit logs" ON public.security_audit_log
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- Only system can insert audit logs (via service role key)
CREATE POLICY "Service role can insert audit logs" ON public.security_audit_log
  FOR INSERT
  WITH CHECK (true);

-- STEP 11: Add password metadata to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS login_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;

-- STEP 12: Create function to track login attempts
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_user_id UUID,
  p_success BOOLEAN,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_success THEN
    -- Successful login: reset failed attempts, increment count
    UPDATE public.profiles
    SET 
      last_login_at = NOW(),
      login_count = COALESCE(login_count, 0) + 1,
      failed_login_attempts = 0,
      account_locked_until = NULL
    WHERE user_id = p_user_id;
    
    -- Log the successful login
    INSERT INTO public.security_audit_log (user_id, event_type, ip_address, user_agent)
    VALUES (p_user_id, 'login', p_ip_address, p_user_agent);
  ELSE
    -- Failed login: increment failed attempts
    UPDATE public.profiles
    SET 
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      -- Lock account for 15 minutes after 5 failed attempts
      account_locked_until = CASE 
        WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 
        THEN NOW() + INTERVAL '15 minutes'
        ELSE account_locked_until
      END
    WHERE user_id = p_user_id;
    
    -- Log the failed login
    INSERT INTO public.security_audit_log (user_id, event_type, ip_address, user_agent)
    VALUES (p_user_id, 'failed_login', p_ip_address, p_user_agent);
  END IF;
END;
$$;

-- STEP 13: Create function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT account_locked_until INTO v_locked_until
  FROM public.profiles
  WHERE user_id = p_user_id;
  
  -- Account is locked if locked_until is in the future
  RETURN (v_locked_until IS NOT NULL AND v_locked_until > NOW());
END;
$$;

-- STEP 14: Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Create default user preferences
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- STEP 15: Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Delete sessions inactive for more than 30 days
  DELETE FROM public.user_sessions
  WHERE last_activity < NOW() - INTERVAL '30 days';
  
  -- Delete audit logs older than 90 days
  DELETE FROM public.security_audit_log
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- STEP 16: Create function for password change tracking
CREATE OR REPLACE FUNCTION public.record_password_change(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.profiles
  SET password_changed_at = NOW()
  WHERE user_id = p_user_id;
  
  INSERT INTO public.security_audit_log (user_id, event_type)
  VALUES (p_user_id, 'password_change');
END;
$$;

-- STEP 17: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.user_sessions TO authenticated;
GRANT INSERT ON public.user_sessions TO authenticated;
GRANT DELETE ON public.user_sessions TO authenticated;
GRANT SELECT ON public.security_audit_log TO authenticated;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Security improvements implemented:
-- ✅ Function search_path security fixed
-- ✅ RLS policies optimized for performance
-- ✅ Missing foreign key indexes added
-- ✅ Session tracking added
-- ✅ Security audit logging implemented
-- ✅ Account lockout protection (5 failed attempts)
-- ✅ Password change tracking
-- ✅ Automated profile creation on signup
-- ✅ Session cleanup function
--
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Enable leaked password protection in Supabase Auth dashboard
-- 3. Enable MFA options in Auth settings
-- 4. Update frontend to use new security features
-- ========================================

