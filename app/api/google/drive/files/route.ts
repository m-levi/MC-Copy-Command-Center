/**
 * Google Drive Files API
 * GET /api/google/drive/files - List files from Google Drive
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  isTokenExpired, 
  refreshAccessToken, 
  GoogleDriveClient 
} from '@/lib/google-drive-service';

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
      return NextResponse.json(
        { error: 'Google Drive not connected', code: 'not_connected' },
        { status: 400 }
      );
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
        return NextResponse.json(
          { error: 'Token expired', code: 'token_expired' },
          { status: 401 }
        );
      }
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const pageToken = searchParams.get('pageToken') || undefined;
    const query = searchParams.get('q') || undefined;
    const folderId = searchParams.get('folderId') || undefined;

    // List files from Google Drive
    const driveClient = new GoogleDriveClient(accessToken);
    const result = await driveClient.listFiles({
      pageSize,
      pageToken,
      query,
      folderId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Google Drive files error:', error);
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}

















