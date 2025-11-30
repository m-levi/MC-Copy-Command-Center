import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canManageMembers, getUserOrganization } from '@/lib/permissions';
import { sendInviteEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Need Node.js runtime for crypto

/**
 * GET /api/organizations/invites
 * List all pending invitations for the user's organization
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

    // List all invitations (pending and used)
    const { data: invitesData, error } = await supabase
      .from('organization_invites')
      .select('id, email, role, invite_token, invited_by, expires_at, used_at, created_at')
      .eq('organization_id', userOrg.organization.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Fetch inviter profiles separately
    const invitesWithInviters = await Promise.all(
      (invitesData || []).map(async (invite) => {
        if (invite.invited_by) {
          const { data: inviter } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', invite.invited_by)
            .single();
          
          return {
            ...invite,
            inviter: inviter || null
          };
        }
        return invite;
      })
    );

    return NextResponse.json({ invites: invitesWithInviters });
  } catch (error: any) {
    console.error('Error fetching invites:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/organizations/invites
 * Create a new invitation (admin only)
 */
export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Only admins can send invitations' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    // Validate role
    if (!['admin', 'brand_manager', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if user is already a member
    // We need to handle the case where the user might not have a profile yet or the query fails safely
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .single();

    if (userProfile) {
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', userOrg.organization.id)
        .eq('user_id', userProfile.user_id)
        .single();

      if (existingMember) {
        return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 400 });
      }
    }

    // Check if there's already a pending invitation
    const { data: existingInvite } = await supabase
      .from('organization_invites')
      .select('id, used_at')
      .eq('organization_id', userOrg.organization.id)
      .eq('email', email)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: 'An active invitation already exists for this email' }, { status: 400 });
    }

    // Generate secure random token
    const { randomBytes } = await import('crypto');
    const inviteToken = randomBytes(32).toString('hex');
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const { data: invite, error } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: userOrg.organization.id,
        email,
        role,
        invite_token: inviteToken,
        invited_by: user.id,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Generate invite link
    const inviteLink = `${request.nextUrl.origin}/signup/${inviteToken}`;

    // Fetch inviter's profile to get name
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    // Send email
    const emailResult = await sendInviteEmail({
      to: email,
      inviteLink,
      inviterName: inviterProfile?.full_name || user.email,
      organizationName: userOrg.organization.name,
      role,
    });

    return NextResponse.json({ 
      invite,
      inviteLink,
      emailSent: emailResult.success,
      emailError: emailResult.success ? undefined : emailResult.error
    });
  } catch (error: any) {
    console.error('Error creating invite:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
