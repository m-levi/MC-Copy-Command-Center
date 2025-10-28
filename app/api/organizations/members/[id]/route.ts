import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canManageMembers, getUserOrganization } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/organizations/members/[id]
 * Update a member's role (admin only)
 */
export async function PATCH(
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
      return NextResponse.json({ error: 'Only admins can update member roles' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    // Validate role
    if (!['admin', 'brand_manager', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Prevent user from changing their own role
    const { data: member } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('id', id)
      .single();

    if (member?.user_id === user.id) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
    }

    // Update the member's role
    const { data, error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('id', id)
      .eq('organization_id', userOrg.organization.id) // Ensure it belongs to their org
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ member: data });
  } catch (error: any) {
    console.error('Error updating member:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/organizations/members/[id]
 * Remove a member from the organization (admin only)
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
      return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent user from removing themselves
    const { data: member } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('id', id)
      .single();

    if (member?.user_id === user.id) {
      return NextResponse.json({ error: 'You cannot remove yourself from the organization' }, { status: 400 });
    }

    // Delete the member
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', id)
      .eq('organization_id', userOrg.organization.id); // Ensure it belongs to their org

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

