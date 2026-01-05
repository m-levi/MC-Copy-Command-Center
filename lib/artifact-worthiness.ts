/**
 * Artifact Worthiness Check
 *
 * Prevents the AI from creating artifacts for content that shouldn't be artifacts.
 * This helps avoid over-creation of artifacts for simple questions, clarifications,
 * and conversational responses.
 *
 * Also provides validation for structured artifact types (calendar, email_brief)
 * that require specific metadata fields.
 */

import type { ArtifactKind } from '@/types/artifacts';

/**
 * Result of a worthiness check
 */
export interface WorthinessResult {
  isWorthy: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  suggestedKind?: ArtifactKind;
}

/**
 * Result of a tool input validation check
 */
export interface ToolInputValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Context for worthiness check
 */
export interface WorthinessContext {
  /** Whether the user explicitly requested an artifact */
  userRequestedArtifact?: boolean;
  /** Whether the content has structured markers (XML tags, code blocks, etc.) */
  hasStructuredContent?: boolean;
  /** The mode/context of the conversation */
  conversationMode?: string;
  /** The user's original message */
  userMessage?: string;
  /** The intended artifact kind (for kind-specific thresholds) */
  kind?: ArtifactKind;
  /** Tool call arguments for structure validation (calendar_slots, etc.) */
  toolArgs?: Record<string, unknown>;
}

/**
 * Minimum content length thresholds by artifact type
 */
const MIN_LENGTH_THRESHOLDS: Record<ArtifactKind | 'default', number> = {
  email: 200,
  markdown: 300,
  code: 50,
  checklist: 30,
  spreadsheet: 50,
  flow: 150,
  campaign: 200,
  subject_lines: 50,
  template: 100,
  content_brief: 150,
  email_brief: 100,
  calendar: 50, // Calendar artifacts are structure-based, low content threshold
  default: 200,
};

/**
 * Patterns that indicate content should NOT become an artifact
 * These are typically conversational responses, questions, or brief acknowledgments
 */
