/**
 * Model constants using AI Gateway model identifiers
 * Format: provider/model-name
 * 
 * See: https://sdk.vercel.ai/docs/ai-sdk-core/ai-gateway
 * 
 * IMPORTANT: Use the '-thinking' suffix for models that should stream reasoning output
 */
export const MODELS = {
  // Anthropic models (all support thinking via extended thinking)
  CLAUDE_SONNET: 'anthropic/claude-sonnet-4.5',
  CLAUDE_OPUS: 'anthropic/claude-opus-4.5',
  CLAUDE_HAIKU: 'anthropic/claude-haiku-4.5',
  
  // OpenAI models - use '-thinking' variants for reasoning output
  GPT_5_1: 'openai/gpt-5.1-thinking',         // Streams reasoning/thinking
  GPT_5_1_INSTANT: 'openai/gpt-5.1-instant',  // Fast, no reasoning stream
  GPT_5_1_MINI: 'openai/gpt-5-mini',          // Smaller model
  GPT_5: 'openai/gpt-5',
  O1: 'openai/o1',
  O3: 'openai/o3',
  O3_MINI: 'openai/o3-mini',
  O4_MINI: 'openai/o4-mini',
  
  // Google models
  GEMINI_3: 'google/gemini-3-pro',
  GEMINI_3_FLASH: 'google/gemini-3-flash',
  GEMINI_PRO: 'google/gemini-2.5-pro',
  GEMINI_FLASH: 'google/gemini-2.5-flash',
  
  // For Whisper (direct OpenAI - not through gateway)
  WHISPER: 'whisper-1',
  
  // Legacy aliases (for backwards compatibility)
  GPT_4O: 'openai/gpt-5.1-thinking',
  GPT_4O_MINI: 'openai/gpt-5-mini',
  GPT_5_MINI: 'openai/gpt-5-mini',
  GEMINI_3_PRO: 'google/gemini-3-pro',
  
  // Deprecated model IDs - keeping for reference
  O1_MINI: 'openai/o3-mini',  // o1-mini deprecated, using o3-mini
} as const;

