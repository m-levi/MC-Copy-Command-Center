import { AIModelOption } from '@/types';

export const AI_MODELS: AIModelOption[] = [
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
  },
  {
    id: 'claude-4.5-sonnet',
    name: 'Claude 4.5 Sonnet',
    provider: 'anthropic',
  },
];

export function getModelById(id: string): AIModelOption | undefined {
  return AI_MODELS.find((model) => model.id === id);
}

export function getFallbackModel(currentProvider: 'openai' | 'anthropic'): AIModelOption {
  // Return fallback model from opposite provider
  if (currentProvider === 'openai') {
    return AI_MODELS.find(m => m.id === 'claude-4.5-sonnet')!;
  } else {
    return AI_MODELS.find(m => m.id === 'gpt-5')!;
  }
}


