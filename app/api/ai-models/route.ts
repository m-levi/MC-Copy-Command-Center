import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Cache the models for 1 hour to avoid excessive API calls
let cachedModels: GatewayModel[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export interface GatewayModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
  contextLength?: number;
  capabilities?: string[];
}

/**
 * GET /api/ai-models
 * Fetch available AI models from Vercel AI Gateway
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check cache first
    if (cachedModels && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return NextResponse.json({ models: cachedModels });
    }

    // Fetch models from Vercel AI Gateway
    const apiKey = process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) {
      // If no gateway key, return a curated list of known models
      return NextResponse.json({ models: getKnownModels() });
    }

    try {
      const response = await fetch('https://ai-gateway.vercel.sh/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[AI Models API] Gateway returned error:', response.status);
        // Fall back to known models
        return NextResponse.json({ models: getKnownModels() });
      }

      const data = await response.json();
      
      // Transform the gateway response to our format
      const models: GatewayModel[] = (data.data || data.models || []).map((model: any) => ({
        id: model.id,
        name: formatModelName(model.id),
        provider: extractProvider(model.id),
        description: model.description || getModelDescription(model.id),
        contextLength: model.context_length || model.contextLength,
        capabilities: model.capabilities || getModelCapabilities(model.id),
      }));

      // Cache the results
      cachedModels = models;
      cacheTimestamp = Date.now();

      return NextResponse.json({ models });
    } catch (fetchError) {
      console.error('[AI Models API] Failed to fetch from gateway:', fetchError);
      // Fall back to known models
      return NextResponse.json({ models: getKnownModels() });
    }
  } catch (error) {
    console.error('[AI Models API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI models' },
      { status: 500 }
    );
  }
}

/**
 * Format model ID into a human-readable name
 */
function formatModelName(modelId: string): string {
  const nameMap: Record<string, string> = {
    'anthropic/claude-sonnet-4.5': 'Claude Sonnet 4.5',
    'anthropic/claude-opus-4.5': 'Claude Opus 4.5',
    'anthropic/claude-haiku-4.5': 'Claude Haiku 4.5',
    'openai/gpt-5.1-thinking': 'GPT 5.1',
    'openai/gpt-5.1-instant': 'GPT 5.1 Instant',
    'openai/gpt-5-mini': 'GPT 5 Mini',
    'openai/gpt-5': 'GPT 5',
    'openai/o1': 'O1',
    'openai/o3': 'O3',
    'openai/o3-mini': 'O3 Mini',
    'openai/o4-mini': 'O4 Mini',
    'google/gemini-3-pro': 'Gemini 3 Pro',
    'google/gemini-3-flash': 'Gemini 3 Flash',
    'google/gemini-2.5-pro': 'Gemini 2.5 Pro',
    'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
  };
  
  if (nameMap[modelId]) {
    return nameMap[modelId];
  }
  
  // Extract and format the model name from the ID
  const parts = modelId.split('/');
  const name = parts[parts.length - 1]
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return name;
}

/**
 * Extract provider from model ID
 */
function extractProvider(modelId: string): string {
  const parts = modelId.split('/');
  return parts[0] || 'unknown';
}

/**
 * Get model description
 */
function getModelDescription(modelId: string): string {
  const descriptions: Record<string, string> = {
    'anthropic/claude-sonnet-4.5': 'Most balanced model for everyday tasks with excellent reasoning',
    'anthropic/claude-opus-4.5': 'Most capable model for complex analysis and creative tasks',
    'anthropic/claude-haiku-4.5': 'Fastest model for quick responses and simple tasks',
    'openai/gpt-5.1-thinking': 'Advanced reasoning with step-by-step thinking',
    'openai/gpt-5.1-instant': 'Fast responses without reasoning stream',
    'openai/gpt-5-mini': 'Efficient model for simple tasks',
    'openai/gpt-5': 'Full GPT-5 capabilities',
    'openai/o1': 'Optimized for complex reasoning tasks',
    'openai/o3': 'Next-gen reasoning model',
    'openai/o3-mini': 'Smaller reasoning model for faster responses',
    'openai/o4-mini': 'Latest compact reasoning model',
    'google/gemini-3-pro': 'Google\'s most capable multimodal model',
    'google/gemini-3-flash': 'Fast and efficient for everyday use',
    'google/gemini-2.5-pro': 'Powerful multimodal reasoning',
    'google/gemini-2.5-flash': 'Quick responses with good quality',
  };
  
  return descriptions[modelId] || 'AI language model';
}

/**
 * Get model capabilities
 */
function getModelCapabilities(modelId: string): string[] {
  const baseCapabilities = ['text-generation', 'chat'];
  
  if (modelId.includes('claude') || modelId.includes('gemini')) {
    baseCapabilities.push('vision');
  }
  
  if (modelId.includes('thinking') || modelId.includes('o1') || modelId.includes('o3') || modelId.includes('o4')) {
    baseCapabilities.push('reasoning');
  }
  
  if (modelId.includes('claude')) {
    baseCapabilities.push('code-generation', 'extended-thinking');
  }
  
  return baseCapabilities;
}

/**
 * Get known models as fallback when gateway is unavailable
 */
function getKnownModels(): GatewayModel[] {
  const knownModelIds = [
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-opus-4.5',
    'anthropic/claude-haiku-4.5',
    'openai/gpt-5.1-thinking',
    'openai/gpt-5.1-instant',
    'openai/gpt-5-mini',
    'openai/gpt-5',
    'openai/o1',
    'openai/o3',
    'openai/o3-mini',
    'openai/o4-mini',
    'google/gemini-3-pro',
    'google/gemini-3-flash',
    'google/gemini-2.5-pro',
    'google/gemini-2.5-flash',
  ];
  
  return knownModelIds.map(id => ({
    id,
    name: formatModelName(id),
    provider: extractProvider(id),
    description: getModelDescription(id),
    capabilities: getModelCapabilities(id),
  }));
}

















