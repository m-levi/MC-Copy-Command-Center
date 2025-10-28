import { createClient } from '@/lib/supabase/server';
import { Organization, OrganizationRole } from '@/types';

/**
 * Get the user's organization and role
 */
export async function getUserOrganization(userId: string): Promise<{ organization: Organization; role: OrganizationRole } | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      role,
      organization:organizations (
        id,
        name,
        slug,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    organization: data.organization as unknown as Organization,
    role: data.role as OrganizationRole
  };
}

/**
 * Get the user's role in a specific organization
 */
export async function getUserRole(userId: string, orgId: string): Promise<OrganizationRole | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role as OrganizationRole;
}

/**
 * Check if user can create brands (admin or brand_manager)
 */
export async function canCreateBrand(userId: string, orgId: string): Promise<boolean> {
  const role = await getUserRole(userId, orgId);
  return role === 'admin' || role === 'brand_manager';
}

/**
 * Check if user can edit a specific brand
 */
export async function canEditBrand(userId: string, brandId: string): Promise<boolean> {
  const supabase = await createClient();
  
  // Get the brand's organization
  const { data: brand, error } = await supabase
    .from('brands')
    .select('organization_id')
    .eq('id', brandId)
    .single();

  if (error || !brand) {
    return false;
  }

  // Check if user is admin or brand_manager in that organization
  const role = await getUserRole(userId, brand.organization_id);
  return role === 'admin' || role === 'brand_manager';
}

/**
 * Check if user can delete a specific brand (admin only)
 */
export async function canDeleteBrand(userId: string, brandId: string): Promise<boolean> {
  const supabase = await createClient();
  
  // Get the brand's organization
  const { data: brand, error } = await supabase
    .from('brands')
    .select('organization_id')
    .eq('id', brandId)
    .single();

  if (error || !brand) {
    return false;
  }

  // Check if user is admin in that organization
  const role = await getUserRole(userId, brand.organization_id);
  return role === 'admin';
}

/**
 * Check if user can manage organization members (admin only)
 */
export async function canManageMembers(userId: string, orgId: string): Promise<boolean> {
  const role = await getUserRole(userId, orgId);
  return role === 'admin';
}

/**
 * Check if user is admin in their organization
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const userOrg = await getUserOrganization(userId);
  return userOrg?.role === 'admin';
}

/**
 * Check if user is admin or brand manager in their organization
 */
export async function canManageBrands(userId: string): Promise<boolean> {
  const userOrg = await getUserOrganization(userId);
  return userOrg?.role === 'admin' || userOrg?.role === 'brand_manager';
}

/**
 * Get all members of an organization with their profiles
 */
export async function getOrganizationMembers(orgId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      id,
      organization_id,
      user_id,
      role,
      invited_by,
      joined_at,
      created_at,
      profile:profiles (
        user_id,
        email,
        full_name,
        avatar_url,
        created_at
      )
    `)
    .eq('organization_id', orgId)
    .order('joined_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Check if user has access to a specific brand
 */
export async function hasAccessToBrand(userId: string, brandId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('brands')
    .select(`
      organization_id,
      organization_members!inner (
        user_id
      )
    `)
    .eq('id', brandId)
    .eq('organization_members.user_id', userId)
    .single();

  return !error && !!data;
}

