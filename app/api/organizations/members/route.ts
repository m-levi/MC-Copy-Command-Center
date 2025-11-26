import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getUserOrganization } from '@/lib/permissions';
import {
  authenticationError,
  notFoundError,
  withErrorHandling,
} from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/**
 * GET /api/organizations/members
 * List all members in the user's organization
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return authenticationError('Please log in');
  }

  // Get user's organization
  const userOrg = await getUserOrganization(user.id);
  if (!userOrg) {
    return notFoundError('Organization');
  }

  // Use service client to bypass RLS for listing all members
  // This ensures admins can see everyone even if RLS is strict
  const serviceClient = createServiceClient();

  // Get all members without nested profile select (to avoid foreign key issues)
  const { data: membersData, error: membersError } = await serviceClient
    .from('organization_members')
    .select('id, organization_id, user_id, role, invited_by, joined_at, created_at')
    .eq('organization_id', userOrg.organization.id)
    .order('joined_at', { ascending: false });

  if (membersError) {
    throw membersError;
  }

  // Fetch profiles separately for each member using service client
  // This ensures we can see profiles even if public visibility is restricted
  const membersWithProfiles = await Promise.all(
    (membersData || []).map(async (member) => {
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('user_id, email, full_name, avatar_url, created_at')
        .eq('user_id', member.user_id)
        .single();
      
      return {
        ...member,
        profile: profile || null
      };
    })
  );

  return NextResponse.json({ members: membersWithProfiles });
});
