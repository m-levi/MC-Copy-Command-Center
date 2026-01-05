import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gateway, getProviderOptions } from '@/lib/ai-providers';
import { MODELS } from '@/lib/ai-constants';
import { generateText } from 'ai';
import { BuilderMessage, BuilderPhase, CopySample, DoOrDont } from '@/types/brand-builder';
import { searchRelevantDocumentsV2, buildRAGContextV2 } from '@/lib/rag-service';

export const maxDuration = 60;

// Use Opus for highest quality brand building
const BUILDER_MODEL = MODELS.CLAUDE_OPUS;
const THINKING_BUDGET = 10000;

// ============================================================================
// SYSTEM PROMPTS FOR EACH PHASE
// ============================================================================

const RESEARCH_SYSTEM = `You are a Brand Research Specialist conducting deep discovery for a brand.

## YOUR ROLE
Help the user build a comprehensive brand profile by gathering information about their brand. Be curious, ask smart questions, and help them articulate what makes their brand unique.

## GUIDELINES
1. When the user shares materials (documents, URLs, text), acknowledge what you learned and ask 2-3 follow-up questions
2. Focus on understanding: brand positioning, competitive differentiation, customer pain points, voice personality
3. Reference specific things from their materials to show you've read them
4. Be conversational and collaborative, not interrogative
5. When you have enough context, let them know you're ready to move to the next phase

## WHAT TO DISCOVER
- What does the brand do and who do they serve?
- What makes them different from competitors?
- What's their personality? How do they want to come across?
- Who is their ideal customer? What do they care about?
- Any words, phrases, or tones they love or hate?`;

const OVERVIEW_SYSTEM = `You are a Brand Strategist helping create a concise brand overview.

## YOUR ROLE
Create a clear, concise 1-2 paragraph brand overview based on the research gathered so far.

## CONTEXT FROM RESEARCH
{{RESEARCH_CONTEXT}}

## CURRENT BRAND OVERVIEW DRAFT
{{CURRENT_DRAFT}}

## GUIDELINES
1. The overview should answer: Who is this brand? What do they do? Who do they serve? What makes them special?
2. Keep it to 1-2 paragraphs (50-100 words is ideal)
3. Make it immediately usable - this will guide AI content generation
4. When providing a draft, include it in your response with this format:

SUGGESTED DRAFT:
[Your 1-2 paragraph overview here]

5. Be responsive to user feedback - refine based on what they like and don't like
6. When the user approves, confirm and let them know they can continue`;

const CUSTOMER_SYSTEM = `You are a Customer Insights Specialist helping define the target customer.

## YOUR ROLE
Create a clear, concise paragraph describing the brand's target customer.

## CONTEXT
{{RESEARCH_CONTEXT}}

## BRAND OVERVIEW
{{BRAND_OVERVIEW}}

## CURRENT TARGET CUSTOMER DRAFT
{{CURRENT_DRAFT}}

## GUIDELINES
1. Describe who the ideal customer is - demographics, psychographics, pain points, desires
2. Keep it to 1 paragraph (40-80 words is ideal)
3. Make it specific enough to guide content creation
4. When providing a draft, include it in your response with this format:

SUGGESTED DRAFT:
[Your target customer paragraph here]

5. Refine based on user feedback
6. When approved, confirm and let them know they can continue`;

const STYLE_GUIDE_SYSTEM = `You are a Copywriting Coach helping develop a brand's writing style through examples.

## YOUR ROLE
Help the user discover their brand's copywriting style through iterative copy samples. Generate samples, get feedback, and refine until you can synthesize a clear style guide.

## CONTEXT
{{RESEARCH_CONTEXT}}

## BRAND OVERVIEW
{{BRAND_OVERVIEW}}

## TARGET CUSTOMER
{{TARGET_CUSTOMER}}

## CURRENT STYLE GUIDE DRAFT
{{CURRENT_DRAFT}}

## YOUR APPROACH
1. Generate 2-3 copy samples demonstrating different voice possibilities
2. Ask which feels right and what to adjust
3. Refine based on feedback (more casual, more confident, etc.)
4. After 2-3 rounds, synthesize findings into a concise 1-2 paragraph style guide

## OUTPUT FORMAT FOR SAMPLES
Include samples in your response like this:

COPY SAMPLES:
[SUBJECT_LINE|HERO|BODY|CTA|TAGLINE] - [Tone description]
"[The copy sample text]"

For example:
SUBJECT_LINE - Warm & Confident
"Your weekend just got a lot better"

## OUTPUT FORMAT FOR FINAL STYLE GUIDE
When ready to synthesize, include:

SUGGESTED DRAFT:
[Your 1-2 paragraph style guide here. Focus on: How we write, our tone, what makes our copy distinctive, and practical guidance for any writer.]

## GUIDELINES
- Samples should feel real and usable, not generic
- Be specific about what works and what doesn't
- The final style guide should be actionable and concise`;

