import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

// Singleton instance for client reuse across the app
let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Create or reuse Supabase client instance
 * Uses singleton pattern to avoid creating multiple clients
 */
export function createClient(): SupabaseClient {
  // Return existing instance if available
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
    );
  }
  
  // Create and cache the instance
  supabaseClientInstance = createBrowserClient(url, key);
  return supabaseClientInstance;
}

