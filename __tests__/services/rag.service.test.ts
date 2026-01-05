/**
 * RAG Service Tests
 *
 * Tests for the hybrid search RAG service
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { buildRAGContext, RAGDocument } from '@/lib/services/rag.service';

// Mock fetch for embedding generation
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('RAG Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildRAGContext', () => {
    it('should return empty context for empty documents array', () => {
      const result = buildRAGContext([]);

      expect(result.context).toBe('');
      expect(result.documentCount).toBe(0);
      expect(result.categories).toEqual([]);
    });

    it('should build context from documents', () => {
      const documents: RAGDocument[] = [
        {
          id: '1',
          brand_id: 'brand-1',
          doc_type: 'text',
          title: 'Brand Guidelines',
          description: 'Our brand guidelines',
          content: 'Always use friendly tone',
          extracted_text: null,
          url: null,
          category: 'brand_guidelines',
        },
        {
          id: '2',
          brand_id: 'brand-1',
          doc_type: 'file',
          title: 'Product Info',
          description: null,
          content: null,
          extracted_text: 'Product details here',
          url: null,
          category: 'product_info',
        },
      ];

      const result = buildRAGContext(documents);

      expect(result.documentCount).toBe(2);
      expect(result.categories).toContain('brand_guidelines');
      expect(result.categories).toContain('product_info');
      expect(result.context).toContain('Brand Guidelines');
      expect(result.context).toContain('Always use friendly tone');
      expect(result.context).toContain('Product Info');
      expect(result.context).toContain('Product details here');
    });

    it('should truncate long content', () => {
      const longContent = 'a'.repeat(2000);
      const documents: RAGDocument[] = [
        {
          id: '1',
          brand_id: 'brand-1',
          doc_type: 'text',
          title: 'Long Document',
          description: null,
          content: longContent,
          extracted_text: null,
          url: null,
          category: 'general',
        },
      ];

      const result = buildRAGContext(documents);

      expect(result.context).toContain('[truncated]');
      expect(result.context.length).toBeLessThan(longContent.length + 500);
    });

    it('should handle documents with only extracted_text', () => {
      const documents: RAGDocument[] = [
        {
          id: '1',
          brand_id: 'brand-1',
          doc_type: 'file',
          title: 'PDF Document',
          description: null,
          content: null,
          extracted_text: 'Extracted from PDF',
          url: null,
          category: 'reference',
        },
      ];

      const result = buildRAGContext(documents);

      expect(result.context).toContain('Extracted from PDF');
    });

    it('should deduplicate categories', () => {
      const documents: RAGDocument[] = [
        {
          id: '1',
          brand_id: 'brand-1',
          doc_type: 'text',
          title: 'Doc 1',
          description: null,
          content: 'Content 1',
          extracted_text: null,
          url: null,
          category: 'brand_guidelines',
        },
        {
          id: '2',
          brand_id: 'brand-1',
          doc_type: 'text',
          title: 'Doc 2',
          description: null,
          content: 'Content 2',
          extracted_text: null,
          url: null,
          category: 'brand_guidelines',
        },
      ];

      const result = buildRAGContext(documents);

      expect(result.categories.length).toBe(1);
      expect(result.categories).toContain('brand_guidelines');
    });

    it('should include description when present', () => {
      const documents: RAGDocument[] = [
        {
          id: '1',
          brand_id: 'brand-1',
          doc_type: 'text',
          title: 'Doc with Description',
          description: 'This is a helpful description',
          content: 'Main content here',
          extracted_text: null,
          url: null,
          category: 'general',
        },
      ];

      const result = buildRAGContext(documents);

      expect(result.context).toContain('This is a helpful description');
    });

    it('should format different doc types correctly', () => {
      const documents: RAGDocument[] = [
        {
          id: '1',
          brand_id: 'brand-1',
          doc_type: 'file',
          title: 'File Doc',
          description: null,
          content: 'File content',
          extracted_text: null,
          url: null,
          category: 'general',
        },
        {
          id: '2',
          brand_id: 'brand-1',
          doc_type: 'text',
          title: 'Text Doc',
          description: null,
          content: 'Text content',
          extracted_text: null,
          url: null,
          category: 'general',
        },
        {
          id: '3',
          brand_id: 'brand-1',
          doc_type: 'link',
          title: 'Link Doc',
          description: null,
          content: 'Link content',
          extracted_text: null,
          url: 'https://example.com',
          category: 'general',
        },
      ];

      const result = buildRAGContext(documents);

      expect(result.context).toContain('Document');
      expect(result.context).toContain('Note');
      expect(result.context).toContain('Reference');
    });
  });
});
