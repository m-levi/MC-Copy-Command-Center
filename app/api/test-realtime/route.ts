import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

/**
 * Test endpoint to verify Supabase Realtime is working
 * GET /api/test-realtime
 */
export async function GET() {
  try {
    const supabase = createClient();
    
    // Test 1: Check if we can create a channel
    const testChannel = supabase.channel('test-channel-' + Date.now());
    
    let subscriptionStatus = 'unknown';
    let error: any = null;
    
    // Test 2: Try to subscribe
    const subscribePromise = new Promise((resolve) => {
      testChannel.subscribe((status, err) => {
        subscriptionStatus = status;
        error = err;
        
        if (status === 'SUBSCRIBED') {
          resolve({ status, error: null });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          resolve({ status, error: err });
        }
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (subscriptionStatus === 'unknown') {
          resolve({ status: 'timeout', error: 'Connection timed out after 5s' });
        }
      }, 5000);
    });
    
    const result = await subscribePromise;
    
    // Clean up
    await supabase.removeChannel(testChannel);
    
    return NextResponse.json({
      success: subscriptionStatus === 'SUBSCRIBED',
      status: subscriptionStatus,
      error: error?.message || null,
      message: subscriptionStatus === 'SUBSCRIBED' 
        ? 'Realtime is working! ✅' 
        : 'Realtime connection failed. Check Supabase Dashboard → Database → Replication',
      details: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to test Realtime connection',
    }, { status: 500 });
  }
}

