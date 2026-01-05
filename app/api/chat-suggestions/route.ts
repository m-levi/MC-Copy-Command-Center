import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { gateway, MODELS } from '@/lib/ai-providers';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { searchMemories, isSupermemoryConfigured } from '@/lib/supermemory';
import { formatBrandForPrompt } from '@/lib/services/brand.service';

export const runtime = 'edge';

// Use a fast model for quick suggestions
const SUGGESTION_MODEL = MODELS.GEMINI_FLASH;

// In-memory cache with 5-minute TTL
const CACHE_TTL_MS = 5 * 60 * 1000;
const suggestionsCache = new Map<string, { data: ChatSuggestion[]; timestamp: number }>();

function getCacheKey(brandId: string, mode: string): string {
  return `${brandId}:${mode}`;
}

function getCachedSuggestions(brandId: string, mode: string): ChatSuggestion[] | null {
  const key = getCacheKey(brandId, mode);
  const cached = suggestionsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  // Clean up expired entry
  if (cached) {
    suggestionsCache.delete(key);
  }
  return null;
}

function setCachedSuggestions(brandId: string, mode: string, suggestions: ChatSuggestion[]): void {
  const key = getCacheKey(brandId, mode);
  suggestionsCache.set(key, { data: suggestions, timestamp: Date.now() });

  // Clean up old entries if cache gets too large
  if (suggestionsCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of suggestionsCache.entries()) {
      if (now - v.timestamp >= CACHE_TTL_MS) {
        suggestionsCache.delete(k);
      }
    }
  }
}

interface ChatSuggestion {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: string;
  category: 'campaign' | 'content' | 'strategy' | 'optimization';
}

interface SuggestionsResponse {
  suggestions: ChatSuggestion[];
  cached?: boolean;
}