const DOS_DONTS_SYSTEM = `You are a Brand Guidelines Expert helping define clear do's and don'ts.

## YOUR ROLE
Help the user articulate clear do's and don'ts for their brand communication.

## CONTEXT
{{RESEARCH_CONTEXT}}

## BRAND OVERVIEW
{{BRAND_OVERVIEW}}

## COPYWRITING STYLE GUIDE
{{STYLE_GUIDE}}

## CURRENT DO'S AND DON'TS
{{CURRENT_ITEMS}}

## GUIDELINES
1. Suggest specific, actionable do's and don'ts based on everything you've learned
2. Include output in this format:

SUGGESTED DO'S AND DON'TS:
DO: Use conversational language like "you" instead of "customers"
DO: Start emails with a benefit, not a feature
DONT: Use exclamation points excessively
DONT: Mention competitor names directly

3. Help the user add their own items or refine suggestions
4. Focus on things that will make a real difference in content creation
5. Each item should be specific and memorable`;

// ============================================================================
// HELPERS
// ============================================================================

function buildResearchContext(messages: BuilderMessage[]): string {
  // Extract key information from research phase messages
  const researchMessages = messages.filter(m => m.phase === 'research');
  if (researchMessages.length === 0) return 'No research context available.';

  const userMessages = researchMessages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join('\n\n');

  return userMessages.slice(0, 3000); // Limit context size
}

function extractSuggestedDraft(text: string): string | undefined {
  const match = text.match(/SUGGESTED DRAFT:\s*([\s\S]*?)(?=\n\n[A-Z]|$)/i);
  return match ? match[1].trim() : undefined;
}

function extractCopySamples(text: string): CopySample[] {
  const samples: CopySample[] = [];
  const regex = /\[(SUBJECT_LINE|HERO|BODY|CTA|TAGLINE)\]\s*[-–]\s*([^\n]+)\s*"([^"]+)"/gi;

  let match;
  while ((match = regex.exec(text)) !== null) {
    samples.push({
      id: crypto.randomUUID(),
      type: match[1].toLowerCase().replace(/ /g, '_') as CopySample['type'],
      tone: match[2].trim(),
      content: match[3].trim(),
    });
  }

  return samples;
}

function extractDosDonts(text: string): DoOrDont[] {
  const items: DoOrDont[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const doMatch = line.match(/^DO:\s*(.+)/i);
    const dontMatch = line.match(/^DON'?T:\s*(.+)/i);

    if (doMatch) {
      items.push({
        id: crypto.randomUUID(),
        type: 'do',
        content: doMatch[1].trim(),
      });
    } else if (dontMatch) {
      items.push({
        id: crypto.randomUUID(),
        type: 'dont',
        content: dontMatch[1].trim(),
      });
    }
  }

  return items;
}

function buildSystemPrompt(
  phase: BuilderPhase,
  context: {
    researchContext: string;
    brandOverview?: string;
    targetCustomer?: string;
    styleGuide?: string;
    currentDraft?: string;
    currentItems?: DoOrDont[];
  }
): string {
  switch (phase) {
    case 'research':
      return RESEARCH_SYSTEM;

    case 'overview':
      return OVERVIEW_SYSTEM
        .replace('{{RESEARCH_CONTEXT}}', context.researchContext || 'No research context')
        .replace('{{CURRENT_DRAFT}}', context.currentDraft || 'No draft yet');

    case 'customer':
      return CUSTOMER_SYSTEM
        .replace('{{RESEARCH_CONTEXT}}', context.researchContext || 'No research context')
        .replace('{{BRAND_OVERVIEW}}', context.brandOverview || 'Not yet defined')
        .replace('{{CURRENT_DRAFT}}', context.currentDraft || 'No draft yet');

    case 'style_guide':
      return STYLE_GUIDE_SYSTEM
        .replace('{{RESEARCH_CONTEXT}}', context.researchContext || 'No research context')
        .replace('{{BRAND_OVERVIEW}}', context.brandOverview || 'Not yet defined')
        .replace('{{TARGET_CUSTOMER}}', context.targetCustomer || 'Not yet defined')
        .replace('{{CURRENT_DRAFT}}', context.currentDraft || 'No draft yet');

    case 'dos_donts':
      const itemsText = context.currentItems?.length
        ? context.currentItems.map(i => `${i.type.toUpperCase()}: ${i.content}`).join('\n')
        : 'None yet';
      return DOS_DONTS_SYSTEM
        .replace('{{RESEARCH_CONTEXT}}', context.researchContext || 'No research context')
        .replace('{{BRAND_OVERVIEW}}', context.brandOverview || 'Not yet defined')
        .replace('{{STYLE_GUIDE}}', context.styleGuide || 'Not yet defined')
        .replace('{{CURRENT_ITEMS}}', itemsText);

    default:
      return RESEARCH_SYSTEM;
  }
}

// ============================================================================
// HANDLERS
// ============================================================================

async function handleStartPhase(
  brandId: string,
  phase: BuilderPhase,
  conversationHistory: BuilderMessage[],
  currentDrafts: { brandOverview?: string; targetCustomer?: string; copywritingStyleGuide?: string; dosDonts?: DoOrDont[] }
) {
  const model = gateway.languageModel(BUILDER_MODEL);
  const researchContext = buildResearchContext(conversationHistory);

  const systemPrompt = buildSystemPrompt(phase, {
    researchContext,
    brandOverview: currentDrafts.brandOverview,
    targetCustomer: currentDrafts.targetCustomer,
    styleGuide: currentDrafts.copywritingStyleGuide,
    currentDraft: phase === 'overview'
      ? currentDrafts.brandOverview
      : phase === 'customer'
        ? currentDrafts.targetCustomer
        : currentDrafts.copywritingStyleGuide,
    currentItems: currentDrafts.dosDonts,
  });

  let startingPrompt = '';
  switch (phase) {
    case 'overview':
      startingPrompt = 'Based on our research, create an initial brand overview draft.';
      break;
    case 'customer':
      startingPrompt = 'Based on our research and brand overview, create a target customer description.';
      break;
    case 'style_guide':
      startingPrompt = 'Generate some initial copy samples to help us discover this brand\'s voice.';
      break;
    case 'dos_donts':
      startingPrompt = 'Based on everything we\'ve discussed, suggest some initial do\'s and don\'ts for this brand.';
      break;
    default:
      startingPrompt = 'Let\'s get started.';
  }

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: startingPrompt,
    temperature: 1,
    maxOutputTokens: 4000,
    providerOptions: getProviderOptions(BUILDER_MODEL, THINKING_BUDGET),
  });

  // Extract structured data from response
  const suggestedOutput = extractSuggestedDraft(result.text);
  const copySamples = extractCopySamples(result.text);
  const suggestedDosDonts = extractDosDonts(result.text);

  return {
    message: result.text,
    metadata: {
      suggestedOutput,
      copySamples: copySamples.length > 0 ? copySamples : undefined,
      suggestedDosDonts: suggestedDosDonts.length > 0 ? suggestedDosDonts : undefined,
    },
  };
}

