import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/calendar/create-emails
 *
 * Create email conversations from approved briefs in a calendar.
 * This spawns child conversations linked to the parent calendar conversation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      calendarConversationId,
      briefIds,
      createAll = false,
    } = body as {
      calendarConversationId: string;
      briefIds?: string[];
      createAll?: boolean;
    };

    if (!calendarConversationId) {
      return NextResponse.json(
        { error: 'calendarConversationId is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the calendar conversation
    const { data: calendarConversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', calendarConversationId)
      .single();

    if (convError || !calendarConversation) {
      return NextResponse.json(
        { error: 'Calendar conversation not found' },
        { status: 404 }
      );
    }

    // Get the approved briefs for this conversation
    let briefsQuery = supabase
      .from('email_artifacts')
      .select('*')
      .eq('conversation_id', calendarConversationId)
      .eq('kind', 'email_brief')
      .contains('metadata', { approval_status: 'approved' });

    // If specific brief IDs are provided, filter by them
    if (briefIds && briefIds.length > 0 && !createAll) {
      briefsQuery = briefsQuery.in('id', briefIds);
    }

    const { data: briefs, error: briefsError } = await briefsQuery;

    if (briefsError) {
      console.error('Failed to fetch briefs:', briefsError);
      return NextResponse.json(
        { error: 'Failed to fetch briefs' },
        { status: 500 }
      );
    }

    if (!briefs || briefs.length === 0) {
      return NextResponse.json(
        { error: 'No approved briefs found' },
        { status: 400 }
      );
    }

    // Create child conversations for each approved brief
    const createdConversations: Array<{
      id: string;
      title: string;
      briefId: string;
    }> = [];

    for (let i = 0; i < briefs.length; i++) {
      const brief = briefs[i];
      const briefMetadata = brief.metadata || {};

      // Generate a title for the email conversation
      const emailTitle = `Email: ${brief.title}`;

      // Create the child conversation
      const conversationId = uuidv4();
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          id: conversationId,
          user_id: user.id,
          brand_id: calendarConversation.brand_id,
          title: emailTitle,
          mode: 'email_copy', // Email writing mode
          parent_conversation_id: calendarConversationId, // Link to calendar
          is_flow: true,
          flow_type: 'calendar_emails',
          flow_sequence_order: i + 1,
          // Store reference to the brief
          metadata: {
            email_brief_artifact_id: brief.id,
            send_date: briefMetadata.send_date,
            campaign_type: briefMetadata.campaign_type,
          },
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create conversation:', createError);
        continue; // Skip this one but continue with others
      }

      // Update the brief to reference the created conversation
      await supabase
        .from('email_artifacts')
        .update({
          metadata: {
            ...briefMetadata,
            email_conversation_id: conversationId,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', brief.id);

      // Create an initial system message with the brief context
      const briefContent = `## Email Brief

**Objective:** ${briefMetadata.objective || 'Not specified'}

**Key Message:** ${briefMetadata.key_message || 'Not specified'}

**Call to Action:** ${briefMetadata.call_to_action || 'Not specified'}

${briefMetadata.subject_line_direction ? `**Subject Line Direction:** ${briefMetadata.subject_line_direction}` : ''}

${briefMetadata.tone_notes ? `**Tone Notes:** ${briefMetadata.tone_notes}` : ''}

${briefMetadata.content_guidelines ? `**Content Guidelines:**\n${briefMetadata.content_guidelines}` : ''}

---

Please write the email copy based on this brief. Create A/B/C versions with different approaches.`;

      // Add the brief as the first message
      await supabase.from('messages').insert({
        id: uuidv4(),
        conversation_id: conversationId,
        role: 'user',
        content: briefContent,
        created_at: new Date().toISOString(),
      });

      createdConversations.push({
        id: conversationId,
        title: emailTitle,
        briefId: brief.id,
      });
    }

    // Mark the calendar conversation as having children
    await supabase
      .from('conversations')
      .update({
        is_flow: true,
        flow_type: 'calendar_emails',
        updated_at: new Date().toISOString(),
      })
      .eq('id', calendarConversationId);

    return NextResponse.json({
      success: true,
      createdCount: createdConversations.length,
      conversations: createdConversations,
      message: `Created ${createdConversations.length} email conversation(s) from approved briefs`,
    });
  } catch (error) {
    console.error('Error creating email conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/create-emails
 *
 * Get the status of email conversations created from a calendar.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const calendarConversationId = searchParams.get('calendarConversationId');

    if (!calendarConversationId) {
      return NextResponse.json(
        { error: 'calendarConversationId is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all briefs for this calendar
    const { data: briefs, error: briefsError } = await supabase
      .from('email_artifacts')
      .select('*')
      .eq('conversation_id', calendarConversationId)
      .eq('kind', 'email_brief')
      .order('created_at', { ascending: true });

    if (briefsError) {
      console.error('Failed to fetch briefs:', briefsError);
      return NextResponse.json(
        { error: 'Failed to fetch briefs' },
        { status: 500 }
      );
    }

    // Get child conversations
    const { data: childConversations, error: childError } = await supabase
      .from('conversations')
      .select('*')
      .eq('parent_conversation_id', calendarConversationId)
      .order('flow_sequence_order', { ascending: true });

    if (childError) {
      console.error('Failed to fetch child conversations:', childError);
    }

    // Calculate status
    const totalBriefs = briefs?.length || 0;
    const approvedBriefs = briefs?.filter(b => b.metadata?.approval_status === 'approved').length || 0;
    const createdEmails = childConversations?.length || 0;

    return NextResponse.json({
      totalBriefs,
      approvedBriefs,
      createdEmails,
      briefs: briefs?.map(b => ({
        id: b.id,
        title: b.title,
        approvalStatus: b.metadata?.approval_status || 'draft',
        hasEmailConversation: !!b.metadata?.email_conversation_id,
        emailConversationId: b.metadata?.email_conversation_id,
      })),
      childConversations: childConversations?.map(c => ({
        id: c.id,
        title: c.title,
        briefId: c.metadata?.email_brief_artifact_id,
      })),
      canCreateEmails: approvedBriefs > createdEmails,
    });
  } catch (error) {
    console.error('Error getting calendar status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
