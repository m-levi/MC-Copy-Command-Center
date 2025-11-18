import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validationError,
  authenticationError,
  withErrorHandling,
} from '@/lib/api-error';

export const runtime = 'nodejs';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'all'; // 'all', 'brands', 'conversations', 'messages'
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
  const offset = (page - 1) * limit;

  // Filters
  const brandId = searchParams.get('brandId');
  const conversationId = searchParams.get('conversationId');
  const userId = searchParams.get('userId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const status = searchParams.get('status');

  // Verify authentication
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in to search');
  }

  // Get user's organization
  const { data: orgMember } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!orgMember) {
    return NextResponse.json({ error: 'No organization found' }, { status: 403 });
  }

  const results: any = {
    query,
    type,
    page,
    limit,
    total: 0,
    results: [],
  };

  // If no query, return empty results
  if (!query.trim()) {
    return NextResponse.json(results);
  }

  try {
    if (type === 'all' || type === 'brands') {
      // Search brands
      let brandsQuery = supabase
        .from('brands')
        .select('id, name, brand_details, created_at, updated_at', { count: 'exact' })
        .eq('organization_id', orgMember.organization_id)
        .textSearch('search_vector', query, {
          type: 'plain',
          config: 'english',
        })
        .order('created_at', { ascending: false });

      if (userId) {
        brandsQuery = brandsQuery.eq('user_id', userId);
      }
      if (dateFrom) {
        brandsQuery = brandsQuery.gte('created_at', dateFrom);
      }
      if (dateTo) {
        brandsQuery = brandsQuery.lte('created_at', dateTo);
      }

      const { data: brands, count: brandsCount } = await brandsQuery
        .range(offset, offset + limit - 1);

      if (brands) {
        results.results.push(
          ...brands.map((b) => ({
            type: 'brand',
            id: b.id,
            title: b.name,
            content: b.brand_details,
            created_at: b.created_at,
            updated_at: b.updated_at,
          }))
        );
        results.total += brandsCount || 0;
      }
    }

    if (type === 'all' || type === 'conversations') {
      // Search conversations
      let conversationsQuery = supabase
        .from('conversations')
        .select('id, title, description, created_at, updated_at, brand_id', { count: 'exact' })
        .eq('user_id', user.id) // User can only search their own conversations
        .textSearch('search_vector', query, {
          type: 'plain',
          config: 'english',
        })
        .order('created_at', { ascending: false });

      if (brandId) {
        conversationsQuery = conversationsQuery.eq('brand_id', brandId);
      }
      if (dateFrom) {
        conversationsQuery = conversationsQuery.gte('created_at', dateFrom);
      }
      if (dateTo) {
        conversationsQuery = conversationsQuery.lte('created_at', dateTo);
      }

      const { data: conversations, count: conversationsCount } = await conversationsQuery
        .range(offset, offset + limit - 1);

      if (conversations) {
        results.results.push(
          ...conversations.map((c) => ({
            type: 'conversation',
            id: c.id,
            title: c.title,
            content: c.description,
            created_at: c.created_at,
            updated_at: c.updated_at,
            brand_id: c.brand_id,
          }))
        );
        results.total += conversationsCount || 0;
      }
    }

    if (type === 'all' || type === 'messages') {
      // Search messages
      let messagesQuery = supabase
        .from('messages')
        .select('id, content, created_at, conversation_id, role', { count: 'exact' })
        .textSearch('search_vector', query, {
          type: 'plain',
          config: 'english',
        })
        .order('created_at', { ascending: false });

      // Only search messages from user's conversations
      const { data: userConversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id);

      if (userConversations && userConversations.length > 0) {
        const conversationIds = userConversations.map((c) => c.id);
        messagesQuery = messagesQuery.in('conversation_id', conversationIds);
      } else {
        // No conversations, return empty
        messagesQuery = messagesQuery.eq('conversation_id', '00000000-0000-0000-0000-000000000000');
      }

      if (conversationId) {
        messagesQuery = messagesQuery.eq('conversation_id', conversationId);
      }
      if (dateFrom) {
        messagesQuery = messagesQuery.gte('created_at', dateFrom);
      }
      if (dateTo) {
        messagesQuery = messagesQuery.lte('created_at', dateTo);
      }

      const { data: messages, count: messagesCount } = await messagesQuery
        .range(offset, offset + limit - 1);

      if (messages) {
        results.results.push(
          ...messages.map((m) => ({
            type: 'message',
            id: m.id,
            title: `Message from ${m.role}`,
            content: m.content,
            created_at: m.created_at,
            conversation_id: m.conversation_id,
            role: m.role,
          }))
        );
        results.total += messagesCount || 0;
      }
    }

    // Sort results by relevance (simplified - could use ts_rank in future)
    results.results.sort((a: any, b: any) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
});




