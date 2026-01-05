import { streamText, ModelMessage, LanguageModel, generateText, stepCountIs } from 'ai';
import { gateway, getToolsForModel, getProviderOptionsWithWebSearch, MODELS } from '@/lib/ai-providers';
import { getModelById, normalizeModelId } from '@/lib/ai-models';
import { Message, FlowType, isCustomMode, getCustomModeId } from '@/types';
import { extractConversationContext } from '@/lib/conversation-memory';
import { buildFlowOutlinePrompt, buildConversationalFlowPrompt } from '@/lib/flow-prompts';
import { buildSystemPrompt, buildBrandInfo, buildContextInfo, buildCustomModePrompt } from '@/lib/chat-prompts';
import { buildDesignEmailV2Prompt } from '@/lib/prompts/design-email-v2.prompt';
import { getActiveDebugPromptFast, determinePromptType } from '@/lib/debug-prompts';
import { messageQueue } from '@/lib/queue/message-queue';
import { createEdgeClientWithSession } from '@/lib/supabase/edge';
import { logger } from '@/lib/logger';
import { smartExtractProductLinks } from '@/lib/url-extractor';
import { withSupermemory, addMemoryTool } from '@supermemory/tools/ai-sdk';
import { getSupermemoryUserId, isSupermemoryConfigured } from '@/lib/supermemory';
import { isPersonalAI, buildPersonalAIPrompt } from '@/lib/personal-ai';
import { getToolsForMode, getToolsForModeWithShopify, detectArtifactContent, parseEmailVersions, getAgentDisplayInfo } from '@/lib/tools';
import { checkArtifactWorthiness, quickRejectCheck, validateArtifactToolInput, isConversationalContent } from '@/lib/artifact-worthiness';
import { z } from 'zod';
// Orchestrator imports
import {
  shouldUseOrchestrator,
  buildOrchestratorSystemPrompt,
  buildOrchestratorTools,
  executeSpecialist,
  parseSpecialistInvocation,
  isSpecialistInvocation,
  suggestConversationPlanTool,
  type OrchestratorConfig,
} from '@/lib/agents/orchestrator-service';
import type { SpecialistType } from '@/types/orchestrator';

export const runtime = 'edge';

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

// Maximum attachment size: 10MB per file, 50MB total
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const MAX_TOTAL_ATTACHMENT_SIZE = 50 * 1024 * 1024; // 50MB in bytes
const MAX_ATTACHMENTS = 10;

// Zod schema for chat request validation
// Messages schema is flexible to allow additional properties (id, metadata, etc.)
const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  }).passthrough()).min(1, 'At least one message is required'),
  modelId: z.string().optional(),
  brandContext: z.object({
    id: z.string().uuid().optional(),
    name: z.string().optional(),
    brand_details: z.string().nullish(),
    brand_guidelines: z.string().nullish(),
    copywriting_style_guide: z.string().nullish(),
    website_url: z.string().nullish(),
    shopify_domain: z.string().nullish(),
  }).optional().nullable(),
  regenerateSection: z.object({
    type: z.string(),
    title: z.string(),
  }).optional(),
  conversationId: z.string().uuid().optional(),
  conversationMode: z.string().optional(),
  emailType: z.enum(['design', 'letter', 'flow']).optional(),
  isFlowMode: z.boolean().optional(),
  flowType: z.string().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    type: z.enum(['image', 'file']),
    mimeType: z.string(),
    data: z.string(), // Base64 encoded
  })).max(MAX_ATTACHMENTS).optional(),
  customModeId: z.string().uuid().optional(),
});

/**
 * Validate attachment sizes
 * Returns error message if validation fails, null if valid
 */
function validateAttachments(attachments: Array<{ data: string; name: string }> | undefined): string | null {
  if (!attachments || attachments.length === 0) return null;

  let totalSize = 0;
  for (const attachment of attachments) {
    // Base64 string length * 0.75 ≈ actual byte size
    const estimatedSize = Math.ceil(attachment.data.length * 0.75);

    if (estimatedSize > MAX_ATTACHMENT_SIZE) {
      return `Attachment "${attachment.name}" exceeds maximum size of 10MB`;
    }

    totalSize += estimatedSize;
  }

  if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
    return `Total attachment size exceeds maximum of 50MB`;
  }

  return null;
}

/**
 * Validate UUID format
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// =============================================================================
// ARTIFACT EXISTENCE HELPERS
// =============================================================================

/**
 * Check if a conversation already has a calendar artifact.
 * Used to determine if tool-choice should be forced for Calendar Planner mode.
 */
async function hasCalendarArtifact(
  supabase: ReturnType<typeof import('@/lib/supabase/edge').createEdgeClientWithSession> extends Promise<infer T> ? T : never,
  conversationId: string | undefined
): Promise<boolean> {
  if (!conversationId) return false;
  
  try {
    const { count, error } = await supabase
      .from('artifacts')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('kind', 'calendar');
    
    if (error) {
      logger.warn('[Chat API] Error checking for calendar artifact:', error);
      return false;
    }
    
    return (count ?? 0) > 0;
  } catch (err) {
    logger.warn('[Chat API] Exception checking for calendar artifact:', err);
    return false;
  }
}

/**
 * Modes that require mandatory tool use until their primary artifact exists.
 * Maps mode name to the artifact kind that must be created.
 */
