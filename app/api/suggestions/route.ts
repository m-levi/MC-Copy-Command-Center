import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

// Initialize Anthropic with API key
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const runtime = 'edge';

interface SuggestionRequest {
  brandId: string;
  mode: 'planning' | 'email_copy' | 'flow';
  emailType?: 'design' | 'flow';
}

interface BrandData {
  name: string;
  brand_details?: string;
  brand_guidelines?: string;
  website_url?: string;
}

/**
 * Generate AI-powered prompt suggestions using Claude Haiku 4.5 with web search
 * Cost: ~$1 per 1M input tokens, ~$5 per 1M output tokens + $10 per 1,000 searches
 * Web search enables smart, research-backed suggestions
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Suggestions API] Request received');
    
    const body: SuggestionRequest = await request.json();
    const { brandId, mode, emailType } = body;

    console.log('[Suggestions API] Params:', { brandId, mode, emailType });

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('[Suggestions API] ANTHROPIC_API_KEY not set, using fallback suggestions');
      return NextResponse.json({
        suggestions: getFallbackSuggestions(mode, emailType),
        fallback: true,
      });
    }

    // Fetch brand data from Supabase
    const supabase = await createClient();
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('name, brand_details, brand_guidelines, website_url')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      console.error('[Suggestions API] Error fetching brand:', brandError);
      // Return fallback suggestions if brand fetch fails
      return NextResponse.json({
        suggestions: getFallbackSuggestions(mode, emailType),
        fallback: true,
      });
    }

    console.log('[Suggestions API] Brand fetched:', brand.name);

    // Fetch recent brand documents for additional context
    const { data: documents } = await supabase
      .from('brand_documents')
      .select('document_type, content_summary')
      .eq('brand_id', brandId)
      .limit(3);

    // Build context for the AI
    const contextInfo = buildBrandContext(brand as BrandData, documents || []);

    // Generate suggestions using Claude Haiku 4.5 with web search
    console.log('[Suggestions API] Generating AI suggestions...');
    const suggestions = await generateSuggestionsWithAI(
      contextInfo,
      brand.website_url,
      mode,
      emailType
    );

    console.log('[Suggestions API] Generated suggestions:', suggestions.length);
    return NextResponse.json({ 
      suggestions,
      fallback: false,
    });
  } catch (error) {
    console.error('[Suggestions API] Error generating suggestions:', error);
    // Return fallback suggestions on error
    try {
      const body = await request.json();
      return NextResponse.json({
        suggestions: getFallbackSuggestions(body.mode, body.emailType),
        fallback: true,
      });
    } catch {
      // If we can't even parse the request, return generic fallback
      return NextResponse.json({
        suggestions: getFallbackSuggestions('email_copy', 'design'),
        fallback: true,
      });
    }
  }
}

/**
 * Build brand context string for AI prompt
 */
function buildBrandContext(
  brand: BrandData,
  documents: Array<{ document_type: string; content_summary?: string }>
): string {
  let context = `Brand: ${brand.name}\n`;

  if (brand.brand_details) {
    context += `\nAbout: ${brand.brand_details.substring(0, 300)}...\n`;
  }

  if (brand.brand_guidelines) {
    context += `\nBrand Voice: ${brand.brand_guidelines.substring(0, 200)}...\n`;
  }

  if (brand.website_url) {
    context += `\nWebsite: ${brand.website_url}\n`;
  }

  if (documents.length > 0) {
    context += `\nBrand Documents:\n`;
    documents.forEach((doc) => {
      context += `- ${doc.document_type}`;
      if (doc.content_summary) {
        context += `: ${doc.content_summary.substring(0, 100)}...`;
      }
      context += '\n';
    });
  }

  return context;
}

/**
 * Generate suggestions using Claude Haiku 4.5 with web search
 */
