import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { gateway, MODELS } from '@/lib/ai-providers';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { listMemories, isSupermemoryConfigured } from '@/lib/supermemory';

export const runtime = 'edge';

// Low-cost model for suggestions
const SUGGESTION_MODEL = MODELS.GEMINI_FLASH;

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

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch brand details
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name, brand_details, brand_voice, website_url')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Fetch recent conversations (last 5) for context
    const { data: recentConversations } = await supabase
      .from('conversations')
      .select('id, title, mode, last_message_preview, created_at')
      .eq('brand_id', brandId)
      .order('updated_at', { ascending: false })
      .limit(5);

    // Fetch recent email artifacts/content
    const { data: recentEmails } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        conversation:conversations!inner(
          id,
          brand_id,
          title,
          mode
        )
      `)
      .eq('role', 'assistant')
      .eq('conversation.brand_id', brandId)
      .eq('conversation.mode', 'email_copy')
      .order('created_at', { ascending: false })
      .limit(3);

    // Fetch memories (gracefully handle if not configured)
    let memories: Array<{ title: string; content: string; category: string }> = [];
    if (isSupermemoryConfigured()) {
      try {
        const rawMemories = await listMemories(brandId, user.id, 10);
        memories = rawMemories.map(m => ({
          title: (m.metadata?.title as string) || 'Untitled',
          content: m.content,
          category: (m.metadata?.category as string) || 'general',
        }));
      } catch (e) {
        logger.warn('[Chat Suggestions] Failed to fetch memories:', e);
      }
    }

    // Build context for AI
    const brandContext = {
      name: brand.name,
      details: brand.brand_details?.substring(0, 500) || '',
      voiceSummary: brand.brand_voice?.brand_summary || '',
      audience: brand.brand_voice?.audience || '',
    };

    const recentWork = (recentConversations || [])
      .slice(0, 3)
      .map(c => `- ${c.title}${c.last_message_preview ? `: ${c.last_message_preview.substring(0, 100)}` : ''}`)
      .join('\n');

    const recentEmailTitles = (recentEmails || [])
      .map((e: any) => e.conversation?.title)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');

    const memoryContext = memories
      .slice(0, 5)
      .map(m => `- ${m.title}: ${m.content.substring(0, 100)}`)
      .join('\n');

    // Generate suggestions using low-cost model
    const systemPrompt = `You are a marketing strategist helping users get started with email creation. Generate 4 actionable, specific suggestions based on the brand context and mode.

Each suggestion should be:
- Specific to the brand (use their name, products, audience)
- Actionable and ready to execute
- Different from each other (variety of campaign types)
- Written as if starting a conversation with an AI copywriter

${mode === 'planning' ? 'Focus on strategy, brainstorming, and campaign planning ideas.' : 'Focus on specific email types and campaigns to create.'}

IMPORTANT: Output ONLY valid JSON, no markdown or explanation.`;

    const userPrompt = `Brand: ${brandContext.name}
${brandContext.details ? `About: ${brandContext.details}` : ''}
${brandContext.audience ? `Target Audience: ${brandContext.audience}` : ''}
${brandContext.voiceSummary ? `Brand Voice: ${brandContext.voiceSummary}` : ''}

${recentWork ? `Recent work:\n${recentWork}` : 'No recent work.'}

${recentEmailTitles ? `Recent email topics: ${recentEmailTitles}` : ''}

${memoryContext ? `Key brand info:\n${memoryContext}` : ''}

Mode: ${mode === 'planning' ? 'Strategy & Planning (brainstorming, advice, campaign planning)' : 'Email Writing (create actual email copy)'}

Generate 4 suggestions in this JSON format:
{
  "suggestions": [
    {
      "id": "1",
      "title": "Short catchy title (5-7 words)",
      "description": "Brief description of what this will create (10-15 words)",
      "prompt": "The full prompt to send to the AI (be specific, include brand details)",
      "icon": "emoji that fits",
      "category": "campaign|content|strategy|optimization"
    }
  ]
}

Make prompts specific to ${brandContext.name}. Don't suggest things they've recently done. Be creative but practical.`;

    const { text } = await generateText({
      model: gateway.languageModel(SUGGESTION_MODEL),
      system: systemPrompt,
      prompt: userPrompt,
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
      // Return fallback suggestions
      suggestions = getFallbackSuggestions(brandContext.name, mode);
    }

    // Ensure we always have suggestions
    if (suggestions.length === 0) {
      suggestions = getFallbackSuggestions(brandContext.name, mode);
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    logger.error('[Chat Suggestions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

function getFallbackSuggestions(brandName: string, mode: string): ChatSuggestion[] {
  if (mode === 'planning') {
    return [
      {
        id: '1',
        title: 'Q1 Email Strategy Review',
        description: 'Analyze and plan your email marketing strategy',
        prompt: `Help me develop a comprehensive Q1 email marketing strategy for ${brandName}. What campaigns should we prioritize?`,
        icon: '📊',
        category: 'strategy',
      },
      {
        id: '2',
        title: 'Customer Retention Ideas',
        description: 'Brainstorm ways to keep customers engaged',
        prompt: `I want to improve customer retention for ${brandName}. What email sequences and campaigns would you recommend?`,
        icon: '🎯',
        category: 'strategy',
      },
      {
        id: '3',
        title: 'Competitive Analysis',
        description: 'Research competitor email strategies',
        prompt: `Can you help me analyze what competitors in our space are doing with email marketing? I want to find opportunities for ${brandName}.`,
        icon: '🔍',
        category: 'strategy',
      },
      {
        id: '4',
        title: 'Seasonal Campaign Planning',
        description: 'Plan upcoming seasonal promotions',
        prompt: `Let's plan seasonal email campaigns for ${brandName}. What upcoming holidays or events should we capitalize on?`,
        icon: '📅',
        category: 'campaign',
      },
    ];
  }

  return [
    {
      id: '1',
      title: 'Welcome Email Sequence',
      description: 'Create emails to greet new subscribers',
      prompt: `Create a welcome email for new ${brandName} subscribers. It should introduce our brand, highlight what makes us unique, and encourage them to make their first purchase.`,
      icon: '👋',
      category: 'campaign',
    },
    {
      id: '2',
      title: 'Flash Sale Announcement',
      description: 'Urgent promotional email with strong CTA',
      prompt: `Write a flash sale email for ${brandName}. Create urgency, highlight the discount, and include a compelling call-to-action.`,
      icon: '⚡',
      category: 'campaign',
    },
    {
      id: '3',
      title: 'Product Launch Email',
      description: 'Announce a new product or collection',
      prompt: `Create a product launch email for ${brandName}. Build excitement, showcase the key features, and drive pre-orders or early interest.`,
      icon: '🚀',
      category: 'content',
    },
    {
      id: '4',
      title: 'Win-Back Campaign',
      description: 'Re-engage inactive customers',
      prompt: `Write a win-back email for ${brandName} to re-engage customers who haven't purchased in a while. Include a special offer and remind them why they loved us.`,
      icon: '💝',
      category: 'optimization',
    },
  ];
}


