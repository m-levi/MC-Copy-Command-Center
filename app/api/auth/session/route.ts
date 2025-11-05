import { createClient } from '@/lib/supabase/server';
import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get device info from request
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'Unknown';

    // Extract device info from user agent
    let deviceInfo = 'Unknown Device';
    if (userAgent.includes('Windows')) deviceInfo = 'Windows PC';
    else if (userAgent.includes('Mac')) deviceInfo = 'Mac';
    else if (userAgent.includes('Linux')) deviceInfo = 'Linux PC';
    else if (userAgent.includes('iPhone')) deviceInfo = 'iPhone';
    else if (userAgent.includes('iPad')) deviceInfo = 'iPad';
    else if (userAgent.includes('Android')) deviceInfo = 'Android Device';

    // Check if session exists
    const { data: existingSession } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('user_agent', userAgent)
      .single();

    if (existingSession) {
      // Update existing session
      const { error: updateError } = await supabase
        .from('user_sessions')
        .update({ 
          last_activity: new Date().toISOString(),
          ip_address: ipAddress,
        })
        .eq('id', existingSession.id);

      if (updateError) {
        console.error('Error updating session:', updateError);
      }
    } else {
      // Create new session
      const { error: insertError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          device_info: deviceInfo,
          ip_address: ipAddress,
          user_agent: userAgent,
        });

      if (insertError) {
        console.error('Error creating session:', insertError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Session tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a specific session
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id); // Ensure user can only delete their own sessions

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Session deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


