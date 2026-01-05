/**
 * Google Drive OAuth - Initiate Authorization
 * GET /api/google/drive/auth - Redirect to Google OAuth
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleAuthUrl } from '@/lib/google-drive-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get redirect URL from query params
    const searchParams = request.nextUrl.searchParams;
    const redirectTo = searchParams.get('redirect') || '/';
    const brandId = searchParams.get('brandId') || '';

    // Create state with user info and redirect
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      redirectTo,
      brandId,
    })).toString('base64');

    // Generate OAuth URL
    const authUrl = getGoogleAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Google OAuth init error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}

















