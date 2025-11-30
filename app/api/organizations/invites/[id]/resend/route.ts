import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canManageMembers, getUserOrganization } from '@/lib/permissions';
import { sendInviteEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/organizations/invites/[id]/resend
 * Resend an invitation email (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      return NextResponse.json({ error: 'Only admins can resend invitations' }, { status: 403 });
    }

    // Fetch the invitation
    const { data: invite, error: fetchError } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userOrg.organization.id)
      .single();

    if (fetchError || !invite) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invite.used_at) {
      return NextResponse.json({ error: 'Invitation has already been used' }, { status: 400 });
    }

    // Extend expiration date by 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: updateError } = await supabase
      .from('organization_invites')
      .update({ expires_at: expiresAt.toISOString() })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Generate invite link
    const inviteLink = `${request.nextUrl.origin}/signup/${invite.invite_token}`;

    // Fetch inviter's profile (current user re-sending)
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    // Send email
    const emailResult = await sendInviteEmail({
      to: invite.email,
      inviteLink,
      inviterName: inviterProfile?.full_name || user.email,
      organizationName: userOrg.organization.name,
      role: invite.role,
    });

    if (!emailResult.success) {
      console.error('Failed to resend email:', emailResult.error);
      return NextResponse.json({ 
        error: 'Failed to send email', 
        details: emailResult.error 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Invitation resent successfully' 
    });
  } catch (error: any) {
    console.error('Error resending invite:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



