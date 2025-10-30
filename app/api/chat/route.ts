import { createClient } from '@/lib/supabase/server';
import { getModelById } from '@/lib/ai-models';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Message, ProductLink } from '@/types';
import { retryWithBackoff } from '@/lib/retry-utils';
import { buildMessageContext, extractConversationContext } from '@/lib/conversation-memory';
import { searchRelevantDocuments, buildRAGContext } from '@/lib/rag-service';
import { extractProductMentions, constructProductUrl } from '@/lib/web-search';
import { 
  loadMemories, 
  buildMemoryContext, 
  formatMemoryForPrompt,
  parseMemoryInstructions,
  saveMemory 
} from '@/lib/conversation-memory-store';

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
    
    // Store conversationId globally for memory saving in stream handlers
    (globalThis as any).__currentConversationId = conversationId;

    const model = getModelById(modelId);
    if (!model) {
      return new Response('Invalid model', { status: 400 });
    }

    // Extract conversation context (fast, synchronous)
    const conversationContext = extractConversationContext(messages);

    // Parallel execution: RAG search and memory loading
    const [ragContext, memories] = await Promise.all([
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
      (async () => {
        if (!conversationId) return [];
        try {
          return await loadMemories(conversationId);
        } catch (error) {
          console.error('Memory loading error:', error);
          return [];
        }
      })(),
    ]);

    // Build memory context
    const memoryContext = buildMemoryContext(memories);
    const memoryPrompt = formatMemoryForPrompt(memoryContext);

    // Build system prompt with brand context, RAG, and memory
    const systemPrompt = buildSystemPrompt(brandContext, ragContext, regenerateSection, conversationContext, conversationMode, memoryPrompt);

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

