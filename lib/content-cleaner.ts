/**
 * Content Cleaner
 * Removes web search announcements and research process text from AI responses
 */

/**
 * Patterns that indicate web search/research process that should be removed
 */
const RESEARCH_PATTERNS = [
  // Direct research announcements
  /^Based on my (research|web search|search|investigation),?\s*/gim,
  /^According to my (research|web search|search),?\s*/gim,
  /^From (my )?(research|web search|search results|the search results),?\s*/gim,
  /^I can see that\s+/gim,
  /^I found that\s+/gim,
  /^My research shows\s+/gim,
  /^The search results show\s+/gim,
  
  // Search process announcements
  /^Let me search (for|more specifically for|the web for).*?\.\s*/gim,
  /^I'll search (for|the web for).*?\.\s*/gim,
  /^Searching (for|the web for).*?\.\s*/gim,
  /^I need to (search|find|look up).*?\.\s*/gim,
  
  // Multi-line research blocks at the start
  /^Based on my (?:research|web search|search),.*?(?:\n.*?)*?(?=\n\n|HERO SECTION|SUBJECT LINE|$)/gim,
];

/**
 * Clean AI response content by removing web search announcements
 */
export function cleanAIResponse(content: string): string {
  if (!content) return content;
  
  let cleaned = content;
  
  // Apply all research pattern removals
  for (const pattern of RESEARCH_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove empty lines at the start
  cleaned = cleaned.replace(/^\s*\n+/, '');
  
  // Remove multiple consecutive blank lines (more than 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

/**
 * Extract research/thinking content that was removed
 * This can be optionally shown in the thinking section
 */
export function extractResearchContent(content: string): string | null {
  const researchMatch = content.match(/^(Based on my (?:research|web search|search).*?)(?=\n\n|HERO SECTION|SUBJECT LINE|$)/is);
  
  if (researchMatch) {
    return researchMatch[1].trim();
  }
  
  return null;
}

/**
 * Check if content contains research announcements
 */
export function hasResearchAnnouncements(content: string): boolean {
  return RESEARCH_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Clean content and log what was removed (for debugging)
 */
export function cleanWithLogging(content: string, conversationId?: string): string {
  const original = content;
  const cleaned = cleanAIResponse(content);
  
  if (original !== cleaned) {
    const removed = original.length - cleaned.length;
    console.log(`[ContentCleaner] Removed ${removed} characters of research text from response`);
    
    if (conversationId) {
      console.log(`[ContentCleaner] Conversation: ${conversationId}`);
    }
    
    // Log what was removed (first 100 chars)
    const diff = original.substring(0, Math.min(100, original.length - cleaned.length));
    console.log(`[ContentCleaner] Removed text preview: "${diff}..."`);
  }
  
  return cleaned;
}

/**
 * Clean email content specifically - more aggressive
 * Removes any preamble before the actual email structure
 */
export function cleanEmailContent(content: string): string {
  let cleaned = cleanAIResponse(content);
  
  // If content starts with research text before email structure, remove it
  const emailStartPatterns = [
    /^.*?(?=SUBJECT LINE:|HERO SECTION:|EMAIL SUBJECT:)/is,
    /^.*?(?=\n\nSUBJECT LINE:|\n\nHERO SECTION:|\n\nEMAIL SUBJECT:)/is,
  ];
  
  for (const pattern of emailStartPatterns) {
    const match = cleaned.match(pattern);
    if (match && match[0].length > 0 && match[0].length < 500) {
      // Only remove if it's a reasonable preamble (< 500 chars)
      // and doesn't contain the actual email structure
      if (!match[0].includes('Headline:') && !match[0].includes('Content:')) {
        console.log(`[ContentCleaner] Removing email preamble: "${match[0].substring(0, 100)}..."`);
        cleaned = cleaned.replace(pattern, '');
      }
    }
  }
  
  return cleaned.trim();
}

