/**
 * Centralized content sanitization utilities
 * Provides consistent sanitization across the app
 */

import DOMPurify from 'dompurify';

/**
 * Strip AI control markers from content
 * These are internal markers used for streaming and status tracking
 */
export function stripControlMarkers(value: string | undefined): string {
  if (!value) return '';
  
  // Step 1: Remove thinking chunks more carefully
  // Only match from [THINKING:CHUNK] to the next [ marker (not to end of string!)
  let result = value.replace(/\[THINKING:CHUNK\][^\[]*(?=\[)/g, '');
  
  // Step 2: Handle any remaining THINKING:CHUNK at the end (edge case)
  result = result.replace(/\[THINKING:CHUNK\][^\[]*$/g, '');
  
  // Step 3: Remove other control markers
  result = result
    .replace(/\[STATUS:\w+\]/g, '')
    .replace(/\[TOOL:\w+:(?:START|END)\]/g, '')
    .replace(/\[THINKING:(?:START|END)\]/g, '')
    .replace(/\[PRODUCTS:[\s\S]*?\]\]/g, '') // Match double closing brackets
    .replace(/\[PRODUCTS:[\s\S]*?\]/g, '') // Match single closing bracket
    .replace(/\[REMEMBER:[^\]]+\]/g, '');
  
  return result;
}

/**
 * Normalize whitespace characters for consistent processing
 */
export function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, '')
    .replace(/\u2028|\u2029/g, '\n')
    .replace(/\t/g, '  ');
}

/**
 * DOMPurify configuration for sanitizing user and AI content
 * Includes email version tags for multi-version email UI
 */
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'code', 'pre', 'blockquote',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr', 'span', 'div',
    // Email version tags for multi-version email UI
    'version_a', 'version_b', 'version_c',
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'class'],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

/**
 * Sanitize AI-generated content before saving to database
 * Removes control markers and sanitizes HTML
 */
export function sanitizeContent(content: string): string {
  const withoutMarkers = stripControlMarkers(content);
  return DOMPurify.sanitize(withoutMarkers, DOMPURIFY_CONFIG);
}

/**
 * Sanitize content without stripping control markers
 * Use when you need to sanitize user input that doesn't have markers
 */
export function sanitizeHTML(content: string): string {
  return DOMPurify.sanitize(content, DOMPURIFY_CONFIG);
}

/**
 * Clean email content by removing preamble before actual email structure
 * Also removes strategy tags and analysis blocks
 */
export function cleanEmailContent(content: string): string {
  return stripControlMarkers(content)
    .replace(/<email_strategy>[\s\S]*?<\/email_strategy>/gi, '')
    .trim();
}

/**
 * Sanitize clarification requests - remove XML tags and format nicely
 */
export function sanitizeClarification(content: string | undefined): string | undefined {
  if (!content) return undefined;
  return content.replace(/<\/?clarification_request>/gi, '').trim();
}