const EXCLUSION_PATTERNS = [
  // Simple acknowledgments
  /^(yes|no|ok|okay|sure|thanks|thank you|got it|understood|right|correct|exactly)\.?$/i,

  // Clarification responses
  /^I (can|will|would|should|might|could|need to|have to)/i,
  /^(let me|i'll|i will) (know|help|explain|clarify|check|look|think)/i,

  // Questions (AI asking user)
  /^(what|when|where|why|how|which|who|can|could|would|should|do|does|did|is|are|was|were).+\?$/i,

  // Brief intros that lead to questions
  /^(here's|here is|here are) (a|an|the) (quick|brief|short)/i,
  /^(before|first|to).+(let me|i need to).+(ask|know|understand)/i,

  // Meta-responses about the task
  /^(I (understand|see|got it)|that makes sense|good question)/i,
  /^(let's|we can|we should|i suggest|i recommend).{0,50}$/i,

  // Apologies or corrections
  /^(sorry|apologies|my mistake|let me correct)/i,

  // Single sentences without structure
  /^[^.!?]*[.!?]$/,  // Single sentence (one terminator)
];

/**
 * Patterns that indicate content likely SHOULD become an artifact
 */
const INCLUSION_PATTERNS = [
  // XML version tags (email variants)
  /<version_[abc]>/i,

  // Code blocks with language
  /```\w+\n[\s\S]{50,}```/,

  // Checklist items (3+ items)
  /(\[ \]|\[x\])/gi,

  // Markdown tables (3+ rows)
  /^\|.+\|\s*\n\|[-:\s|]+\|\s*\n(\|.+\|\s*\n){2,}/m,

  // Multiple headers (structured document)
  /^#{1,3}\s+.+$/gm,

  // Numbered lists with 5+ items
  /^\d+\.\s+.+$/gm,
];

/**
 * Check if user's message indicates they want an artifact
 */
function userWantsArtifact(userMessage?: string): boolean {
  if (!userMessage) return false;

  const artifactRequestPatterns = [
    /\b(create|make|generate|write|build|draft)\s+(a|an|the|some)?\s*(artifact|document|email|code|table|list|checklist)/i,
    /\b(save|store)\s+(this|that|it)/i,
    /\b(as|into)\s+(an?\s+)?(artifact|document)/i,
  ];

  return artifactRequestPatterns.some(p => p.test(userMessage));
}

/**
 * Count pattern matches in content
 */
function countPatternMatches(content: string, pattern: RegExp): number {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Check if content is artifact-worthy
 *
 * @param content - The AI-generated content to evaluate
 * @param context - Additional context about the conversation
 * @returns WorthinessResult indicating if content should become an artifact
 */
export function checkArtifactWorthiness(
  content: string,
  context: WorthinessContext = {}
): WorthinessResult {
  const trimmedContent = content.trim();

  // Always create if user explicitly requested
  if (context.userRequestedArtifact || userWantsArtifact(context.userMessage)) {
    return {
      isWorthy: true,
      confidence: 'high',
      reason: 'User explicitly requested artifact',
    };
  }

  // Calendar artifacts are always worthy - their value is in metadata (calendar_slots), not content
  if (context.kind === 'calendar') {
    return {
      isWorthy: true,
      confidence: 'high',
      reason: 'Calendar artifacts are structure-based',
      suggestedKind: 'calendar',
    };
  }

  // Check exclusion patterns first (fast rejection)
  for (const pattern of EXCLUSION_PATTERNS) {
    if (pattern.test(trimmedContent)) {
      return {
        isWorthy: false,
        confidence: 'high',
        reason: 'Content matches exclusion pattern (conversational/question)',
      };
    }
  }

  // Check if content ends with a question (AI asking for clarification)
  if (trimmedContent.endsWith('?') && !context.hasStructuredContent) {
    // Count questions - if more than half the content is questions, reject
    const questionCount = countPatternMatches(trimmedContent, /\?/g);
    const sentenceCount = countPatternMatches(trimmedContent, /[.!?]/g);
    if (questionCount > sentenceCount / 2) {
      return {
        isWorthy: false,
        confidence: 'high',
        reason: 'Content is primarily questions/clarification',
      };
    }
  }

  // Check for structured content patterns (high confidence worthy)
  if (context.hasStructuredContent) {
    for (const pattern of INCLUSION_PATTERNS) {
      if (pattern.test(trimmedContent)) {
        return {
          isWorthy: true,
          confidence: 'high',
          reason: 'Contains structured artifact content',
        };
      }
    }
  }

  // Check minimum length using kind-specific threshold
  const minLength = context.kind
    ? (MIN_LENGTH_THRESHOLDS[context.kind] ?? MIN_LENGTH_THRESHOLDS.default)
    : MIN_LENGTH_THRESHOLDS.default;
  if (trimmedContent.length < minLength) {
    return {
      isWorthy: false,
      confidence: 'medium',
      reason: `Content too short (${trimmedContent.length} < ${minLength} chars)`,
    };
  }

  // Check for checklist items
  const checklistMatches = countPatternMatches(trimmedContent, /(\[ \]|\[x\])/gi);
  if (checklistMatches >= 3) {
    return {
      isWorthy: true,
      confidence: 'high',
      reason: 'Contains checklist items',
      suggestedKind: 'checklist',
    };
  }

  // Check for code blocks
  const codeBlockMatch = trimmedContent.match(/```(\w+)\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    const codeLines = codeBlockMatch[2].split('\n').length;
    if (codeLines >= 10) {
      return {
        isWorthy: true,
        confidence: 'high',
        reason: 'Contains substantial code block',
        suggestedKind: 'code',
      };
    }
  }

  // Check for markdown headers (structured document)
  const headerCount = countPatternMatches(trimmedContent, /^#{1,3}\s+.+$/gm);
  if (headerCount >= 3 && trimmedContent.length > 500) {
    return {
      isWorthy: true,
      confidence: 'medium',
      reason: 'Contains structured markdown document',
      suggestedKind: 'markdown',
    };
  }

  // Check for markdown table
  if (/^\|.+\|\s*\n\|[-:\s|]+\|\s*\n/m.test(trimmedContent)) {
    const tableRows = countPatternMatches(trimmedContent, /^\|.+\|$/gm);
    if (tableRows >= 3) {
      return {
        isWorthy: true,
        confidence: 'high',
        reason: 'Contains data table',
        suggestedKind: 'spreadsheet',
      };
    }
  }

  // Default: not worthy unless content is very substantial
  if (trimmedContent.length > 1000) {
    return {
      isWorthy: true,
      confidence: 'low',
      reason: 'Long content may warrant saving',
    };
  }

  return {
    isWorthy: false,
    confidence: 'low',
    reason: 'No clear artifact indicators found',
  };
}

/**
 * Quick check if content should definitely not be an artifact
 * Use this for fast rejection before more expensive processing
 */
export function quickRejectCheck(content: string): boolean {
  const trimmed = content.trim();

  // Very short content
  if (trimmed.length < 50) return true;

  // Single line
  if (!trimmed.includes('\n')) return true;

  // Ends with question mark (likely asking for input)
  if (trimmed.endsWith('?') && trimmed.length < 300) return true;

  // Starts with common conversational patterns
  if (/^(I |Let me |Here's a quick |Sure,? |Yes,? |No,? )/i.test(trimmed)) {
    // Unless it's followed by substantial structured content
    if (trimmed.length < 200) return true;
  }

  return false;
}

// =============================================================================
// STRUCTURED ARTIFACT VALIDATION
// =============================================================================

/**
 * Calendar slot structure for validation
 */
interface CalendarSlotInput {
  id?: string;
  date?: string;
  title?: string;
  description?: string;
  email_type?: string;
  status?: string;
}

/**
 * Validate calendar artifact tool input
 *
 * Ensures calendar artifacts have the required structure:
 * - calendar_month in YYYY-MM format
 * - calendar_slots array with at least 1 slot
 * - Each slot has required fields (id, date, title)
 * - Dates are valid ISO format (YYYY-MM-DD)
 */
export function validateCalendarArtifactInput(
  toolArgs: Record<string, unknown>
): ToolInputValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check calendar_month
  const calendarMonth = toolArgs.calendar_month;
  if (!calendarMonth) {
    errors.push('calendar_month is required for calendar artifacts');
  } else if (typeof calendarMonth !== 'string' || !/^\d{4}-\d{2}$/.test(calendarMonth)) {
    errors.push('calendar_month must be in YYYY-MM format');
  }

  // Check calendar_slots
  const calendarSlots = toolArgs.calendar_slots;
  if (!calendarSlots || !Array.isArray(calendarSlots)) {
    errors.push('calendar_slots array is required for calendar artifacts');
  } else if (calendarSlots.length === 0) {
    errors.push('calendar_slots must contain at least one slot');
  } else {
    // Validate each slot
    calendarSlots.forEach((slot: CalendarSlotInput, index: number) => {
      if (!slot.id) {
        errors.push(`calendar_slots[${index}].id is required`);
      }
      if (!slot.date) {
        errors.push(`calendar_slots[${index}].date is required`);
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(slot.date)) {
        errors.push(`calendar_slots[${index}].date must be in YYYY-MM-DD format`);
      }
      if (!slot.title) {
        errors.push(`calendar_slots[${index}].title is required`);
      }
      if (!slot.description) {
        warnings.push(`calendar_slots[${index}].description is recommended`);
      }
      if (!slot.email_type) {
        warnings.push(`calendar_slots[${index}].email_type is recommended`);
      }
    });

    // Check for duplicate dates on weekdays
    const dateCount: Record<string, number> = {};
    calendarSlots.forEach((slot: CalendarSlotInput) => {
      if (slot.date) {
        dateCount[slot.date] = (dateCount[slot.date] || 0) + 1;
      }
    });

    Object.entries(dateCount).forEach(([date, count]) => {
      if (count > 2) {
        warnings.push(`${count} emails scheduled for ${date} - consider spreading them out`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate email_brief artifact tool input
 *
 * Ensures email_brief artifacts have meaningful content:
 * - title is not conversational
 * - objective or description is provided
 * - send_date (if provided) is valid
 */
export function validateEmailBriefInput(
  toolArgs: Record<string, unknown>
): ToolInputValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check title is not conversational
  const title = toolArgs.title as string | undefined;
  if (title) {
    const conversationalPatterns = [
      /^(here|let me|i'll|i will|sure|okay)/i,
      /\?$/,
      /^(what|how|when|where|why|can|could|would|should)/i,
    ];

    for (const pattern of conversationalPatterns) {
      if (pattern.test(title)) {
        errors.push('Email brief title should not be conversational - use a descriptive name');
        break;
      }
    }
  }

  // Check for meaningful content
  const hasObjective = !!toolArgs.objective;
  const hasDescription = !!(toolArgs.description && (toolArgs.description as string).length > 20);
  const hasKeyMessage = !!toolArgs.key_message;

  if (!hasObjective && !hasDescription && !hasKeyMessage) {
    errors.push('Email brief must have at least one of: objective, description, or key_message');
  }

  // Validate send_date format if provided
  const sendDate = toolArgs.send_date;
  if (sendDate && typeof sendDate === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sendDate)) {
      errors.push('send_date must be in YYYY-MM-DD format');
    }
  }

  // Warnings for better briefs
  if (!toolArgs.target_segment) {
    warnings.push('target_segment is recommended for email briefs');
  }
  if (!toolArgs.call_to_action) {
    warnings.push('call_to_action is recommended for email briefs');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate artifact tool input based on kind
 *
 * This is the main entry point for validating structured artifact types.
 * Returns validation result with errors and warnings.
 */
export function validateArtifactToolInput(
  kind: ArtifactKind,
  toolArgs: Record<string, unknown>
): ToolInputValidationResult {
  switch (kind) {
    case 'calendar':
      return validateCalendarArtifactInput(toolArgs);

    case 'email_brief':
      return validateEmailBriefInput(toolArgs);

    // Other kinds don't have strict structural requirements
    default:
      return { isValid: true, errors: [], warnings: [] };
  }
}

/**
 * Check if artifact content is conversational (should not be saved)
 *
 * Used for any artifact type to detect if the AI is trying to save
 * conversational/clarifying text instead of actual deliverable content.
 */
export function isConversationalContent(content: string): boolean {
  const trimmed = content.trim();

  // Very short content is likely conversational
  if (trimmed.length < 100) return true;

  // Starts with conversational patterns
  const conversationalStarts = [
    /^(I |Let me |I'll |I will |Here's |Sure,? |Yes,? |No,? |Great )/i,
    /^(Before |First |To |In order to |Would you |Could you |Can you )/i,
    /^(What |How |When |Where |Why |Which |Do you |Are you |Is there )/i,
  ];

  for (const pattern of conversationalStarts) {
    if (pattern.test(trimmed)) {
      // Check if content is mostly conversational (no structure)
      const hasStructure = /^[#*-]|\d+\./m.test(trimmed) || /<\w+>/.test(trimmed);
      if (!hasStructure && trimmed.length < 500) {
        return true;
      }
    }
  }

  // Ends with a question (likely asking for clarification)
  if (trimmed.endsWith('?')) {
    const questionCount = (trimmed.match(/\?/g) || []).length;
    const sentenceCount = (trimmed.match(/[.!?]/g) || []).length;

    // If more than half the content is questions, it's conversational
    if (questionCount > sentenceCount / 2) {
      return true;
    }
  }

  return false;
}

export default checkArtifactWorthiness;