async function handleContinue(
  brandId: string,
  phase: BuilderPhase,
  userMessage: string,
  conversationHistory: BuilderMessage[],
  currentDrafts: { brandOverview?: string; targetCustomer?: string; copywritingStyleGuide?: string; dosDonts?: DoOrDont[] },
  additionalContext?: string
) {
  const model = gateway.languageModel(BUILDER_MODEL);
  const researchContext = buildResearchContext(conversationHistory);

  const systemPrompt = buildSystemPrompt(phase, {
    researchContext,
    brandOverview: currentDrafts.brandOverview,
    targetCustomer: currentDrafts.targetCustomer,
    styleGuide: currentDrafts.copywritingStyleGuide,
    currentDraft: phase === 'overview'
      ? currentDrafts.brandOverview
      : phase === 'customer'
        ? currentDrafts.targetCustomer
        : currentDrafts.copywritingStyleGuide,
    currentItems: currentDrafts.dosDonts,
  });

  // Build conversation context from recent messages in this phase
  const phaseMessages = conversationHistory
    .filter(m => m.phase === phase)
    .slice(-6)
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  let prompt = '';
  if (phaseMessages) {
    prompt = `## Recent Conversation:\n${phaseMessages}\n\n`;
  }
  if (additionalContext) {
    prompt += `## Additional Context (uploaded/extracted content):\n${additionalContext}\n\n`;
  }
  prompt += `## User Message:\n${userMessage}`;

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt,
    temperature: 1,
    maxOutputTokens: 4000,
    providerOptions: getProviderOptions(BUILDER_MODEL, THINKING_BUDGET),
  });

  // Extract structured data from response
  const suggestedOutput = extractSuggestedDraft(result.text);
  const copySamples = extractCopySamples(result.text);
  const suggestedDosDonts = extractDosDonts(result.text);

  return {
    message: result.text,
    metadata: {
      suggestedOutput,
      copySamples: copySamples.length > 0 ? copySamples : undefined,
      suggestedDosDonts: suggestedDosDonts.length > 0 ? suggestedDosDonts : undefined,
    },
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { brandId, action, phase, userMessage, conversationHistory, currentDrafts, additionalContext } = body;

    // Verify brand access
    if (brandId) {
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('id, name')
        .eq('id', brandId)
        .single();

      if (brandError || !brand) {
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
      }
    }

    switch (action) {
      case 'start_phase': {
        if (!phase) {
          return NextResponse.json({ error: 'Phase is required' }, { status: 400 });
        }
        const result = await handleStartPhase(
          brandId,
          phase as BuilderPhase,
          conversationHistory || [],
          currentDrafts || {}
        );
        return NextResponse.json(result);
      }

      case 'continue': {
        if (!phase) {
          return NextResponse.json({ error: 'Phase is required' }, { status: 400 });
        }
        const result = await handleContinue(
          brandId,
          phase as BuilderPhase,
          userMessage || '',
          conversationHistory || [],
          currentDrafts || {},
          additionalContext
        );
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[Brand Builder] Error:', error);
    return NextResponse.json(
      {
        error: 'Brand builder failed',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
