import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/organizations/invites/validate?token=xxx
 * Validate an invitation token
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Find the invitation
    const { data: invite, error } = await supabase
      .from('organization_invites')
      .select('id, email, role, organization_id, expires_at, used_at')
      .eq('invite_token', token)
      .single();

    if (error || !invite) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid invitation token' 
      }, { status: 404 });
    }

    // Check if already used
    if (invite.used_at) {
      return NextResponse.json({ 
        valid: false, 
        error: 'This invitation has already been used' 
      }, { status: 400 });
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    if (now > expiresAt) {
      return NextResponse.json({ 
        valid: false, 
        error: 'This invitation has expired' 
      }, { status: 400 });
    }

    // Fetch organization details separately
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('id', invite.organization_id)
      .single();

    if (orgError || !organization) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Organization not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      email: invite.email,
      role: invite.role,
      organization: organization
    });
  } catch (error: any) {
    console.error('Error validating invite:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

