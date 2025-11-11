import { getModelById } from '@/lib/ai-models';
import { Message, FlowType } from '@/types';
import { retryWithBackoff } from '@/lib/retry-utils';
import { extractConversationContext } from '@/lib/conversation-memory';
import { searchRelevantDocuments, buildRAGContext } from '@/lib/rag-service';
import { 
  loadMemories, 
  buildMemoryContext, 
  formatMemoryForPrompt,
} from '@/lib/conversation-memory-store';
import { loadMemoryContext as loadClaudeMemoryContext } from '@/lib/claude-memory-tool';
import { buildFlowOutlinePrompt } from '@/lib/flow-prompts';
import { buildSystemPrompt, buildStandardEmailPromptV2, buildBrandInfo, buildContextInfo } from '@/lib/chat-prompts';
import { handleUnifiedStream } from '@/lib/unified-stream-handler';

// Temporarily disable edge runtime to debug memory loading issues
// export const runtime = 'edge';

// AI clients now loaded dynamically in unified-stream-handler to reduce bundle size

export async function POST(req: Request) {
  try {
    console.log('[Chat API] Received request');
    const { messages, modelId, brandContext, regenerateSection, conversationId, conversationMode, emailType, isFlowMode, flowType } = await req.json();
    console.log('[Chat API] Request params:', { 
      modelId, 
      conversationId, 
      conversationMode,
      emailType,
      isFlowMode,
      flowType,
      hasMessages: !!messages,
      hasBrandContext: !!brandContext 
    });

    const model = getModelById(modelId);
    if (!model) {
      console.error('[Chat API] Invalid model:', modelId);
      return new Response('Invalid model', { status: 400 });
    }
    
    console.log('[Chat API] Using model:', model.name, 'Provider:', model.provider);

    // Extract conversation context (fast, synchronous)
    const conversationContext = extractConversationContext(messages);

    // Parallel execution: RAG search and memory loading
    const [ragContext, memories, claudeMemoryContext] = await Promise.all([
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
      // Legacy memory (still load for OpenAI models)
      (async () => {
        if (!conversationId) {
          console.log('[Memory] No conversationId provided, skipping legacy memory load');
          return [];
        }
        try {
          console.log('[Memory] Loading legacy memories for conversation:', conversationId);
          const mems = await loadMemories(conversationId);
          console.log('[Memory] Loaded', mems.length, 'legacy memories');
          return mems;
        } catch (error) {
          console.error('[Memory] Failed to load legacy memories:', error);
          return [];
        }
      })(),
      // Claude native memory (for Claude models)
      (async () => {
        if (!conversationId) {
          console.log('[Claude Memory] No conversationId provided');
          return '';
        }
        try {
          console.log('[Claude Memory] Loading native memory context for conversation:', conversationId);
          const context = await loadClaudeMemoryContext(conversationId);
          console.log('[Claude Memory] Loaded native memory context');
          return context;
        } catch (error) {
          console.error('[Claude Memory] Failed to load:', error);
          return '';
        }
      })(),
    ]);

    // Build memory context (legacy for OpenAI, native for Claude)
    const isClaudeModel = modelId.startsWith('claude');
    const memoryPrompt = isClaudeModel 
      ? claudeMemoryContext 
      : formatMemoryForPrompt(buildMemoryContext(memories));

    // Build system prompt with brand context, RAG, and memory
    // Use flow outline prompt if in flow mode
    let systemPrompt: string;
    let processedMessages = messages;
    
    if (isFlowMode && flowType) {
      // Build brand info string for flow mode
      const brandInfo = `
Brand Name: ${brandContext?.name || 'N/A'}
Brand Details: ${brandContext?.brand_details || 'N/A'}
Brand Guidelines: ${brandContext?.brand_guidelines || 'N/A'}
Copywriting Style Guide: ${brandContext?.copywriting_style_guide || 'N/A'}
${brandContext?.website_url ? `Website: ${brandContext.website_url}` : ''}
      `.trim();
      
      systemPrompt = buildFlowOutlinePrompt(flowType as FlowType, brandInfo, ragContext);
    } else if (emailType === 'design' && conversationMode === 'email_copy' && !regenerateSection) {
      // NEW: Use V2 prompt builder for standard design emails
      // IMPORTANT: Only use V2 for FIRST message, not follow-ups
      const userMessages = messages.filter((m: Message) => m.role === 'user');
      const isFirstMessage = userMessages.length === 1;
      
      if (isFirstMessage) {
        // First message - use V2 prompt with full template
        console.log('[Chat API] Using new V2 prompt system for standard design email (FIRST MESSAGE)');
        
        const brandInfo = buildBrandInfo(brandContext);
        const contextInfo = buildContextInfo(conversationContext);
        
        const { systemPrompt: v2SystemPrompt, userPromptTemplate } = buildStandardEmailPromptV2({
          brandInfo,
          ragContext,
          contextInfo,
          memoryContext: memoryPrompt,
          websiteUrl: brandContext?.website_url
        });
        
        systemPrompt = v2SystemPrompt;
        
        // Get the first user message (the copy brief)
        const copyBrief = userMessages[0]?.content || '';
        
        console.log('[Chat API] Filling COPY_BRIEF with user message:', copyBrief.substring(0, 100) + '...');
        
        // Fill in the COPY_BRIEF placeholder with actual user message
        const filledUserPrompt = userPromptTemplate.replace('{{COPY_BRIEF}}', copyBrief);
        
        // Replace the first (only) user message with the filled prompt
        processedMessages = [{ ...userMessages[0], content: filledUserPrompt }];
        
        console.log('[Chat API] Processed first message with filled user prompt');
      } else {
        // Follow-up message - use old system with full conversation context
        console.log('[Chat API] Using standard prompt system for follow-up message (preserving conversation history)');
        
        systemPrompt = buildSystemPrompt(brandContext, ragContext, {
          regenerateSection,
          conversationContext,
          conversationMode,
          memoryContext: memoryPrompt,
          emailType
        });
        
        // Keep all messages as-is for follow-ups
        processedMessages = messages;
        
        console.log('[Chat API] Sending', messages.length, 'messages for context');
      }
    } else {
      // Use existing centralized prompt builder for other modes
      systemPrompt = buildSystemPrompt(brandContext, ragContext, {
        regenerateSection,
        conversationContext,
        conversationMode,
        memoryContext: memoryPrompt,
        emailType
      });
    }

    // Extract website URL from brand context
    const websiteUrl = brandContext?.website_url;

    // Use unified stream handler with retry logic and fallback
    try {
      return await retryWithBackoff(
        () => handleUnifiedStream({
          messages: processedMessages,
          modelId,
          systemPrompt,
          provider: model.provider,
          websiteUrl,
          conversationId
        }),
        { maxRetries: 2, timeout: 60000 }
      );
    } catch (primaryError) {
      console.error(`Primary model ${modelId} failed, attempting fallback:`, primaryError);
      
      // Fallback logic: try the other provider
      try {
        const fallbackProvider = model.provider === 'openai' ? 'anthropic' : 'openai';
        const fallbackModel = model.provider === 'openai' ? 'claude-4.5-sonnet' : 'gpt-5';
        
        return await handleUnifiedStream({
          messages: processedMessages,
          modelId: fallbackModel,
          systemPrompt,
          provider: fallbackProvider,
          websiteUrl,
          conversationId
        });
      } catch (fallbackError) {
        console.error('Fallback model also failed:', fallbackError);
        throw fallbackError;
      }
    }

    return new Response('Unsupported provider', { status: 400 });
  } catch (error) {
    console.error('[Chat API] Error occurred:', error);
    console.error('[Chat API] Error type:', typeof error);
    console.error('[Chat API] Error details:', {
      name: error instanceof Error ? error.name : 'N/A',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'N/A'
    });
    
    return new Response(JSON.stringify({ 
      error: 'Failed to generate response. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.name : typeof error
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Old stream handlers removed - now using unified-stream-handler.ts
// This eliminates ~400 lines of duplicated code between OpenAI and Anthropic handlers

/*
// LEGACY CODE - Kept for reference, can be deleted after verification
async function handleOpenAI(
  messages: Message[],
  modelId: string,
  systemPrompt: string,
  brandWebsiteUrl?: string,
  conversationId?: string
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
    // reasoning_effort: 'high', // Enable extended thinking for GPT-5
    // TODO: Re-enable tools with correct API syntax
    // tools: [
    //   {
    //     type: 'web_search',
    //   },
    // ],
    // tool_choice: 'auto', // Let GPT decide when to use web search
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
          const reasoningContent = (chunk.choices[0]?.delta as any)?.reasoning_content || '';
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
  brandWebsiteUrl?: string,
  conversationId?: string
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
    // TODO: Re-enable tools with correct API syntax
    // The web_fetch_20250305 tool type is not supported according to the error
    // Only web_search_20250305 is valid
    // tools: [
    //   {
    //     type: 'web_search_20250305',
    //     name: 'web_search',
    //     max_uses: 5,
    //     // Allow search for brand website and general queries
    //     ...(brandWebsiteUrl && {
    //       allowed_domains: [
    //         new URL(brandWebsiteUrl).hostname,
    //         // Allow common e-commerce and product info sites
    //         'shopify.com',
    //         'amazon.com',
    //         'yelp.com',
    //         'trustpilot.com',
    //       ],
    //     }),
    //   },
    // ],
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
          if (chunk.type === 'content_block_start' && (chunk.content_block as any)?.type === 'web_fetch_tool_result') {
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
*/
