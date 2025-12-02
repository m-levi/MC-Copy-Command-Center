import DOMPurify from 'dompurify';
import { parseAIResponse } from '@/lib/streaming/ai-response-parser';
import { ProductLink } from '@/types';
import { logger } from '@/lib/logger';

/**
 * Strip control markers from AI response content
 */
export const stripControlMarkers = (value: string | undefined): string => {
  if (!value) return '';
  return value
    .replace(/\[STATUS:\w+\]/g, '')
    .replace(/\[TOOL:\w+:(?:START|END)\]/g, '')
    .replace(/\[THINKING:(?:START|END)\]/g, '')
    .replace(/\[THINKING:CHUNK\][\s\S]*?(?=\[|$)/g, '')
    .replace(/\[PRODUCTS:[\s\S]*?\]/g, '')
    .replace(/\[REMEMBER:[^\]]+\]/g, '');
};

/**
 * Check if content looks like corrupted raw JSON streaming format
 * This happens when raw API streaming chunks are saved instead of parsed content
 * Format: {"type":"text","content":"..."} {"type":"thinking","content":"..."}
 */
export function isCorruptedJsonContent(content: string): boolean {
  if (!content) return false;
  
  // Look for characteristic JSON streaming patterns
  const hasJsonPattern = /\{"type"\s*:\s*"(text|thinking|status|thinking_start|thinking_end)"/i.test(content);
  const hasMultipleJsonObjects = (content.match(/\{"type"\s*:/g) || []).length > 2;
  
  // If it starts with JSON and has multiple objects, it's likely corrupted
  return hasJsonPattern && hasMultipleJsonObjects;
}

/**
 * Extract clean content from corrupted raw JSON streaming format
 * Used to fix messages that were incorrectly saved with raw API response
 */
export function extractContentFromCorruptedJson(rawContent: string): { content: string; thinking: string } {
  let content = '';
  let thinking = '';
  
  // Try to parse each JSON object (they might be separated by spaces or newlines)
  // Handle both space-separated and newline-separated formats
  const normalizedContent = rawContent
    .replace(/\}\s*\{/g, '}\n{')  // Normalize space-separated to newline-separated
    .split('\n');
  
  for (const line of normalizedContent) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    try {
      const message = JSON.parse(trimmedLine);
      
      switch (message.type) {
        case 'text':
          content += message.content || '';
          break;
        case 'thinking':
          thinking += message.content || '';
          break;
        // Ignore status, tool_use, thinking_start, thinking_end and other message types
      }
    } catch {
      // If we can't parse as JSON, skip this line
      // This handles partial JSON or other content
    }
  }
  
  return { content: content.trim(), thinking: thinking.trim() };
}

/**
 * Clean message content, fixing corrupted JSON if detected
 * Use this when displaying messages to handle legacy corrupted data
 */
export function cleanMessageContent(content: string | undefined): string {
  if (!content) return '';
  
  // Check if this is corrupted JSON content
  if (isCorruptedJsonContent(content)) {
    logger.warn('[cleanMessageContent] Detected corrupted JSON content, extracting clean text');
    const extracted = extractContentFromCorruptedJson(content);
    return extracted.content || content; // Fall back to original if extraction fails
  }
  
  // Normal content - just strip control markers
  return stripControlMarkers(content);
}

/**
 * Sanitize AI-generated content before saving to database
 * Preserves email version tags (version_a, version_b, version_c) for the version switching UI
 */
export const sanitizeContent = (content: string): string => {
  const withoutMarkers = stripControlMarkers(content);

  return DOMPurify.sanitize(withoutMarkers, {
    ALLOWED_TAGS: [
      // Standard HTML tags
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote',
      // Email version tags for multi-version email UI
      'version_a', 'version_b', 'version_c',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
};

/**
 * Comprehensive email content cleaning with multiple fallback strategies
 */
export const cleanEmailContentFinal = (content: string): string => {
  return stripControlMarkers(content)
    .replace(/<email_strategy>[\s\S]*?<\/email_strategy>/gi, '')
    .trim();
};

export interface ParsedStreamContent {
  emailCopy: string;
  clarification: string;
  otherContent: string;
  thoughtContent: string;
  responseType: 'email_copy' | 'clarification' | 'other';
  productLinks: ProductLink[];
}

/**
 * Parse streamed content into separate sections
 * "Accumulate Then Parse" approach - clean, simple, reliable
 */
export function parseStreamedContent(fullContent: string): ParsedStreamContent {
  const parsed = parseAIResponse(fullContent);

  const emailCopy = parsed.emailCopy || '';
  const clarification = parsed.clarification || '';
  const otherContent = parsed.other || '';
  const thoughtContent = parsed.thinking || '';
  const responseType = parsed.responseType;
  const productLinks = parsed.productLinks || [];

  logger.log('[Parser] Parsed response summary:', {
    responseType,
    emailLength: emailCopy.length,
    clarificationLength: clarification.length,
    otherLength: otherContent.length,
    thinkingLength: thoughtContent.length,
    productLinks: productLinks.length,
    emailPreview: emailCopy?.substring(0, 100),
    clarificationPreview: clarification?.substring(0, 100),
    otherPreview: otherContent?.substring(0, 100),
  });

  return {
    emailCopy,
    clarification,
    otherContent,
    thoughtContent,
    responseType,
    productLinks,
  };
}

/**
 * Determine the final content to display based on response type
 */
export function getFinalContent(
  parsed: ParsedStreamContent,
  fallbackContent: string
): string {
  let finalContent = '';
  
  if (parsed.responseType === 'clarification') {
    finalContent = parsed.clarification;
  } else if (parsed.responseType === 'other') {
    finalContent = parsed.otherContent;
  } else {
    finalContent = parsed.emailCopy || parsed.clarification || fallbackContent;
  }
  
  return stripControlMarkers(finalContent);
}

/**
 * Build metadata payload for message saving
 */
export function buildMetadataPayload(
  parsed: ParsedStreamContent
): Record<string, unknown> | null {
  const metadataPayload: Record<string, unknown> = {
    responseType: parsed.responseType,
  };
  
  if (parsed.productLinks.length > 0) {
    metadataPayload.productLinks = parsed.productLinks;
  }
  
  if (parsed.responseType === 'clarification' && parsed.clarification) {
    metadataPayload.clarification = parsed.clarification;
  }
  
  return Object.keys(metadataPayload).length > 0 ? metadataPayload : null;
}



