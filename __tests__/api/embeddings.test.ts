/**
 * @jest-environment node
 */

import { POST } from '@/app/api/embeddings/route';
import { createClient } from '@/lib/supabase/server';
import { addBrandDocument } from '@/lib/rag-service';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/rag-service');

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockAddBrandDocument = addBrandDocument as jest.MockedFunction<typeof addBrandDocument>;

describe('/api/embeddings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  describe('POST', () => {
    it('should return 400 if required fields are missing', async () => {
      const req = new Request('http://localhost/api/embeddings', {
        method: 'POST',
        body: JSON.stringify({
          brandId: 'test-brand-id',
          // Missing docType, title, content
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.message).toContain('Missing required fields');
    });

    it('should return 401 if user is not authenticated', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().resolves({ data: { user: null }, error: null }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const req = new Request('http://localhost/api/embeddings', {
        method: 'POST',
        body: JSON.stringify({
          brandId: 'test-brand-id',
          docType: 'style_guide',
          title: 'Test Document',
          content: 'Test content',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should return 403 if user does not have access to brand', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().resolves({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().resolves({ data: null, error: null }),
              }),
            }),
          }),
        }),
      };
      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const req = new Request('http://localhost/api/embeddings', {
        method: 'POST',
        body: JSON.stringify({
          brandId: 'test-brand-id',
          docType: 'style_guide',
          title: 'Test Document',
          content: 'Test content',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should return 502 if OpenAI API key is not configured', async () => {
      delete process.env.OPENAI_API_KEY;

      const mockSupabase = {
        auth: {
          getUser: jest.fn().resolves({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().resolves({
                  data: { id: 'brand-123' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const req = new Request('http://localhost/api/embeddings', {
        method: 'POST',
        body: JSON.stringify({
          brandId: 'test-brand-id',
          docType: 'style_guide',
          title: 'Test Document',
          content: 'Test content',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.code).toBe('EXTERNAL_API_ERROR');
    });

    it('should successfully create document with embedding', async () => {
      const mockDocument = {
        id: 'doc-123',
        brand_id: 'brand-123',
        doc_type: 'style_guide',
        title: 'Test Document',
        content: 'Test content',
        created_at: new Date().toISOString(),
      };

      mockAddBrandDocument.mockResolvedValue(mockDocument as any);

      const mockSupabase = {
        auth: {
          getUser: jest.fn().resolves({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().resolves({
                  data: { id: 'brand-123' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const req = new Request('http://localhost/api/embeddings', {
        method: 'POST',
        body: JSON.stringify({
          brandId: 'brand-123',
          docType: 'style_guide',
          title: 'Test Document',
          content: 'Test content',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(mockAddBrandDocument).toHaveBeenCalledWith(
        'brand-123',
        'style_guide',
        'Test Document',
        'Test content',
        'test-openai-key'
      );
      expect(data).toEqual(mockDocument);
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockAddBrandDocument.mockRejectedValue(
        new Error('OpenAI API error: Rate limit exceeded')
      );

      const mockSupabase = {
        auth: {
          getUser: jest.fn().resolves({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().resolves({
                  data: { id: 'brand-123' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const req = new Request('http://localhost/api/embeddings', {
        method: 'POST',
        body: JSON.stringify({
          brandId: 'brand-123',
          docType: 'style_guide',
          title: 'Test Document',
          content: 'Test content',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.code).toBe('EXTERNAL_API_ERROR');
      expect(data.message).toContain('OpenAI');
    });
  });
});






