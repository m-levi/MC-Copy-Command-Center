/**
 * Centralized chat prompt builders
 * All AI prompts for chat functionality in one place
 */

import { PLANNING_MODE_PROMPT } from './prompts/planning-mode.prompt';
import { LETTER_EMAIL_PROMPT } from './prompts/letter-email.prompt';
import { STANDARD_EMAIL_PROMPT } from './prompts/standard-email.prompt';
import { SECTION_REGENERATION_PROMPTS } from './prompts/section-regeneration.prompt';

export interface PromptContext {
  brandInfo: string;
  ragContext: string;
  contextInfo: string;
  memoryContext?: string;
  emailType?: string;
  websiteUrl?: string;
}

/**
 * Safely extract hostname from URL with error handling
 */
function getHostnameFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  
  try {
    return new URL(url).hostname;
  } catch (err) {
    console.warn('Invalid website URL, cannot extract hostname:', url);
    return null;
  }
}

/**
 * Build brand information string
 */
export function buildBrandInfo(brandContext: any): string {
  if (!brandContext) {
    return 'No brand information provided.';
  }

  return `
Brand Name: ${brandContext.name}

Brand Details:
${brandContext.brand_details || 'No brand details provided.'}

Brand Guidelines:
${brandContext.brand_guidelines || 'No brand guidelines provided.'}

Copywriting Style Guide:
${brandContext.copywriting_style_guide || 'No style guide provided.'}
${brandContext.website_url ? `\nBrand Website: ${brandContext.website_url}` : ''}
`.trim();
}

/**
 * Build conversation context info
 */
export function buildContextInfo(conversationContext?: any): string {
  if (!conversationContext) return '';

  return `
<conversation_context>
Campaign Type: ${conversationContext.campaignType || 'Not specified'}
Target Audience: ${conversationContext.targetAudience || 'Not specified'}
Tone Preference: ${conversationContext.tone || 'Follow brand guidelines'}
Goals: ${conversationContext.goals?.join(', ') || 'Not specified'}
</conversation_context>
`;
}

/**
 * Replace placeholders in a prompt template
 */
function replacePlaceholders(
  template: string,
  replacements: Record<string, string>
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  
  return result;
}

/**
 * Planning mode prompt
 */
export function buildPlanningPrompt(context: PromptContext): string {
  const hostname = getHostnameFromUrl(context.websiteUrl);
  const websiteHint = hostname ? ` (including ${hostname})` : '';
  
  return replacePlaceholders(PLANNING_MODE_PROMPT, {
    BRAND_INFO: context.brandInfo,
    RAG_CONTEXT: context.ragContext,
    CONTEXT_INFO: context.contextInfo,
    MEMORY_CONTEXT: context.memoryContext || '',
    WEBSITE_HINT: websiteHint,
  });
}

/**
 * Letter email prompt (short, personal emails)
 */
export function buildLetterEmailPrompt(context: PromptContext): string {
  return replacePlaceholders(LETTER_EMAIL_PROMPT, {
    BRAND_INFO: context.brandInfo,
    RAG_CONTEXT: context.ragContext,
    CONTEXT_INFO: context.contextInfo,
    MEMORY_CONTEXT: context.memoryContext || '',
  });
}

/**
 * Standard email copy prompt (design emails)
 */
export function buildStandardEmailPrompt(context: PromptContext): string {
  const hostname = getHostnameFromUrl(context.websiteUrl);
  const websiteHint = hostname ? ` (especially from ${hostname})` : '';
  
  return replacePlaceholders(STANDARD_EMAIL_PROMPT, {
    BRAND_INFO: context.brandInfo,
    RAG_CONTEXT: context.ragContext,
    CONTEXT_INFO: context.contextInfo,
    MEMORY_CONTEXT: context.memoryContext || '',
    WEBSITE_HINT: websiteHint,
    WEBSITE_URL: context.websiteUrl || 'the brand website',
    EMAIL_BRIEF: '{{EMAIL_BRIEF}}', // This will be filled in by the system when used
  });
}

/**
 * Section regeneration prompt
 */
export function buildSectionRegenerationPrompt(
  sectionType: string,
  sectionTitle: string,
  context: PromptContext
): string {
  const basePrompt = SECTION_REGENERATION_PROMPTS[sectionType as keyof typeof SECTION_REGENERATION_PROMPTS];
  
  if (!basePrompt) {
    throw new Error(`Unknown section type: ${sectionType}`);
  }

  return replacePlaceholders(basePrompt, {
    BRAND_INFO: context.brandInfo,
    RAG_CONTEXT: context.ragContext,
    CONTEXT_INFO: context.contextInfo,
    SECTION_TITLE: sectionTitle,
  });
}

/**
 * Main system prompt builder - routes to appropriate prompt
 */
export function buildSystemPrompt(
  brandContext: any,
  ragContext: string,
  options: {
    regenerateSection?: { type: string; title: string };
    conversationContext?: any;
    conversationMode?: string;
    memoryContext?: string;
    emailType?: string;
  } = {}
): string {
  const brandInfo = buildBrandInfo(brandContext);
  const contextInfo = buildContextInfo(options.conversationContext);

  const context: PromptContext = {
    brandInfo,
    ragContext,
    contextInfo,
    memoryContext: options.memoryContext,
    emailType: options.emailType,
    websiteUrl: brandContext?.website_url,
  };

  // Section regeneration
  if (options.regenerateSection) {
    return buildSectionRegenerationPrompt(
      options.regenerateSection.type,
      options.regenerateSection.title,
      context
    );
  }

  // Planning mode
  if (options.conversationMode === 'planning') {
    return buildPlanningPrompt(context);
  }

  // Letter email
  if (options.emailType === 'letter') {
    return buildLetterEmailPrompt(context);
  }

  // Standard email (design)
  return buildStandardEmailPrompt(context);
}
