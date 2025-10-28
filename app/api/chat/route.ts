import { createClient } from '@/lib/supabase/server';
import { getModelById } from '@/lib/ai-models';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Message, ProductLink } from '@/types';
import { retryWithBackoff } from '@/lib/retry-utils';
import { buildMessageContext, extractConversationContext } from '@/lib/conversation-memory';
import { searchRelevantDocuments, buildRAGContext } from '@/lib/rag-service';
import { extractProductMentions, constructProductUrl } from '@/lib/web-search';

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

// Helper function to construct product URLs
// AI native search will provide actual product details if needed
function constructProductLinks(
  websiteUrl: string,
  productNames: string[]
): ProductLink[] {
  return productNames.map(name => {
    const result = constructProductUrl(websiteUrl, name);
    return {
      name: result.productName,
      url: result.url,
      description: result.description,
    };
  });
}

export async function POST(req: Request) {
  try {
    const { messages, modelId, brandContext, regenerateSection, conversationId, conversationMode } = await req.json();

    const model = getModelById(modelId);
    if (!model) {
      return new Response('Invalid model', { status: 400 });
    }

    // Extract conversation context (fast, synchronous)
    const conversationContext = extractConversationContext(messages);

    // Parallel execution: RAG search (don't block other operations)
    const [ragContext] = await Promise.all([
      (async () => {
        if (!brandContext?.id || !process.env.OPENAI_API_KEY) {
          return '';
        }

        try {
          const lastUserMessage = messages.filter((m: Message) => m.role === 'user').pop();
          if (!lastUserMessage) return '';

          const relevantDocs = await searchRelevantDocuments(
            brandContext.id,
            lastUserMessage.content,
            process.env.OPENAI_API_KEY,
            3
          );
          
          return relevantDocs.length > 0 ? buildRAGContext(relevantDocs) : '';
        } catch (error) {
          console.error('RAG search error:', error);
          return ''; // Continue without RAG if it fails
        }
      })(),
    ]);

    // Build system prompt with brand context and RAG
    const systemPrompt = buildSystemPrompt(brandContext, ragContext, regenerateSection, conversationContext, conversationMode);

    // Extract website URL from brand context
    const websiteUrl = brandContext?.website_url;

    // Use retry logic with fallback
    try {
      if (model.provider === 'openai') {
        return await retryWithBackoff(
          () => handleOpenAI(messages, modelId, systemPrompt, websiteUrl),
          { maxRetries: 2, timeout: 60000 }
        );
      } else if (model.provider === 'anthropic') {
        return await retryWithBackoff(
          () => handleAnthropic(messages, modelId, systemPrompt, websiteUrl),
          { maxRetries: 2, timeout: 60000 }
        );
      }
    } catch (primaryError) {
      console.error(`Primary model ${modelId} failed, attempting fallback:`, primaryError);
      
      // Fallback logic: try the other provider
      try {
        if (model.provider === 'openai') {
          // Fallback to Claude
          return await handleAnthropic(messages, 'claude-4.5-sonnet', systemPrompt, websiteUrl);
        } else {
          // Fallback to GPT
          return await handleOpenAI(messages, 'gpt-5', systemPrompt, websiteUrl);
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

function buildPlanningPrompt(brandInfo: string, ragContext: string, contextInfo: string): string {
  return `You are an expert email marketing strategist and brand consultant. You're in a flexible conversation space where users can explore ideas, ask questions, and plan their campaigns.

<brand_info>
${brandInfo}
</brand_info>

${ragContext}

${contextInfo}

## YOUR ROLE IN PLANNING MODE

You are in **PLANNING MODE** - a flexible conversation space for discovery, questions, and strategy. This is NOT for writing actual email copy.

### What This Mode Is For:

**1. General Questions & Learning**
- Answer questions about the brand, products, or strategy
- Explain email marketing concepts or best practices
- Provide industry insights and advice
- Help users understand their audience or market

**2. Exploration & Discovery**
- Discuss ideas freely without structure
- Explore "what if" scenarios
- Research target audiences
- Understand product positioning
- Analyze competitors or market trends

**3. Campaign Planning & Brainstorming**
- When the user wants to plan an email campaign, help them brainstorm
- Ask strategic questions about goals and audience
- Suggest messaging approaches and angles
- Create strategic outlines (not actual copy)
- Build framework for email structure

### How to Adapt to Context:

**If user asks a question** (e.g., "What makes a good subject line?"):
→ Answer it directly, conversationally
→ Provide insights and examples
→ No need for structured outlines

**If user wants to understand something** (e.g., "Tell me about our target audience"):
→ Analyze and discuss based on brand info
→ Share insights and observations
→ Be conversational and exploratory

**If user is brainstorming/planning an email**:
→ Ask clarifying questions
→ Suggest strategic approaches
→ Build outlines together
→ When plan feels complete, suggest they're ready to move to Email Copy mode

## CRITICAL: WHAT YOU NEVER DO

❌ DO NOT generate actual email copy (subject lines, headlines, body copy, CTAs)
❌ DO NOT write in email format structure (HERO SECTION, BODY SECTION, etc.)
❌ DO NOT create finished email text ready to send

## NATURAL CONVERSATION FLOW

**Just Asking Questions:**
\`\`\`
User: "What are best practices for abandoned cart emails?"
You: "Great question! Abandoned cart emails typically perform best when:
      - Sent within 1-3 hours of abandonment
      - Include product images to remind them
      - Offer help (maybe they had questions?)
      - Create gentle urgency (limited stock, sale ending)
      
      The key is being helpful, not pushy. Are you thinking about 
      setting up an abandoned cart series?"
\`\`\`

**Exploring Ideas:**
\`\`\`
User: "I'm thinking about our holiday strategy"
You: "Let's explore that! A few thoughts:
      - Holiday shopping typically peaks in early December
      - Consider early access for loyal customers
      - Gift guides often perform well
      
      What's your main goal - maximize revenue, clear inventory, 
      or build brand awareness for new customers?"
\`\`\`

**Planning an Email:**
\`\`\`
User: "I want to create a promotional email for our sale"
You: "Let's plan this strategically! To help you best:
      - Who should receive this?
      - What's the sale/offer?
      - Any timing considerations?
      
      Once I understand the context, I can suggest some 
      approaches that would work well."
\`\`\`

**When Plan Is Ready:**
\`\`\`
"This sounds like a solid plan! Here's what we've outlined:
 - [Strategic summary]
 
 When you're ready, you can switch to Email Copy mode to 
 generate the actual email based on this plan. There's a 
 'Transfer Plan' button that will carry all this context over."
\`\`\`

## RESPONSE STYLE

- Be **conversational and natural** - not overly structured unless planning an email
- **Match the user's intent** - are they asking, exploring, or planning?
- Be **helpful and insightful** - share your expertise
- **Adapt your format** - structured outlines only when actually planning
- **Recognize transitions** - notice when casual questions turn into campaign planning

## EXAMPLES OF GOOD RESPONSES

### Example 1: General Question
\`\`\`
User: "How do I know if my email tone is right?"
You: "Good question! Your brand guidelines mention [tone from brand info]. 
      A few ways to check if you're hitting the right tone:
      
      1. Read it out loud - does it sound like your brand voice?
      2. Compare to past emails customers responded well to
      3. Test with your team - do they recognize the brand?
      
      What kind of email are you working on? I can give more specific guidance."
\`\`\`

### Example 2: Exploration
\`\`\`
User: "Tell me about our products"
You: "Based on your brand info, you're focused on [products/niche]. 
      Here's what stands out:
      
      - Value proposition: [from brand details]
      - Unique positioning: [what makes it different]
      - Target audience seems to be: [analysis]
      
      Is there a specific product or angle you want to explore for 
      a campaign?"
\`\`\`

### Example 3: Campaign Planning
\`\`\`
User: "I need to promote our new collection"
You: "Exciting! Let's think through this strategically:
      
      First, a few questions:
      - When does the collection launch?
      - Who will be most interested in this?
      - Is this replacing existing products or expanding the line?
      - Any launch special or just announcement?
      
      Once I understand the context, I can suggest some messaging 
      approaches that would work well for your brand."
\`\`\`

## KEY PRINCIPLE

**Be flexible and adaptive.** You're a consultant in conversation, not a rigid planning bot. Sometimes users just want to chat, ask questions, or explore. Other times they want structured planning. Read the context and adapt accordingly.

**When in doubt**: Be conversational, answer what they asked, then offer to go deeper if they want.

**Remember**: You're helping them think and plan, NOT writing their email. That happens in Email Copy mode.`;
}

function buildSystemPrompt(
  brandContext: any,
  ragContext: string,
  regenerateSection?: { type: string; title: string },
  conversationContext?: any,
  conversationMode?: string
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

  // If in planning mode, use a completely different prompt
  if (conversationMode === 'planning') {
    return buildPlanningPrompt(brandInfo, ragContext, contextInfo);
  }

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
${brandContext?.website_url ? `\nBrand Website: ${brandContext.website_url}` : ''}
</brand_info>

${ragContext}

${contextInfo}

<email_brief>
{{EMAIL_BRIEF}}
</email_brief>

${brandContext?.website_url ? `\n## IMPORTANT: When you mention specific products or collections:
- If you need current product information, you can search "${brandContext.website_url}" for accurate details
- Product links will be automatically generated based on the products you mention
- Mention products naturally in your copy using their exact names` : ''}

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
  systemPrompt: string,
  brandWebsiteUrl?: string
) {
  const openai = getOpenAIClient();
  
  console.log('[OpenAI] Starting request with model:', modelId);
  
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

  console.log('[OpenAI] Calling API...');
  const stream = await openai.chat.completions.create({
    model: modelId,
    messages: formattedMessages,
    stream: true,
    reasoning_effort: 'high', // Enable extended thinking for GPT-5
  });
  
  console.log('[OpenAI] Stream received, starting to read...');

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Send initial status
        controller.enqueue(encoder.encode('[STATUS:analyzing_brand]'));
        console.log('[OpenAI] Sent initial status');
        
        let chunkCount = 0;
        let fullResponse = '';
        const statusSequence = [
          { threshold: 0, status: 'crafting_subject' },
          { threshold: 5, status: 'writing_hero' },
          { threshold: 15, status: 'developing_body' },
          { threshold: 30, status: 'creating_cta' },
          { threshold: 50, status: 'finalizing' },
        ];
        
        let currentStatusIndex = 0;
        
        console.log('[OpenAI] Starting to iterate stream chunks...');
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
            
            fullResponse += content;
            controller.enqueue(encoder.encode(content));
            chunkCount++;
            
            // Log progress every 10 chunks
            if (chunkCount % 10 === 0) {
              console.log(`[OpenAI] Processed ${chunkCount} chunks, ${fullResponse.length} chars`);
            }
          }
        }
        
        console.log(`[OpenAI] Stream complete. Total chunks: ${chunkCount}, chars: ${fullResponse.length}`);
        
        // After streaming is complete, search for product links
        if (brandWebsiteUrl && fullResponse) {
          const productNames = extractProductMentions(fullResponse);
          if (productNames.length > 0) {
            const productLinks = await constructProductLinks(brandWebsiteUrl, productNames);
            if (productLinks.length > 0) {
              // Send product links as metadata at the end
              controller.enqueue(encoder.encode(`\n\n[PRODUCTS:${JSON.stringify(productLinks)}]`));
            }
          }
        }
        
        controller.close();
        console.log('[OpenAI] Stream controller closed successfully');
      } catch (error) {
        console.error('[OpenAI] Stream error:', error);
        controller.error(error);
      }
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
  systemPrompt: string,
  brandWebsiteUrl?: string
) {
  const anthropic = getAnthropicClient();
  
  console.log('[Anthropic] Starting request with model:', modelId);
  
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

  console.log('[Anthropic] Calling API...');
  const stream = await anthropic.messages.create({
    model: anthropicModel,
    max_tokens: 4096,
    system: systemPrompt,
    messages: formattedMessages,
    stream: true,
    thinking: {
      type: 'enabled',
      budget_tokens: 2000, // Enable extended thinking for Claude with budget
    },
  });
  
  console.log('[Anthropic] Stream received, starting to read...');

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Send initial status
        controller.enqueue(encoder.encode('[STATUS:analyzing_brand]'));
        console.log('[Anthropic] Sent initial status');
        
        let chunkCount = 0;
        let fullResponse = '';
        const statusSequence = [
          { threshold: 0, status: 'crafting_subject' },
          { threshold: 5, status: 'writing_hero' },
          { threshold: 15, status: 'developing_body' },
          { threshold: 30, status: 'creating_cta' },
          { threshold: 50, status: 'finalizing' },
        ];
        
        let currentStatusIndex = 0;
        
        console.log('[Anthropic] Starting to iterate stream chunks...');
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
            
            fullResponse += chunk.delta.text;
            controller.enqueue(encoder.encode(chunk.delta.text));
            chunkCount++;
            
            // Log progress every 10 chunks
            if (chunkCount % 10 === 0) {
              console.log(`[Anthropic] Processed ${chunkCount} chunks, ${fullResponse.length} chars`);
            }
          }
        }
        
        console.log(`[Anthropic] Stream complete. Total chunks: ${chunkCount}, chars: ${fullResponse.length}`);
        
        // After streaming is complete, search for product links
        if (brandWebsiteUrl && fullResponse) {
          const productNames = extractProductMentions(fullResponse);
          if (productNames.length > 0) {
            const productLinks = await constructProductLinks(brandWebsiteUrl, productNames);
            if (productLinks.length > 0) {
              // Send product links as metadata at the end
              controller.enqueue(encoder.encode(`\n\n[PRODUCTS:${JSON.stringify(productLinks)}]`));
            }
          }
        }
        
        controller.close();
        console.log('[Anthropic] Stream controller closed successfully');
      } catch (error) {
        console.error('[Anthropic] Stream error:', error);
        controller.error(error);
      }
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
