import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContext } from './types';

/**
 * Structured 3-variant output for design emails. The model calls this
 * instead of hand-assembling the XML `<version_a>` tags — the UI can render
 * cards side-by-side without brittle regex parsing.
 */

const blockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hero'),
    accent: z.string().optional(),
    headline: z.string(),
    subhead: z.string().optional(),
    cta: z.string(),
  }),
  z.object({
    type: z.literal('text'),
    accent: z.string().optional(),
    headline: z.string().optional(),
    body: z.string(),
    cta: z.string().optional(),
  }),
  z.object({
    type: z.literal('bullets'),
    accent: z.string().optional(),
    headline: z.string(),
    bullets: z.array(z.string()).min(2).max(6),
    cta: z.string().optional(),
  }),
  z.object({
    type: z.literal('product_card'),
    product_name: z.string(),
    price: z.string(),
    one_liner: z.string(),
    cta: z.string(),
  }),
  z.object({
    type: z.literal('product_grid'),
    accent: z.string().optional(),
    headline: z.string(),
    products: z
      .array(
        z.object({
          product_name: z.string(),
          price: z.string(),
          one_liner: z.string(),
        }),
      )
      .min(2)
      .max(4),
    cta: z.string().optional(),
  }),
  z.object({
    type: z.literal('cta_block'),
    accent: z.string().optional(),
    headline: z.string(),
    subhead: z.string().optional(),
    cta: z.string(),
  }),
  z.object({
    type: z.literal('social_proof'),
    quote: z.string(),
    attribution: z.string(),
  }),
  z.object({
    type: z.literal('discount_bar'),
    code: z.string(),
    message: z.string(),
    expiry: z.string().optional(),
  }),
]);

const variantSchema = z.object({
  label: z.enum(['A', 'B', 'C']),
  approach: z.string().describe('One sentence: what this version does and why.'),
  subject: z.string().describe('Email subject line, 5-8 words.'),
  preheader: z.string().optional(),
  blocks: z.array(blockSchema).min(3),
});

export function buildGenerateEmailVariantsTool(_ctx: ToolContext) {
  return tool({
    description:
      'Produce three designed email variants (A/B/C). Call this exactly once when you\'re ready to deliver the final email. Each variant should take a distinct angle.',
    inputSchema: z.object({
      angle: z
        .string()
        .describe('One-line note on the angle that makes this email worth opening.'),
      variants: z.array(variantSchema).length(3),
    }),
    execute: async ({ angle, variants }) => ({
      ok: true as const,
      angle,
      variants,
    }),
  });
}

export type EmailVariantBlock = z.infer<typeof blockSchema>;
export type EmailVariant = z.infer<typeof variantSchema>;
