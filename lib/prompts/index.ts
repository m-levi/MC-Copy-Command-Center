/**
 * Prompt Templates Index
 * 
 * This directory contains individual prompt files for easier backend editing.
 * Each prompt type is in its own file for better organization and maintainability.
 */

export { PLANNING_MODE_PROMPT } from './planning-mode.prompt';
export { LETTER_EMAIL_PROMPT } from './letter-email.prompt';
export { STANDARD_EMAIL_PROMPT } from './standard-email.prompt';
export { SECTION_REGENERATION_PROMPTS } from './section-regeneration.prompt';
export { FLOW_OUTLINE_PROMPT } from './flow-outline.prompt';
export { FLOW_BEST_PRACTICES } from './flow-best-practices';
// @deprecated - These prompts are no longer used. Design V2 is now the single source of truth.
// Kept for backwards compatibility only. Use DESIGN_EMAIL_V2_* and LETTER_EMAIL_PROMPT instead.
export { FLOW_EMAIL_PROMPT_DESIGN, FLOW_EMAIL_PROMPT_LETTER } from './flow-email.prompt';
export { CONVERSATIONAL_FLOW_PROMPT, buildConversationalFlowPrompt } from './conversational-flow.prompt';

// Design Email V2 - Returns 3 versions (A, B, C) in XML tags
export { 
  DESIGN_EMAIL_V2_SYSTEM_PROMPT, 
  DESIGN_EMAIL_V2_USER_PROMPT, 
  buildDesignEmailV2Prompt 
} from './design-email-v2.prompt';




