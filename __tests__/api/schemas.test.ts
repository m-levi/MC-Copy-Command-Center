/**
 * API Schema Tests
 *
 * Tests for Zod validation schemas
 */

import { describe, it, expect } from '@jest/globals';
import {
  ChatRequestSchema,
  CreateBrandSchema,
  CreateModeSchema,
  PasswordUpdateSchema,
  UUIDSchema,
  PaginationSchema,
  parseQueryParams,
  ValidationError,
} from '@/lib/api/schemas';

describe('API Schemas', () => {
  describe('UUIDSchema', () => {
    it('should accept valid UUIDs', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const result = UUIDSchema.safeParse(validUUID);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUID = 'not-a-uuid';
      const result = UUIDSchema.safeParse(invalidUUID);
      expect(result.success).toBe(false);
    });
  });

  describe('PaginationSchema', () => {
    it('should apply defaults', () => {
      const result = PaginationSchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should coerce string numbers', () => {
      const result = PaginationSchema.parse({ limit: '10', offset: '5' });
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(5);
    });

    it('should reject limit over 100', () => {
      const result = PaginationSchema.safeParse({ limit: 150 });
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const result = PaginationSchema.safeParse({ offset: -1 });
      expect(result.success).toBe(false);
    });
  });

  describe('ChatRequestSchema', () => {
    const validRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      modelId: 'anthropic/claude-sonnet',
    };

    it('should accept valid minimal request', () => {
      const result = ChatRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject empty messages array', () => {
      const result = ChatRequestSchema.safeParse({
        ...validRequest,
        messages: [],
      });
      expect(result.success).toBe(false);
    });

    it('should accept full request with all fields', () => {
      const fullRequest = {
        ...validRequest,
        brandContext: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Brand',
        },
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        conversationMode: 'email_copy',
        emailType: 'design',
        isFlowMode: false,
        attachments: [],
      };
      const result = ChatRequestSchema.safeParse(fullRequest);
      expect(result.success).toBe(true);
    });

    it('should accept custom mode format', () => {
      const result = ChatRequestSchema.safeParse({
        ...validRequest,
        conversationMode: 'custom_123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid message role', () => {
      const result = ChatRequestSchema.safeParse({
        ...validRequest,
        messages: [{ role: 'invalid', content: 'Hello' }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CreateBrandSchema', () => {
    it('should accept valid brand', () => {
      const validBrand = {
        name: 'Test Brand',
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = CreateBrandSchema.safeParse(validBrand);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = CreateBrandSchema.safeParse({
        name: '',
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional website URL', () => {
      const result = CreateBrandSchema.safeParse({
        name: 'Test',
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        website_url: 'https://example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid website URL', () => {
      const result = CreateBrandSchema.safeParse({
        name: 'Test',
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        website_url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should accept empty string for optional URL', () => {
      const result = CreateBrandSchema.safeParse({
        name: 'Test',
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        website_url: '',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('CreateModeSchema', () => {
    it('should accept valid mode', () => {
      const validMode = {
        name: 'My Mode',
        system_prompt: 'You are a helpful assistant.',
      };
      const result = CreateModeSchema.safeParse(validMode);
      expect(result.success).toBe(true);
    });

    it('should reject empty system prompt', () => {
      const result = CreateModeSchema.safeParse({
        name: 'My Mode',
        system_prompt: '',
      });
      expect(result.success).toBe(false);
    });

    it('should validate color format', () => {
      const validColor = CreateModeSchema.safeParse({
        name: 'Mode',
        system_prompt: 'Prompt',
        color: '#FF5500',
      });
      expect(validColor.success).toBe(true);

      const invalidColor = CreateModeSchema.safeParse({
        name: 'Mode',
        system_prompt: 'Prompt',
        color: 'red',
      });
      expect(invalidColor.success).toBe(false);
    });

    it('should accept valid category', () => {
      const result = CreateModeSchema.safeParse({
        name: 'Mode',
        system_prompt: 'Prompt',
        category: 'writing',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid category', () => {
      const result = CreateModeSchema.safeParse({
        name: 'Mode',
        system_prompt: 'Prompt',
        category: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('PasswordUpdateSchema', () => {
    it('should accept valid password', () => {
      const result = PasswordUpdateSchema.safeParse({
        password: 'Password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject password without uppercase', () => {
      const result = PasswordUpdateSchema.safeParse({
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = PasswordUpdateSchema.safeParse({
        password: 'PASSWORD123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = PasswordUpdateSchema.safeParse({
        password: 'PasswordOnly',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password under 8 characters', () => {
      const result = PasswordUpdateSchema.safeParse({
        password: 'Pass1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('parseQueryParams', () => {
    it('should parse valid params', () => {
      const params = new URLSearchParams('limit=10&offset=5');
      const result = parseQueryParams(params, PaginationSchema);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(5);
    });

    it('should throw ValidationError for invalid params', () => {
      const params = new URLSearchParams('limit=-1');
      expect(() => parseQueryParams(params, PaginationSchema)).toThrow(ValidationError);
    });
  });
});
