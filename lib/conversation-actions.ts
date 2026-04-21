import { createClient } from '@/lib/supabase/client';
import { Conversation, Message, BulkActionType } from '@/types';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

/**
 * Pin or unpin a conversation
 */
export async function togglePinConversation(conversationId: string, isPinned: boolean): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('conversations')
      .update({ is_pinned: isPinned })
      .eq('id', conversationId);

    if (error) throw error;
    
    toast.success(isPinned ? 'Conversation pinned' : 'Conversation unpinned');
    return true;
  } catch (error) {
    logger.error('Error toggling pin:', error);
    toast.error('Failed to update conversation');
    return false;
  }
}

/**
 * Archive or unarchive a conversation
 */
export async function toggleArchiveConversation(conversationId: string, isArchived: boolean): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('conversations')
      .update({ is_archived: isArchived })
      .eq('id', conversationId);

    if (error) throw error;
    
    toast.success(isArchived ? 'Conversation archived' : 'Conversation unarchived');
    return true;
  } catch (error) {
    logger.error('Error toggling archive:', error);
    toast.error('Failed to update conversation');
    return false;
  }
}

/**
 * Duplicate a conversation with all its messages
 */
export async function duplicateConversation(
  conversationId: string,
  userId: string,
  userName: string
): Promise<Conversation | null> {
  try {
    const supabase = createClient();

    // Get the original conversation
    const { data: originalConv, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    // Create a new conversation
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        brand_id: originalConv.brand_id,
        user_id: userId,
        created_by_name: userName,
        title: `${originalConv.title} (Copy)`,
        model: originalConv.model,
        conversation_type: originalConv.conversation_type,
        mode: originalConv.mode,
      })
      .select()
      .single();

    if (createError) throw createError;

    // Get all messages from original conversation
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    // Insert messages into new conversation
    if (messages && messages.length > 0) {
      const newMessages = messages.map((msg) => ({
        conversation_id: newConv.id,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata,
      }));

      const { error: insertError } = await supabase
        .from('messages')
        .insert(newMessages);

      if (insertError) throw insertError;
    }

    toast.success('Conversation duplicated successfully');
    return newConv;
  } catch (error) {
    logger.error('Error duplicating conversation:', error);
    toast.error('Failed to duplicate conversation');
    return null;
  }
}

/**
 * Export conversation as JSON
 */
export async function exportConversation(conversationId: string): Promise<void> {
  try {
    const supabase = createClient();

    // Get conversation and messages
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    const exportData = {
      conversation,
      messages,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    // Create download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversation.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Conversation exported');
  } catch (error) {
    logger.error('Error exporting conversation:', error);
    toast.error('Failed to export conversation');
  }
}

/**
 * Export conversation as Markdown
 */
export async function exportConversationAsMarkdown(conversationId: string): Promise<void> {
  try {
    const supabase = createClient();

    // Get conversation and messages
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    // Build markdown content
    let markdown = `# ${conversation.title}\n\n`;
    markdown += `**Created:** ${new Date(conversation.created_at).toLocaleString()}\n`;
    markdown += `**Model:** ${conversation.model}\n`;
    markdown += `**Mode:** ${conversation.mode}\n\n`;
    markdown += `---\n\n`;

    messages?.forEach((msg, index) => {
      markdown += `## ${msg.role === 'user' ? 'User' : 'Assistant'} ${index + 1}\n\n`;
      markdown += `${msg.content}\n\n`;
      markdown += `*${new Date(msg.created_at).toLocaleString()}*\n\n`;
      markdown += `---\n\n`;
    });

    // Create download
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversation.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Conversation exported as Markdown');
  } catch (error) {
    logger.error('Error exporting conversation:', error);
    toast.error('Failed to export conversation');
  }
}

/**
 * Delete a conversation permanently
 */
export async function deleteConversation(conversationId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Delete the conversation (messages will be cascade deleted)
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) throw error;
    
    toast.success('Conversation deleted');
    return true;
  } catch (error) {
    logger.error('Error deleting conversation:', error);
    toast.error('Failed to delete conversation');
    return false;
  }
}

