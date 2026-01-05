import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting (in production, use Redis/KV)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 3; // 3 attempts per window

function checkRateLimit(email: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = email.toLowerCase();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((record.resetAt - now) / 1000) 
    };
  }

  record.count++;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check rate limit
    const rateLimit = checkRateLimit(email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: `Too many requests. Please try again in ${rateLimit.retryAfter} seconds.`,
          retryAfter: rateLimit.retryAfter 
        },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    
    // Get the origin from the request
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const redirectTo = `${origin}/auth/callback`;

    // Send magic link using Supabase
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false, // Only allow existing users
      },
    });

    if (error) {
      console.error('Magic link error:', error);
      
      // Don't reveal if user exists or not
      if (error.message.includes('User not found') || error.message.includes('Signups not allowed')) {
        // Still return success to prevent email enumeration
        return NextResponse.json({ 
          message: 'If an account exists with this email, a sign-in link has been sent.' 
        });
      }
      
      throw error;
    }

    return NextResponse.json({ 
      message: 'If an account exists with this email, a sign-in link has been sent.' 
    });

  } catch (error: any) {
    console.error('Magic link request error:', error);
    return NextResponse.json(
      { error: 'Failed to send magic link. Please try again.' },
      { status: 500 }
    );
  }
}























