/**
 * Brand Service Tests
 */

import { describe, it, expect } from '@jest/globals';
import { formatBrandForPrompt, BrandVoiceDataSchema } from '@/lib/services/brand.service';

describe('Brand Service', () => {
  describe('formatBrandForPrompt', () => {
    it('should format basic brand info', () => {
      const brand = {
        id: '1',
        name: 'Test Brand',
        organization_id: 'org-1',
        brand_details: 'We sell widgets',
        brand_guidelines: 'Be friendly',
        copywriting_style_guide: 'Use casual tone',
        brand_voice: null,
        website_url: 'https://test.com',
        logo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = formatBrandForPrompt(brand);

      expect(result).toContain('Brand Name: Test Brand');
      expect(result).toContain('We sell widgets');
      expect(result).toContain('Be friendly');
      expect(result).toContain('Use casual tone');
      expect(result).toContain('https://test.com');
    });

    it('should format brand with voice data', () => {
      const brand = {
        id: '1',
        name: 'Voice Brand',
        organization_id: 'org-1',
        brand_details: null,
        brand_guidelines: null,
        copywriting_style_guide: null,
        brand_voice: {
          brand_summary: 'A premium widget company',
          voice_description: 'Sophisticated yet approachable',
          we_sound: [
            { trait: 'Confident', explanation: 'We know our stuff' },
            { trait: 'Friendly', explanation: 'We care about customers' },
          ],
          we_never_sound: ['Pushy', 'Corporate'],
          vocabulary: {
            use: ['premium', 'quality', 'craft'],
            avoid: ['cheap', 'deal', 'discount'],
          },
          audience: 'Professionals aged 25-45',
          proof_points: [],
        },
        website_url: null,
        logo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = formatBrandForPrompt(brand);

      expect(result).toContain('A premium widget company');
      expect(result).toContain('Sophisticated yet approachable');
      expect(result).toContain('Confident');
      expect(result).toContain('We know our stuff');
      expect(result).toContain('Pushy');
      expect(result).toContain('premium, quality, craft');
      expect(result).toContain('cheap, deal, discount');
      expect(result).toContain('Professionals aged 25-45');
    });

    it('should handle missing optional fields', () => {
      const brand = {
        id: '1',
        name: 'Minimal Brand',
        organization_id: 'org-1',
        brand_details: null,
        brand_guidelines: null,
        copywriting_style_guide: null,
        brand_voice: null,
        website_url: null,
        logo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = formatBrandForPrompt(brand);

      expect(result).toContain('Brand Name: Minimal Brand');
      expect(result).not.toContain('undefined');
      expect(result).not.toContain('null');
    });
  });

  describe('BrandVoiceDataSchema', () => {
    it('should validate valid voice data', () => {
      const validVoice = {
        brand_summary: 'Test summary',
        voice_description: 'Test voice',
        we_sound: [{ trait: 'Bold', explanation: 'We are bold' }],
        we_never_sound: ['Timid'],
        vocabulary: {
          use: ['awesome'],
          avoid: ['bad'],
        },
        audience: 'Everyone',
      };

      const result = BrandVoiceDataSchema.safeParse(validVoice);
      expect(result.success).toBe(true);
    });

    it('should apply defaults for missing arrays', () => {
      const partialVoice = {
        brand_summary: 'Test',
      };

      const result = BrandVoiceDataSchema.parse(partialVoice);

      expect(result.we_sound).toEqual([]);
      expect(result.we_never_sound).toEqual([]);
      expect(result.proof_points).toEqual([]);
    });

    it('should reject invalid trait structure', () => {
      const invalidVoice = {
        we_sound: [{ invalid: 'structure' }],
      };

      const result = BrandVoiceDataSchema.safeParse(invalidVoice);
      expect(result.success).toBe(false);
    });
  });
});
