/**
 * @jest-environment node
 */

import { POST } from '@/app/api/chat/route';
import { getModelById } from '@/lib/ai-models';
import { extractConversationContext } from '@/lib/conversation-memory';
import { searchRelevantDocuments, buildRAGContext } from '@/lib/rag-service';

// Mock dependencies
jest.mock('@/lib/ai-models');
jest.mock('@/lib/conversation-memory');
jest.mock('@/lib/rag-service');
jest.mock('@/lib/flow-prompts');
jest.mock('@/lib/chat-prompts');
jest.mock('@/lib/unified-stream-handler');

const mockGetModelById = getModelById as jest.MockedFunction<typeof getModelById>;
const mockExtractConversationContext = extractConversationContext as jest.MockedFunction<
  typeof extractConversationContext
>;
const mockSearchRelevantDocuments = searchRelevantDocuments as jest.MockedFunction<
  typeof searchRelevantDocuments
>;

describe('/api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  });

  describe('POST', () => {
    it('should return 400 for invalid model', async () => {
      mockGetModelById.mockReturnValue(null as any);

      const req = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [],
          modelId: 'invalid-model',
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
    });

    it('should extract conversation context', async () => {
      const mockModel = {
        id: 'gpt-5',
        name: 'GPT-5',
        provider: 'openai',
      };

      mockGetModelById.mockReturnValue(mockModel as any);
      mockExtractConversationContext.mockReturnValue({
        goals: [],
        keyPoints: [],
      });

      const req = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Create an email',
            },
          ],
          modelId: 'gpt-5',
        }),
      });

      // Mock the unified stream handler
      const { handleUnifiedStream } = require('@/lib/unified-stream-handler');
      handleUnifiedStream.mockResolvedValue(
        new Response('test response', { status: 200 })
      );

      await POST(req);

      expect(mockExtractConversationContext).toHaveBeenCalled();
    });

    it('should search RAG documents when brand context is provided', async () => {
      const mockModel = {
        id: 'gpt-5',
        name: 'GPT-5',
        provider: 'openai',
      };

      mockGetModelById.mockReturnValue(mockModel as any);
      mockExtractConversationContext.mockReturnValue({
        goals: [],
        keyPoints: [],
      });
      mockSearchRelevantDocuments.mockResolvedValue([]);

      const req = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Create an email',
            },
          ],
          modelId: 'gpt-5',
          brandContext: {
            id: 'brand-123',
            name: 'Test Brand',
          },
        }),
      });

      const { handleUnifiedStream } = require('@/lib/unified-stream-handler');
      handleUnifiedStream.mockResolvedValue(
        new Response('test response', { status: 200 })
      );

      await POST(req);

      expect(mockSearchRelevantDocuments).toHaveBeenCalled();
    });
  });
});






