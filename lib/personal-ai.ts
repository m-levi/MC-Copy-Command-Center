/**
 * Personal AI Feature
 * 
 * Allows users to chat with any AI model without brand context.
 * Conversations are private to each user and stored under a virtual "Personal AI" brand.
 */

// Special constant for Personal AI brand ID
// This is a fixed UUID that represents the "Personal AI" feature across all users
// Using a well-known UUID v4 that's reserved for this purpose
export const PERSONAL_AI_BRAND_ID = '00000000-0000-0000-0000-000000000001';

// Personal AI display info (used in UI)
export const PERSONAL_AI_INFO = {
  id: PERSONAL_AI_BRAND_ID,
  name: 'AI Assistant',
  description: 'Chat with any AI model without brand context',
  icon: '✨', // Sparkle emoji for AI
} as const;

/**
 * Check if a brand ID is the Personal AI brand
 */
export function isPersonalAI(brandId: string | null | undefined): boolean {
  return brandId === PERSONAL_AI_BRAND_ID;
}

/**
 * System prompt for Personal AI mode
 * Minimal prompt - no brand context, just basic helpful assistant behavior
 */
export const PERSONAL_AI_SYSTEM_PROMPT = `You are a helpful AI assistant. Be direct, clear, and helpful in your responses.`;

/**
 * Build the system prompt for Personal AI mode
 * Returns a minimal prompt - user gets the AI without brand-specific context
 */
export function buildPersonalAIPrompt(): string {
  return PERSONAL_AI_SYSTEM_PROMPT;
}

