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
import { getActiveDebugPrompt, determinePromptType } from '@/lib/debug-prompts';
import { handleUnifiedStream } from '@/lib/unified-stream-handler';
import { messageQueue } from '@/lib/queue/message-queue';
import { createClient } from '@/lib/supabase/server';

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
        
        const {
          systemPrompt: v2SystemPrompt,
          userPromptTemplate,
          brandVoiceGuidelines,
          additionalContext,
        } = buildStandardEmailPromptV2({
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
        let filledUserPrompt = userPromptTemplate.replace(/{{COPY_BRIEF}}/g, copyBrief || 'No copy brief provided.');

        // Safety: Ensure no placeholders remain
        if (filledUserPrompt.includes('{{BRAND_VOICE_GUIDELINES}}')) {
          filledUserPrompt = filledUserPrompt.replace(/{{BRAND_VOICE_GUIDELINES}}/g, brandVoiceGuidelines || 'No style guide provided.');
        }

        if (filledUserPrompt.includes('{{ADDITIONAL_CONTEXT}}')) {
          filledUserPrompt = filledUserPrompt.replace(/{{ADDITIONAL_CONTEXT}}/g, additionalContext || '');
        }

        if (filledUserPrompt.includes('{{')) {
          console.warn('[Chat API] ⚠️ Placeholder(s) still present after replacement. Applying fallbacks.', {
            hasCopyBrief: !!copyBrief,
            hasStyleGuide: !!brandVoiceGuidelines,
            hasAdditionalContext: !!additionalContext,
          });

          filledUserPrompt = filledUserPrompt
            .replace(/{{COPY_BRIEF}}/g, copyBrief || 'No copy brief provided.')
            .replace(/{{BRAND_VOICE_GUIDELINES}}/g, brandVoiceGuidelines || 'No style guide provided.')
            .replace(/{{ADDITIONAL_CONTEXT}}/g, additionalContext || '');
        }

        console.log('[Chat API] Filled prompt preview:', filledUserPrompt.substring(0, 200));
        if (filledUserPrompt.includes('{{')) {
          console.warn('[Chat API] ⚠️ WARNING: Placeholders still detected in filled prompt.');
        }
        
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

    // DEBUG MODE: Check for custom prompt overrides
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Determine email type
      const effectiveEmailType = emailType || (isFlowMode ? 'design' : 'design'); // fallback
      
      if (!isFlowMode) {
        const promptType = determinePromptType(effectiveEmailType as 'design' | 'letter', false);
        const customPrompt = await getActiveDebugPrompt(supabase, user.id, promptType);
        
        if (customPrompt) {
          console.log(`[Chat API] 🐛 DEBUG MODE: Using custom prompt: ${customPrompt.name} for ${promptType}`);
          
          // Override system prompt if provided
          if (customPrompt.system_prompt) {
            systemPrompt = customPrompt.system_prompt;
          }
          
          // Override user prompt template if provided
          if (customPrompt.user_prompt) {
            const userMessages = messages.filter((m: Message) => m.role === 'user');
            const isFirstMessage = userMessages.length === 1;

            if (isFirstMessage) {
              // Get user content (the copy brief)
              const copyBrief = userMessages[0]?.content || '';
              
              // Apply variable replacements to the custom user prompt
              const brandInfo = buildBrandInfo(brandContext);
              const contextInfo = buildContextInfo(conversationContext);
              const brandVoiceGuidelines = brandContext?.copywriting_style_guide || '';
              
              // Replace variables in user prompt template
              let filledUserPrompt = customPrompt.user_prompt
                .replace(/{{COPY_BRIEF}}/g, copyBrief || 'No copy brief provided.')
                .replace(/{{BRAND_INFO}}/g, brandInfo)
                .replace(/{{RAG_CONTEXT}}/g, ragContext)
                .replace(/{{CONTEXT_INFO}}/g, contextInfo)
                .replace(/{{MEMORY_CONTEXT}}/g, memoryPrompt)
                .replace(/{{WEBSITE_URL}}/g, websiteUrl || '')
                .replace(/{{BRAND_VOICE_GUIDELINES}}/g, brandVoiceGuidelines)
                .replace(/{{EMAIL_BRIEF}}/g, copyBrief || 'No copy brief provided.');

              // Use the filled prompt as the user message
              processedMessages = [{ ...userMessages[0], content: filledUserPrompt }];
            }
          }
        }
      } else if (isFlowMode) {
        // Flow mode uses 'flow_email' type
        const customPrompt = await getActiveDebugPrompt(supabase, user.id, 'flow_email');
        if (customPrompt) {
          console.log(`[Chat API] 🐛 DEBUG MODE: Using custom flow prompt: ${customPrompt.name}`);
          if (customPrompt.system_prompt) {
            systemPrompt = customPrompt.system_prompt;
          }
        }
      }
    }

    // Background queue mode: queue jobs for cron processing instead of direct streaming
    // Enable with ENABLE_MESSAGE_QUEUE=true in environment variables
    if (process.env.ENABLE_MESSAGE_QUEUE === 'true' && user && conversationId) {
      console.log('[Chat API] Background queue mode enabled, queueing job');
      
      try {
        // Create a placeholder message in the database
        const { data: newMessage, error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: '', // Will be filled by worker
            status: 'queued',
            queued_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (msgError || !newMessage) {
          console.error('[Chat API] Failed to create message:', msgError);
          throw new Error('Failed to create message');
        }

        // Queue the job for background processing
        const jobId = await messageQueue.enqueue({
          messageId: newMessage.id,
          conversationId,
          userId: user.id,
          priority: 0, // Default priority
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

        console.log('[Chat API] Job queued:', jobId, 'Message:', newMessage.id);

        // Return immediately with job info - client should poll /api/messages/[id]/stream
        return new Response(JSON.stringify({
          queued: true,
          jobId,
          messageId: newMessage.id,
          streamUrl: `/api/messages/${newMessage.id}/stream`,
        }), {
          status: 202, // Accepted
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (queueError) {
        console.error('[Chat API] Queue error, falling back to direct streaming:', queueError);
        // Fall through to direct streaming
      }
    }

    // Direct streaming mode (default) - better real-time UX
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
