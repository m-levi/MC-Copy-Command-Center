import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserOrganization } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/organizations/members
 * List all members in the user's organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const userOrg = await getUserOrganization(user.id);
    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get all members without nested profile select (to avoid foreign key issues)
    const { data: membersData, error: membersError } = await supabase
      .from('organization_members')
      .select('id, organization_id, user_id, role, invited_by, joined_at, created_at')
      .eq('organization_id', userOrg.organization.id)
      .order('joined_at', { ascending: false });

    if (membersError) {
      throw membersError;
    }

    // Fetch profiles separately for each member
    const membersWithProfiles = await Promise.all(
      (membersData || []).map(async (member) => {
        const { data: profile } = await supabase
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
  } catch (error: any) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

