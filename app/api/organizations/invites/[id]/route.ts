import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canManageMembers, getUserOrganization } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/organizations/invites/[id]
 * Revoke/delete an invitation (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check if user is admin
    const canManage = await canManageMembers(user.id, userOrg.organization.id);
    if (!canManage) {
      return NextResponse.json({ error: 'Only admins can revoke invitations' }, { status: 403 });
    }

    const { id } = await params;

    // Delete the invitation
    const { error } = await supabase
      .from('organization_invites')
      .delete()
      .eq('id', id)
      .eq('organization_id', userOrg.organization.id); // Ensure it belongs to their org

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting invite:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

