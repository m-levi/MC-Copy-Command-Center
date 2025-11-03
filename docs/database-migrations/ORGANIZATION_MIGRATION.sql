-- ========================================
-- MULTI-TENANT ORGANIZATION SYSTEM MIGRATION
-- ========================================
-- This migration adds support for:
-- - Organization-based multi-tenancy
-- - Role-based access control (admin, brand_manager, member)
-- - Invite-only signup flow
-- - Team collaboration and conversation attribution
-- ========================================

-- STEP 1: Create organization role enum
CREATE TYPE organization_role AS ENUM ('admin', 'brand_manager', 'member');

-- STEP 2: Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 3: Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role organization_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- STEP 4: Create organization_invites table
CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role organization_role NOT NULL DEFAULT 'member',
  invite_token TEXT UNIQUE NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_invites_token ON organization_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_organization_invites_email ON organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_organization_invites_org_id ON organization_invites(organization_id);

-- STEP 6: Modify profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- STEP 7: Modify brands table
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_brands_organization_id ON brands(organization_id);
CREATE INDEX IF NOT EXISTS idx_brands_created_by ON brands(created_by);

-- STEP 8: Modify conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- STEP 9: Create default "Moon Commerce" organization
INSERT INTO organizations (name, slug)
VALUES ('Moon Commerce', 'moon-commerce')
ON CONFLICT (slug) DO NOTHING;

-- STEP 10: Migrate existing users to Moon Commerce organization as admins
INSERT INTO organization_members (organization_id, user_id, role, joined_at)
SELECT 
  (SELECT id FROM organizations WHERE slug = 'moon-commerce'),
  id,
  'admin'::organization_role,
  NOW()
FROM auth.users
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- STEP 11: Update existing brands to belong to Moon Commerce
UPDATE brands
SET 
  organization_id = (SELECT id FROM organizations WHERE slug = 'moon-commerce'),
  created_by = user_id
WHERE organization_id IS NULL;

-- STEP 12: Update existing conversations with creator names
UPDATE conversations c
SET created_by_name = COALESCE(p.full_name, p.email, 'Unknown User')
FROM profiles p
WHERE c.user_id = p.user_id
AND c.created_by_name IS NULL;

-- STEP 13: Enable Row Level Security on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- STEP 14: Drop existing RLS policies for brands and conversations
DROP POLICY IF EXISTS "Users can view own brands" ON brands;
DROP POLICY IF EXISTS "Users can insert own brands" ON brands;
DROP POLICY IF EXISTS "Users can update own brands" ON brands;
DROP POLICY IF EXISTS "Users can delete own brands" ON brands;

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;

-- STEP 15: Create RLS policies for organizations table
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- STEP 16: Create RLS policies for organization_members table
CREATE POLICY "Members can view their organization members" ON organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert organization members" ON organization_members
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update organization members" ON organization_members
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete organization members" ON organization_members
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- STEP 17: Create RLS policies for organization_invites table
CREATE POLICY "Members can view their organization invites" ON organization_invites
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert organization invites" ON organization_invites
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update organization invites" ON organization_invites
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete organization invites" ON organization_invites
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- STEP 18: Create new RLS policies for brands table (organization-based)
CREATE POLICY "Members can view organization brands" ON brands
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and brand managers can insert brands" ON brands
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'brand_manager')
    )
  );

CREATE POLICY "Admins and brand managers can update brands" ON brands
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'brand_manager')
    )
  );

CREATE POLICY "Admins can delete brands" ON brands
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- STEP 19: Create new RLS policies for conversations table (organization-based)
CREATE POLICY "Members can view organization conversations" ON conversations
  FOR SELECT
  USING (
    brand_id IN (
      SELECT b.id FROM brands b
      INNER JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert conversations" ON conversations
  FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT b.id FROM brands b
      INNER JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own conversations or admins can update any" ON conversations
  FOR UPDATE
  USING (
    user_id = auth.uid() OR
    brand_id IN (
      SELECT b.id FROM brands b
      INNER JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

CREATE POLICY "Users can delete own conversations or admins can delete any" ON conversations
  FOR DELETE
  USING (
    user_id = auth.uid() OR
    brand_id IN (
      SELECT b.id FROM brands b
      INNER JOIN organization_members om ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- STEP 20: Create helper function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization(p_user_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  organization_slug TEXT,
  user_role organization_role
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    om.role
  FROM organizations o
  INNER JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = p_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 21: Create helper function to check if user can create brands
CREATE OR REPLACE FUNCTION can_user_create_brand(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id 
    AND organization_id = p_org_id
    AND role IN ('admin', 'brand_manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 22: Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id 
    AND organization_id = p_org_id
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 23: Create trigger to update organizations updated_at
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at_trigger
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_organizations_updated_at();

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Next steps:
-- 1. Verify all tables were created successfully
-- 2. Check that existing data was migrated to Moon Commerce
-- 3. Test RLS policies with different user roles
-- 4. Deploy application code changes
-- ========================================

