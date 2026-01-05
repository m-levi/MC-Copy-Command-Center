import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Skip Supabase check if environment variables are not set (during build)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow access to public auth pages and shared conversations
  const publicPaths = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/auth/confirm',
    '/auth/callback',
    '/shared',  // Allow unauthenticated access to shared conversations
  ];
  
  // Pages that require auth but not organization membership
  const noOrgRequiredPaths = [
    '/onboarding',
    '/api',  // API routes handle their own auth
  ];
  
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );
  
  const isNoOrgRequiredPath = noOrgRequiredPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && !isPublicPath) {
    // no user, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages (except confirmation, callback, and shared links)
  if (user && isPublicPath && 
      request.nextUrl.pathname !== '/auth/confirm' &&
      request.nextUrl.pathname !== '/auth/callback' &&
      !request.nextUrl.pathname.startsWith('/shared') &&
      !request.nextUrl.pathname.startsWith('/signup/')) {  // Allow invite signup
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Check organization membership for authenticated users on protected pages
  if (user && !isPublicPath && !isNoOrgRequiredPath) {
    // Check if user has an organization
    const { data: membership, error } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!membership && !error?.message.includes('multiple')) {
      // User has no organization, redirect to onboarding
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }
  }

  // If user is on onboarding but already has an organization, redirect to home
  if (user && request.nextUrl.pathname === '/onboarding') {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (membership) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse;
}
