import {
  extractConversationContext,
  buildMessageContext,
  shouldCreateSummary,
} from '@/lib/conversation-memory';
import { Message, ConversationSummary } from '@/types';

describe('conversation-memory', () => {
  describe('extractConversationContext', () => {
    it('should extract campaign type from user messages', () => {
      const messages: Message[] = [
        {
          id: '1',
          conversation_id: 'conv-1',
          role: 'user',
          content: 'Create a promotional email for our sale',
          created_at: new Date().toISOString(),
        },
      ];

      const context = extractConversationContext(messages);

      expect(context.campaignType).toBe('promotional');
      expect(context.goals).toBeDefined();
    });

    it('should detect product launch campaign', () => {
      const messages: Message[] = [
        {
          id: '1',
          conversation_id: 'conv-1',
          role: 'user',
          content: 'We are launching a new product',
          created_at: new Date().toISOString(),
        },
      ];

      const context = extractConversationContext(messages);

      expect(context.campaignType).toBe('product_launch');
    });

    it('should detect tone preferences', () => {
      const messages: Message[] = [
        {
          id: '1',
          conversation_id: 'conv-1',
          role: 'user',
          content: 'Make it casual and friendly',
          created_at: new Date().toISOString(),
        },
      ];

      const context = extractConversationContext(messages);

      expect(context.tone).toBe('casual');
    });

    it('should extract goals from messages', () => {
      const messages: Message[] = [
        {
          id: '1',
          conversation_id: 'conv-1',
          role: 'user',
          content: 'Increase engagement and drive conversions',
          created_at: new Date().toISOString(),
        },
      ];

      const context = extractConversationContext(messages);

      expect(context.goals).toContain('increase_engagement');
      expect(context.goals).toContain('drive_conversions');
    });

    it('should merge metadata context if available', () => {
      const messages: Message[] = [
        {
          id: '1',
          conversation_id: 'conv-1',
          role: 'user',
          content: 'Test message',
          created_at: new Date().toISOString(),
          metadata: {
            context: {
              campaignType: 'newsletter',
              tone: 'professional',
            },
          },
        },
      ];

      const context = extractConversationContext(messages);

      expect(context.campaignType).toBe('newsletter');
      expect(context.tone).toBe('professional');
    });

    it('should return empty context for empty messages', () => {
      const context = extractConversationContext([]);

      expect(context.goals).toEqual([]);
      expect(context.keyPoints).toEqual([]);
      expect(context.campaignType).toBeUndefined();
    });
  });

  describe('buildMessageContext', () => {
    it('should return recent messages when under limit', () => {
      const messages: Message[] = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`,
        conversation_id: 'conv-1',
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        created_at: new Date().toISOString(),
      }));

      const result = buildMessageContext(messages);

      expect(result).toHaveLength(5);
      expect(result).toEqual(messages);
    });

    it('should include summary when message count exceeds limit', () => {
      const messages: Message[] = Array.from({ length: 15 }, (_, i) => ({
        id: `${i}`,
        conversation_id: 'conv-1',
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        created_at: new Date().toISOString(),
      }));

      const summary: ConversationSummary = {
        id: 'summary-1',
        conversation_id: 'conv-1',
        summary: 'Previous conversation about email campaigns',
        message_count: 10,
        created_at: new Date().toISOString(),
      };

      const result = buildMessageContext(messages, summary, 10);

      expect(result).toHaveLength(11); // Summary + 10 recent messages
      expect(result[0].role).toBe('system');
      expect(result[0].content).toContain('Previous conversation');
    });

    it('should return only recent messages when no summary provided', () => {
      const messages: Message[] = Array.from({ length: 15 }, (_, i) => ({
        id: `${i}`,
        conversation_id: 'conv-1',
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        created_at: new Date().toISOString(),
      }));

      const result = buildMessageContext(messages, undefined, 10);

      expect(result).toHaveLength(10);
      expect(result).toEqual(messages.slice(-10));
    });
  });

  describe('shouldCreateSummary', () => {
    it('should return true when message count reaches interval', () => {
      expect(shouldCreateSummary(10)).toBe(true);
      expect(shouldCreateSummary(20)).toBe(true);
    });

    it('should return false when message count is below interval', () => {
      expect(shouldCreateSummary(5)).toBe(false);
      expect(shouldCreateSummary(9)).toBe(false);
    });

    it('should return true when enough new messages since last summary', () => {
      expect(shouldCreateSummary(20, 5)).toBe(true);
      expect(shouldCreateSummary(15, 5)).toBe(true);
    });

    it('should return false when not enough new messages since last summary', () => {
      expect(shouldCreateSummary(12, 5)).toBe(false);
      expect(shouldCreateSummary(14, 5)).toBe(false);
    });
  });
});