/**
 * Bulk delete conversations
 */
export async function bulkDeleteConversations(conversationIds: string[]): Promise<number> {
  try {
    const supabase = createClient();
    
    const { error, count } = await supabase
      .from('conversations')
      .delete()
      .in('id', conversationIds);

    if (error) throw error;
    
    const deletedCount = count || conversationIds.length;
    toast.success(`${deletedCount} conversation${deletedCount > 1 ? 's' : ''} deleted`);
    return deletedCount;
  } catch (error) {
    logger.error('Error bulk deleting conversations:', error);
    toast.error('Failed to delete conversations');
    return 0;
  }
}

/**
 * Bulk archive conversations
 */
export async function bulkArchiveConversations(conversationIds: string[], archive: boolean): Promise<number> {
  try {
    const supabase = createClient();
    
    const { error, count } = await supabase
      .from('conversations')
      .update({ is_archived: archive })
      .in('id', conversationIds);

    if (error) throw error;
    
    const updatedCount = count || conversationIds.length;
    toast.success(`${updatedCount} conversation${updatedCount > 1 ? 's' : ''} ${archive ? 'archived' : 'unarchived'}`);
    return updatedCount;
  } catch (error) {
    logger.error('Error bulk archiving conversations:', error);
    toast.error('Failed to update conversations');
    return 0;
  }
}

/**
 * Bulk pin conversations
 */
export async function bulkPinConversations(conversationIds: string[], pin: boolean): Promise<number> {
  try {
    const supabase = createClient();
    
    const { error, count } = await supabase
      .from('conversations')
      .update({ is_pinned: pin })
      .in('id', conversationIds);

    if (error) throw error;
    
    const updatedCount = count || conversationIds.length;
    toast.success(`${updatedCount} conversation${updatedCount > 1 ? 's' : ''} ${pin ? 'pinned' : 'unpinned'}`);
    return updatedCount;
  } catch (error) {
    logger.error('Error bulk pinning conversations:', error);
    toast.error('Failed to update conversations');
    return 0;
  }
}

/**
 * Bulk export conversations
 */
export async function bulkExportConversations(conversationIds: string[]): Promise<void> {
  try {
    const supabase = createClient();
    const exportData: any[] = [];

    // Fetch all conversations and their messages
    for (const id of conversationIds) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single();

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (conversation) {
        exportData.push({
          conversation,
          messages: messages || [],
        });
      }
    }

    // Create download
    const blob = new Blob([JSON.stringify({
      conversations: exportData,
      exportedAt: new Date().toISOString(),
      count: exportData.length,
      version: '1.0'
    }, null, 2)], { type: 'application/json' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversations-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`${exportData.length} conversation${exportData.length > 1 ? 's' : ''} exported`);
  } catch (error) {
    logger.error('Error bulk exporting conversations:', error);
    toast.error('Failed to export conversations');
  }
}

/**
 * Execute a bulk action on multiple conversations
 */
export async function executeBulkAction(
  action: BulkActionType,
  conversationIds: string[]
): Promise<number> {
  if (conversationIds.length === 0) {
    toast.error('No conversations selected');
    return 0;
  }

  switch (action) {
    case 'delete':
      return await bulkDeleteConversations(conversationIds);
    case 'archive':
      return await bulkArchiveConversations(conversationIds, true);
    case 'unarchive':
      return await bulkArchiveConversations(conversationIds, false);
    case 'pin':
      return await bulkPinConversations(conversationIds, true);
    case 'unpin':
      return await bulkPinConversations(conversationIds, false);
    case 'export':
      await bulkExportConversations(conversationIds);
      return conversationIds.length;
    default:
      toast.error('Invalid bulk action');
      return 0;
  }
}










