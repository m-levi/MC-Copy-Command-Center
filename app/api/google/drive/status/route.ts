/**
 * Google Drive Connection Status
 * GET /api/google/drive/status - Check if user has connected Google Drive
 * DELETE /api/google/drive/status - Disconnect Google Drive
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isTokenExpired, refreshAccessToken, GoogleDriveClient } from '@/lib/google-drive-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stored tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_oauth_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({
        connected: false,
        email: null,
      });
    }

    // Check if token is valid
    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;
    let accessToken = tokenData.access_token;

    // Try to refresh if expired
    if (isTokenExpired(expiresAt) && tokenData.refresh_token) {
      try {
        const newTokens = await refreshAccessToken(tokenData.refresh_token);
        
        // Update stored tokens
        await supabase
          .from('google_oauth_tokens')
          .update({
            access_token: newTokens.access_token,
            expires_at: newTokens.expires_at?.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        accessToken = newTokens.access_token;
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        return NextResponse.json({
          connected: false,
          email: null,
          error: 'token_expired',
        });
      }
    }

    // Get user info from Google
    try {
      const driveClient = new GoogleDriveClient(accessToken);
      const userInfo = await driveClient.getUserInfo();

      return NextResponse.json({
        connected: true,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      });
    } catch (userError) {
      console.error('Failed to get Google user info:', userError);
      return NextResponse.json({
        connected: true,
        email: null,
        error: 'user_info_failed',
      });
    }
  } catch (error) {
    console.error('Google status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete stored tokens
    const { error: deleteError } = await supabase
      .from('google_oauth_tokens')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Failed to delete tokens:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Google disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

















