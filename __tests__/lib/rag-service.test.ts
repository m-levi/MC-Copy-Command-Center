import {
  generateEmbedding,
  searchRelevantDocuments,
  addBrandDocument,
} from '@/lib/rag-service';
import { createClient } from '@/lib/supabase/server';

// Mock dependencies
jest.mock('@/lib/supabase/server');

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('rag-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  describe('generateEmbedding', () => {
    it('should generate embedding successfully', async () => {
      const mockEmbedding = Array.from({ length: 1536 }, () => Math.random());

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      const result = await generateEmbedding('test text', 'test-key');

      expect(result).toEqual(mockEmbedding);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    it('should throw error on API failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
      });

      await expect(
        generateEmbedding('test text', 'test-key')
      ).rejects.toThrow('Failed to generate embedding');
    });
  });

  describe('searchRelevantDocuments', () => {
    it('should search documents using vector similarity', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          brand_id: 'brand-123',
          title: 'Test Doc',
          content: 'Test content',
        },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: Array(1536).fill(0.1) }],
        }),
      });

      const mockSupabase = {
        rpc: jest.fn().mockResolvedValue({
          data: mockDocuments,
          error: null,
        }),
      };

      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const result = await searchRelevantDocuments(
        'brand-123',
        'test query',
        'test-key',
        3
      );

      expect(result).toEqual(mockDocuments);
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'match_documents',
        expect.objectContaining({
          brand_id_filter: 'brand-123',
          match_count: 3,
        })
      );
    });

    it('should return empty array on error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: Array(1536).fill(0.1) }],
        }),
      });

      const mockSupabase = {
        rpc: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      };

      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const result = await searchRelevantDocuments(
        'brand-123',
        'test query',
        'test-key'
      );

      expect(result).toEqual([]);
    });
  });

  describe('addBrandDocument', () => {
    it('should add document with embedding', async () => {
      const mockDocument = {
        id: 'doc-1',
        brand_id: 'brand-123',
        doc_type: 'style_guide',
        title: 'Test Doc',
        content: 'Test content',
        embedding: Array(1536).fill(0.1),
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockDocument.embedding }],
        }),
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockDocument,
                error: null,
              }),
            }),
          }),
        }),
      };

      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const result = await addBrandDocument(
        'brand-123',
        'style_guide',
        'Test Doc',
        'Test content',
        'test-key'
      );

      expect(result).toEqual(mockDocument);
    });
  });
});




