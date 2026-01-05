/**
 * Google Drive Service
 * Handles OAuth, token management, and Drive API operations
 */

import { createClient } from '@/lib/supabase/client';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/google/drive/callback`
  : 'http://localhost:3000/api/google/drive/callback';

// Required scopes for Drive access
const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export interface GoogleToken {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_at: Date | null;
  scope: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
  owners?: Array<{ displayName: string; emailAddress: string }>;
  parents?: string[];
  starred?: boolean;
}

export interface DriveFileList {
  files: DriveFile[];
  nextPageToken?: string;
}

/**
 * Generate OAuth URL for Google Drive authorization
 */
export function getGoogleAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    ...(state && { state }),
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleToken> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange code for tokens');
  }

  const data = await response.json();
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type || 'Bearer',
    expires_at: data.expires_in 
      ? new Date(Date.now() + data.expires_in * 1000)
      : null,
    scope: data.scope,
  };
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleToken> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to refresh token');
  }

  const data = await response.json();
  
  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // Keep original refresh token
    token_type: data.token_type || 'Bearer',
    expires_at: data.expires_in 
      ? new Date(Date.now() + data.expires_in * 1000)
      : null,
    scope: data.scope,
  };
}

/**
 * Check if token is expired or about to expire (within 5 minutes)
 */
export function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  const bufferMs = 5 * 60 * 1000; // 5 minutes
  return new Date(expiresAt).getTime() - bufferMs < Date.now();
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(token: GoogleToken): Promise<string> {
  if (!isTokenExpired(token.expires_at)) {
    return token.access_token;
  }

  if (!token.refresh_token) {
    throw new Error('Token expired and no refresh token available');
  }

  const newToken = await refreshAccessToken(token.refresh_token);
  return newToken.access_token;
}

/**
 * Google Drive API wrapper class
 */
export class GoogleDriveClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`https://www.googleapis.com/drive/v3${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `Drive API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * List files from Google Drive
   */
  async listFiles(options: {
    pageSize?: number;
    pageToken?: string;
    query?: string;
    orderBy?: string;
    folderId?: string;
    fields?: string;
  } = {}): Promise<DriveFileList> {
    const {
      pageSize = 20,
      pageToken,
      query,
      orderBy = 'modifiedTime desc',
      folderId,
      fields = 'nextPageToken,files(id,name,mimeType,webViewLink,thumbnailLink,iconLink,createdTime,modifiedTime,size,owners,parents,starred)',
    } = options;

    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
      orderBy,
      fields,
      ...(pageToken && { pageToken }),
    });

    // Build query
    let q = 'trashed = false';
    if (folderId) {
      q += ` and '${folderId}' in parents`;
    }
    if (query) {
      q += ` and (name contains '${query}' or fullText contains '${query}')`;
    }
    params.set('q', q);

    return this.request<DriveFileList>(`/files?${params.toString()}`);
  }

  /**
   * Get a specific file's metadata
   */
  async getFile(fileId: string, fields?: string): Promise<DriveFile> {
    const defaultFields = 'id,name,mimeType,webViewLink,thumbnailLink,iconLink,createdTime,modifiedTime,size,owners,parents,starred';
    const params = new URLSearchParams({ fields: fields || defaultFields });
    return this.request<DriveFile>(`/files/${fileId}?${params.toString()}`);
  }

  /**
   * Download file content
   */
  async downloadFile(fileId: string): Promise<Blob> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }

    return response.blob();
  }

  /**
   * Export Google Doc as specified format
   */
  async exportFile(fileId: string, mimeType: string): Promise<Blob> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(mimeType)}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to export file: ${response.status}`);
    }

    return response.blob();
  }

  /**
   * Get user info
   */
  async getUserInfo(): Promise<{ email: string; name: string; picture?: string }> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return response.json();
  }
}

// Helper to get mime type display name
export function getMimeTypeLabel(mimeType: string): string {
  const mimeTypeMap: Record<string, string> = {
    'application/vnd.google-apps.document': 'Google Doc',
    'application/vnd.google-apps.spreadsheet': 'Google Sheet',
    'application/vnd.google-apps.presentation': 'Google Slides',
    'application/vnd.google-apps.folder': 'Folder',
    'application/vnd.google-apps.form': 'Google Form',
    'application/pdf': 'PDF',
    'image/jpeg': 'Image',
    'image/png': 'Image',
    'image/gif': 'Image',
    'text/plain': 'Text File',
    'text/html': 'HTML File',
    'application/json': 'JSON File',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Doc',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
  };
  return mimeTypeMap[mimeType] || 'File';
}

// Check if a mime type is a Google Workspace app (not downloadable directly)
export function isGoogleWorkspaceApp(mimeType: string): boolean {
  return mimeType.startsWith('application/vnd.google-apps.');
}

// Get export mime type for Google Workspace files
export function getExportMimeType(googleMimeType: string): string {
  const exportMap: Record<string, string> = {
    'application/vnd.google-apps.document': 'text/html',
    'application/vnd.google-apps.spreadsheet': 'text/csv',
    'application/vnd.google-apps.presentation': 'application/pdf',
    'application/vnd.google-apps.drawing': 'image/png',
  };
  return exportMap[googleMimeType] || 'application/pdf';
}

















