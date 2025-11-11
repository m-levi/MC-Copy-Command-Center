/**
 * Centralized chat prompt builders
 * All AI prompts for chat functionality in one place
 */

import { PLANNING_MODE_PROMPT } from './prompts/planning-mode.prompt';
import { LETTER_EMAIL_PROMPT } from './prompts/letter-email.prompt';
import { 
  STANDARD_EMAIL_PROMPT, 
  STANDARD_EMAIL_SYSTEM_PROMPT,
  STANDARD_EMAIL_USER_PROMPT 
} from './prompts/standard-email.prompt';
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
 * 
 * NEW: Returns an object with separate system and user prompts
 * to support the new API-first prompt architecture
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
 * NEW: Build standard email prompt with separate system and user prompts
 * This is the new API-first approach that better aligns with Claude's API
 */
export function buildStandardEmailPromptV2(context: PromptContext): {
  systemPrompt: string;
  userPromptTemplate: string;
} {
  // Extract copywriting style guide for BRAND_VOICE_GUIDELINES
  // IMPORTANT: Only extract the style guide, not the website URL that comes after
  let brandVoiceGuidelines = 'No style guide provided.';
  
  if (context.brandInfo.includes('Copywriting Style Guide:')) {
    const afterStyleGuide = context.brandInfo.split('Copywriting Style Guide:')[1];
    
    // Check if there's a "Brand Website:" section after the style guide
    if (afterStyleGuide && afterStyleGuide.includes('Brand Website:')) {
      // Extract only up to "Brand Website:"
      brandVoiceGuidelines = afterStyleGuide.split('Brand Website:')[0].trim();
    } else if (afterStyleGuide) {
      // No website URL, take everything
      brandVoiceGuidelines = afterStyleGuide.trim();
    }
    
    // Fallback if extraction failed
    if (!brandVoiceGuidelines) {
      brandVoiceGuidelines = 'No style guide provided.';
    }
  }

  // Build ADDITIONAL_CONTEXT from all available context
  const additionalContext = `
<brand_details>
${context.brandInfo}
</brand_details>

${context.ragContext ? `<rag_context>\n${context.ragContext}\n</rag_context>` : ''}

${context.contextInfo ? `<conversation_context>\n${context.contextInfo}\n</conversation_context>` : ''}

${context.memoryContext ? `<memory_context>\n${context.memoryContext}\n</memory_context>` : ''}
  `.trim();

  // Build user prompt template with placeholders
  // COPY_BRIEF will be filled in with the actual user message when sending to API
  const userPromptTemplate = replacePlaceholders(STANDARD_EMAIL_USER_PROMPT, {
    COPY_BRIEF: '{{COPY_BRIEF}}', // Placeholder for actual email brief from user
    BRAND_VOICE_GUIDELINES: brandVoiceGuidelines,
    ADDITIONAL_CONTEXT: additionalContext,
  });

  return {
    systemPrompt: STANDARD_EMAIL_SYSTEM_PROMPT,
    userPromptTemplate,
  };
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