const ARTIFACT_REQUIRED_MODES: Record<string, { kind: string; toolName: string }> = {
  'Calendar Planner': { kind: 'calendar', toolName: 'create_artifact' },
};

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(req: Request) {
  try {
    logger.log('[Chat API] Received request');

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate with Zod schema
    const parseResult = ChatRequestSchema.safeParse(requestBody);
    if (!parseResult.success) {
      const validationDetails = parseResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
      logger.warn('[Chat API] Validation failed:', validationDetails);
      return new Response(JSON.stringify({
        error: `Invalid request format: ${validationDetails.join('; ')}`,
        details: validationDetails,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { messages, modelId: rawModelId, brandContext, regenerateSection, conversationId, conversationMode, emailType, isFlowMode, flowType, attachments, customModeId } = parseResult.data;

    // Validate attachment sizes
    const attachmentError = validateAttachments(attachments);
    if (attachmentError) {
      return new Response(JSON.stringify({ error: attachmentError }), {
        status: 413, // Payload Too Large
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Normalize legacy model IDs to AI Gateway format
    const modelId = normalizeModelId(rawModelId);
    
    // Check if this is a custom mode (format: custom_<uuid>)
    const isCustomModeRequest = conversationMode && isCustomMode(conversationMode);
    const customModeIdFromMode = isCustomModeRequest ? getCustomModeId(conversationMode) : null;
    const effectiveCustomModeId = customModeId || customModeIdFromMode;
    
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
      attachmentCount: attachments?.length || 0,
      isCustomMode: isCustomModeRequest,
      customModeId: effectiveCustomModeId,
    });

    const model = getModelById(modelId);
    if (!model) {
      logger.error('[Chat API] Invalid model:', modelId);
      return new Response('Invalid model', { status: 400 });
    }
    
    logger.log('[Chat API] Using model:', model.name, 'Provider:', model.provider);

    // Extract conversation context (fast, synchronous)
    const conversationContext = extractConversationContext(messages);

    // Create ONE Supabase client to reuse (Edge runtime compatible with user session)
    const supabase = await createEdgeClientWithSession();

    // PERFORMANCE: Run ALL async operations in parallel
    // This includes: user auth, debug prompts, and custom mode fetch
    // NOTE: Memory is now handled by Supermemory (external service)
    const effectiveEmailType = emailType || 'design';
    const promptType = determinePromptType(effectiveEmailType as 'design' | 'letter', isFlowMode);
    
    const [
      userResult,
      debugPromptResult,
      customModeResult,
    ] = await Promise.all([
      // User authentication (needed for debug prompts, queue mode, and Supermemory)
      supabase.auth.getUser(),
      
      // Debug prompts - uses optimized single-query function
      getActiveDebugPromptFast(supabase, promptType),
      
      // Fetch custom mode if provided (need system prompt and tool config)
      effectiveCustomModeId 
        ? supabase
            .from('custom_modes')
            .select('id, name, system_prompt, enabled_tools')
            .eq('id', effectiveCustomModeId)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ]);
    
    // Extract user from result
    const user = userResult.data?.user;
    const customMode = customModeResult?.data;
    
    // Debug: Log custom mode fetch results
    if (effectiveCustomModeId) {
      logger.log('[Chat API] Custom mode fetch result:', {
        requestedId: effectiveCustomModeId,
        hasData: !!customMode,
        modeName: customMode?.name,
        error: customModeResult?.error?.message || null,
      });
    }

    // Build system prompt with brand context, RAG, and memory
    let systemPrompt: string;
    let processedMessages = messages;

    // Check if this is a Personal AI conversation (no brand context)
    const isPersonalAIMode = isPersonalAI(brandContext?.id);

    // Check if orchestrator mode should be used
    // Orchestrator is used when: no specific mode, 'orchestrator' mode, or 'assistant' mode
    const isOrchestratorMode = !isPersonalAIMode &&
                                brandContext?.id &&
                                shouldUseOrchestrator(conversationMode) &&
                                !customMode; // Custom modes override orchestrator

    // Build orchestrator config if needed
    const orchestratorConfig: OrchestratorConfig | null = isOrchestratorMode && brandContext?.id && user?.id ? {
      brandId: brandContext.id,
      brandInfo: `
Brand Name: ${brandContext?.name || 'N/A'}
Brand Details: ${brandContext?.brand_details || 'N/A'}
Brand Guidelines: ${brandContext?.brand_guidelines || 'N/A'}
Copywriting Style Guide: ${brandContext?.copywriting_style_guide || 'N/A'}
${brandContext?.website_url ? `Website: ${brandContext.website_url}` : ''}
      `.trim(),
      brandName: brandContext?.name,
      userId: user.id,
      conversationId: conversationId || '',
      // memoryContext will be added by Supermemory wrapper
    } : null;

    // Determine if memory should be enabled (needed early for system prompt instructions)
    // Skip for Personal AI mode - no brand-specific memory needed
    const shouldEnableMemory = isSupermemoryConfigured() &&
                               brandContext?.id &&
                               user?.id &&
                               !isPersonalAIMode;

    if (isPersonalAIMode) {
      // Personal AI mode: Use generic assistant prompt without brand context
      logger.log('[Chat API] Personal AI mode - using generic assistant prompt');
      systemPrompt = buildPersonalAIPrompt();
    } else if (isOrchestratorMode && orchestratorConfig) {
      // Orchestrator mode: Use the orchestrator prompt with specialist invocation capabilities
      logger.log('[Chat API] Orchestrator mode - using orchestrator prompt');
      systemPrompt = buildOrchestratorSystemPrompt(orchestratorConfig);
      processedMessages = messages;
    } else {
      // Brand mode: Build brand-specific prompts
      // Build brand info string for prompts
      const brandInfo = `
Brand Name: ${brandContext?.name || 'N/A'}
Brand Details: ${brandContext?.brand_details || 'N/A'}
Brand Guidelines: ${brandContext?.brand_guidelines || 'N/A'}
Copywriting Style Guide: ${brandContext?.copywriting_style_guide || 'N/A'}
${brandContext?.website_url ? `Website: ${brandContext.website_url}` : ''}
      `.trim();

    // Custom mode: Use the custom mode's system prompt
    if (customMode && customMode.system_prompt) {
      logger.log('[Chat API] Using custom mode:', customMode.name);
      const userMessages = messages.filter((m) => m.role === 'user');
      const latestUserMessage = userMessages[userMessages.length - 1]?.content || '';

      // Get allowed artifact kinds from custom mode's enabled_tools config
      const allowedArtifactKinds = customMode.enabled_tools?.create_artifact?.allowed_kinds as string[] | undefined;

      systemPrompt = buildCustomModePrompt(customMode.system_prompt, brandContext, {
        conversationContext,
        userMessage: latestUserMessage,
        allowedArtifactKinds,
      });
      processedMessages = messages;
    // Flow mode: Use conversational flow prompt for guided flow creation
    } else if (conversationMode === 'flow') {
      logger.log('[Chat API] Using conversational flow prompt');
      systemPrompt = buildConversationalFlowPrompt(brandInfo);
    } else if (isFlowMode && flowType) {
      // Legacy flow mode with specific flow type (used by flow outline generation)
      systemPrompt = buildFlowOutlinePrompt(flowType as FlowType, brandInfo);
    } else if (emailType === 'design' && conversationMode === 'email_copy' && !regenerateSection) {
      const userMessages = messages.filter((m) => m.role === 'user');
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
          websiteUrl: brandContext?.website_url || undefined,
          brandName: brandContext?.name || undefined,
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
    } // Close isPersonalAIMode else block

    const websiteUrl = brandContext?.website_url || undefined;

    // DEBUG MODE: Apply custom system prompt if pre-fetched
    // debugPromptResult was fetched in parallel with other async operations above
    if (debugPromptResult && debugPromptResult.system_prompt) {
      logger.log(`[Chat API] DEBUG MODE: Using custom prompt: ${debugPromptResult.name}`);
      
      // IMPORTANT: Reset processedMessages to original messages when using custom debug prompt.
      // The default flow (e.g., Design Email V2) may have transformed processedMessages with its
      // own template. Using a custom debug prompt should bypass that transformation entirely,
      // pairing the custom system prompt with the user's original messages.
      processedMessages = messages;
      
      // Get user's message for the COPY_BRIEF variable
      const userMessages = messages.filter((m) => m.role === 'user');
      const copyBrief = userMessages[userMessages.length - 1]?.content || '';
      
      // Build variable values
      const brandInfoLocal = buildBrandInfo(brandContext);
      const contextInfo = buildContextInfo(conversationContext);
      const brandVoiceGuidelines = brandContext?.copywriting_style_guide || '';
      const brandName = brandContext?.name || 'Unknown Brand';
      
      // Replace template variables in the system prompt
      // Includes deprecated variables for backward compatibility with existing prompts
      systemPrompt = debugPromptResult.system_prompt
        // Current variables
        .replace(/{{BRAND_NAME}}/g, brandName)
        .replace(/{{BRAND_INFO}}/g, brandInfoLocal)
        .replace(/{{BRAND_VOICE_GUIDELINES}}/g, brandVoiceGuidelines)
        .replace(/{{WEBSITE_URL}}/g, websiteUrl || '')
        .replace(/{{COPY_BRIEF}}/g, copyBrief || '')
        .replace(/{{CONTEXT_INFO}}/g, contextInfo)
        // Deprecated variables - replaced with safe fallbacks for backward compatibility
        .replace(/{{RAG_CONTEXT}}/g, '') // RAG disabled, empty string
        .replace(/{{MEMORY_CONTEXT}}/g, '') // Memory now handled by Supermemory
        .replace(/{{EMAIL_BRIEF}}/g, copyBrief || '') // Alias for COPY_BRIEF
        .replace(/{{USER_MESSAGE}}/g, copyBrief || '') // Alias for COPY_BRIEF
        .replace(/{{BRAND_DETAILS}}/g, '') // Deprecated, use BRAND_INFO
        .replace(/{{BRAND_GUIDELINES}}/g, '') // Deprecated, use BRAND_INFO
        .replace(/{{COPYWRITING_STYLE_GUIDE}}/g, brandVoiceGuidelines); // Alias for BRAND_VOICE_GUIDELINES
      
      logger.log(`[Chat API] DEBUG MODE: System prompt processed, length: ${systemPrompt.length}`);
    }

    // Add memory tool instructions to system prompt when memory is enabled
    // This tells the AI how and when to use the save_memory tool
    if (shouldEnableMemory) {
      const memoryInstructions = `

## MEMORY TOOL

You have access to a \`save_memory\` tool for storing important information that should persist across conversations.

**When to save to memory:**
- Brand preferences explicitly stated by the user (e.g., "We always use Oxford commas", "Never use emojis")
- Key facts about the brand, products, or audience
- Important decisions made during the conversation
- User preferences for working style or output format
- Specific guidelines or rules the user wants followed consistently

**When NOT to save:**
- Casual conversation or greetings
- Temporary context only relevant to this conversation
- Information that's already in the brand profile
- Common knowledge or general facts

**How to use:** Call the \`save_memory\` tool with a clear, concise description of what to remember. Be specific and include context.

Example: "The brand prefers a casual, friendly tone. They never use words like 'synergy' or 'leverage'."
`;
      systemPrompt += memoryInstructions;
      logger.log('[Chat API] Added memory tool instructions to system prompt');
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
        // Return error response instead of falling through to streaming
        return new Response(JSON.stringify({
          error: 'Failed to queue message. Please try again.',
          details: queueError instanceof Error ? queueError.message : 'Unknown error',
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Format messages for AI SDK, including attachments for the last user message
    // Supports: images (type: 'image'), PDFs/documents (type: 'file'), and text (type: 'text')
    // Cast processedMessages to Message[] for type compatibility with the rest of the code
    const typedMessages = processedMessages as unknown as Message[];
    const formattedMessages = typedMessages.map((msg, index): ModelMessage => {
      const isLastUserMessage = msg.role === 'user' && index === typedMessages.length - 1;
      
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

        // This is always a user message (isLastUserMessage check above)
        return {
          role: 'user' as const,
          content: contentParts,
        } as ModelMessage;
      }

      // For non-multimodal messages, just return role and content
      if (msg.role === 'user') {
        return {
          role: 'user' as const,
          content: msg.content,
        } as ModelMessage;
      }

      return {
        role: 'assistant' as const,
        content: msg.content,
      } as ModelMessage;
    });

    // Use AI Gateway with the model ID directly (format: provider/model-name)
    // The gateway handles routing to the correct provider
    let aiModel: LanguageModel = gateway.languageModel(modelId);

    // Wrap model with Supermemory for persistent brand+user memory
    // This automatically injects memory context into every LLM call
    // shouldEnableMemory was determined earlier (needed for system prompt instructions)
    
    // Generate the composite userId for Supermemory (needed for both model wrapping and tools)
    // Note: brandContext.id is guaranteed to be defined when shouldEnableMemory is true
    // (see shouldEnableMemory check above which requires brandContext?.id to be truthy)
    const supermemoryUserId = shouldEnableMemory
      ? getSupermemoryUserId(brandContext!.id!, user!.id)
      : '';
    
    if (shouldEnableMemory) {
      logger.log('[Chat API] Wrapping model with Supermemory:', { supermemoryUserId });
      
      // Type assertion needed due to @supermemory/tools using AI SDK v5 types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aiModel = withSupermemory(aiModel as any, supermemoryUserId, {
        mode: 'full', // Combines profile + query-based search for comprehensive context
        conversationId, // Group messages by conversation for better context
      }) as unknown as LanguageModel;
    }

    // Build tools based on provider
    // - Anthropic: Uses explicit web_search tool
    // - OpenAI/Google: Web search configured via provider options
    const baseTools = getToolsForModel(modelId, websiteUrl);
    
    // Add memory tool if Supermemory is configured and memory is enabled
    // This gives the AI the ability to save important information to memory
    const memoryTool = shouldEnableMemory && process.env.SUPERMEMORY_API_KEY
      ? {
          save_memory: addMemoryTool(process.env.SUPERMEMORY_API_KEY, {
            containerTags: [supermemoryUserId],
          }),
        }
      : {};
    
    // Get mode-specific tools (artifact creation, conversation creation, actions, image generation)
    // Pass custom mode tool config if available
    // Also load Shopify MCP tools if brand has a Shopify store
    const toolConfig = customMode?.enabled_tools || undefined;
    const shopifyDomain = brandContext?.shopify_domain || undefined;
    const shopifyConfig = toolConfig?.shopify_product_search;

    // Use async function to load mode tools with potential Shopify MCP integration
    const modeTools = await getToolsForModeWithShopify(conversationMode || 'email_copy', {
      modeTools: toolConfig || {},
      shopifyDomain,
      shopifyConfig,
    });

    // Log Shopify integration status
    if (shopifyDomain) {
      const hasShopifyTools = Object.keys(modeTools).some(k => k.startsWith('shopify_'));
      logger.log(`[Chat API] Shopify MCP: ${hasShopifyTools ? 'connected' : 'not available'} for ${shopifyDomain}`);
    }

    // Add orchestrator-specific tools when in orchestrator mode
    const orchestratorTools = isOrchestratorMode && orchestratorConfig
      ? buildOrchestratorTools(orchestratorConfig)
      : {};

    // Log orchestrator status
    if (isOrchestratorMode) {
      logger.log('[Chat API] Orchestrator mode enabled with tools:', Object.keys(orchestratorTools));
    }

    // Combine all tools (filter out undefined values for TypeScript)
    const allTools = { ...baseTools, ...memoryTool, ...modeTools, ...orchestratorTools };
    const tools = Object.fromEntries(
      Object.entries(allTools).filter(([, v]) => v !== undefined)
    );

    logger.log(`[Chat API] Starting stream with ${model.provider} model`);
    logger.log(`[Chat API] System prompt length: ${systemPrompt.length}`);
    logger.log(`[Chat API] Messages count: ${formattedMessages.length}`);
    logger.log(`[Chat API] Mode: ${isPersonalAIMode ? 'Personal AI' : isOrchestratorMode ? 'Orchestrator' : 'Brand Mode'}`);
    logger.log(`[Chat API] Orchestrator enabled: ${isOrchestratorMode}`);
    logger.log(`[Chat API] Web search enabled: ${model.provider === 'anthropic' ? 'via tool' : 'via provider options'}`);
    logger.log(`[Chat API] Supermemory enabled: ${isSupermemoryConfigured() && brandContext?.id && user?.id && !isPersonalAIMode}`);
    
    // Log attachment details for debugging
    if (attachments && attachments.length > 0) {
      logger.log('[Chat API] Attachments being sent:', attachments.map((a: { type: string; name: string; mimeType: string }) => ({
        type: a.type,
        name: a.name,
        mimeType: a.mimeType,
      })));
    }

    // Log mode configuration
    if (customMode) {
      logger.log('[Chat API] Custom mode active:', customMode.name);
    }

    // Use Vercel AI SDK streamText with AI Gateway
    let result;
    try {
      const providerOptions = getProviderOptionsWithWebSearch(modelId, 10000, websiteUrl);

      // =======================================================================
      // ARTIFACT-REQUIRED MODES: Force tool use until primary artifact exists
      // =======================================================================
      // Modes like Calendar Planner MUST create their primary artifact before
      // providing text-only responses. This prevents plain-text fallbacks.
      
      const artifactRequirement = customMode?.name 
        ? ARTIFACT_REQUIRED_MODES[customMode.name] 
        : undefined;
      
      let shouldForceToolUse = false;
      
      if (artifactRequirement) {
        // Check if the required artifact already exists for this conversation
        const hasRequiredArtifact = await hasCalendarArtifact(supabase, conversationId);
        
        // Force tool use if artifact doesn't exist yet
        shouldForceToolUse = !hasRequiredArtifact;
        
        logger.log('[Chat API] Artifact-required mode check:', {
          modeName: customMode?.name,
          requiredKind: artifactRequirement.kind,
          hasRequiredArtifact,
          shouldForceToolUse,
          conversationId,
        });
      }

      // Debug logging for Calendar Planner (backwards-compatible log key)
      const isCalendarPlannerMode = customMode?.name === 'Calendar Planner';
      logger.log('[Chat API] Calendar Planner check:', {
        customModeName: customMode?.name,
        isCalendarPlannerMode,
        messagesLength: messages.length,
        shouldForceToolUse,
      });

      if (shouldForceToolUse) {
        logger.log('[Chat API] Forcing tool use via toolChoice: required (artifact not yet created)');
      }

      result = await streamText({
        model: aiModel,
        system: systemPrompt,
        messages: formattedMessages,
        tools,
        // Force tool calling for modes that require artifact creation
        // Using 'required' forces the AI to call a tool; the system prompt guides which one
        ...(shouldForceToolUse && {
          toolChoice: 'required' as const,
        }),
        stopWhen: stepCountIs(5), // Allow up to 5 tool execution rounds per response
        maxRetries: 2,
        // Extended thinking/reasoning + web search for all supported providers
        providerOptions,
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
                logger.info('[Chat API] Tool called:', part.toolName);
                sendMessage('tool_use', { tool: part.toolName, status: 'start' });

                // Handle specific tool calls
                if (part.toolName === 'invoke_specialist') {
                  // Orchestrator is invoking a specialist agent
                  const toolInput = 'input' in part ? part.input : ('args' in part ? (part as any).args : {});
                  const specialistArgs = toolInput as {
                    specialist: SpecialistType;
                    task: string;
                    context?: Record<string, unknown>;
                    expectedOutput?: string;
                  };

                  sendMessage('status', { status: 'invoking_specialist' });
                  sendMessage('specialist_start', {
                    specialist: specialistArgs.specialist,
                    task: specialistArgs.task,
                  });
                  logger.log(`[Chat API] Invoking specialist: ${specialistArgs.specialist}`);

                  // Execute the specialist if orchestrator config is available
                  if (orchestratorConfig) {
                    try {
                      // Convert messages for specialist execution
                      const specialistMessages: ModelMessage[] = formattedMessages.map((msg) => ({
                        role: msg.role as 'user' | 'assistant',
                        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                      }));

                      const specialistResult = await executeSpecialist(
                        {
                          specialist: specialistArgs.specialist,
                          task: specialistArgs.task,
                          context: specialistArgs.context,
                          expectedOutput: specialistArgs.expectedOutput,
                        },
                        orchestratorConfig,
                        specialistMessages
                      );

                      // Send specialist result to frontend
                      sendMessage('specialist_result', {
                        specialist: specialistResult.specialist,
                        status: specialistResult.status,
                        response: specialistResult.response,
                        artifacts: specialistResult.artifacts,
                        modelUsed: specialistResult.modelUsed,
                        durationMs: specialistResult.durationMs,
                      });

                      // If specialist created artifacts, send them
                      if (specialistResult.artifacts) {
                        for (const artifact of specialistResult.artifacts) {
                          sendMessage('artifact_created', {
                            artifactId: artifact.id,
                            kind: artifact.kind,
                            title: artifact.title,
                          });
                        }
                      }

                      // Stream the specialist's response as text
                      if (specialistResult.response) {
                        fullText += `\n\n**[${specialistArgs.specialist}]:**\n${specialistResult.response}`;
                        sendMessage('text', { content: `\n\n**[${specialistArgs.specialist}]:**\n${specialistResult.response}` });
                      }

                      logger.log(`[Chat API] Specialist ${specialistArgs.specialist} completed in ${specialistResult.durationMs}ms`);
                    } catch (err) {
                      logger.error('[Chat API] Specialist execution error:', err);
                      sendMessage('specialist_error', {
                        specialist: specialistArgs.specialist,
                        error: err instanceof Error ? err.message : 'Unknown error',
                      });
                    }
                  }
                } else if (part.toolName === 'web_search') {
                  sendMessage('status', { status: 'searching_web' });
                } else if (part.toolName === 'generate_image') {
                  sendMessage('status', { status: 'generating_image' });
                  logger.log('[Chat API] Image generation started');
                } else if (part.toolName === 'create_artifact') {
                  sendMessage('status', { status: 'creating_artifact' });

                  // Create artifact in database
                  try {
                    // AI SDK uses 'input' for tool call arguments, not 'args'
                    const toolInput = 'input' in part ? part.input : ('args' in part ? (part as any).args : {});
                    const artifactArgs = toolInput as {
                      kind: 'email' | 'flow' | 'campaign' | 'template' | 'subject_lines' | 'content_brief' | 'email_brief' | 'calendar' | 'markdown' | 'spreadsheet' | 'code' | 'checklist';
                      title: string;
                      description?: string;
                      content: string;
                      metadata?: Record<string, unknown>;
                    };

                    // Validate artifact kind against custom mode's allowed_kinds
                    const allowedKinds = toolConfig?.create_artifact?.allowed_kinds as string[] | undefined;
                    if (allowedKinds && allowedKinds.length > 0 && !allowedKinds.includes(artifactArgs.kind)) {
                      logger.warn('[Chat API] Artifact kind not allowed by custom mode:', {
                        requestedKind: artifactArgs.kind,
                        allowedKinds,
                        customModeName: customMode?.name,
                      });
                      sendMessage('artifact_error', {
                        error: 'Artifact kind not allowed',
                        kind: artifactArgs.kind,
                        title: artifactArgs.title,
                        details: `This mode only allows: ${allowedKinds.join(', ')}`,
                      });
                      break;
                    }

                    // Validate artifact content - reject if it contains questions/clarifications
                    const contentToCheck = artifactArgs.content || '';
                    logger.info('[Chat API] Artifact kind received:', artifactArgs.kind);
                    const worthinessCheck = checkArtifactWorthiness(contentToCheck, {
                      userMessage: messages[messages.length - 1]?.content,
                      conversationMode: conversationMode,
                      kind: artifactArgs.kind as import('@/types/artifacts').ArtifactKind,
                    });
                    logger.info('[Chat API] Worthiness check result:', JSON.stringify(worthinessCheck));

                    if (!worthinessCheck.isWorthy) {
                      logger.warn('[Chat API] Artifact rejected by worthiness check:', worthinessCheck.reason);
                      sendMessage('artifact_error', {
                        error: 'Content not suitable for artifact',
                        reason: worthinessCheck.reason,
                        kind: artifactArgs.kind,
                        title: artifactArgs.title,
                      });
                      break;
                    }

                    // Build metadata based on artifact kind
                    // The tool schema uses flat fields (versions, steps, etc.) at top level
                    const toolArgs = toolInput as {
                      kind: string;
                      title: string;
                      description?: string;
                      content: string;
                      // Email fields
                      versions?: Array<{
                        id: 'a' | 'b' | 'c';
                        content: string;
                        approach?: string;
                        subject_line?: string;
                        preview_text?: string;
                      }>;
                      selected_variant?: 'a' | 'b' | 'c';
                      email_type?: string;
                      // Flow fields
                      steps?: Array<{ id: string; type: string; title: string }>;
                      flow_type?: string;
                      // Subject lines
                      subject_line_variants?: Array<{ text: string; approach?: string }>;
                      // Calendar fields
                      calendar_slots?: Array<{
                        id: string;
                        date: string;
                        title: string;
                        description?: string;
                        email_type?: string;
                        status?: string;
                        timing?: string;
                      }>;
                      calendar_month?: string;
                      calendar_view_mode?: string;
                      campaign_name?: string;
                      // Email brief fields
                      brief_campaign_type?: string;
                      send_date?: string;
                      target_segment?: string;
                      objective?: string;
                      key_message?: string;
                      value_proposition?: string;
                      call_to_action?: string;
                      subject_line_direction?: string;
                      tone_notes?: string;
                      approval_status?: string;
                      calendar_artifact_id?: string;
                    };

                    const baseMetadata: Record<string, unknown> = {
                      status: 'draft',
                    };

                    // For email artifacts, extract version content to metadata fields
                    if (artifactArgs.kind === 'email' && toolArgs.versions) {
                      for (const version of toolArgs.versions) {
                        baseMetadata[`version_${version.id}_content`] = version.content;
                        baseMetadata[`version_${version.id}_approach`] = version.approach;
                        baseMetadata[`version_${version.id}_subject_line`] = version.subject_line;
                        baseMetadata[`version_${version.id}_preview_text`] = version.preview_text;
                      }
                      baseMetadata.selected_variant = toolArgs.selected_variant || 'a';
                      baseMetadata.email_type = toolArgs.email_type;
                    }

                    // For subject_lines artifacts, extract variants
                    if (artifactArgs.kind === 'subject_lines' && toolArgs.subject_line_variants) {
                      baseMetadata.variants = toolArgs.subject_line_variants;
                      baseMetadata.selected_index = 0;
                    }

                    // For flow artifacts, extract steps
                    if (artifactArgs.kind === 'flow' && toolArgs.steps) {
                      baseMetadata.steps = toolArgs.steps;
                      baseMetadata.flow_type = toolArgs.flow_type;
                    }

                    // For calendar artifacts, extract slots and month
                    if (artifactArgs.kind === 'calendar' && toolArgs.calendar_slots) {
                      baseMetadata.slots = toolArgs.calendar_slots;
                      baseMetadata.month = toolArgs.calendar_month;
                      baseMetadata.view_mode = toolArgs.calendar_view_mode || 'month';
                      baseMetadata.campaign_name = toolArgs.campaign_name;
                    }

                    // For email_brief artifacts, extract brief data
                    if (artifactArgs.kind === 'email_brief') {
                      baseMetadata.campaign_type = toolArgs.brief_campaign_type;
                      baseMetadata.send_date = toolArgs.send_date;
                      baseMetadata.target_segment = toolArgs.target_segment;
                      baseMetadata.objective = toolArgs.objective;
                      baseMetadata.key_message = toolArgs.key_message;
                      baseMetadata.value_proposition = toolArgs.value_proposition;
                      baseMetadata.call_to_action = toolArgs.call_to_action;
                      baseMetadata.subject_line_direction = toolArgs.subject_line_direction;
                      baseMetadata.tone_notes = toolArgs.tone_notes;
                      baseMetadata.approval_status = toolArgs.approval_status || 'draft';
                      baseMetadata.calendar_artifact_id = toolArgs.calendar_artifact_id;
                    }

                    // =================================================================
                    // ARTIFACT VALIDATION: Block spurious/conversational artifacts
                    // =================================================================

                    // Validate structured artifact types (calendar, email_brief)
                    const validationResult = validateArtifactToolInput(
                      artifactArgs.kind,
                      toolArgs as Record<string, unknown>
                    );

                    if (!validationResult.isValid) {
                      logger.warn('[Chat API] Artifact validation failed:', {
                        kind: artifactArgs.kind,
                        errors: validationResult.errors,
                      });
                      sendMessage('artifact_error', {
                        error: 'Artifact validation failed',
                        kind: artifactArgs.kind,
                        title: artifactArgs.title,
                        details: validationResult.errors.join('; '),
                      });
                      break;
                    }

                    // Log validation warnings (non-blocking)
                    if (validationResult.warnings.length > 0) {
                      logger.log('[Chat API] Artifact validation warnings:', validationResult.warnings);
                    }

                    // Check for conversational content being saved as artifact
                    if (artifactArgs.content && isConversationalContent(artifactArgs.content)) {
                      // Allow for calendar/email_brief since their value is in metadata
                      if (artifactArgs.kind !== 'calendar' && artifactArgs.kind !== 'email_brief') {
                        logger.warn('[Chat API] Blocking conversational artifact:', {
                          kind: artifactArgs.kind,
                          contentPreview: artifactArgs.content.slice(0, 100),
                        });
                        sendMessage('artifact_error', {
                          error: 'Cannot save conversational content as artifact',
                          kind: artifactArgs.kind,
                          title: artifactArgs.title,
                          details: 'Artifacts should contain deliverable content, not questions or conversational text',
                        });
                        break;
                      }
                    }

                    // Ensure user_id is available (required by database constraint)
                    if (!user?.id) {
                      logger.warn('[Chat API] Cannot save artifact - user not authenticated');
                      sendMessage('artifact_error', {
                        error: 'Failed to save artifact',
                        kind: artifactArgs.kind,
                        title: artifactArgs.title,
                        details: 'User authentication required to save artifacts',
                      });
                      break;
                    }

                    const { data: artifact, error: artifactError } = await supabase
                      .from('artifacts')
                      .insert({
                        conversation_id: conversationId,
                        user_id: user.id,
                        brand_id: brandContext?.id,
                        kind: artifactArgs.kind,
                        title: artifactArgs.title,
                        content: artifactArgs.content,
                        metadata: baseMetadata,
                      })
                      .select()
                      .single();

                    if (artifact && !artifactError) {
                      sendMessage('artifact_created', {
                        artifactId: artifact.id,
                        kind: artifactArgs.kind,
                        title: artifactArgs.title,
                      });
                      logger.log('[Chat API] Artifact created via tool:', artifact.id);
                    } else {
                      logger.error('[Chat API] Failed to create artifact:', artifactError);
                      // Send error to client so they know artifact wasn't saved
                      sendMessage('artifact_error', {
                        error: 'Failed to save artifact',
                        kind: artifactArgs.kind,
                        title: artifactArgs.title,
                        details: artifactError?.message || 'Database error',
                      });
                    }
                  } catch (err) {
                    logger.error('[Chat API] Artifact creation error:', err);
                    // Send error to client
                    sendMessage('artifact_error', {
                      error: 'Failed to create artifact',
                      details: err instanceof Error ? err.message : 'Unknown error',
                    });
                  }
                } else if (part.toolName === 'create_conversation') {
                  sendMessage('status', { status: 'preparing_conversation' });
                  
                  // Send pending action to frontend for approval
                  const toolInput = 'input' in part ? part.input : ('args' in part ? (part as any).args : {});
                  const convArgs = toolInput as {
                    title: string;
                    initial_prompt: string;
                    parent_conversation_id?: string;
                    mode?: string;
                    metadata?: Record<string, unknown>;
                  };
                  
                  sendMessage('pending_action', {
                    action_type: 'create_conversation',
                    title: convArgs.title,
                    initial_prompt: convArgs.initial_prompt,
                    parent_conversation_id: convArgs.parent_conversation_id || conversationId,
                    mode: convArgs.mode,
                    metadata: convArgs.metadata,
                  });
                } else if (part.toolName === 'create_bulk_conversations') {
                  sendMessage('status', { status: 'preparing_conversations' });
                  
                  const toolInput = 'input' in part ? part.input : ('args' in part ? (part as any).args : {});
                  const bulkArgs = toolInput as {
                    conversations: Array<{
                      title: string;
                      initial_prompt: string;
                      mode?: string;
                      metadata?: Record<string, unknown>;
                    }>;
                    sequence_name?: string;
                  };
                  
                  sendMessage('pending_action', {
                    action_type: 'create_bulk_conversations',
                    sequence_name: bulkArgs.sequence_name,
                    conversations: bulkArgs.conversations,
                    parent_conversation_id: conversationId,
                  });
                } else if (part.toolName === 'suggest_conversation_plan') {
                  sendMessage('status', { status: 'planning_conversations' });

                  const toolInput = 'input' in part ? part.input : ('args' in part ? (part as any).args : {});
                  const planArgs = toolInput as {
                    plan_name: string;
                    plan_description: string;
                    conversations: Array<{
                      title: string;
                      purpose: string;
                      timing?: string;
                      email_type?: 'design' | 'letter';
                      estimated_complexity?: 'simple' | 'moderate' | 'complex';
                    }>;
                    total_count: number;
                    relationship_type: 'sequence' | 'parallel' | 'hierarchical';
                    can_be_sub_conversations: boolean;
                  };

                  // Send conversation plan for user review
                  sendMessage('conversation_plan', {
                    plan_name: planArgs.plan_name,
                    plan_description: planArgs.plan_description,
                    conversations: planArgs.conversations,
                    total_count: planArgs.total_count,
                    relationship_type: planArgs.relationship_type,
                    can_be_sub_conversations: planArgs.can_be_sub_conversations,
                    parent_conversation_id: conversationId,
                  });

                  // Add synthetic text response for Calendar Planner mode
                  // This ensures the client receives text content when toolChoice is forced
                  const syntheticText = `I've created your **${planArgs.plan_name}** with ${planArgs.total_count} planned emails.\n\n${planArgs.plan_description}\n\nReview the calendar above and let me know if you'd like to make any changes, or approve it to start creating the email briefs.`;
                  fullText += syntheticText;
                  sendMessage('text', { content: syntheticText });
                } else if (part.toolName === 'suggest_action') {
                  const toolInput = 'input' in part ? part.input : ('args' in part ? (part as any).args : {});
                  const actionArgs = toolInput as {
                    label: string;
                    action_type: string;
                    description: string;
                    action_data?: Record<string, unknown>;
                    style?: string;
                    icon?: string;
                  };
                  
                  sendMessage('suggested_action', {
                    label: actionArgs.label,
                    action_type: actionArgs.action_type,
                    description: actionArgs.description,
                    action_data: actionArgs.action_data,
                    style: actionArgs.style || 'primary',
                    icon: actionArgs.icon,
                  });
                } else if (part.toolName === 'invoke_agent') {
                  // Agent is invoking another agent - this enables agent chaining!
                  const toolInput = 'input' in part ? part.input : ('args' in part ? (part as any).args : {});
                  const agentArgs = toolInput as {
                    agent_id: string;
                    task: string;
                    context?: Record<string, unknown>;
                    expected_output?: string;
                    priority?: string;
                  };

                  // Get display info for the agent being invoked
                  const agentInfo = getAgentDisplayInfo(agentArgs.agent_id);

                  // Send status update for UI
                  sendMessage('status', { status: 'invoking_agent' });

                  // Send agent invocation message to frontend for visual display
                  sendMessage('agent_invocation', {
                    agent_id: agentArgs.agent_id,
                    agent_name: agentInfo?.name || agentArgs.agent_id,
                    agent_icon: agentInfo?.icon || '🤖',
                    task: agentArgs.task,
                    context: agentArgs.context,
                    expected_output: agentArgs.expected_output,
                    status: 'invoking',
                  });

                  // Execute the specialist agent
                  if (brandContext?.id && user?.id) {
                    try {
                      logger.log(`[Chat API] Invoking agent: ${agentArgs.agent_id} for task: ${agentArgs.task}`);

                      const specialistResult = await executeSpecialist(
                        {
                          specialist: agentArgs.agent_id as any,
                          task: agentArgs.task,
                          context: agentArgs.context,
                          expectedOutput: agentArgs.expected_output,
                        },
                        {
                          brandId: brandContext.id,
                          brandInfo: buildBrandInfo(brandContext),
                          brandName: brandContext.name,
                          userId: user.id,
                          conversationId: conversationId || '',
                        },
                        messages.slice(-5) as ModelMessage[]
                      );

                      // Send the agent's response back
                      sendMessage('agent_response', {
                        agent_id: agentArgs.agent_id,
                        agent_name: agentInfo?.name || agentArgs.agent_id,
                        agent_icon: agentInfo?.icon || '🤖',
                        status: specialistResult.status,
                        response: specialistResult.response,
                        artifacts: specialistResult.artifacts,
                        model_used: specialistResult.modelUsed,
                        duration_ms: specialistResult.durationMs,
                      });

                      // If the agent produced text, add it to the stream
                      if (specialistResult.response) {
                        fullText += `\n\n**${agentInfo?.name || agentArgs.agent_id}**: ${specialistResult.response}`;
                      }

                      logger.log(`[Chat API] Agent ${agentArgs.agent_id} completed in ${specialistResult.durationMs}ms`);
                    } catch (err) {
                      logger.error(`[Chat API] Agent invocation failed:`, err);
                      sendMessage('agent_response', {
                        agent_id: agentArgs.agent_id,
                        agent_name: agentInfo?.name || agentArgs.agent_id,
                        agent_icon: agentInfo?.icon || '🤖',
                        status: 'failed',
                        error: err instanceof Error ? err.message : 'Unknown error',
                      });
                    }
                  }
                }
                break;
                
              case 'tool-result':
                sendMessage('tool_use', { tool: part.toolName, status: 'end' });
                
                // Handle image generation results
                if (part.toolName === 'generate_image') {
                  try {
                    const toolResult = (part as { output: unknown }).output as {
                      success: boolean;
                      images?: Array<{ index: number; base64?: string; url?: string; revisedPrompt?: string }>;
                      model?: string;
                      originalPrompt?: string;
                      error?: string;
                    };
                    
                    if (toolResult.success && toolResult.images) {
                      // Save images to database
                      for (const image of toolResult.images) {
                        try {
                          const { error: imgError } = await supabase
                            .from('image_artifacts')
                            .insert({
                              conversation_id: conversationId,
                              user_id: user?.id,
                              brand_id: brandContext?.id,
                              prompt: toolResult.originalPrompt || '',
                              revised_prompt: image.revisedPrompt,
                              model: toolResult.model || 'unknown',
                              image_data: image.base64 || image.url || '',
                              width: 1024, // Default, could parse from size
                              height: 1024,
                            });
                          
                          if (imgError) {
                            logger.error('[Chat API] Failed to save image artifact:', imgError);
                          }
                        } catch (err) {
                          logger.error('[Chat API] Error saving image:', err);
                        }
                      }
                      
                      // Send images to client
                      sendMessage('images_generated', {
                        images: toolResult.images,
                        model: toolResult.model,
                        prompt: toolResult.originalPrompt,
                      });
                      
                      logger.log('[Chat API] Images generated and sent:', {
                        count: toolResult.images.length,
                        model: toolResult.model,
                      });
                    } else if (toolResult.error) {
                      sendMessage('error', { error: `Image generation failed: ${toolResult.error}` });
                    }
                  } catch (err) {
                    logger.error('[Chat API] Error processing image result:', err);
                    sendMessage('error', { error: 'Failed to process generated images' });
                  }
                } else if (part.toolName !== 'create_artifact') {
                  sendMessage('status', { status: 'analyzing_brand' });
                }
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

          // NOTE: Fallback artifact detection removed - if AI doesn't explicitly use
          // create_artifact tool, content displays inline. This is cleaner and prevents
          // the flash/race condition between tool-created artifacts and detected suggestions.

          // Extract product links from the response
          if (fullText) {
            try {
              const userMessageTexts = messages
                .filter((m) => m.role === 'user')
                .map((m) => m.content);
              
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
