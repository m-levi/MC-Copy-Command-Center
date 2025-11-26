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
 * Sanitize AI-generated content before saving to database
 */
export const sanitizeContent = (content: string): string => {
  const withoutMarkers = stripControlMarkers(content);

  return DOMPurify.sanitize(withoutMarkers, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote'],
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

