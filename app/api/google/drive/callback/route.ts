/**
 * Google Drive OAuth Callback
 * GET /api/google/drive/callback - Handle OAuth callback from Google
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens } from '@/lib/google-drive-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/?google_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/?google_error=no_code', request.url)
    );
  }

  // Parse state
  let parsedState: { userId: string; redirectTo: string; brandId?: string } = {
    userId: '',
    redirectTo: '/',
  };

  if (state) {
    try {
      parsedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch (e) {
      console.error('Failed to parse state:', e);
    }
  }

  try {
    const supabase = await createClient();
    
    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.redirect(
        new URL('/login?google_error=unauthorized', request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens in database
    const { error: upsertError } = await supabase
      .from('google_oauth_tokens')
      .upsert({
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_at: tokens.expires_at?.toISOString(),
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('Failed to store tokens:', upsertError);
      return NextResponse.redirect(
        new URL(`${parsedState.redirectTo}?google_error=storage_failed`, request.url)
      );
    }

    // Redirect back to the original page with success
    const redirectUrl = new URL(parsedState.redirectTo, request.url);
    redirectUrl.searchParams.set('google_connected', 'true');
    if (parsedState.brandId) {
      redirectUrl.searchParams.set('brandId', parsedState.brandId);
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`${parsedState.redirectTo}?google_error=exchange_failed`, request.url)
    );
  }
}

















