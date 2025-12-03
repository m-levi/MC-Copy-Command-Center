import { FlowType, FlowOutlineEmail, FlowOutlineData, EmailType } from '@/types';
import { getFlowTemplate } from './flow-templates';
import { FLOW_OUTLINE_PROMPT } from './prompts/flow-outline.prompt';
import { FLOW_BEST_PRACTICES } from './prompts/flow-best-practices';
import { buildDesignEmailV2Prompt } from './prompts/design-email-v2.prompt';
import { LETTER_EMAIL_PROMPT } from './prompts/letter-email.prompt';

// Re-export conversational flow prompts for convenience
export { buildConversationalFlowPrompt, buildFlowTypeSelectedPrompt } from './prompts/conversational-flow.prompt';

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
 * Build the system prompt for creating a flow outline
 * This guides the AI through a conversational process to build a comprehensive outline
 */
export function buildFlowOutlinePrompt(
  flowType: FlowType,
  brandInfo: string,
  ragContext: string = '' // RAG disabled for performance
): string {
  const template = getFlowTemplate(flowType);
  const bestPractices = FLOW_BEST_PRACTICES[flowType] || '';
  
  return replacePlaceholders(FLOW_OUTLINE_PROMPT, {
    FLOW_NAME: template.name,
    FLOW_NAME_UPPER: template.name.toUpperCase(),
    BRAND_INFO: brandInfo,
    RAG_CONTEXT: '', // RAG disabled - always empty
    DEFAULT_EMAIL_COUNT: template.defaultEmailCount.toString(),
    BEST_PRACTICES: bestPractices,
  });
}

/**
 * Build the copy brief for a flow email based on its outline
 */
function buildFlowEmailBrief(
  emailOutline: FlowOutlineEmail,
  flowOutline: FlowOutlineData
): string {
  return `
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
}

/**
 * Build the system and user prompts for generating an individual email within a flow
 * 
 * UNIFIED: Uses Design Email V2 as the single source of truth for design emails
 * This ensures flow emails use the exact same prompt as the main chat API
 */
export function buildFlowEmailPrompts(
  emailOutline: FlowOutlineEmail,
  flowOutline: FlowOutlineData,
  brandInfo: string,
  ragContext: string,
  emailType: EmailType
): { systemPrompt: string; userPrompt: string } {
  // Build the email brief based on the outline
  const emailBrief = buildFlowEmailBrief(emailOutline, flowOutline);
  
  // Extract brand voice guidelines for the prompt
  const brandVoiceGuidelines = extractBrandVoiceGuidelines(brandInfo);

  if (emailType === 'design') {
    // UNIFIED: Use Design Email V2 prompt (single source of truth)
    // This matches how the main chat API handles design emails
    const { systemPrompt, userPrompt } = buildDesignEmailV2Prompt({
      brandInfo,
      brandVoiceGuidelines,
      copyBrief: emailBrief,
    });

    return {
      systemPrompt,
      userPrompt,
    };
  }
  
  // For letter emails, use the letter prompt (which is a combined prompt)
  // Extract website URL from brandInfo string
  const websiteMatch = brandInfo.match(/Website:\s*(.+)/);
  const websiteUrl = websiteMatch ? websiteMatch[1].trim() : '';
  const websiteHint = websiteUrl 
    ? ` (especially the brand's website: ${websiteUrl})` 
    : '';

  const letterPrompt = replacePlaceholders(LETTER_EMAIL_PROMPT, {
    BRAND_INFO: brandInfo,
    RAG_CONTEXT: ragContext || '',
    CONTEXT_INFO: '', // No additional context needed for flows
    MEMORY_CONTEXT: '', // Flows don't need memory context
    EMAIL_BRIEF: emailBrief,
    WEBSITE_URL: websiteUrl,
    WEBSITE_HINT: websiteHint,
  });

  // Letter emails use a combined prompt approach
  return {
    systemPrompt: letterPrompt,
    userPrompt: `Please write the email described above following all the guidelines.`,
  };
}

/**
 * LEGACY: Build the system prompt for generating an individual email within a flow
 * 
 * @deprecated Use buildFlowEmailPrompts instead for proper system/user prompt separation
 */
export function buildFlowEmailPrompt(
  emailOutline: FlowOutlineEmail,
  flowOutline: FlowOutlineData,
  brandInfo: string,
  ragContext: string,
  emailType: EmailType
): string {
  // For backwards compatibility, return the user prompt
  // Note: This loses the system prompt context - use buildFlowEmailPrompts instead
  const { systemPrompt, userPrompt } = buildFlowEmailPrompts(
    emailOutline,
    flowOutline,
    brandInfo,
    ragContext,
    emailType
  );
  
  // Combine them for legacy callers (not ideal, but maintains compatibility)
  return `${systemPrompt}\n\n---\n\n${userPrompt}`;
}