export async function GET(request: NextRequest): Promise<NextResponse<SuggestionsResponse | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    const mode = searchParams.get('mode') || 'email_copy';

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Check cache first
    const cachedSuggestions = getCachedSuggestions(brandId, mode);
    if (cachedSuggestions) {
      return NextResponse.json({ suggestions: cachedSuggestions, cached: true });
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch full brand details including voice
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Fetch recent conversations to avoid duplicates
    const { data: recentConversations } = await supabase
      .from('conversations')
      .select('id, title, mode, last_message_preview, created_at')
      .eq('brand_id', brandId)
      .order('updated_at', { ascending: false })
      .limit(10);

    // Build comprehensive brand context using the existing formatter
    const brandContext = formatBrandForPrompt(brand);

    // Build recent work context
    const recentWork = (recentConversations || [])
      .map(c => `• "${c.title}" (${c.mode || 'chat'})`)
      .join('\n');

    // Get current date info
    const now = new Date();
    const upcomingEvents = getUpcomingEvents(now);
    const dateContext = {
      date: now.toISOString().split('T')[0],
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      month: now.toLocaleDateString('en-US', { month: 'long' }),
      upcomingEvents,
    };

    // Pre-fetch RAG context if available
    let ragContext = '';
    if (isSupermemoryConfigured()) {
      try {
        const memories = await searchMemories(brandId, user.id, 'products campaigns promotions key features', 5);
        if (memories.length > 0) {
          ragContext = '\n\n## Brand Knowledge Base\n' + memories
            .map(m => `• ${m.content.substring(0, 200)}`)
            .join('\n');
        }
      } catch {
        // Continue without RAG context
      }
    }

    // System prompt with pre-fetched context
    const systemPrompt = `You are a strategic email marketing advisor for "${brand.name}". Generate 4 highly relevant, actionable conversation starters.

## Requirements
- SPECIFIC to this brand (reference actual products, services, audience)
- TIMELY (consider: ${dateContext.dayOfWeek}, ${dateContext.month}. Upcoming: ${dateContext.upcomingEvents.join(', ') || 'none'})
- DIVERSE (different campaign types)
- ACTIONABLE (ready to execute now)
- DO NOT suggest similar topics to recent work

## Brand Context
${brandContext}
${ragContext}

## Recent Work (AVOID similar topics)
${recentWork || 'No recent work'}

## Mode
${mode === 'planning' ? 'Strategy & Planning: Focus on campaign planning, brainstorming, strategic advice' : 'Email Writing: Focus on creating actual email copy'}

Output ONLY valid JSON:
{
  "suggestions": [
    {
      "id": "1",
      "title": "5-7 word title",
      "description": "10-15 word description",
      "prompt": "2-3 sentence detailed prompt referencing brand specifics",
      "icon": "emoji",
      "category": "campaign|content|strategy|optimization"
    }
  ]
}`;

    const { text } = await generateText({
      model: gateway.languageModel(SUGGESTION_MODEL),
      system: systemPrompt,
      prompt: 'Generate 4 strategic, brand-specific suggestions now.',
      maxRetries: 2,
    });

    // Parse JSON response
    let suggestions: ChatSuggestion[] = [];
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = (parsed.suggestions || []).map((s: any, i: number) => ({
          id: s.id || String(i + 1),
          title: s.title || 'Untitled Suggestion',
          description: s.description || '',
          prompt: s.prompt || s.title,
          icon: s.icon || '✨',
          category: s.category || 'content',
        }));
      }
    } catch (parseError) {
      logger.error('[Chat Suggestions] Failed to parse AI response:', text);
      suggestions = getFallbackSuggestions(brand.name, mode, brand);
    }

    if (suggestions.length === 0) {
      suggestions = getFallbackSuggestions(brand.name, mode, brand);
    }

    // Cache successful suggestions
    setCachedSuggestions(brandId, mode, suggestions);

    return NextResponse.json({ suggestions });
  } catch (error) {
    logger.error('[Chat Suggestions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

// Helper to get upcoming events/holidays
function getUpcomingEvents(now: Date): string[] {
  const events: string[] = [];
  const month = now.getMonth();
  const day = now.getDate();

  // Check for nearby holidays/events
  const upcoming: Array<{ month: number; day: number; name: string }> = [
    { month: 0, day: 1, name: "New Year's Day" },
    { month: 1, day: 14, name: "Valentine's Day" },
    { month: 2, day: 17, name: "St. Patrick's Day" },
    { month: 4, day: 12, name: "Mother's Day" },
    { month: 5, day: 16, name: "Father's Day" },
    { month: 6, day: 4, name: "Independence Day (US)" },
    { month: 9, day: 31, name: "Halloween" },
    { month: 10, day: 28, name: "Thanksgiving (US)" },
    { month: 10, day: 29, name: "Black Friday" },
    { month: 11, day: 25, name: "Christmas" },
    { month: 11, day: 31, name: "New Year's Eve" },
  ];

  for (const event of upcoming) {
    const eventDate = new Date(now.getFullYear(), event.month, event.day);
    const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil >= 0 && daysUntil <= 30) {
      events.push(`${event.name} (${daysUntil === 0 ? 'today' : `in ${daysUntil} days`})`);
    }
  }

  // Add seasonal context
  if (month >= 2 && month <= 4) events.push('Spring season');
  else if (month >= 5 && month <= 7) events.push('Summer season');
  else if (month >= 8 && month <= 10) events.push('Fall season');
  else events.push('Winter/Holiday season');

  return events;
}

function getFallbackSuggestions(brandName: string, mode: string, brand?: any): ChatSuggestion[] {
  const audience = brand?.brand_voice?.audience || 'customers';
  const voiceHint = brand?.brand_voice?.brand_summary ? ` in our ${brand.brand_voice.voice_description || 'unique'} voice` : '';
  
  if (mode === 'planning') {
    return [
      {
        id: '1',
        title: `${brandName} Email Strategy`,
        description: 'Develop a comprehensive email marketing plan',
        prompt: `Help me develop a strategic email marketing plan for ${brandName}. Consider our target audience (${audience}) and what campaigns would resonate most with them.`,
        icon: '📊',
        category: 'strategy',
      },
      {
        id: '2',
        title: 'Customer Retention Ideas',
        description: 'Brainstorm ways to keep customers engaged',
        prompt: `I want to improve customer retention for ${brandName}. What email sequences would work best for ${audience}?`,
        icon: '🎯',
        category: 'strategy',
      },
      {
        id: '3',
        title: 'Campaign Calendar Planning',
        description: 'Map out upcoming email campaigns',
        prompt: `Help me plan the next month of email campaigns for ${brandName}. What mix of promotional, educational, and engagement emails should we send?`,
        icon: '📅',
        category: 'strategy',
      },
      {
        id: '4',
        title: 'Segmentation Strategy',
        description: 'Better target different customer groups',
        prompt: `Help me develop customer segmentation strategies for ${brandName}'s email marketing. How can we better personalize for different ${audience} segments?`,
        icon: '🎯',
        category: 'optimization',
      },
    ];
  }

  return [
    {
      id: '1',
      title: `Welcome to ${brandName}`,
      description: 'Greet new subscribers warmly',
      prompt: `Create a welcome email for new ${brandName} subscribers${voiceHint}. It should introduce what we offer to ${audience}, build trust, and encourage a first action.`,
      icon: '👋',
      category: 'campaign',
    },
    {
      id: '2',
      title: 'Limited Time Offer',
      description: 'Create urgency with a promotional email',
      prompt: `Write a promotional email for ${brandName}${voiceHint}. Create urgency, clearly communicate the value, and include a compelling call-to-action for ${audience}.`,
      icon: '⚡',
      category: 'campaign',
    },
    {
      id: '3',
      title: 'Product Highlight',
      description: 'Showcase what makes us special',
      prompt: `Create an email highlighting ${brandName}'s key offering${voiceHint}. Focus on the benefits that matter most to ${audience} and drive interest.`,
      icon: '✨',
      category: 'content',
    },
    {
      id: '4',
      title: 'Re-engagement Email',
      description: 'Win back inactive subscribers',
      prompt: `Write a re-engagement email for ${brandName}${voiceHint}. Reconnect with ${audience} who haven't engaged recently, remind them of our value, and include an incentive to return.`,
      icon: '💝',
      category: 'optimization',
    },
  ];
}









