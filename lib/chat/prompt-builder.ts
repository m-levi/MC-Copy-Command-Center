/**
 * Prompt Builder
 *
 * Centralized prompt building logic for all chat modes
 */

import { logger } from '@/lib/logger';
import { ChatRequest, BrandContext, ChatMessage } from './types';
import { buildBrandInfo, buildContextInfo, buildCustomModePrompt } from '@/lib/chat-prompts';
import { buildDesignEmailV2Prompt } from '@/lib/prompts/design-email-v2.prompt';
import { buildFlowOutlinePrompt, buildConversationalFlowPrompt } from '@/lib/flow-prompts';
import { buildPersonalAIPrompt } from '@/lib/personal-ai';
import { extractConversationContext } from '@/lib/conversation-memory';
import { FlowType } from '@/types';
import { ModelMessage } from 'ai';

export interface PromptBuildResult {
  systemPrompt: string;
  processedMessages: ModelMessage[];
}

/**
 * Build the system prompt based on the request context
 */
export function buildPrompt(
  request: ChatRequest,
  options: {
    customMode?: { id: string; name: string; system_prompt: string } | null;
    ragContext?: string;
    memoryEnabled?: boolean;
  } = {}
): PromptBuildResult {
  const { messages, brandContext, conversationMode, emailType, isFlowMode, flowType, regenerateSection } = request;
  const { customMode, ragContext = '', memoryEnabled = false } = options;

  // Default to original messages
  let processedMessages = formatMessages(messages);
  let systemPrompt: string;

  // Check if this is Personal AI mode
  const isPersonalAI = !brandContext?.id || brandContext.id === 'personal';

  if (isPersonalAI) {
    logger.info('[PromptBuilder] Using Personal AI mode');
    systemPrompt = buildPersonalAIPrompt();
    return { systemPrompt, processedMessages };
  }

  // Build brand info for prompts
  const brandInfo = buildBrandInfoString(brandContext);
  const conversationContext = extractConversationContext(messages);
  const contextInfo = buildContextInfo(conversationContext);

  // Custom mode takes priority
  if (customMode?.system_prompt) {
    logger.info('[PromptBuilder] Using custom mode:', customMode.name);
    const userMessages = messages.filter((m) => m.role === 'user');
    const latestUserMessage = userMessages[userMessages.length - 1]?.content || '';

    systemPrompt = buildCustomModePrompt(customMode.system_prompt, brandContext, {
      conversationContext,
      userMessage: latestUserMessage,
    });

    // Inject RAG context if available
    if (ragContext) {
      systemPrompt = injectRAGContext(systemPrompt, ragContext);
    }

    return { systemPrompt, processedMessages };
  }

  // Flow mode
  if (conversationMode === 'flow') {
    logger.info('[PromptBuilder] Using conversational flow prompt');
    systemPrompt = buildConversationalFlowPrompt(brandInfo);

    if (ragContext) {
      systemPrompt = injectRAGContext(systemPrompt, ragContext);
    }

    return { systemPrompt, processedMessages };
  }

  // Legacy flow mode with specific flow type
  if (isFlowMode && flowType) {
    logger.info('[PromptBuilder] Using flow outline prompt for:', flowType);
    systemPrompt = buildFlowOutlinePrompt(flowType as FlowType, brandInfo);

    if (ragContext) {
      systemPrompt = injectRAGContext(systemPrompt, ragContext);
    }

    return { systemPrompt, processedMessages };
  }

  // Design email mode (first message uses V2 with 3 versions)
  if (emailType === 'design' && conversationMode === 'email_copy' && !regenerateSection) {
    const userMessages = messages.filter((m) => m.role === 'user');
    const isFirstMessage = userMessages.length === 1;

    if (isFirstMessage) {
      logger.info('[PromptBuilder] Using Design Email V2 prompt (3 versions)');
      const brandInfoForPrompt = buildBrandInfo(brandContext);
      const brandVoiceGuidelines = brandContext?.copywriting_style_guide || '';
      const copyBrief = userMessages[0]?.content || '';

      const { systemPrompt: designSystemPrompt, userPrompt: designUserPrompt } = buildDesignEmailV2Prompt({
        brandInfo: brandInfoForPrompt,
        brandVoiceGuidelines,
        websiteUrl: brandContext?.website_url || undefined,
        brandName: brandContext?.name,
        copyBrief,
        ragContext, // Pass RAG context to be included in the prompt
      });

      systemPrompt = designSystemPrompt;
      processedMessages = [{ role: 'user' as const, content: designUserPrompt }];

      return { systemPrompt, processedMessages };
    }
  }

  // Default: Standard system prompt
  logger.info('[PromptBuilder] Using standard system prompt');
  systemPrompt = buildStandardPrompt(brandContext, contextInfo, emailType);

  if (ragContext) {
    systemPrompt = injectRAGContext(systemPrompt, ragContext);
  }

  // Add memory instructions if enabled
  if (memoryEnabled) {
    systemPrompt += buildMemoryInstructions();
  }

  return { systemPrompt, processedMessages };
}

