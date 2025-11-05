import { createClient } from '@/lib/supabase/server';
import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user (should be just logged in)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request info
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || null;

    // Extract device info
    let deviceInfo = 'Unknown Device';
    if (userAgent.includes('Windows')) deviceInfo = 'Windows PC';
    else if (userAgent.includes('Mac')) deviceInfo = 'Mac';
    else if (userAgent.includes('Linux')) deviceInfo = 'Linux PC';
    else if (userAgent.includes('iPhone')) deviceInfo = 'iPhone';
    else if (userAgent.includes('iPad')) deviceInfo = 'iPad';
    else if (userAgent.includes('Android')) deviceInfo = 'Android Device';

    // Record login via database function
    const { error: loginError } = await supabase.rpc('record_login_attempt', {
      p_user_id: user.id,
      p_success: true,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });

    if (loginError) {
      console.error('Error recording login:', loginError);
    }

    // Create session
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        device_info: deviceInfo,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (sessionError) {
      console.error('Error creating session:', sessionError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Login tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


