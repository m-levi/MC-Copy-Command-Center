import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/organizations/invites/accept
 * Accept an invitation and add user to organization (called after user signup)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Use service client to validate invitation and find user
    // This is necessary because new users may not have an established session yet
    const serviceSupabase = createServiceClient();

    // Find the invitation
    const { data: invite, error: inviteError } = await serviceSupabase
      .from('organization_invites')
      .select('id, email, role, organization_id, expires_at, used_at, invited_by')
      .eq('invite_token', token)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ 
        error: 'Invalid invitation token' 
      }, { status: 404 });
    }

    // Check if already used
    if (invite.used_at) {
      return NextResponse.json({ 
        error: 'This invitation has already been used' 
      }, { status: 400 });
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    if (now > expiresAt) {
      return NextResponse.json({ 
        error: 'This invitation has expired' 
      }, { status: 400 });
    }

    // Find user by email (works for both new signups and existing users)
    const { data: profile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select('user_id, email')
      .eq('email', invite.email)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ 
        error: 'User profile not found. Please try again in a moment.' 
      }, { status: 404 });
    }

    // Check if user is already a member
    const { data: existingMember } = await serviceSupabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', invite.organization_id)
      .eq('user_id', profile.user_id)
      .single();

    if (existingMember) {
      // Mark invitation as used anyway
      await serviceSupabase
        .from('organization_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invite.id);

      return NextResponse.json({ 
        error: 'You are already a member of this organization' 
      }, { status: 400 });
    }

    // Add user to organization
    const { error: memberError } = await serviceSupabase
      .from('organization_members')
      .insert({
        organization_id: invite.organization_id,
        user_id: profile.user_id,
        role: invite.role,
        invited_by: invite.invited_by,
        joined_at: new Date().toISOString()
      });

    if (memberError) {
      console.error('Error adding member:', memberError);
      throw memberError;
    }

    // Mark invitation as used
    const { error: updateError } = await serviceSupabase
      .from('organization_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id);

    if (updateError) {
      console.error('Error updating invite:', updateError);
    }

    return NextResponse.json({ 
      success: true,
      organization_id: invite.organization_id
    });
  } catch (error: any) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to accept invitation' 
    }, { status: 500 });
  }
}

