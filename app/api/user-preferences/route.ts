import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const defaultEmailNotifications = {
  enabled: true,
  comment_added: true,
  comment_assigned: true,
  comment_mention: true,
  review_requested: true,
  review_completed: true,
  team_invite: true,
};

const defaultPushNotifications = {
  enabled: true,
  comment_added: true,
  comment_assigned: true,
  comment_mention: true,
  review_requested: true,
  review_completed: true,
  team_invite: true,
};

/**
 * GET /api/user-preferences
 * Fetch user preferences
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences found, return default
        return NextResponse.json({
          user_id: user.id,
          sidebar_view_mode: 'list',
          sidebar_width: 398,
          default_filter: 'all',
          pinned_conversations: [],
          archived_conversations: [],
          enabled_models: null,
          default_model: null,
          email_notifications: defaultEmailNotifications,
          push_notifications: defaultPushNotifications,
        });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-preferences
 * Create or update user preferences
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate the input
    const allowedFields = [
      'sidebar_view_mode',
      'sidebar_width',
      'default_filter',
      'default_filter_person_id',
      'pinned_conversations',
      'archived_conversations',
      'enabled_models',
      'default_model',
      'email_notifications',
      'push_notifications',
    ];

    const updates: Record<string, unknown> = {
      user_id: user.id
    };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(updates, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user-preferences
 * Partially update user preferences
 */
export async function PATCH(request: Request) {
  return POST(request); // Same logic as POST for upsert
}





























