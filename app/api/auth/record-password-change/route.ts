import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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

    // Call the function to record password change
    // Note: This requires service role permissions
    const { error: recordError } = await supabase.rpc('record_password_change', {
      p_user_id: user.id
    });

    if (recordError) {
      console.error('Error recording password change:', recordError);
      // Don't fail the whole operation if logging fails
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Password change recording error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

