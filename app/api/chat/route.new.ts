/**
 * Chat API Route - Refactored
 *
 * This is the main AI chat endpoint, now with:
 * - RAG integration (hybrid search)
 * - Proper validation with Zod
 * - Modular architecture
 * - Type safety
 */

import { LanguageModel, ModelMessage } from 'ai';
import { gateway, getToolsForModel, getProviderOptionsWithWebSearch } from '@/lib/ai-providers';
import { getModelById, normalizeModelId } from '@/lib/ai-models';
import { isCustomMode, getCustomModeId } from '@/types';
import { createEdgeClient } from '@/lib/supabase/edge';
import { logger } from '@/lib/logger';
import { withSupermemory, addMemoryTool } from '@supermemory/tools/ai-sdk';
import { getSupermemoryUserId, isSupermemoryConfigured } from '@/lib/supermemory';
import { isPersonalAI } from '@/lib/personal-ai';
import { getToolsForMode } from '@/lib/tools';
import { getActiveDebugPromptFast, determinePromptType } from '@/lib/debug-prompts';

// New modular imports
import { ChatRequestSchema, ChatRequest, Attachment } from '@/lib/chat/types';
import { buildPrompt, applyDebugPrompt } from '@/lib/chat/prompt-builder';
import { createStreamHandler, createStreamResponse } from '@/lib/chat/stream-handler';
import { getRAGContext } from '@/lib/services/rag.service';
import { AppError, createErrorResponse, generateRequestId } from '@/lib/api-error';

export const runtime = 'edge';

export async function POST(req: Request) {
  const requestId = generateRequestId();

  try {
    // Parse and validate request
    const body = await req.json();
    const parseResult = ChatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      logger.error(`[Chat ${requestId}] Validation error:`, parseResult.error);
      return createErrorResponse(
        new AppError('VALIDATION_ERROR', 'Invalid request', 400, parseResult.error.message),
        requestId
      );
    }

    const request: ChatRequest = parseResult.data;
    const {
      messages,
      modelId: rawModelId,
      brandContext,
      conversationId,
      conversationMode,
      emailType,
      isFlowMode,
      flowType,
      attachments,
      customModeId,
    } = request;

    // Normalize model ID
    const modelId = normalizeModelId(rawModelId);
    const model = getModelById(modelId);

    if (!model) {
      return createErrorResponse(new AppError('VALIDATION_ERROR', 'Invalid model', 400), requestId);
    }

    logger.info(`[Chat ${requestId}] Processing request`, {
      modelId,
      conversationId,
      conversationMode,
      hasBrandContext: !!brandContext?.id,
    });

    // Create Supabase client
    const supabase = createEdgeClient();

    // Determine custom mode ID
    const isCustomModeRequest = conversationMode && isCustomMode(conversationMode);
    const customModeIdFromMode = isCustomModeRequest ? getCustomModeId(conversationMode) : null;
    const effectiveCustomModeId = customModeId || customModeIdFromMode;

    // Determine prompt type for debug prompts
    const effectiveEmailType = emailType || 'design';
    const promptType = determinePromptType(effectiveEmailType, isFlowMode || false);

    // Run parallel queries
    const [userResult, debugPromptResult, customModeResult] = await Promise.all([
      supabase.auth.getUser(),
      getActiveDebugPromptFast(supabase, promptType),
      effectiveCustomModeId
        ? supabase.from('custom_modes').select('id, name, system_prompt').eq('id', effectiveCustomModeId).single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const user = userResult.data?.user;
    const customMode = customModeResult?.data as { id: string; name: string; system_prompt: string } | null;

    // Determine if this is Personal AI mode
    const isPersonalAIMode = isPersonalAI(brandContext?.id);

    // Determine if memory should be enabled
    const shouldEnableMemory =
      isSupermemoryConfigured() && !!brandContext?.id && !!user?.id && !isPersonalAIMode;

    // ========================================================================
    // RAG INTEGRATION
    // ========================================================================
    let ragContext = '';

    if (brandContext?.id && user?.id && !isPersonalAIMode) {
      try {
        // Get the last user message for semantic search
        const userMessages = messages.filter((m) => m.role === 'user');
        const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';

        if (lastUserMessage.length > 10) {
          // Only search if there's meaningful content
          const ragResult = await getRAGContext(supabase, brandContext.id, user.id, lastUserMessage, {
            limit: 5,
            minSimilarity: 0.6,
            searchMode: 'hybrid',
          });

          ragContext = ragResult.context;

          if (ragResult.documentCount > 0) {
            logger.info(`[Chat ${requestId}] RAG: Found ${ragResult.documentCount} relevant documents`);
          }
        }
      } catch (ragError) {
        // RAG failures should not block the chat
        logger.error(`[Chat ${requestId}] RAG error (non-blocking):`, ragError);
      }
    }

    // ========================================================================
    // BUILD PROMPT
    // ========================================================================
    let { systemPrompt, processedMessages } = buildPrompt(request, {
      customMode,
      ragContext,
      memoryEnabled: shouldEnableMemory,
    });

    // Apply debug prompt override if active
    if (debugPromptResult?.system_prompt) {
      systemPrompt = applyDebugPrompt(
        systemPrompt,
        debugPromptResult as { name: string; system_prompt: string },
        brandContext,
        messages
      );
      // Reset messages when using debug prompt
      processedMessages = messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));
    }

    // ========================================================================
    // FORMAT MESSAGES WITH ATTACHMENTS
    // ========================================================================
    const formattedMessages = formatMessagesWithAttachments(processedMessages, attachments);

    // ========================================================================
    // SETUP AI MODEL
    // ========================================================================
    let aiModel: LanguageModel = gateway.languageModel(modelId);

    // Supermemory integration
    const supermemoryUserId = shouldEnableMemory ? getSupermemoryUserId(brandContext!.id, user!.id) : '';

    if (shouldEnableMemory) {
      logger.info(`[Chat ${requestId}] Enabling Supermemory`);
      // Type assertion needed due to @supermemory/tools using AI SDK v5 types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aiModel = withSupermemory(aiModel as any, supermemoryUserId, {
        mode: 'full',
        conversationId,
      }) as unknown as LanguageModel;
    }

    // ========================================================================
    // BUILD TOOLS
    // ========================================================================
    const websiteUrl = brandContext?.website_url || undefined;
    const baseTools = getToolsForModel(modelId, websiteUrl);
    const modeTools = getToolsForMode(conversationMode || 'email_copy');

    const memoryTool =
      shouldEnableMemory && process.env.SUPERMEMORY_API_KEY
        ? {
            save_memory: addMemoryTool(process.env.SUPERMEMORY_API_KEY, {
              containerTags: [supermemoryUserId],
            }),
          }
        : {};

    const tools = {
      ...baseTools,
      ...memoryTool,
      ...modeTools,
    };

    // ========================================================================
    // CREATE STREAM
    // ========================================================================
    const providerOptions = getProviderOptionsWithWebSearch(modelId, 10000, websiteUrl);

    logger.info(`[Chat ${requestId}] Starting stream`, {
      model: model.name,
      promptLength: systemPrompt.length,
      messageCount: formattedMessages.length,
      hasRAG: ragContext.length > 0,
      hasMemory: shouldEnableMemory,
    });

    const stream = createStreamHandler({
      model: aiModel,
      systemPrompt,
      messages: formattedMessages,
      tools: tools as Record<string, unknown>,
      providerOptions,
      conversationId,
      userId: user?.id,
      brandId: brandContext?.id,
      websiteUrl,
    });

    return createStreamResponse(stream);
  } catch (error) {
    logger.error(`[Chat ${requestId}] Error:`, error);
    return createErrorResponse(error, requestId);
  }
}

