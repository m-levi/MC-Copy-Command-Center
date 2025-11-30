import { AIModelOption } from '@/types';
import { MODELS } from './ai-constants';

export const AI_MODELS: AIModelOption[] = [
  // Anthropic models - all support extended thinking
  {
    id: MODELS.CLAUDE_SONNET,
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
  },
  {
    id: MODELS.CLAUDE_OPUS,
    name: 'Claude Opus 4',
    provider: 'anthropic',
  },
  {
    id: MODELS.CLAUDE_HAIKU,
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
  },
  // OpenAI models - GPT 5.1 with thinking streams reasoning
  {
    id: MODELS.GPT_5_1,
    name: 'GPT 5.1',
    provider: 'openai',
  },
  {
    id: MODELS.GPT_5_1_INSTANT,
    name: 'GPT 5.1 Instant',
    provider: 'openai',
  },
  {
    id: MODELS.GPT_5_1_MINI,
    name: 'GPT 5 mini',
    provider: 'openai',
  },
  // Google models
  {
    id: MODELS.GEMINI_PRO,
    name: 'Gemini 2.5 Pro',
    provider: 'google',
  },
  {
    id: MODELS.GEMINI_FLASH,
    name: 'Gemini 2.5 Flash',
    provider: 'google',
  },
];

/**
 * Legacy model ID mapping for backwards compatibility
 * Maps old model IDs stored in database to new AI Gateway format
 */
const LEGACY_MODEL_MAP: Record<string, string> = {
  // Old Claude models (various naming conventions)
  'claude-4.5-sonnet': MODELS.CLAUDE_SONNET,
  'claude-4-sonnet': MODELS.CLAUDE_SONNET,
  'claude-4.5-opus': MODELS.CLAUDE_OPUS,
  'claude-4-opus': MODELS.CLAUDE_OPUS,
  'claude-4.5-haiku': MODELS.CLAUDE_HAIKU,
  'claude-4-haiku': MODELS.CLAUDE_HAIKU,
  'claude-3-5-sonnet-20241022': MODELS.CLAUDE_SONNET,
  'claude-3-sonnet-20240229': MODELS.CLAUDE_SONNET,
  'claude-3-opus-20240229': MODELS.CLAUDE_OPUS,
  'claude-3-haiku-20240307': MODELS.CLAUDE_HAIKU,
  'claude-sonnet-4-5': MODELS.CLAUDE_SONNET,
  'claude-opus-4': MODELS.CLAUDE_OPUS,
  'claude-sonnet-4.5': MODELS.CLAUDE_SONNET,
  'claude-opus-4.5': MODELS.CLAUDE_OPUS,
  'claude-haiku-4.5': MODELS.CLAUDE_HAIKU,
  // Old OpenAI models
  'gpt-4o': MODELS.GPT_5_1,
  'gpt-4o-mini': MODELS.GPT_5_1_MINI,
  'gpt-4-turbo': MODELS.GPT_5_1,
  'gpt-4': MODELS.GPT_5_1,
  'o1-preview': MODELS.O1,
  'o1-mini': MODELS.O3_MINI,
  // Old Gemini models
  'gemini-pro': MODELS.GEMINI_PRO,
  'gemini-1.5-pro': MODELS.GEMINI_PRO,
  'gemini-1.5-flash': MODELS.GEMINI_FLASH,
};

/**
 * Normalizes legacy model IDs to new AI Gateway format
 */
export function normalizeModelId(id: string | null | undefined): string {
  if (!id) return MODELS.CLAUDE_SONNET;
  return LEGACY_MODEL_MAP[id] || id;
}

export function getModelById(id: string): AIModelOption | undefined {
  const normalizedId = normalizeModelId(id);
  return AI_MODELS.find((model) => model.id === normalizedId);
}

export function getFallbackModel(currentProvider: 'openai' | 'anthropic'): AIModelOption {
  // Note: With AI Gateway, fallback is handled automatically
  // This function is kept for backwards compatibility
  if (currentProvider === 'openai') {
    return AI_MODELS.find(m => m.provider === 'anthropic')!;
  } else {
    return AI_MODELS.find(m => m.provider === 'openai')!;
  }
}

// Re-export MODELS for convenience
export { MODELS };
