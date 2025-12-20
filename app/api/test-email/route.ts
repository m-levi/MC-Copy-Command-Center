import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendCommentAddedEmail } from '@/lib/email-service';

export const runtime = 'nodejs';

// POST: Test email sending
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's email from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', user.id)
      .single();

    if (!profile?.email) {
      return NextResponse.json({ error: 'No email found in profile' }, { status: 400 });
    }

    console.log('[Test Email] Sending test email to:', profile.email);
    console.log('[Test Email] RESEND_API_KEY is set:', !!process.env.RESEND_API_KEY);
    console.log('[Test Email] EMAIL_FROM:', process.env.EMAIL_FROM || 'onboarding@resend.dev');

    // Send a test email
    const result = await sendCommentAddedEmail({
      to: profile.email,
      commenterName: 'Test User',
      commentContent: 'This is a test comment to verify email notifications are working.',
      conversationTitle: 'Test Conversation',
      brandName: 'Test Brand',
      conversationLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`,
    });

    console.log('[Test Email] Send result:', result);

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Test email sent to ${profile.email}` 
        : 'Failed to send email',
      details: result,
      config: {
        resendKeySet: !!process.env.RESEND_API_KEY,
        emailFrom: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        recipientEmail: profile.email,
      }
    });
  } catch (error: any) {
    console.error('[Test Email] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
    }, { status: 500 });
  }
}

// GET: Check email configuration
export async function GET() {
  return NextResponse.json({
    resendKeySet: !!process.env.RESEND_API_KEY,
    resendKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 6) || 'not set',
    emailFrom: process.env.EMAIL_FROM || 'onboarding@resend.dev (default)',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000 (default)',
  });
}























