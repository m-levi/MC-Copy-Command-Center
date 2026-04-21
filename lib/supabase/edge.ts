import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client for Edge runtime
 * This version doesn't rely on Next.js cookies and is suitable for Edge functions
 */
export function createEdgeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  
  if (!serviceRoleKey) {
    // Silently fall back to anon key for operations that don't require elevated privileges
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error('Missing Supabase credentials for Edge runtime');
    }
    return createSupabaseClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // Use service role key for server-side operations
  // This bypasses RLS and should only be used in secure server contexts
  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client with user context for Edge runtime
 * Use this when you have a user's access token from the request
 */
export function createEdgeClientWithAuth(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables for Edge runtime');
  }

  return createSupabaseClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

