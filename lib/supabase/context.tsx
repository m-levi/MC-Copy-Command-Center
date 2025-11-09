'use client';

import { createContext, useContext, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

// Singleton instance for client reuse
let supabaseClientInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
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
  
  supabaseClientInstance = createBrowserClient(url, key);
  return supabaseClientInstance;
}

// Context for React components
const SupabaseContext = createContext<SupabaseClient | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getSupabaseClient(), []);
  
  return (
    <SupabaseContext.Provider value={client}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    // Fallback to singleton if context not available (for backward compatibility)
    return getSupabaseClient();
  }
  return context;
}

// Export singleton getter for non-React code
export { getSupabaseClient };