function buildPlanningPrompt(brandInfo: string, ragContext: string, contextInfo: string, memoryContext?: string): string {
  return `You are an expert email marketing strategist and brand consultant. You're in a flexible conversation space where users can explore ideas, ask questions, and plan their campaigns.

<brand_info>
${brandInfo}
</brand_info>

${ragContext}

${contextInfo}

${memoryContext || ''}

## AVAILABLE TOOLS

You have access to powerful tools to enhance your responses:

**🔍 Web Search:** You can search the internet for current information, product details, market trends, competitor analysis, and more. Use this when you need:
- Current pricing or product availability
- Recent industry trends or statistics  
- Competitor information
- Real-time data beyond your knowledge cutoff

**🌐 Web Fetch:** You can directly fetch and read content from specific URLs. Use this when the user provides a link or when you need to:
- Analyze a specific webpage
- Review a product page
- Check current website content

**💭 Memory:** You can remember important facts, preferences, and decisions across the conversation. To save something to memory, use this format anywhere in your response (it will be invisible to the user):

`[REMEMBER:key_name=value:category]`

Categories: user_preference, brand_context, campaign_info, product_details, decision, fact

Examples:
- `[REMEMBER:tone_preference=casual and friendly:user_preference]`
- `[REMEMBER:target_audience=millennials interested in tech:brand_context]`
- `[REMEMBER:promo_code=SUMMER20:campaign_info]`

The system will automatically parse these and save them to persistent memory. Use this when you learn something important that should be remembered for future messages.

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
  conversationMode?: string,
  memoryContext?: string
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
    return buildPlanningPrompt(brandInfo, ragContext, contextInfo, memoryContext);
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

${memoryContext || ''}

## AVAILABLE TOOLS

You have access to powerful tools to enhance your email copy:

**🔍 Web Search:** Search the internet for current product information, pricing, reviews, and market trends. Use this to:
- Verify current product availability and pricing
- Find recent customer reviews or testimonials
- Research competitor offers
- Get up-to-date statistics or data

**🌐 Web Fetch:** Directly fetch content from specific URLs (especially the brand website). Use this to:
- Review current product pages for accurate details
- Check website content for consistency
- Analyze specific landing pages
- Verify links and resources

**💭 Memory:** The system remembers important facts and preferences from this conversation. To save something to memory, use:

`[REMEMBER:key_name=value:category]`

Categories: user_preference, brand_context, campaign_info, product_details, decision, fact

Example: `[REMEMBER:tone_preference=professional:user_preference]`

This will be invisible to the user but saved for future reference. Use this when you learn preferences or important details that should persist across the conversation.

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
    tools: [
      {
        type: 'web_search',
      },
    ],
    tool_choice: 'auto', // Let GPT decide when to use web search
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
        let thinkingContent = '';
        let isThinking = false;
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
          // Check for reasoning content (GPT-5 extended thinking)
          const reasoningContent = chunk.choices[0]?.delta?.reasoning_content || '';
          if (reasoningContent) {
            if (!isThinking) {
              controller.enqueue(encoder.encode('[THINKING:START]'));
              controller.enqueue(encoder.encode('[STATUS:thinking]'));
              isThinking = true;
            }
            thinkingContent += reasoningContent;
            controller.enqueue(encoder.encode(`[THINKING:CHUNK]${reasoningContent}`));
            continue;
          }
          
          // If we were thinking and now have content, end thinking
          if (isThinking && chunk.choices[0]?.delta?.content) {
            controller.enqueue(encoder.encode('[THINKING:END]'));
            controller.enqueue(encoder.encode('[STATUS:analyzing_brand]'));
            isThinking = false;
          }
          
          // Handle tool calls (web search)
          const toolCalls = chunk.choices[0]?.delta?.tool_calls;
          if (toolCalls && toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
              if (toolCall.type === 'function' && toolCall.function) {
                const toolName = toolCall.function.name || 'unknown';
                console.log(`[OpenAI] Tool call: ${toolName}`);
                controller.enqueue(encoder.encode(`[TOOL:${toolName}:START]`));
              }
            }
            continue;
          }
          
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
        
        if (thinkingContent) {
          console.log(`[OpenAI] Captured ${thinkingContent.length} chars of thinking content`);
        }
        
        console.log(`[OpenAI] Stream complete. Total chunks: ${chunkCount}, chars: ${fullResponse.length}`);
        
        // Parse and save memory instructions from AI response
        const conversationId = (globalThis as any).__currentConversationId;
        if (conversationId && fullResponse) {
          const memoryInstructions = parseMemoryInstructions(fullResponse);
          if (memoryInstructions.length > 0) {
            console.log(`[OpenAI] Found ${memoryInstructions.length} memory instructions`);
            for (const instruction of memoryInstructions) {
              try {
                await saveMemory(
                  conversationId,
                  instruction.key,
                  instruction.value,
                  instruction.category
                );
                console.log(`[Memory] Saved: ${instruction.key} = ${instruction.value}`);
              } catch (error) {
                console.error('[Memory] Error saving:', error);
              }
            }
          }
        }
        
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
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 5,
        // Allow search for brand website and general queries
        ...(brandWebsiteUrl && {
          allowed_domains: [
            new URL(brandWebsiteUrl).hostname,
            // Allow common e-commerce and product info sites
            'shopify.com',
            'amazon.com',
            'yelp.com',
            'trustpilot.com',
          ],
        }),
      },
      {
        type: 'web_fetch_20250305',
        name: 'web_fetch',
        max_uses: 3,
      },
    ],
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
        let thinkingContent = '';
        let isInThinkingBlock = false;
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
          // Handle thinking block start
          if (chunk.type === 'content_block_start' && chunk.content_block?.type === 'thinking') {
            controller.enqueue(encoder.encode('[THINKING:START]'));
            controller.enqueue(encoder.encode('[STATUS:thinking]'));
            isInThinkingBlock = true;
            console.log('[Anthropic] Started thinking block');
            continue;
          }
          
          // Handle thinking content
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'thinking_delta'
          ) {
            const thinkingText = chunk.delta.thinking || '';
            thinkingContent += thinkingText;
            controller.enqueue(encoder.encode(`[THINKING:CHUNK]${thinkingText}`));
            continue;
          }
          
          // Handle thinking block end
          if (chunk.type === 'content_block_stop' && isInThinkingBlock) {
            controller.enqueue(encoder.encode('[THINKING:END]'));
            controller.enqueue(encoder.encode('[STATUS:analyzing_brand]'));
            isInThinkingBlock = false;
            console.log(`[Anthropic] Ended thinking block (${thinkingContent.length} chars)`);
            continue;
          }
          
          // Handle tool use (web search, web fetch)
          if (chunk.type === 'content_block_start' && chunk.content_block?.type === 'server_tool_use') {
            const toolName = chunk.content_block.name;
            console.log(`[Anthropic] Tool use started: ${toolName}`);
            controller.enqueue(encoder.encode(`[TOOL:${toolName}:START]`));
            continue;
          }
          
          // Handle web search tool results
          if (chunk.type === 'content_block_start' && chunk.content_block?.type === 'web_search_tool_result') {
            console.log('[Anthropic] Web search results received');
            controller.enqueue(encoder.encode('[TOOL:web_search:RESULTS]'));
            continue;
          }
          
          // Handle web fetch tool results
          if (chunk.type === 'content_block_start' && chunk.content_block?.type === 'web_fetch_tool_result') {
            console.log('[Anthropic] Web fetch results received');
            controller.enqueue(encoder.encode('[TOOL:web_fetch:RESULTS]'));
            continue;
          }
          
          // Handle regular text content
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
        
        if (thinkingContent) {
          console.log(`[Anthropic] Total thinking content: ${thinkingContent.length} chars`);
        }
        
        console.log(`[Anthropic] Stream complete. Total chunks: ${chunkCount}, chars: ${fullResponse.length}`);
        
        // Parse and save memory instructions from AI response
        const conversationId = (globalThis as any).__currentConversationId;
        if (conversationId && fullResponse) {
          const memoryInstructions = parseMemoryInstructions(fullResponse);
          if (memoryInstructions.length > 0) {
            console.log(`[Anthropic] Found ${memoryInstructions.length} memory instructions`);
            for (const instruction of memoryInstructions) {
              try {
                await saveMemory(
                  conversationId,
                  instruction.key,
                  instruction.value,
                  instruction.category
                );
                console.log(`[Memory] Saved: ${instruction.key} = ${instruction.value}`);
              } catch (error) {
                console.error('[Memory] Error saving:', error);
              }
            }
          }
        }
        
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