async function generateSuggestionsWithAI(
  brandContext: string,
  websiteUrl: string | undefined,
  mode: string,
  emailType?: string
): Promise<Array<{ text: string; icon: string }>> {
  const systemPrompt = buildSystemPrompt(mode, emailType, websiteUrl);

  try {
    console.log('[AI Generation] Starting with web search enabled');
    
    // Configure web search tool
    const tools: any[] = [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 3, // Allow up to 3 searches for research
      },
    ];

    // If brand has a website, prioritize searching it
    if (websiteUrl) {
      try {
        tools[0].allowed_domains = [
          new URL(websiteUrl).hostname,
          'shopify.com',
          'amazon.com',
          'yelp.com',
          'trustpilot.com',
        ];
        console.log('[AI Generation] Web search configured with domains:', tools[0].allowed_domains);
      } catch (err) {
        console.warn('[AI Generation] Invalid website URL, web search enabled without domain filtering');
      }
    }

    console.log('[AI Generation] Calling Claude Haiku 4.5...');
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4.5-20250305',
      max_tokens: 1024,
      temperature: 0.9, // Higher creativity for varied, smart suggestions
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Based on this brand information, generate 3 smart, detailed, and specific prompt suggestions.

IMPORTANT: Before generating suggestions, use web search to research:
1. The brand's current products, services, and offerings
2. Recent campaigns, promotions, or seasonal content
3. Industry trends and competitor strategies
4. Customer reviews or testimonials

Then create suggestions that are:
- Highly specific to this brand's actual products/services
- Timely and relevant to current trends or seasons
- Detailed enough to be immediately actionable
- Creative and smart, not generic

Brand Information:
${brandContext}`,
        },
      ],
      tools,
    });

    console.log('[AI Generation] Claude response received');

    // Extract text content from Claude's response
    let textContent = '';
    for (const block of message.content) {
      if (block.type === 'text') {
        textContent += block.text;
      }
    }

    if (!textContent) {
      console.error('[AI Generation] No text content in Claude response');
      throw new Error('No text content in Claude response');
    }

    console.log('[AI Generation] Parsing response...');
    
    // Parse JSON from the response
    const parsed = JSON.parse(textContent);
    console.log('[AI Generation] Successfully parsed suggestions');
    
    return parsed.suggestions || getFallbackSuggestions(mode, emailType);
  } catch (error) {
    console.error('[AI Generation] Claude API error:', error);
    return getFallbackSuggestions(mode, emailType);
  }
}

/**
 * Build system prompt based on mode
 */
function buildSystemPrompt(mode: string, emailType?: string, websiteUrl?: string): string {
  const websiteHint = websiteUrl 
    ? `\n\n**CRITICAL: The brand's website is ${websiteUrl}. Use web search to explore their current products, services, and recent content BEFORE generating suggestions.**`
    : `\n\n**Note: No website URL available. Generate suggestions based on the brand information provided.**`;

  const basePrompt = `You are a senior marketing strategist and creative director helping generate smart, research-backed prompt suggestions for email marketing campaigns.${websiteHint}

Your task is to:
1. **RESEARCH FIRST** - Use web search to understand the brand's current offerings, recent campaigns, and market position
2. **THINK STRATEGICALLY** - Consider seasonality, trends, and what would drive engagement NOW
3. **BE SPECIFIC** - Reference actual products, services, or brand initiatives discovered through research
4. **ADD DETAIL** - Each suggestion should be 8-12 words with specific details (not generic)

Generate 3 intelligent, detailed prompt suggestions that:
- Mention specific products, services, or initiatives (e.g., "Promote your new sustainable denim collection with summer styling tips")
- Include strategic context or angle (e.g., "Create an abandoned cart flow highlighting your 30-day return policy")
- Are immediately actionable and timely
- Show you understand the brand's unique positioning
- Feel professional yet conversational

`;

  const modeSpecificInstructions = {
    planning: `Generate suggestions for STRATEGIC PLANNING & CONSULTATION mode:

These should be thoughtful QUESTIONS that help the user think strategically about their marketing. 

Good examples (detailed, specific):
- "How can I position our organic coffee beans against cheaper competitors?"
- "What messaging will resonate with busy parents shopping for kids' clothing?"
- "Should our skincare emails focus on ingredients or results?"

Bad examples (too generic):
- "How do I improve open rates?"
- "What's a good subject line?"
- "Tell me about my audience"

Focus on: Brand positioning, audience psychology, channel strategy, competitive differentiation, messaging angles.`,

    email_copy_design: `Generate suggestions for WRITING EMAIL COPY mode (Design emails):

These should be specific CAMPAIGN IDEAS ready to execute.

Good examples (detailed, with specific products/angles):
- "Announce your new winter coat collection with styling tips for layering"
- "Promote your best-selling protein powder with customer transformation stories"
- "Create a flash sale email for slow-moving inventory from last season"

Bad examples (too generic):
- "Write a promotional email"
- "Create a product announcement"
- "Draft a newsletter"

Focus on: Specific products/services, promotional angles, seasonal relevance, clear value props.`,

    email_copy_flow: `Generate suggestions for CREATING EMAIL FLOWS mode (Automated sequences):

These should be complete AUTOMATION CONCEPTS with clear triggers and goals.

Good examples (detailed, with purpose):
- "Welcome series for new subscribers featuring your story and best-sellers"
- "Post-purchase flow with care instructions and cross-sell recommendations"
- "Win-back campaign for 90-day inactive customers with special incentive"

Bad examples (too vague):
- "Create a welcome series"
- "Build an abandoned cart flow"
- "Make a re-engagement campaign"

Focus on: Clear triggers, specific customer journey stage, sequence goals, automation strategy.`,
  };

  let modeKey = mode;
  if (mode === 'email_copy') {
    modeKey = emailType === 'flow' ? 'email_copy_flow' : 'email_copy_design';
  }

  const instructions =
    modeSpecificInstructions[modeKey as keyof typeof modeSpecificInstructions] ||
    modeSpecificInstructions.email_copy_design;

  return `${basePrompt}${instructions}

**RESPONSE FORMAT:**

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "suggestions": [
    { "text": "First detailed suggestion (8-12 words with specifics)", "icon": "💡" },
    { "text": "Second detailed suggestion (8-12 words with specifics)", "icon": "🎯" },
    { "text": "Third detailed suggestion (8-12 words with specifics)", "icon": "✨" }
  ]
}

**Emoji Selection Guidelines:**
- Use creative, relevant emojis that match the suggestion's theme
- Vary the emojis (don't repeat)
- Examples: 🌿 (sustainability), 🏃‍♀️ (fitness), ☕ (coffee), 👶 (baby products), 💼 (B2B), etc.
- Avoid generic emojis like ❤️ or 😊 unless very relevant

**Remember:** Use web search FIRST to discover actual products, services, and current campaigns before generating suggestions.`;

}

/**
 * Fallback suggestions when AI generation fails or brand data unavailable
 */
function getFallbackSuggestions(
  mode: string,
  emailType?: string
): Array<{ text: string; icon: string }> {
  if (mode === 'planning') {
    return [
      { text: 'What makes a good email subject line?', icon: '💡' },
      { text: 'Help me understand our target audience', icon: '🎯' },
      { text: 'How can I improve engagement rates?', icon: '📈' },
    ];
  } else if (emailType === 'flow') {
    return [
      { text: 'Create a welcome email sequence', icon: '👋' },
      { text: 'Build a re-engagement campaign', icon: '🔄' },
      { text: 'Design an abandoned cart flow', icon: '🛒' },
    ];
  } else {
    return [
      { text: 'Write a promotional email for a sale', icon: '🎉' },
      { text: 'Create a product launch announcement', icon: '🚀' },
      { text: 'Draft a newsletter update', icon: '📧' },
    ];
  }
}

