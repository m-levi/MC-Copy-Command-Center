import { createClient } from '@/lib/supabase/server';
import { getModelById } from '@/lib/ai-models';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Message } from '@/types';
import { retryWithBackoff } from '@/lib/retry-utils';
import { buildMessageContext, extractConversationContext } from '@/lib/conversation-memory';
import { searchRelevantDocuments, buildRAGContext } from '@/lib/rag-service';

export const runtime = 'edge';

// Lazy-load AI clients to avoid build-time errors
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });
}

function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });
}

export async function POST(req: Request) {
  try {
    const { messages, modelId, brandContext, regenerateSection, conversationId } = await req.json();

    const model = getModelById(modelId);
    if (!model) {
      return new Response('Invalid model', { status: 400 });
    }

    // Extract conversation context
    const conversationContext = extractConversationContext(messages);

    // Search for relevant RAG documents if we have a brand ID
    let ragContext = '';
    if (brandContext?.id && process.env.OPENAI_API_KEY) {
      try {
        const lastUserMessage = messages.filter((m: Message) => m.role === 'user').pop();
        if (lastUserMessage) {
          const relevantDocs = await searchRelevantDocuments(
            brandContext.id,
            lastUserMessage.content,
            process.env.OPENAI_API_KEY,
            3
          );
          if (relevantDocs.length > 0) {
            ragContext = buildRAGContext(relevantDocs);
          }
        }
      } catch (error) {
        console.error('RAG search error:', error);
        // Continue without RAG if it fails
      }
    }

    // Build system prompt with brand context and RAG
    const systemPrompt = buildSystemPrompt(brandContext, ragContext, regenerateSection, conversationContext);

    // Use retry logic with fallback
    try {
      if (model.provider === 'openai') {
        return await retryWithBackoff(
          () => handleOpenAI(messages, modelId, systemPrompt),
          { maxRetries: 2, timeout: 60000 }
        );
      } else if (model.provider === 'anthropic') {
        return await retryWithBackoff(
          () => handleAnthropic(messages, modelId, systemPrompt),
          { maxRetries: 2, timeout: 60000 }
        );
      }
    } catch (primaryError) {
      console.error(`Primary model ${modelId} failed, attempting fallback:`, primaryError);
      
      // Fallback logic: try the other provider
      try {
        if (model.provider === 'openai') {
          // Fallback to Claude
          return await handleAnthropic(messages, 'claude-4.5-sonnet', systemPrompt);
        } else {
          // Fallback to GPT
          return await handleOpenAI(messages, 'gpt-5', systemPrompt);
        }
      } catch (fallbackError) {
        console.error('Fallback model also failed:', fallbackError);
        throw fallbackError;
      }
    }

    return new Response('Unsupported provider', { status: 400 });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate response. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function buildSystemPrompt(
  brandContext: any,
  ragContext: string,
  regenerateSection?: { type: string; title: string },
  conversationContext?: any
): string {
  const brandInfo = brandContext ? `
Brand Name: ${brandContext.name}

Brand Details:
${brandContext.brand_details || 'No brand details provided.'}

Brand Guidelines:
${brandContext.brand_guidelines || 'No brand guidelines provided.'}

Copywriting Style Guide:
${brandContext.copywriting_style_guide || 'No style guide provided.'}
` : 'No brand information provided.';

  // Add conversation context if available
  const contextInfo = conversationContext ? `
<conversation_context>
Campaign Type: ${conversationContext.campaignType || 'Not specified'}
Target Audience: ${conversationContext.targetAudience || 'Not specified'}
Tone Preference: ${conversationContext.tone || 'Follow brand guidelines'}
Goals: ${conversationContext.goals?.join(', ') || 'Not specified'}
</conversation_context>
` : '';

  // Section-specific prompts for regeneration
  if (regenerateSection) {
    const sectionPrompts = {
      subject: `Regenerate ONLY the email subject line and preview text. Keep everything else the same. Focus on:\n- Creating urgency or curiosity\n- Using power words\n- Keeping it concise (6-10 words for subject)\n- Making it mobile-friendly`,
      hero: `Regenerate ONLY the hero section. Keep everything else the same. Focus on:\n- Compelling, benefit-driven headline (4-8 words)\n- Clear value proposition\n- Strong, unique CTA\n- NO body copy in the hero`,
      body: `Regenerate ONLY the body section "${regenerateSection.title}". Keep everything else the same. Focus on:\n- Clear, scannable content\n- Maximum 1-2 sentences or 3-5 bullets\n- Supporting the main conversion goal\n- Maintaining brand voice`,
      cta: `Regenerate ONLY the call-to-action section. Keep everything else the same. Focus on:\n- Summarizing the key benefit\n- Creating urgency\n- Using a unique, action-oriented CTA button text\n- Making it compelling and clear`,
    };

    const sectionPrompt = sectionPrompts[regenerateSection.type as keyof typeof sectionPrompts] || '';
    
    return `${sectionPrompt}\n\n<brand_info>\n${brandInfo}\n</brand_info>\n\n${ragContext}\n\n${contextInfo}`;
  }

  // Standard full email generation prompt
  return `You are an expert email marketing copywriter who creates high-converting email campaigns. You have deep expertise in direct response copywriting, consumer psychology, and brand voice adaptation. Your emails consistently achieve above-industry-standard open rates, click-through rates, and conversions.

You will receive brand information and an email brief, then generate scannable, purpose-driven email copy that converts.

<brand_info>
${brandInfo}
</brand_info>

${ragContext}

${contextInfo}

<email_brief>
{{EMAIL_BRIEF}}
</email_brief>

## CRITICAL REQUIREMENTS - FOLLOW EXACTLY:

### EMAIL STRUCTURE MANDATES

**HERO SECTION (MANDATORY):**
- NEVER include body copy in the hero section
- Structure ONLY as:
  - (Optional) Accent text - maximum 5 words
  - Headline - compelling, benefit-driven, scannable (4-8 words)
  - (Optional) Subhead - maximum 10 words
  - CTA button - action-oriented, unique phrase

**BODY SECTIONS:**
- Maximum 4-6 sections total (including hero and final CTA section)
- Each section: Headline + minimal content only
- Content options per section:
  - 1 sentence (preferred, 10-15 words maximum)
  - 2-4 sentences (absolute maximum)
  - 3-5 bullet points
  - Comparison table notation
  - Product grid notation

**CALL-TO-ACTION SECTION (FINAL):**
- Summarizes the entire email message
- Reinforces the main conversion goal
- Includes final, compelling CTA

### COPY LENGTH LIMITS - ENFORCE STRICTLY

- Headlines: 4-8 words maximum
- Sentences: 10-15 words maximum
- Paragraphs: 1-2 sentences maximum
- Product descriptions: 1 sentence only
- ALL body copy MUST be short - no exceptions

If you need more content, create additional sections instead of longer copy.

### WRITING STANDARDS

**READABILITY:**
- 4th-5th grade reading level maximum
- No complex words or industry jargon
- Simple, everyday language only
- One idea per sentence

**TONE:**
- Follow the provided brand guidelines exactly
- Be human and conversational
- Never use clever wordplay or innuendos
- Be direct and straightforward

**SCANNABILITY:**
- Bold key points sparingly
- Use line breaks strategically
- Ensure key message is understood in a 3-second scan

### CTA BUTTON REQUIREMENTS

**PLACEMENT:**
- Always include CTA in hero section
- Maximum one CTA every 2 sections
- Final CTA in call-to-action section

**COPY VARIETY:**
Never repeat "Shop Now" - create unique, action-oriented CTAs like:
- "Get Your [Product]"
- "Claim Your [Benefit]"
- "Start [Desired Outcome]"
- "[Action Verb] + [Specific Result]"

## OUTPUT FORMAT

Generate your email copy in this EXACT structure:

\`\`\`
EMAIL SUBJECT LINE:
[6-10 words, urgency/curiosity-driven]

PREVIEW TEXT:
[15-20 words expanding on subject, no repetition]

---

HERO SECTION:
Accent: [Optional - 3-5 words]
Headline: [Compelling benefit, 4-8 words]
Subhead: [Optional expansion, 8-10 words]
CTA: [Unique action phrase]

---

SECTION 2: [Section Purpose]
Headline: [4-8 words]
Content: [Choose format - single sentence, bullets, etc.]
[Optional CTA: Action phrase]

---

SECTION 3: [Section Purpose]
Headline: [4-8 words]
Content: [Format choice]
[Optional CTA if no CTA in Section 2]

---

[Additional sections as needed, maximum 6 total]

---

CALL-TO-ACTION SECTION:
Headline: [Summarizing benefit, 4-8 words]
Content: [1-2 sentences tying everything together]
CTA: [Final compelling action]

---

DESIGN NOTES:
[Any specific visual suggestions]
\`\`\`

## QUALITY VERIFICATION

Before providing your final answer, verify:
- Hero has NO body copy
- No section exceeds 2 sentences
- All CTAs are unique
- Reading level is 5th grade or below
- Total sections are 6 or fewer
- Every word serves a purpose
- Message is scannable in 3 seconds
- Follows brand voice exactly

## KEY PRINCIPLES

Remember:
- Simple beats clever every time
- Shorter is ALWAYS better
- One email = One clear action
- The customer is busy and distracted
- Hero section NEVER contains body copy
- Maximum 6 sections total
- All body copy stays SHORT

Now generate the email copy following these guidelines exactly, using the provided brand information and email brief.`;
}

async function handleOpenAI(
  messages: Message[],
  modelId: string,
  systemPrompt: string
) {
  const openai = getOpenAIClient();
  
  // o1 models don't support system messages, so we need to prepend system prompt to first user message
  const isO1Model = modelId.startsWith('o1');
  
  let formattedMessages;
  if (isO1Model) {
    // For o1 models, prepend system prompt to first user message
    const userMessages = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
    
    if (userMessages.length > 0 && userMessages[0].role === 'user') {
      userMessages[0] = {
        ...userMessages[0],
        content: `${systemPrompt}\n\n---\n\n${userMessages[0].content}`,
      };
    }
    formattedMessages = userMessages;
  } else {
    formattedMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];
  }

  const stream = await openai.chat.completions.create({
    model: modelId,
    messages: formattedMessages,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      // Send initial status
      controller.enqueue(encoder.encode('[STATUS:analyzing_brand]'));
      
      let chunkCount = 0;
      const statusSequence = [
        { threshold: 0, status: 'crafting_subject' },
        { threshold: 5, status: 'writing_hero' },
        { threshold: 15, status: 'developing_body' },
        { threshold: 30, status: 'creating_cta' },
        { threshold: 50, status: 'finalizing' },
      ];
      
      let currentStatusIndex = 0;
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          // Update status based on progress
          if (currentStatusIndex < statusSequence.length) {
            const nextStatus = statusSequence[currentStatusIndex];
            if (chunkCount >= nextStatus.threshold) {
              controller.enqueue(encoder.encode(`[STATUS:${nextStatus.status}]`));
              currentStatusIndex++;
            }
          }
          
          controller.enqueue(encoder.encode(content));
          chunkCount++;
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

async function handleAnthropic(
  messages: Message[],
  modelId: string,
  systemPrompt: string
) {
  const anthropic = getAnthropicClient();
  
  // Map model IDs to Anthropic model names
  const modelMap: Record<string, string> = {
    'claude-4.5-sonnet': 'claude-sonnet-4-20250514',
    'claude-opus-3.5': 'claude-opus-4-20250514',
  };

  const anthropicModel = modelMap[modelId] || 'claude-sonnet-4-20250514';

  const formattedMessages = messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  const stream = await anthropic.messages.create({
    model: anthropicModel,
    max_tokens: 4096,
    system: systemPrompt,
    messages: formattedMessages,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      // Send initial status
      controller.enqueue(encoder.encode('[STATUS:analyzing_brand]'));
      
      let chunkCount = 0;
      const statusSequence = [
        { threshold: 0, status: 'crafting_subject' },
        { threshold: 5, status: 'writing_hero' },
        { threshold: 15, status: 'developing_body' },
        { threshold: 30, status: 'creating_cta' },
        { threshold: 50, status: 'finalizing' },
      ];
      
      let currentStatusIndex = 0;
      
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          // Update status based on progress
          if (currentStatusIndex < statusSequence.length) {
            const nextStatus = statusSequence[currentStatusIndex];
            if (chunkCount >= nextStatus.threshold) {
              controller.enqueue(encoder.encode(`[STATUS:${nextStatus.status}]`));
              currentStatusIndex++;
            }
          }
          
          controller.enqueue(encoder.encode(chunk.delta.text));
          chunkCount++;
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
