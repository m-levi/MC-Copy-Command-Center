import { Message, ConversationContext, ConversationSummary } from '@/types';
import { createClient } from '@/lib/supabase/server';

/**
 * Extract conversation context from messages
 */
export function extractConversationContext(messages: Message[]): ConversationContext {
  const context: ConversationContext = {
    goals: [],
    keyPoints: [],
  };

  // Analyze messages to extract context
  for (const message of messages) {
    if (message.role === 'user') {
      const content = (message.content ?? '').toLowerCase();
      
      // Detect campaign type
      if (content.includes('launch') || content.includes('announcement')) {
        context.campaignType = 'product_launch';
      } else if (content.includes('promo') || content.includes('sale') || content.includes('discount')) {
        context.campaignType = 'promotional';
      } else if (content.includes('welcome') || content.includes('onboard')) {
        context.campaignType = 'welcome';
      } else if (content.includes('abandon') || content.includes('cart')) {
        context.campaignType = 'abandoned_cart';
      }
      
      // Detect tone preferences
      if (content.includes('casual') || content.includes('friendly')) {
        context.tone = 'casual';
      } else if (content.includes('professional') || content.includes('formal')) {
        context.tone = 'professional';
      } else if (content.includes('urgent') || content.includes('scarcity')) {
        context.tone = 'urgent';
      }
      
      // Extract key goals
      if (content.includes('increase') || content.includes('boost')) {
        context.goals?.push('increase_engagement');
      }
      if (content.includes('convert') || content.includes('purchase')) {
        context.goals?.push('drive_conversions');
      }
    }
    
    // Store metadata context if available
    if (message.metadata?.context) {
      Object.assign(context, message.metadata.context);
    }
  }

  return context;
}

/**
 * Build intelligent message context for AI
 * Returns the most relevant messages + summary
 */
export function buildMessageContext(
  messages: Message[],
  summary?: ConversationSummary,
  maxMessages: number = 10
): Message[] {
  // Always include the most recent messages
  const recentMessages = messages.slice(-maxMessages);
  
  // If we have a summary and lots of messages, use it
  if (summary && messages.length > maxMessages) {
    // Create a system message with the summary
    const summaryMessage: Message = {
      id: 'summary',
      conversation_id: messages[0]?.conversation_id || '',
      role: 'system',
      content: `Previous conversation summary: ${summary.summary}`,
      created_at: summary.created_at,
    };
    
    return [summaryMessage, ...recentMessages];
  }
  
  return recentMessages;
}

/**
 * Generate a conversation summary using AI
 */
export async function generateConversationSummary(
  messages: Message[],
  apiKey: string
): Promise<string> {
  // Only summarize if we have enough messages
  if (messages.length < 4) {
    return '';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Summarize this email copywriting conversation in 2-3 sentences. Focus on the campaign type, key requirements, tone preferences, and any specific goals mentioned.',
          },
          {
            role: 'user',
            content: messages.map(m => `${m.role}: ${m.content}`).join('\n\n'),
          },
        ],
        max_tokens: 150,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error generating summary:', error);
    return '';
  }
}

/**
 * Save conversation summary to database
 */
export async function saveConversationSummary(
  conversationId: string,
  summary: string,
  messageCount: number
): Promise<ConversationSummary | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('conversation_summaries')
      .insert({
        conversation_id: conversationId,
        summary,
        message_count: messageCount,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving summary:', error);
    return null;
  }
}

/**
 * Get latest conversation summary
 */
export async function getLatestSummary(
  conversationId: string
): Promise<ConversationSummary | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('conversation_summaries')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Check if we should create a new summary
 */
export function shouldCreateSummary(
  messageCount: number,
  lastSummaryMessageCount?: number
): boolean {
  // Create summary every 10 messages
  const summaryInterval = 10;
  
  if (!lastSummaryMessageCount) {
    return messageCount >= summaryInterval;
  }
  
  return messageCount - lastSummaryMessageCount >= summaryInterval;
}


