import { createClient } from '@/lib/supabase/client';
import { Conversation, Message } from '@/types';
import toast from 'react-hot-toast';

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
    console.error('Error toggling pin:', error);
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
    console.error('Error toggling archive:', error);
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
    console.error('Error duplicating conversation:', error);
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
    console.error('Error exporting conversation:', error);
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
    console.error('Error exporting conversation:', error);
    toast.error('Failed to export conversation');
  }
}







