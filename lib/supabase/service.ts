import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client with service role privileges
 * This bypasses RLS and should only be used in secure server-side contexts
 * NEVER expose this client to the browser
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('[Service Client] Missing NEXT_PUBLIC_SUPABASE_URL');
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseServiceKey) {
    console.error('[Service Client] Missing SUPABASE_SERVICE_ROLE_KEY - cannot bypass RLS');
    console.error('[Service Client] Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  console.log('[Service Client] Creating client with service role');
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