/**
 * Format chat messages to ModelMessage format
 */
function formatMessages(messages: ChatMessage[]): ModelMessage[] {
  return messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
  }));
}

/**
 * Build a simple brand info string
 */
function buildBrandInfoString(brandContext: BrandContext | null | undefined): string {
  if (!brandContext) return '';

  return `
Brand Name: ${brandContext.name || 'N/A'}
Brand Details: ${brandContext.brand_details || 'N/A'}
Brand Guidelines: ${brandContext.brand_guidelines || 'N/A'}
Copywriting Style Guide: ${brandContext.copywriting_style_guide || 'N/A'}
${brandContext.website_url ? `Website: ${brandContext.website_url}` : ''}
  `.trim();
}

/**
 * Build standard system prompt
 */
function buildStandardPrompt(
  brandContext: BrandContext | null | undefined,
  contextInfo: string,
  emailType?: string
): string {
  const brandInfo = buildBrandInfo(brandContext);

  return `You are an expert e-commerce email copywriter. Your task is to help create compelling email copy that drives conversions.

<brand_context>
${brandInfo}
</brand_context>

${contextInfo ? `<conversation_context>\n${contextInfo}\n</conversation_context>` : ''}

Guidelines:
- Write in the brand's voice as described in the style guide
- Focus on benefits, not just features
- Use clear, action-oriented language
- Create urgency without being pushy
- Always include a clear call-to-action
${emailType === 'letter' ? '- Keep the email short and personal, like a letter from a friend' : '- Structure the email with clear sections (headline, body, CTA)'}
`;
}

/**
 * Inject RAG context into a system prompt
 */
function injectRAGContext(systemPrompt: string, ragContext: string): string {
  if (!ragContext) return systemPrompt;

  // Find a good insertion point (after brand context, before instructions)
  const brandContextEnd = systemPrompt.indexOf('</brand_context>');
  if (brandContextEnd !== -1) {
    const insertPoint = brandContextEnd + '</brand_context>'.length;
    return (
      systemPrompt.slice(0, insertPoint) +
      '\n\n' +
      ragContext +
      systemPrompt.slice(insertPoint)
    );
  }

  // Fallback: prepend to prompt
  return ragContext + '\n\n' + systemPrompt;
}

/**
 * Build memory tool instructions
 */
function buildMemoryInstructions(): string {
  return `

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
`;
}

/**
 * Apply debug prompt override
 */
export function applyDebugPrompt(
  systemPrompt: string,
  debugPrompt: { name: string; system_prompt: string },
  brandContext: BrandContext | null | undefined,
  messages: ChatMessage[]
): string {
  logger.info(`[PromptBuilder] DEBUG MODE: Using custom prompt: ${debugPrompt.name}`);

  const userMessages = messages.filter((m) => m.role === 'user');
  const copyBrief = userMessages[userMessages.length - 1]?.content || '';
  const brandInfo = buildBrandInfo(brandContext);
  const conversationContext = extractConversationContext(messages);
  const contextInfo = buildContextInfo(conversationContext);
  const brandVoiceGuidelines = brandContext?.copywriting_style_guide || '';
  const brandName = brandContext?.name || 'Unknown Brand';
  const websiteUrl = brandContext?.website_url || '';

  return debugPrompt.system_prompt
    .replace(/{{BRAND_NAME}}/g, brandName)
    .replace(/{{BRAND_INFO}}/g, brandInfo)
    .replace(/{{BRAND_VOICE_GUIDELINES}}/g, brandVoiceGuidelines)
    .replace(/{{WEBSITE_URL}}/g, websiteUrl)
    .replace(/{{COPY_BRIEF}}/g, copyBrief)
    .replace(/{{CONTEXT_INFO}}/g, contextInfo)
    .replace(/{{RAG_CONTEXT}}/g, '') // Will be injected separately
    .replace(/{{MEMORY_CONTEXT}}/g, '')
    .replace(/{{EMAIL_BRIEF}}/g, copyBrief)
    .replace(/{{USER_MESSAGE}}/g, copyBrief)
    .replace(/{{BRAND_DETAILS}}/g, '')
    .replace(/{{BRAND_GUIDELINES}}/g, '')
    .replace(/{{COPYWRITING_STYLE_GUIDE}}/g, brandVoiceGuidelines);
}
