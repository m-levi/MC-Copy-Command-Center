import { streamText, CoreMessage, LanguageModel } from 'ai';
import { gateway, getToolsForModel, getProviderOptionsWithWebSearch, MODELS } from '@/lib/ai-providers';
import { getModelById, normalizeModelId } from '@/lib/ai-models';
import { Message, FlowType } from '@/types';
import { extractConversationContext } from '@/lib/conversation-memory';
import { buildFlowOutlinePrompt, buildConversationalFlowPrompt } from '@/lib/flow-prompts';
import { buildSystemPrompt, buildBrandInfo, buildContextInfo } from '@/lib/chat-prompts';
import { buildDesignEmailV2Prompt } from '@/lib/prompts/design-email-v2.prompt';
import { getActiveDebugPromptFast, determinePromptType } from '@/lib/debug-prompts';
import { messageQueue } from '@/lib/queue/message-queue';
import { createEdgeClient } from '@/lib/supabase/edge';
import { logger } from '@/lib/logger';
import { smartExtractProductLinks } from '@/lib/url-extractor';
import { withSupermemory } from '@supermemory/tools/ai-sdk';
import { getSupermemoryUserId, isSupermemoryConfigured } from '@/lib/supermemory';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    logger.log('[Chat API] Received request');
    const { messages, modelId: rawModelId, brandContext, regenerateSection, conversationId, conversationMode, emailType, isFlowMode, flowType, attachments } = await req.json();
    
    // Normalize legacy model IDs to AI Gateway format
    const modelId = normalizeModelId(rawModelId);
    
    logger.log('[Chat API] Request params:', { 
      rawModelId,
      modelId, 
      conversationId, 
      conversationMode,
      emailType,
      isFlowMode,
      flowType,
      hasMessages: !!messages,
      hasBrandContext: !!brandContext,
      hasAttachments: !!(attachments && attachments.length > 0),
      attachmentCount: attachments?.length || 0
    });

    const model = getModelById(modelId);
    if (!model) {
      logger.error('[Chat API] Invalid model:', modelId);
      return new Response('Invalid model', { status: 400 });
    }
    
    logger.log('[Chat API] Using model:', model.name, 'Provider:', model.provider);

    // Extract conversation context (fast, synchronous)
    const conversationContext = extractConversationContext(messages);

    // Create ONE Supabase client to reuse (Edge runtime compatible)
    const supabase = createEdgeClient();

    // PERFORMANCE: Run ALL async operations in parallel
    // This includes: user auth and debug prompts
    // NOTE: Memory is now handled by Supermemory (external service)
    const effectiveEmailType = emailType || 'design';
    const promptType = determinePromptType(effectiveEmailType as 'design' | 'letter', isFlowMode);
    
    const [
      userResult,
      debugPromptResult
    ] = await Promise.all([
      // User authentication (needed for debug prompts, queue mode, and Supermemory)
      supabase.auth.getUser(),
      
      // Debug prompts - uses optimized single-query function
      getActiveDebugPromptFast(supabase, promptType),
    ]);
    
    // Extract user from result
    const user = userResult.data?.user;

    // Build system prompt with brand context, RAG, and memory
    let systemPrompt: string;
    let processedMessages = messages;
    
    // Build brand info string for prompts
    const brandInfo = `
Brand Name: ${brandContext?.name || 'N/A'}
Brand Details: ${brandContext?.brand_details || 'N/A'}
Brand Guidelines: ${brandContext?.brand_guidelines || 'N/A'}
Copywriting Style Guide: ${brandContext?.copywriting_style_guide || 'N/A'}
${brandContext?.website_url ? `Website: ${brandContext.website_url}` : ''}
    `.trim();

    // Flow mode: Use conversational flow prompt for guided flow creation
    if (conversationMode === 'flow') {
      logger.log('[Chat API] Using conversational flow prompt');
      systemPrompt = buildConversationalFlowPrompt(brandInfo);
    } else if (isFlowMode && flowType) {
      // Legacy flow mode with specific flow type (used by flow outline generation)
      systemPrompt = buildFlowOutlinePrompt(flowType as FlowType, brandInfo);
    } else if (emailType === 'design' && conversationMode === 'email_copy' && !regenerateSection) {
      const userMessages = messages.filter((m: Message) => m.role === 'user');
      const isFirstMessage = userMessages.length === 1;
      
      if (isFirstMessage) {
        logger.log('[Chat API] ★★★ Using Design Email V2 prompt (3 versions: A, B, C) ★★★');
        
        // Build brand info for the prompt
        const brandInfoForPrompt = buildBrandInfo(brandContext);
        const brandVoiceGuidelines = brandContext?.copywriting_style_guide || '';
        const copyBrief = userMessages[0]?.content || '';
        
        logger.log('[Chat API] Building Design Email V2 prompt with:', {
          hasBrandInfo: !!brandInfoForPrompt,
          hasBrandVoice: !!brandVoiceGuidelines,
          copyBriefLength: copyBrief.length,
        });
        
        // Use the new Design Email V2 prompt that returns 3 versions
        const { systemPrompt: designSystemPrompt, userPrompt: designUserPrompt } = buildDesignEmailV2Prompt({
          brandInfo: brandInfoForPrompt,
          brandVoiceGuidelines,
          websiteUrl: brandContext?.website_url,
          brandName: brandContext?.name,
          copyBrief,
        });
        
        logger.log('[Chat API] Design Email V2 prompt built, system prompt length:', designSystemPrompt.length);
        
        systemPrompt = designSystemPrompt;
        processedMessages = [{ ...userMessages[0], content: designUserPrompt }];
      } else {
        systemPrompt = buildSystemPrompt(brandContext, '', {
          regenerateSection,
          conversationContext,
          conversationMode,
          emailType
        });
        processedMessages = messages;
      }
    } else {
      systemPrompt = buildSystemPrompt(brandContext, '', {
        regenerateSection,
        conversationContext,
        conversationMode,
        emailType
      });
    }

    const websiteUrl = brandContext?.website_url;

    // DEBUG MODE: Apply custom prompt if pre-fetched
    // debugPromptResult was fetched in parallel with other async operations above
    if (debugPromptResult) {
      logger.log(`[Chat API] DEBUG MODE: Using custom prompt: ${debugPromptResult.name}`);
      
      // Helper function to replace all template variables
      const replaceTemplateVars = (template: string, copyBrief: string = '') => {
        const brandInfoLocal = buildBrandInfo(brandContext);
        const contextInfo = buildContextInfo(conversationContext);
        const brandVoiceGuidelines = brandContext?.copywriting_style_guide || '';
        const brandName = brandContext?.name || 'Unknown Brand';
        const brandDetails = brandContext?.brand_details || '';
        const brandGuidelines = brandContext?.brand_guidelines || '';
        
        return template
          // Brand placeholders
          .replace(/{{BRAND_NAME}}/g, brandName)
          .replace(/{{BRAND_DETAILS}}/g, brandDetails)
          .replace(/{{BRAND_GUIDELINES}}/g, brandGuidelines)
          .replace(/{{BRAND_INFO}}/g, brandInfoLocal)
          .replace(/{{BRAND_VOICE_GUIDELINES}}/g, brandVoiceGuidelines)
          .replace(/{{COPYWRITING_STYLE_GUIDE}}/g, brandVoiceGuidelines)
          // Context placeholders
          .replace(/{{RAG_CONTEXT}}/g, '') // RAG disabled for performance
          .replace(/{{CONTEXT_INFO}}/g, contextInfo)
          .replace(/{{MEMORY_CONTEXT}}/g, '') // Memory now handled by Supermemory
          .replace(/{{WEBSITE_URL}}/g, websiteUrl || '')
          // User input placeholders
          .replace(/{{COPY_BRIEF}}/g, copyBrief || 'No copy brief provided.')
          .replace(/{{EMAIL_BRIEF}}/g, copyBrief || 'No copy brief provided.')
          .replace(/{{USER_MESSAGE}}/g, copyBrief || '');
      };
      
      const userMessages = messages.filter((m: Message) => m.role === 'user');
      const copyBrief = userMessages[userMessages.length - 1]?.content || '';
      
      // Process system_prompt with template variables
      if (debugPromptResult.system_prompt) {
        systemPrompt = replaceTemplateVars(debugPromptResult.system_prompt, copyBrief);
        logger.log(`[Chat API] DEBUG MODE: System prompt processed, length: ${systemPrompt.length}`);
      }
      
      // Process user_prompt with template variables (only for first message)
      if (debugPromptResult.user_prompt) {
        const isFirstMessage = userMessages.length === 1;

        if (isFirstMessage) {
          const filledUserPrompt = replaceTemplateVars(debugPromptResult.user_prompt, copyBrief);
          processedMessages = [{ ...userMessages[0], content: filledUserPrompt }];
          logger.log(`[Chat API] DEBUG MODE: User prompt processed, length: ${filledUserPrompt.length}`);
        }
      }
    }

    // Background queue mode
    if (process.env.ENABLE_MESSAGE_QUEUE === 'true' && user && conversationId) {
      logger.log('[Chat API] Background queue mode enabled');
      
      try {
        const { data: newMessage, error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: '',
            status: 'queued',
            queued_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (msgError || !newMessage) {
          throw new Error('Failed to create message');
        }

        const jobId = await messageQueue.enqueue({
          messageId: newMessage.id,
          conversationId,
          userId: user.id,
          priority: 0,
          payload: {
            messages: processedMessages,
            modelId,
            brandContext,
            conversationId,
            systemPrompt,
            provider: model.provider,
            websiteUrl,
          },
        });

        return new Response(JSON.stringify({
          queued: true,
          jobId,
          messageId: newMessage.id,
          streamUrl: `/api/messages/${newMessage.id}/stream`,
        }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (queueError) {
        logger.error('[Chat API] Queue error:', queueError);
      }
    }

    // Format messages for AI SDK, including attachments for the last user message
    // Supports: images (type: 'image'), PDFs/documents (type: 'file'), and text (type: 'text')
    const formattedMessages: CoreMessage[] = processedMessages.map((msg: Message, index: number) => {
      const isLastUserMessage = msg.role === 'user' && index === processedMessages.length - 1;
      
      // If this is the last user message and we have attachments, format as multi-modal
      if (isLastUserMessage && attachments && attachments.length > 0) {
        // AI SDK UserContent supports: TextPart | ImagePart | FilePart
        // Note: AI SDK uses 'mediaType' not 'mimeType' for IANA media types
        const contentParts: Array<
          | { type: 'text'; text: string }
          | { type: 'image'; image: string; mediaType?: string }
          | { type: 'file'; data: string; mediaType: string; filename?: string }
        > = [];
        
        // Add text content first (required - AI needs some text context)
        const textContent = msg.content?.trim() || 'Please analyze the attached file(s).';
        contentParts.push({ type: 'text', text: textContent });
        
        // Add attachments based on their type
        for (const attachment of attachments) {
          // Validate attachment has required fields
          if (!attachment.data || !attachment.mimeType) {
            logger.warn('[Chat API] Skipping invalid attachment:', { 
              name: attachment.name,
              hasData: !!attachment.data,
              hasMimeType: !!attachment.mimeType 
            });
            continue;
          }
          
          // Convert raw base64 to data URL format for AI SDK compatibility
          const dataUrl = `data:${attachment.mimeType};base64,${attachment.data}`;
          
          if (attachment.type === 'image') {
            // Images use 'image' part type with data URL
            contentParts.push({
              type: 'image',
              image: dataUrl,
              mediaType: attachment.mimeType,
            });
            logger.log('[Chat API] Added image attachment:', { 
              name: attachment.name, 
              mediaType: attachment.mimeType,
              dataLength: attachment.data?.length || 0 
            });
          } else {
            // PDFs, text files, Word docs, etc. use 'file' part type
            // The AI SDK and models (Claude, GPT-4o, Gemini) can read these directly
            contentParts.push({
              type: 'file',
              data: dataUrl,
              mediaType: attachment.mimeType,
              filename: attachment.name,
            });
            logger.log('[Chat API] Added file attachment:', { 
              name: attachment.name, 
              mediaType: attachment.mimeType,
              dataLength: attachment.data?.length || 0 
            });
          }
        }
        
        logger.log('[Chat API] Final content parts count:', contentParts.length);
        
        return {
          role: msg.role as 'user' | 'assistant',
          content: contentParts,
        };
      }
      
      return {
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      };
    });

    // Use AI Gateway with the model ID directly (format: provider/model-name)
    // The gateway handles routing to the correct provider
    let aiModel: LanguageModel = gateway.languageModel(modelId);

    // Wrap model with Supermemory for persistent brand+user memory
    // This automatically injects memory context into every LLM call
    if (isSupermemoryConfigured() && brandContext?.id && user?.id) {
      const supermemoryUserId = getSupermemoryUserId(brandContext.id, user.id);
      logger.log('[Chat API] Wrapping model with Supermemory:', { supermemoryUserId });
      
      aiModel = withSupermemory(aiModel, supermemoryUserId, {
        mode: 'full', // Combines profile + query-based search for comprehensive context
      });
    }

    // Build tools based on provider
    // - Anthropic: Uses explicit web_search tool
    // - OpenAI/Google: Web search configured via provider options
    const tools = getToolsForModel(modelId, websiteUrl);

    logger.log(`[Chat API] Starting stream with ${model.provider} model`);
    logger.log(`[Chat API] System prompt length: ${systemPrompt.length}`);
    logger.log(`[Chat API] Messages count: ${formattedMessages.length}`);
    logger.log(`[Chat API] Web search enabled: ${model.provider === 'anthropic' ? 'via tool' : 'via provider options'}`);
    logger.log(`[Chat API] Supermemory enabled: ${isSupermemoryConfigured() && brandContext?.id && user?.id}`);
    
    // Log attachment details for debugging
    if (attachments && attachments.length > 0) {
      logger.log('[Chat API] Attachments being sent:', attachments.map((a: { type: string; name: string; mimeType: string }) => ({
        type: a.type,
        name: a.name,
        mimeType: a.mimeType,
      })));
    }

    // Use Vercel AI SDK streamText with AI Gateway
    let result;
    try {
      result = await streamText({
        model: aiModel,
        system: systemPrompt,
        messages: formattedMessages,
        tools,
        maxRetries: 2,
        // Extended thinking/reasoning + web search for all supported providers
        providerOptions: getProviderOptionsWithWebSearch(modelId, 10000, websiteUrl),
      });
      logger.log('[Chat API] streamText result received successfully');
    } catch (streamError) {
      logger.error('[Chat API] streamText failed:', streamError);
      throw streamError;
    }

    // Create custom streaming response with our JSON format for client compatibility
    const encoder = new TextEncoder();
    let fullText = '';
    let fullReasoning = '';
    
    const readable = new ReadableStream({
      async start(controller) {
        const sendMessage = (type: string, data: Record<string, unknown>) => {
          const message = JSON.stringify({ type, ...data }) + '\n';
          controller.enqueue(encoder.encode(message));
        };

        // Send initial status
        sendMessage('status', { status: 'analyzing_brand' });

        try {
          logger.log('[Chat API] Starting to iterate fullStream');
          
          // Iterate over the stream
          for await (const part of result.fullStream) {
            logger.log('[Chat API] Received stream part:', part.type);
            
            switch (part.type) {
              case 'text-delta':
                fullText += part.text;
                sendMessage('text', { content: part.text });
                break;
                
              case 'reasoning-delta':
                // AI SDK uses 'text' property for reasoning-delta content
                const reasoningText = 'text' in part ? (part as { text: string }).text : '';
                fullReasoning += reasoningText;
                sendMessage('thinking', { content: reasoningText });
                break;
                
              case 'tool-call':
                sendMessage('tool_use', { tool: part.toolName, status: 'start' });
                if (part.toolName === 'web_search') {
                  sendMessage('status', { status: 'searching_web' });
                }
                break;
                
              case 'tool-result':
                sendMessage('tool_use', { tool: part.toolName, status: 'end' });
                sendMessage('status', { status: 'analyzing_brand' });
                break;
                
              case 'reasoning-start':
                sendMessage('thinking_start', {});
                sendMessage('status', { status: 'thinking' });
                break;
                
              case 'reasoning-end':
                if (fullReasoning) {
                  sendMessage('thinking_end', {});
                }
                break;
                
              case 'finish':
                logger.log('[Chat API] Stream finished', { 
                  textLength: fullText.length,
                  reasoningLength: fullReasoning.length 
                });
                break;
                
              case 'error':
                logger.error('[Chat API] Stream error:', part.error);
                sendMessage('error', { error: String(part.error) });
                break;
            }
          }

          logger.log('[Chat API] fullStream iteration complete, fullText length:', fullText.length);

          // Extract product links from the response
          if (fullText) {
            try {
              const userMessageTexts = messages
                .filter((m: Message) => m.role === 'user')
                .map((m: Message) => m.content);
              
              const productLinks = smartExtractProductLinks(
                fullText + '\n\n' + fullReasoning,
                userMessageTexts,
                websiteUrl
              );
              
              if (productLinks.length > 0) {
                sendMessage('products', { products: productLinks });
              }
            } catch (error) {
              logger.error('[Chat API] Product link extraction error:', error);
            }
          }

          controller.close();
        } catch (error) {
          logger.error('[Chat API] Stream processing error:', error);
          sendMessage('error', { error: error instanceof Error ? error.message : 'Unknown error' });
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    logger.error('[Chat API] Error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to generate response. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
