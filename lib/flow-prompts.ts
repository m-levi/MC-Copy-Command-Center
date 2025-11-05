import { FlowType, FlowOutlineEmail, FlowOutlineData, EmailType } from '@/types';
import { getFlowTemplate } from './flow-templates';
import { FLOW_OUTLINE_PROMPT } from './prompts/flow-outline.prompt';
import { FLOW_BEST_PRACTICES } from './prompts/flow-best-practices';
import { FLOW_EMAIL_PROMPT_DESIGN, FLOW_EMAIL_PROMPT_LETTER } from './prompts/flow-email.prompt';

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
 */
export function buildFlowEmailPrompt(
  emailOutline: FlowOutlineEmail,
  flowOutline: FlowOutlineData,
  brandInfo: string,
  ragContext: string,
  emailType: EmailType
): string {
  // Determine position guidance
  let positionGuidance = '';
  if (emailOutline.sequence === 1) {
    positionGuidance = '- First email - set the tone for the entire series, make a strong first impression';
  } else if (emailOutline.sequence > 1 && emailOutline.sequence < flowOutline.emails.length) {
    positionGuidance = '- Middle email - build on momentum from previous emails, maintain engagement';
  } else if (emailOutline.sequence === flowOutline.emails.length) {
    positionGuidance = '- Final email - create urgency and closure, strong call to action';
  }

  // Determine subject line guidance based on position
  const subjectLineGuidance = emailOutline.sequence === 1 
    ? 'welcoming and inviting' 
    : 'relevant to this email\'s position in the sequence';

  // Format key points
  const keyPoints = emailOutline.keyPoints.map(p => `- ${p}`).join('\n');

  // Choose the appropriate template
  const template = emailType === 'design' 
    ? FLOW_EMAIL_PROMPT_DESIGN 
    : FLOW_EMAIL_PROMPT_LETTER;

  return replacePlaceholders(template, {
    EMAIL_SEQUENCE: emailOutline.sequence.toString(),
    TOTAL_EMAILS: flowOutline.emails.length.toString(),
    FLOW_NAME: flowOutline.flowName,
    BRAND_INFO: brandInfo,
    RAG_CONTEXT: ragContext,
    FLOW_GOAL: flowOutline.goal,
    TARGET_AUDIENCE: flowOutline.targetAudience,
    EMAIL_TITLE: emailOutline.title,
    EMAIL_TIMING: emailOutline.timing,
    EMAIL_PURPOSE: emailOutline.purpose,
    KEY_POINTS: keyPoints,
    PRIMARY_CTA: emailOutline.cta,
    SUBJECT_LINE_GUIDANCE: subjectLineGuidance,
    POSITION_GUIDANCE: positionGuidance,
  });
}
