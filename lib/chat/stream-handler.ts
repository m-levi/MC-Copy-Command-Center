/**
 * Stream Handler
 *
 * Handles AI streaming responses and converts them to our JSON format
 */

import { ModelMessage, LanguageModel, streamText, StreamTextResult } from 'ai';
import { logger } from '@/lib/logger';
import { StreamEventType } from './types';
import { detectArtifactContent, parseEmailVersions } from '@/lib/tools';
import { smartExtractProductLinks } from '@/lib/url-extractor';

export interface StreamOptions {
  model: LanguageModel;
  systemPrompt: string;
  messages: ModelMessage[];
  tools: Record<string, unknown>;
  providerOptions: Record<string, unknown>;
  conversationId?: string;
  userId?: string;
  brandId?: string;
  websiteUrl?: string;
  onToolCall?: (toolName: string, args: Record<string, unknown>) => Promise<void>;
  onArtifactCreated?: (artifact: { id: string; kind: string; title: string }) => void;
}

export interface StreamSender {
  send: (type: StreamEventType, data: Record<string, unknown>) => void;
  close: () => void;
}

/**
 * Create a streaming response handler
 */
export function createStreamHandler(options: StreamOptions): ReadableStream {
  const encoder = new TextEncoder();
  let fullText = '';
  let fullReasoning = '';

  return new ReadableStream({
    async start(controller) {
      const sender: StreamSender = {
        send: (type, data) => {
          const message = JSON.stringify({ type, ...data }) + '\n';
          controller.enqueue(encoder.encode(message));
        },
        close: () => controller.close(),
      };

      // Send initial status
      sender.send('status', { status: 'analyzing_brand' });

      try {
        logger.info('[StreamHandler] Starting stream');

        const result = await streamText({
          model: options.model,
          system: options.systemPrompt,
          messages: options.messages,
          tools: options.tools as Parameters<typeof streamText>[0]['tools'],
          maxRetries: 2,
          providerOptions: options.providerOptions as Parameters<typeof streamText>[0]['providerOptions'],
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await processStream(result as any, sender, {
          ...options,
          fullText: () => fullText,
          setFullText: (text) => { fullText = text; },
          fullReasoning: () => fullReasoning,
          setFullReasoning: (text) => { fullReasoning = text; },
        });

        // Post-stream processing
        await handlePostStream(sender, {
          fullText,
          fullReasoning,
          messages: options.messages,
          websiteUrl: options.websiteUrl,
        });

        sender.close();
      } catch (error) {
        logger.error('[StreamHandler] Error:', error);
        sender.send('error', { error: error instanceof Error ? error.message : 'Unknown error' });
        sender.close();
      }
    },
  });
}

/**
 * Process the AI stream
 */
async function processStream(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: StreamTextResult<any, any>,
  sender: StreamSender,
  context: {
    fullText: () => string;
    setFullText: (text: string) => void;
    fullReasoning: () => string;
    setFullReasoning: (text: string) => void;
    onToolCall?: (toolName: string, args: Record<string, unknown>) => Promise<void>;
    conversationId?: string;
    userId?: string;
    brandId?: string;
  }
): Promise<void> {
  for await (const part of result.fullStream) {
    switch (part.type) {
      case 'text-delta':
        context.setFullText(context.fullText() + part.text);
        sender.send('text', { content: part.text });
        break;

      case 'reasoning-delta':
        const reasoningText = 'text' in part ? (part as { text: string }).text : '';
        context.setFullReasoning(context.fullReasoning() + reasoningText);
        sender.send('thinking', { content: reasoningText });
        break;

      case 'tool-call':
        sender.send('tool_use', { tool: part.toolName, status: 'start' });
        await handleToolCall(part.toolName, part, sender, context);
        break;

      case 'tool-result':
        sender.send('tool_use', { tool: part.toolName, status: 'end' });
        if (part.toolName !== 'create_artifact') {
          sender.send('status', { status: 'analyzing_brand' });
        }
        break;

      case 'reasoning-start':
        sender.send('thinking_start', {});
        sender.send('status', { status: 'thinking' });
        break;

      case 'reasoning-end':
        if (context.fullReasoning()) {
          sender.send('thinking_end', {});
        }
        break;

      case 'finish':
        logger.info('[StreamHandler] Stream finished', {
          textLength: context.fullText().length,
          reasoningLength: context.fullReasoning().length,
        });
        break;

      case 'error':
        logger.error('[StreamHandler] Stream error:', part.error);
        sender.send('error', { error: String(part.error) });
        break;
    }
  }
}

/**
 * Handle tool calls during streaming
 */
async function handleToolCall(
  toolName: string,
  part: { toolName: string; input?: unknown; args?: unknown },
  sender: StreamSender,
  context: {
    onToolCall?: (toolName: string, args: Record<string, unknown>) => Promise<void>;
    conversationId?: string;
    userId?: string;
    brandId?: string;
  }
): Promise<void> {
  const toolInput = ('input' in part ? part.input : part.args) as Record<string, unknown> | undefined;

  switch (toolName) {
    case 'web_search':
      sender.send('status', { status: 'searching_web' });
      break;

    case 'create_artifact':
      sender.send('status', { status: 'creating_artifact' });
      if (toolInput) {
        // Send the artifact data to the client for processing
        // The client will handle the DB insertion via the ArtifactContext
        const artifactData = toolInput as {
          kind: string;
          title: string;
          content: string;
          metadata?: Record<string, unknown>;
        };

        sender.send('pending_artifact', {
          kind: artifactData.kind,
          title: artifactData.title,
          content: artifactData.content,
          metadata: artifactData.metadata,
          conversationId: context.conversationId,
        });

        logger.info('[StreamHandler] Artifact pending:', {
          kind: artifactData.kind,
          title: artifactData.title,
        });
      }

      // Also call the onToolCall callback if provided (for server-side handling)
      if (context.onToolCall && toolInput) {
        await context.onToolCall(toolName, toolInput);
      }
      break;

    case 'create_conversation':
      sender.send('status', { status: 'preparing_conversation' });
      if (toolInput) {
        sender.send('pending_action', {
          action_type: 'create_conversation',
          ...(toolInput as Record<string, unknown>),
          parent_conversation_id: context.conversationId,
        });
      }
      break;

    case 'create_bulk_conversations':
      sender.send('status', { status: 'preparing_conversations' });
      if (toolInput) {
        sender.send('pending_action', {
          action_type: 'create_bulk_conversations',
          ...(toolInput as Record<string, unknown>),
          parent_conversation_id: context.conversationId,
        });
      }
      break;

    case 'suggest_conversation_plan':
      sender.send('status', { status: 'planning_conversations' });
      if (toolInput) {
        sender.send('conversation_plan', {
          ...(toolInput as Record<string, unknown>),
          parent_conversation_id: context.conversationId,
        });
      }
      break;

    case 'suggest_action':
      if (toolInput) {
        sender.send('suggested_action', toolInput as Record<string, unknown>);
      }
      break;
  }
}

/**
 * Handle post-stream processing
 */
async function handlePostStream(
  sender: StreamSender,
  context: {
    fullText: string;
    fullReasoning: string;
    messages: ModelMessage[];
    websiteUrl?: string;
  }
): Promise<void> {
  const { fullText, fullReasoning, messages, websiteUrl } = context;

  if (!fullText) return;

  // Artifact detection
  const detection = detectArtifactContent(fullText);
  if (detection.isArtifact && detection.confidence !== 'low') {
    let versions = null;
    if (detection.kind === 'email') {
      versions = parseEmailVersions(fullText);
    }

    sender.send('artifact_suggestion', {
      kind: detection.kind,
      confidence: detection.confidence,
      content: fullText,
      versions,
      suggestedTitle: detection.suggestedTitle,
    });

    logger.info('[StreamHandler] Artifact suggestion sent:', detection);
  }

  // Product link extraction
  try {
    const userMessageTexts = messages
      .filter((m) => m.role === 'user')
      .map((m) => (typeof m.content === 'string' ? m.content : ''));

    const productLinks = smartExtractProductLinks(
      fullText + '\n\n' + fullReasoning,
      userMessageTexts,
      websiteUrl
    );

    if (productLinks.length > 0) {
      sender.send('products', { products: productLinks });
    }
  } catch (error) {
    logger.error('[StreamHandler] Product link extraction error:', error);
  }
}

/**
 * Create a streaming response with proper headers
 */
export function createStreamResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
