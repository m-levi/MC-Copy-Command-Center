import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  authenticationError,
  withErrorHandling,
} from '@/lib/api-error';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// GET: Get all team members in the user's organization
export const GET = withErrorHandling(async () => {
  // Use regular client for auth check
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Use service client for data queries (bypasses RLS)
  let serviceClient;
  try {
    serviceClient = createServiceClient();
  } catch (e) {
    logger.error('[Team Members API] Service client not available, using regular client');
    serviceClient = supabase;
  }

  // Get user's organization(s)
  const { data: memberships, error: membershipError } = await serviceClient
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id);

  logger.log('[Team Members API] User:', user.id, 'Memberships:', memberships?.length || 0);

  if (membershipError) {
    logger.error('[Team Members API] Membership query error:', membershipError);
  }

  if (!memberships || memberships.length === 0) {
    // Return just the current user if no organization
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('user_id, email, full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    return NextResponse.json({
      members: profile ? [{
        user_id: user.id,
        profile: { email: profile.email || user.email || 'Unknown', full_name: profile.full_name }
      }] : [{
        user_id: user.id,
        profile: { email: user.email || 'Unknown', full_name: null }
      }]
    });
  }

  // Use the first organization (user might be in multiple)
  const organizationId = memberships[0].organization_id;
  logger.log('[Team Members API] Using organization:', organizationId);

  // Get ALL organization members using service client (bypasses RLS)
  const { data: members, error: membersError } = await serviceClient
    .from('organization_members')
    .select('user_id, role')
    .eq('organization_id', organizationId);

  logger.log('[Team Members API] Members found:', members?.length || 0);

  if (membersError) {
    logger.error('[Team Members API] Members query error:', membersError);
    return NextResponse.json({ members: [] });
  }

  if (!members || members.length === 0) {
    return NextResponse.json({ members: [] });
  }

  // Get profiles for all members using service client
  const userIds = members.map(m => m.user_id);

  const { data: profiles, error: profilesError } = await serviceClient
    .from('profiles')
    .select('user_id, email, full_name')
    .in('user_id', userIds);

  logger.log('[Team Members API] Profiles found:', profiles?.length || 0);

  if (profilesError) {
    logger.error('[Team Members API] Profiles query error:', profilesError);
  }

  // Map profiles to members
  const formattedMembers = members.map(m => {
    const profile = profiles?.find(p => p.user_id === m.user_id);
    return {
      user_id: m.user_id,
      profile: profile 
        ? { email: profile.email || 'Unknown', full_name: profile.full_name }
        : { email: 'Unknown', full_name: null }
    };
  });

  // Filter out members with unknown email (unless that's the only one)
  const validMembers = formattedMembers.filter(m => m.profile.email !== 'Unknown');
  const finalMembers = validMembers.length > 0 ? validMembers : formattedMembers;

  logger.log('[Team Members API] Returning', finalMembers.length, 'members');

  return NextResponse.json({ members: finalMembers });
});

