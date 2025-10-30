import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the origin from the request headers to build the redirect URL
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const redirectUrl = `${origin}/reset-password`;

    console.log('Sending password reset email to:', email);
    console.log('Redirect URL:', redirectUrl);

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('Password reset error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      // Don't reveal if email exists or not for security
      return NextResponse.json({ 
        message: 'If an account exists with this email, a password reset link has been sent.' 
      });
    }

    console.log('Password reset email sent successfully');

    return NextResponse.json({ 
      message: 'If an account exists with this email, a password reset link has been sent.' 
    });
  } catch (error: any) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