/**
 * Format messages with multimodal attachments
 */
function formatMessagesWithAttachments(
  messages: ModelMessage[],
  attachments?: Attachment[]
): ModelMessage[] {
  if (!attachments || attachments.length === 0) {
    return messages;
  }

  return messages.map((msg, index) => {
    const isLastUserMessage = msg.role === 'user' && index === messages.length - 1;

    if (!isLastUserMessage) {
      return msg;
    }

    // Build multimodal content parts
    const contentParts: Array<
      | { type: 'text'; text: string }
      | { type: 'image'; image: string; mediaType?: string }
      | { type: 'file'; data: string; mediaType: string; filename?: string }
    > = [];

    // Add text content
    const textContent =
      typeof msg.content === 'string'
        ? msg.content.trim() || 'Please analyze the attached file(s).'
        : 'Please analyze the attached file(s).';
    contentParts.push({ type: 'text', text: textContent });

    // Add attachments
    for (const attachment of attachments) {
      if (!attachment.data || !attachment.mimeType) {
        logger.warn('[Chat] Skipping invalid attachment:', attachment.name);
        continue;
      }

      const dataUrl = `data:${attachment.mimeType};base64,${attachment.data}`;

      if (attachment.type === 'image') {
        contentParts.push({
          type: 'image',
          image: dataUrl,
          mediaType: attachment.mimeType,
        });
      } else {
        contentParts.push({
          type: 'file',
          data: dataUrl,
          mediaType: attachment.mimeType,
          filename: attachment.name,
        });
      }
    }

    return {
      role: msg.role,
      content: contentParts,
    };
  });
}
