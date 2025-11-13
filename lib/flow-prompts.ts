import { FlowType, FlowOutlineEmail, FlowOutlineData, EmailType } from '@/types';
import { getFlowTemplate } from './flow-templates';
import { FLOW_OUTLINE_PROMPT } from './prompts/flow-outline.prompt';
import { FLOW_BEST_PRACTICES } from './prompts/flow-best-practices';
import { STANDARD_EMAIL_PROMPT } from './prompts/standard-email.prompt';
import { LETTER_EMAIL_PROMPT } from './prompts/letter-email.prompt';

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
 * Extract copywriting style guide content from the brand info block
 */
function extractBrandVoiceGuidelines(brandInfo: string): string {
  if (!brandInfo) {
    return 'No style guide provided.';
  }

  const marker = 'Copywriting Style Guide:';
  const markerIndex = brandInfo.indexOf(marker);

  if (markerIndex === -1) {
    return 'No style guide provided.';
  }

  let guidelines = brandInfo.slice(markerIndex + marker.length);

  const websiteMarker = 'Brand Website:';
  if (guidelines.includes(websiteMarker)) {
    guidelines = guidelines.split(websiteMarker)[0];
  }

  guidelines = guidelines.trim();

  return guidelines || 'No style guide provided.';
}

/**
 * Build the additional context block for standard email prompts within flows
 */
function buildAdditionalContextForFlow(brandInfo: string, ragContext: string): string {
  const sections = [
    `<brand_details>
${brandInfo}
</brand_details>`,
    ragContext
      ? `<rag_context>
${ragContext}
</rag_context>`
      : '',
  ].filter(Boolean);

  return sections.join('\n\n').trim();
}

/**
 * Build the system prompt for creating a flow outline
 * This guides the AI through a conversational process to build a comprehensive outline
 */
export function buildFlowOutlinePrompt(
  flowType: FlowType,
  brandInfo: string,
  ragContext: string
): string {
  const template = getFlowTemplate(flowType);
  const bestPractices = FLOW_BEST_PRACTICES[flowType] || '';
  
  return replacePlaceholders(FLOW_OUTLINE_PROMPT, {
    FLOW_NAME: template.name,
    FLOW_NAME_UPPER: template.name.toUpperCase(),
    BRAND_INFO: brandInfo,
    RAG_CONTEXT: ragContext,
    DEFAULT_EMAIL_COUNT: template.defaultEmailCount.toString(),
    BEST_PRACTICES: bestPractices,
  });
}

/**
 * Build the system prompt for generating an individual email within a flow
 * Uses the standard email prompt to ensure consistent quality and format
 */
export function buildFlowEmailPrompt(
  emailOutline: FlowOutlineEmail,
  flowOutline: FlowOutlineData,
  brandInfo: string,
  ragContext: string,
  emailType: EmailType
): string {
  // Build the email brief based on the outline
  const emailBrief = `
You are writing Email ${emailOutline.sequence} of ${flowOutline.emails.length} in a ${flowOutline.flowName} automation.

**Flow Context:**
- Flow Goal: ${flowOutline.goal}
- Target Audience: ${flowOutline.targetAudience}
- Email Position: ${emailOutline.sequence} of ${flowOutline.emails.length}

**This Email's Details:**
- Title: ${emailOutline.title}
- Timing: ${emailOutline.timing}
- Purpose: ${emailOutline.purpose}
- Primary CTA: ${emailOutline.cta}

**Key Points to Cover:**
${emailOutline.keyPoints.map(p => `- ${p}`).join('\n')}

**Important Flow Considerations:**
${emailOutline.sequence === 1 ? '- First email - set the tone for the entire series, make a strong first impression' : ''}
${emailOutline.sequence > 1 && emailOutline.sequence < flowOutline.emails.length ? '- Middle email - build on momentum from previous emails, maintain engagement' : ''}
${emailOutline.sequence === flowOutline.emails.length ? '- Final email - create urgency and closure, strong call to action' : ''}
- Ensure this email works as part of the larger sequence
- Maintain consistency with brand voice throughout
`.trim();

  // Extract website URL from brandInfo string
  const websiteMatch = brandInfo.match(/Website:\s*(.+)/);
  const websiteUrl = websiteMatch ? websiteMatch[1].trim() : '';
  
  const brandVoiceGuidelines = extractBrandVoiceGuidelines(brandInfo);
  const additionalContext = buildAdditionalContextForFlow(brandInfo, ragContext || '');

  if (emailType === 'design') {
    return replacePlaceholders(STANDARD_EMAIL_PROMPT, {
      BRAND_VOICE_GUIDELINES: brandVoiceGuidelines,
      ADDITIONAL_CONTEXT: additionalContext,
      COPY_BRIEF: emailBrief,
    });
  }
  
  // Generate website hint if we have a URL
  const websiteHint = websiteUrl 
    ? ` (especially the brand's website: ${websiteUrl})` 
    : '';

  return replacePlaceholders(LETTER_EMAIL_PROMPT, {
    BRAND_INFO: brandInfo,
    RAG_CONTEXT: ragContext || '',
    CONTEXT_INFO: '', // No additional context needed for flows
    MEMORY_CONTEXT: '', // Flows don't need memory context
    EMAIL_BRIEF: emailBrief,
    WEBSITE_URL: websiteUrl,
    WEBSITE_HINT: websiteHint,
  });
}
