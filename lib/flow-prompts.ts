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
  
  // Generate website hint if we have a URL
  const websiteHint = websiteUrl 
    ? ` (especially the brand's website: ${websiteUrl})` 
    : '';

  // Choose the appropriate template (design or letter)
  const template = emailType === 'design' 
    ? STANDARD_EMAIL_PROMPT 
    : LETTER_EMAIL_PROMPT;

  // Replace placeholders
  return replacePlaceholders(template, {
    BRAND_INFO: brandInfo,
    RAG_CONTEXT: ragContext || '',
    CONTEXT_INFO: '', // No additional context needed for flows
    MEMORY_CONTEXT: '', // Flows don't need memory context
    WEBSITE_HINT: websiteHint,
    WEBSITE_URL: websiteUrl,
    EMAIL_BRIEF: emailBrief,
  });
}
