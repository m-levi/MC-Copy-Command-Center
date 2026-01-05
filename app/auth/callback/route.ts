import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const next = requestUrl.searchParams.get('next') || '/';

  // Handle OAuth/Magic Link errors
  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    const errorUrl = new URL('/login', requestUrl.origin);
    errorUrl.searchParams.set('error', errorDescription || error);
    return NextResponse.redirect(errorUrl);
  }

  if (code) {
    try {
      const supabase = await createClient();
      
      // Exchange the code for a session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        const errorUrl = new URL('/login', requestUrl.origin);
        errorUrl.searchParams.set('error', 'Failed to authenticate. Please try again.');
        return NextResponse.redirect(errorUrl);
      }

      if (data.user) {
        // Track the login
        try {
          await fetch(new URL('/api/auth/login', requestUrl.origin).toString(), {
            method: 'POST',
            headers: {
              'Cookie': request.headers.get('cookie') || '',
            },
          });
        } catch (trackError) {
          console.error('Failed to track login:', trackError);
        }
      }

      // Redirect to the intended destination
      return NextResponse.redirect(new URL(next, requestUrl.origin));
      
    } catch (err: any) {
      console.error('Auth callback error:', err);
      const errorUrl = new URL('/login', requestUrl.origin);
      errorUrl.searchParams.set('error', 'Authentication failed. Please try again.');
      return NextResponse.redirect(errorUrl);
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}























