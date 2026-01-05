/**
 * Google Drive Import API
 * POST /api/google/drive/import - Import a file from Google Drive to document store
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  isTokenExpired, 
  refreshAccessToken, 
  GoogleDriveClient,
  isGoogleWorkspaceApp,
  getExportMimeType,
} from '@/lib/google-drive-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { fileId, brandId, category = 'general', visibility = 'private', tags = [] } = body;

    if (!fileId || !brandId) {
      return NextResponse.json(
        { error: 'Missing required fields: fileId and brandId' },
        { status: 400 }
      );
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

    // Get valid access token
    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;
    let accessToken = tokenData.access_token;

    if (isTokenExpired(expiresAt) && tokenData.refresh_token) {
      try {
        const newTokens = await refreshAccessToken(tokenData.refresh_token);
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

    // Initialize Drive client
    const driveClient = new GoogleDriveClient(accessToken);

    // Get file metadata
    const fileMetadata = await driveClient.getFile(fileId);

    // Determine file content based on type
    let fileContent: Blob;
    let fileName = fileMetadata.name;
    let finalMimeType = fileMetadata.mimeType;

    if (isGoogleWorkspaceApp(fileMetadata.mimeType)) {
      // Export Google Workspace files
      const exportMimeType = getExportMimeType(fileMetadata.mimeType);
      fileContent = await driveClient.exportFile(fileId, exportMimeType);
      
      // Update file extension based on export type
      const extensionMap: Record<string, string> = {
        'text/html': '.html',
        'text/csv': '.csv',
        'application/pdf': '.pdf',
        'image/png': '.png',
      };
      const extension = extensionMap[exportMimeType] || '';
      if (extension && !fileName.endsWith(extension)) {
        fileName = fileName + extension;
      }
      finalMimeType = exportMimeType;
    } else {
      // Download regular files
      fileContent = await driveClient.downloadFile(fileId);
    }

    // Upload to Supabase storage
    const fileBuffer = await fileContent.arrayBuffer();
    const storagePath = `${brandId}/drive-imports/${Date.now()}-${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('brand-documents')
      .upload(storagePath, fileBuffer, {
        contentType: finalMimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('brand-documents')
      .getPublicUrl(storagePath);

    // Create document record
    const { data: document, error: docError } = await supabase
      .from('brand_documents_v2')
      .insert({
        brand_id: brandId,
        created_by: user.id,
        doc_type: 'file',
        title: fileMetadata.name,
        description: `Imported from Google Drive`,
        file_name: fileName,
        file_size: parseInt(fileMetadata.size || '0') || fileContent.size,
        file_type: finalMimeType,
        storage_path: storagePath,
        public_url: publicUrl,
        category,
        visibility,
        tags,
        // Drive provenance fields
        drive_file_id: fileId,
        drive_mime_type: fileMetadata.mimeType,
        drive_owner: fileMetadata.owners?.[0]?.emailAddress || null,
        drive_web_view_link: fileMetadata.webViewLink || null,
        drive_last_synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (docError) {
      console.error('Document creation error:', docError);
      // Clean up uploaded file
      await supabase.storage.from('brand-documents').remove([storagePath]);
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      );
    }

    // Trigger async RAG indexing for the imported file
    // Import dynamically to avoid server/client issues
    import('@/lib/document-service').then(({ indexDriveImport }) => {
      indexDriveImport(document.id).catch(err => {
        console.error('Failed to index Drive import:', err);
      });
    });

    return NextResponse.json({
      success: true,
      document,
      message: `Successfully imported "${fileMetadata.name}" from Google Drive`,
    });
  } catch (error) {
    console.error('Google Drive import error:', error);
    return NextResponse.json(
      { error: 'Failed to import file' },
      { status: 500 }
    );
  }
}

