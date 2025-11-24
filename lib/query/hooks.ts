/**
 * Data fetching hooks using the lightweight query implementation
 * These provide React Query-like API for common data needs
 */

import { useQuery, invalidateQueries } from './use-query';
import { createClient } from '@/lib/supabase/client';
import { Brand, Conversation, Message, Organization } from '@/types';

/**
 * Fetch a single brand
 */
export function useBrand(brandId: string | null) {
  const supabase = createClient();
  
  return useQuery<Brand | null>(
    ['brand', brandId || ''],
    async () => {
      if (!brandId) return null;
      
      const { data, error } = await supabase
        .from('brands')
        .select('id, user_id, organization_id, created_by, name, brand_details, brand_guidelines, copywriting_style_guide, website_url, created_at, updated_at')
        .eq('id', brandId)
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      enabled: !!brandId,
      staleTime: 60 * 1000, // 1 minute
    }
  );
}

/**
 * Fetch conversations for a brand
 */
export function useConversations(brandId: string | null) {
  const supabase = createClient();
  
  return useQuery<Conversation[]>(
    ['conversations', brandId || ''],
    async () => {
      if (!brandId) return [];
      
      const { data, error } = await supabase
        .from('conversations')
        .select('id, brand_id, user_id, title, model, conversation_type, mode, created_at, updated_at, is_pinned, is_archived, last_message_preview, last_message_at, parent_conversation_id, is_flow, flow_type, flow_sequence_order, flow_email_title')
        .eq('brand_id', brandId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    {
      enabled: !!brandId,
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: true,
    }
  );
}

/**
 * Fetch messages for a conversation
 */
export function useMessages(conversationId: string | null) {
  const supabase = createClient();
  
  return useQuery<Message[]>(
    ['messages', conversationId || ''],
    async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, role, content, thinking, created_at, metadata, edited_at, parent_message_id, user_id')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    {
      enabled: !!conversationId,
      staleTime: 5 * 1000, // 5 seconds - messages change frequently
    }
  );
}

/**
 * Fetch current user's organization
 */
export function useOrganization(userId: string | null) {
  const supabase = createClient();
  
  return useQuery<Organization | null>(
    ['organization', userId || ''],
    async () => {
      if (!userId) return null;
      
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .single();
      
      if (memberError || !memberData) return null;
      
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('id', memberData.organization_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      enabled: !!userId,
      staleTime: 5 * 60 * 1000, // 5 minutes - organization rarely changes
    }
  );
}

/**
 * Invalidation helpers
 */
export const queryInvalidation = {
  brand: (brandId: string) => invalidateQueries(`brand:${brandId}`),
  conversations: (brandId: string) => invalidateQueries(`conversations:${brandId}`),
  messages: (conversationId: string) => invalidateQueries(`messages:${conversationId}`),
  all: () => {
    invalidateQueries('brand');
    invalidateQueries('conversations');
    invalidateQueries('messages');
    invalidateQueries('organization');
  },
};


