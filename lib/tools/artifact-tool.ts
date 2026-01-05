/**
 * Artifact Tool - Vercel AI SDK Integration
 *
 * Allows the AI to create persistent artifacts from generated content.
 * Aligned with the artifact type system in types/artifacts.ts.
 *
 * Supported artifact kinds:
 * - email: Email copy with A/B/C variants
 * - flow: Email automation sequences
 * - campaign: Full campaign plans
 * - template: Reusable templates
 * - subject_lines: Subject line variants
 * - content_brief: Content briefs/outlines
 */

import { z } from 'zod';
import { tool } from 'ai';
import type { ArtifactKind, ArtifactVariant, FlowStep, SubjectLineVariant, CalendarSlot } from '@/types/artifacts';
import { parseEmailVersions as parseEmailVersionsFromParser } from '@/lib/email-version-parser';

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Email version schema for AI tool input validation.
 * This is the STRUCTURED format the AI provides when calling create_artifact.
 * Different from EmailVersion in email-version-parser.ts which is for parsing raw content.
 */
export const EmailVersionToolInputSchema = z.object({
  id: z.enum(['a', 'b', 'c']).describe('Version identifier'),
  label: z.string().describe('Human-readable label (e.g., "Version A - Bold Approach")'),
  subject_line: z.string().describe('Email subject line for this version'),
  preview_text: z.string().optional().describe('Email preview text (preheader)'),
  approach: z.string().optional().describe('Brief description of the approach/strategy for this version'),
  content: z.string().describe('Full email body content in markdown format'),
});

/** Type for AI tool input - structured version data */
export type EmailVersionToolInput = z.infer<typeof EmailVersionToolInputSchema>;

/**
 * Subject line variant schema
 */
export const SubjectLineVariantSchema = z.object({
  text: z.string().describe('The subject line text'),
  approach: z.string().optional().describe('Strategy/approach description'),
  emoji_usage: z.boolean().optional().describe('Whether this version uses emojis'),
  character_count: z.number().optional().describe('Character count for deliverability'),
});

/**
 * Flow step schema for automation sequences
 */
export const FlowStepSchema = z.object({
  id: z.string().describe('Unique step identifier'),
  type: z.enum(['email', 'delay', 'condition', 'action']).describe('Step type'),
  title: z.string().describe('Step title/name'),
  content: z.string().optional().describe('Email content or action details'),
  delay_value: z.number().optional().describe('Delay value (for delay steps)'),
  delay_unit: z.enum(['minutes', 'hours', 'days']).optional().describe('Delay unit'),
  condition: z.string().optional().describe('Condition expression (for condition steps)'),
  next_steps: z.array(z.string()).optional().describe('IDs of next steps'),
});

/**
 * Artifact metadata schemas by kind
 */
export const EmailMetadataSchema = z.object({
  email_type: z.enum(['design', 'letter', 'promotional', 'transactional']).optional(),
  selected_variant: z.enum(['a', 'b', 'c']).optional().default('a'),
  versions: z.array(EmailVersionToolInputSchema).min(1).describe('Email versions (A/B/C)'),
});

export const FlowMetadataSchema = z.object({
  flow_type: z.enum(['welcome', 'abandoned_cart', 'post_purchase', 'winback', 'custom'] as const).optional(),
  trigger: z.object({
    type: z.string(),
    config: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  steps: z.array(FlowStepSchema).min(1, 'At least one step is required').describe('Flow steps'),
});

export const CampaignMetadataSchema = z.object({
  campaign_type: z.enum(['promotional', 'announcement', 'seasonal', 'newsletter']).optional(),
  target_audience: z.string().optional(),
  goals: z.array(z.string()).optional(),
  channels: z.array(z.enum(['email', 'sms', 'push'])).optional(),
  scheduled_date: z.string().optional(),
});

export const SubjectLinesMetadataSchema = z.object({
  variants: z.array(SubjectLineVariantSchema).min(1).describe('Subject line variants'),
  selected_index: z.number().optional().default(0),
  email_artifact_id: z.string().optional().describe('Related email artifact ID'),
});

export const TemplateMetadataSchema = z.object({
  template_type: z.enum(['email', 'flow', 'campaign']).optional(),
  variables: z.array(z.string()).optional().describe('Template variables that can be replaced'),
  category: z.string().optional(),
});

export const ContentBriefMetadataSchema = z.object({
  brief_type: z.enum(['email', 'campaign', 'content']).optional(),
  objectives: z.array(z.string()).optional(),
  key_messages: z.array(z.string()).optional(),
  target_audience: z.string().optional(),
});

/**
 * Simplified artifact tool schema for AI SDK compatibility
 * Uses a flat structure with optional metadata fields
 */
/**
 * Spreadsheet column schema
 */
export const SpreadsheetColumnSchema = z.object({
  id: z.string().describe('Unique column identifier'),
  name: z.string().describe('Column header name'),
  type: z.enum(['text', 'number', 'date', 'boolean']).optional().describe('Column data type'),
});

/**
 * Spreadsheet row schema
 */
export const SpreadsheetRowSchema = z.object({
  id: z.string().describe('Unique row identifier'),
  cells: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).describe('Cell values keyed by column id'),
});

/**
 * Checklist item schema
 */
export const ChecklistItemSchema = z.object({
  id: z.string().describe('Unique item identifier'),
  text: z.string().describe('Item text'),
  checked: z.boolean().describe('Whether the item is checked'),
  indent: z.number().optional().describe('Indentation level (0-2)'),
});

/**
 * Calendar slot schema for scheduled email items
 */
export const CalendarSlotSchema = z.object({
  id: z.string().describe('Unique slot identifier'),
  date: z.string().describe('Date in YYYY-MM-DD format'),
  title: z.string().describe('Email/event title'),
  description: z.string().optional().describe('Brief description of the email content'),
  email_type: z.enum(['promotional', 'content', 'announcement', 'transactional', 'nurture']).optional().describe('Type of email'),
  status: z.enum(['draft', 'scheduled', 'sent', 'approved', 'pending']).optional().describe('Email status'),
  timing: z.string().optional().describe('Human-readable timing like "Morning" or "10:00 AM"'),
});

export const ArtifactToolSchema = z.object({
  kind: z.enum(['email', 'flow', 'campaign', 'subject_lines', 'template', 'content_brief', 'email_brief', 'calendar', 'markdown', 'spreadsheet', 'code', 'checklist'] as const)
    .describe('Type of artifact to create'),
  title: z.string().describe('Artifact title'),
  description: z.string().optional().describe('Brief description'),
  content: z.string().describe('Main content in markdown format'),
  // Email-specific fields
  email_type: z.enum(['design', 'letter', 'promotional', 'transactional'] as const).optional(),
  versions: z.array(EmailVersionToolInputSchema).optional().describe('Email A/B/C versions'),
  selected_variant: z.enum(['a', 'b', 'c'] as const).optional(),
  // Flow-specific fields
  flow_type: z.enum(['welcome', 'abandoned_cart', 'post_purchase', 'winback', 'custom'] as const).optional(),
  steps: z.array(FlowStepSchema).optional().describe('Flow steps'),
  // Subject lines
  subject_line_variants: z.array(SubjectLineVariantSchema).optional(),
  // Campaign
  campaign_type: z.enum(['promotional', 'announcement', 'seasonal', 'newsletter'] as const).optional(),
  target_audience: z.string().optional(),
  goals: z.array(z.string()).optional(),
  // Email Brief-specific fields (for calendar planning)
  brief_campaign_type: z.enum(['promotional', 'content', 'announcement', 'transactional', 'nurture'] as const).optional().describe('Email brief campaign type'),
  send_date: z.string().optional().describe('Planned send date (e.g., "2025-01-07")'),
  target_segment: z.string().optional().describe('Target audience segment'),
  objective: z.string().optional().describe('Email objective - what success looks like'),
  key_message: z.string().optional().describe('Primary message/hook'),
  value_proposition: z.string().optional().describe('Value proposition for the recipient'),
  call_to_action: z.string().optional().describe('Primary CTA'),
  subject_line_direction: z.string().optional().describe('Direction for subject line'),
  tone_notes: z.string().optional().describe('Tone and style notes'),
  approval_status: z.enum(['draft', 'pending_review', 'approved', 'rejected'] as const).optional().describe('Brief approval status'),
  calendar_artifact_id: z.string().optional().describe('ID of parent calendar artifact'),
  // Markdown-specific fields
  markdown_format: z.enum(['article', 'notes', 'documentation']).optional().describe('Document format type'),
  // Spreadsheet-specific fields
  spreadsheet_columns: z.array(SpreadsheetColumnSchema).optional().describe('Table column definitions'),
  spreadsheet_rows: z.array(SpreadsheetRowSchema).optional().describe('Table row data'),
  has_header: z.boolean().optional().describe('Whether first row is a header'),
  // Code-specific fields
  code_language: z.string().optional().describe('Programming language (e.g., javascript, python)'),
  code_filename: z.string().optional().describe('Optional filename'),
  // Checklist-specific fields
  checklist_items: z.array(ChecklistItemSchema).optional().describe('Checklist items'),
  allow_add: z.boolean().optional().describe('Allow adding new items'),
  show_progress: z.boolean().optional().describe('Show completion progress'),
  // Calendar-specific fields
  calendar_month: z.string().optional().describe('Calendar month in YYYY-MM format'),
  calendar_slots: z.array(CalendarSlotSchema).optional().describe('Scheduled email items on the calendar'),
  calendar_view_mode: z.enum(['month', 'week', 'list']).optional().describe('Calendar view mode'),
  campaign_name: z.string().optional().describe('Campaign or calendar name'),
});

export type ArtifactToolInput = z.infer<typeof ArtifactToolSchema>;

// ============================================================================
// TOOL DEFINITION
// ============================================================================

/**
 * The artifact tool for Vercel AI SDK
 *
 * This tool allows the AI to create persistent, structured artifacts.
 * The actual database insertion happens in the chat route handler.
 */
const artifactToolDescription = `Create a persistent artifact from generated content. Use this when you've created structured content that the user will want to save, reference, or iterate on.

WHEN TO USE:
- After generating email copy with A/B/C versions
- After creating an email flow/automation sequence
- After developing a campaign plan
- After generating subject line variants
- When creating reusable templates
- When developing content briefs
- When planning an email marketing calendar (use kind: "calendar")

IMPORTANT GUIDELINES:
1. Call this AFTER showing the content to the user
2. For emails: Always include at least 2-3 versions with different approaches
3. Each version should have a clear subject_line and approach description
4. Use markdown formatting in content fields
5. Be descriptive in approach/strategy fields
6. NEVER include questions, clarification requests, or conversational text in artifacts
7. Artifacts are FINAL deliverables - they should contain only the completed content the user requested
8. If you need clarification from the user, ask BEFORE creating the artifact, not inside it

WHEN NOT TO USE:
- When you're asking the user a question or need clarification
- When providing brief conversational responses
- When the content is incomplete or just a draft outline
- When you want user feedback before finalizing

EMAIL ARTIFACT EXAMPLE:
{
  "kind": "email",
  "title": "Summer Sale Launch Email",
  "content": "Full email content for search...",
  "email_type": "promotional",
  "selected_variant": "a",
  "versions": [
    {
      "id": "a",
      "label": "Version A - Urgency Focus",
      "subject_line": "🔥 24 Hours Only: Summer Sale Starts NOW",
      "preview_text": "Up to 50% off everything...",
      "approach": "Creates urgency with time-limited offer",
      "content": "## Summer Sale is HERE!\\n\\n..."
    },
    {
      "id": "b",
      "label": "Version B - Value Focus",
      "subject_line": "Your Summer Savings Are Inside",
      "preview_text": "See what's waiting for you...",
      "approach": "Emphasizes value and personal benefit",
      "content": "## We saved the best for you\\n\\n..."
    }
  ]
}

CALENDAR ARTIFACT EXAMPLE:
{
  "kind": "calendar",
  "title": "April 2025 Email Marketing Calendar",
  "content": "4 emails planned for April 2025...",
  "calendar_month": "2025-04",
  "campaign_name": "Spring Campaign",
  "calendar_slots": [
    {
      "id": "slot-1",
      "date": "2025-04-05",
      "title": "Spring Collection Launch",
      "description": "Introduce new spring products with exclusive early access",
      "email_type": "promotional",
      "status": "draft",
      "timing": "Morning"
    },
    {
      "id": "slot-2",
      "date": "2025-04-12",
      "title": "Customer Appreciation",
      "description": "Thank loyal customers with a special offer",
      "email_type": "nurture",
      "status": "draft",
      "timing": "Afternoon"
    }
  ]
}`;

export const createArtifactTool = tool({
  description: artifactToolDescription,
  inputSchema: ArtifactToolSchema,
  execute: async (input: ArtifactToolInput) => {
    // Execution is handled in the chat route
    // This just validates and returns a pending status
    return {
      status: 'pending' as const,
      kind: input.kind,
      title: input.title,
      message: 'Artifact will be created by the server',
    };
  },
});

// ============================================================================
// PARSING UTILITIES
// ============================================================================

// Re-export parseEmailVersions from the canonical source
// This prevents duplicate implementations with different return types
export { parseEmailVersions } from '@/lib/email-version-parser';
export type { EmailVersion as ParsedEmailVersion } from '@/lib/email-version-parser';

/**
 * Parse subject lines from AI response
 */
export function parseSubjectLines(content: string): SubjectLineVariant[] {
  const variants: SubjectLineVariant[] = [];

  // Pattern for numbered subject lines: "1. Subject line here"
  const numberedPattern = /^\d+\.\s*(.+?)(?:\s*[-–]\s*(.+?))?$/gm;
  let match;

  while ((match = numberedPattern.exec(content)) !== null) {
    const text = match[1].trim();
    const approach = match[2]?.trim();

    variants.push({
      text,
      approach,
      emoji_usage: /[\u{1F300}-\u{1F9FF}]/u.test(text),
      character_count: text.length,
    });
  }

  // Fallback: look for quoted subject lines
  if (variants.length === 0) {
    const quotedPattern = /[""](.+?)[""]/g;
    while ((match = quotedPattern.exec(content)) !== null) {
      const text = match[1].trim();
      if (text.length > 10 && text.length < 150) {
        variants.push({
          text,
          emoji_usage: /[\u{1F300}-\u{1F9FF}]/u.test(text),
          character_count: text.length,
        });
      }
    }
  }

  return variants;
}

/**
 * Parse flow steps from AI response
 */
export function parseFlowSteps(content: string): FlowStep[] {
  const steps: FlowStep[] = [];

  // Pattern for flow steps: "Email 1: Welcome Email" or "Step 1: Delay 2 days"
  const stepPattern = /(?:email|step)\s*(\d+):?\s*(.+?)(?:\n|$)/gi;
  let match;
  let index = 0;

  while ((match = stepPattern.exec(content)) !== null) {
    const title = match[2].trim();
    const lowerTitle = title.toLowerCase();

    let type: 'email' | 'delay' | 'condition' | 'action' = 'email';
    if (lowerTitle.includes('delay') || lowerTitle.includes('wait')) {
      type = 'delay';
    } else if (lowerTitle.includes('if') || lowerTitle.includes('condition')) {
      type = 'condition';
    } else if (lowerTitle.includes('action') || lowerTitle.includes('trigger')) {
      type = 'action';
    }

    steps.push({
      id: `step-${index}`,
      type,
      title,
      next_steps: index < 10 ? [`step-${index + 1}`] : undefined,
    });

    index++;
  }

  return steps;
}

/**
 * Parse checklist items from content with [ ] or [x] patterns
 */
export function parseChecklistItems(content: string): Array<{ id: string; text: string; checked: boolean; indent?: number }> {
  const items: Array<{ id: string; text: string; checked: boolean; indent?: number }> = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match lines like "- [ ] Task" or "* [x] Done task" or just "[ ] Task"
    const match = line.match(/^(\s*)[-*]?\s*\[([ xX])\]\s*(.+)$/);
    if (match) {
      const indent = Math.floor(match[1].length / 2); // 2 spaces = 1 indent level
      const checked = match[2].toLowerCase() === 'x';
      const text = match[3].trim();

      items.push({
        id: `item-${i}`,
        text,
        checked,
        indent: indent > 0 ? Math.min(indent, 2) : undefined,
      });
    }
  }

  return items;
}

/**
 * Parse markdown table into spreadsheet format
 */
export function parseMarkdownTable(content: string): {
  columns: Array<{ id: string; name: string; type?: 'text' | 'number' | 'date' | 'boolean' }>;
  rows: Array<{ id: string; cells: Record<string, string | number | boolean | null> }>;
} | null {
  const lines = content.split('\n').filter(line => line.trim().startsWith('|'));
  if (lines.length < 2) return null;

  // Parse header row
  const headerLine = lines[0];
  const headers = headerLine
    .split('|')
    .map(h => h.trim())
    .filter(h => h.length > 0);

  if (headers.length === 0) return null;

  // Create columns
  const columns = headers.map((name, i) => ({
    id: `col-${i}`,
    name,
    type: 'text' as const,
  }));

  // Skip separator row (line with |---|---|)
  const dataLines = lines.slice(2);

  // Parse data rows
  const rows = dataLines.map((line, rowIndex) => {
    const cells: Record<string, string | number | boolean | null> = {};
    // Handle edge case where split includes empty strings at start/end
    const cleanValues = line.split('|').slice(1, -1).map(v => v.trim());

    columns.forEach((col, i) => {
      const value = cleanValues[i] || '';
      // Try to detect number
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && value === String(numValue)) {
        cells[col.id] = numValue;
      } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        cells[col.id] = value.toLowerCase() === 'true';
      } else {
        cells[col.id] = value;
      }
    });

    return {
      id: `row-${rowIndex}`,
      cells,
    };
  });

  return { columns, rows };
}

/**
 * Parse code block from content
 */
export function parseCodeBlock(content: string): {
  language: string;
  code: string;
  filename?: string;
} | null {
  // Match ```language\ncode\n```
  const match = content.match(/```(\w+)(?:\s*:\s*(\S+))?\n([\s\S]*?)```/);
  if (!match) return null;

  return {
    language: match[1],
    filename: match[2],
    code: match[3].trim(),
  };
}

// ============================================================================
// DETECTION UTILITIES
// ============================================================================

/**
 * Detect if content looks like it should be an artifact
 * Used as a fallback when AI doesn't explicitly call the tool
 */
export function detectArtifactContent(content: string): {
  isArtifact: boolean;
  kind: ArtifactKind | null;
  confidence: 'high' | 'medium' | 'low';
  suggestedTitle?: string;
} {
  // Check for email version tags (high confidence)
  if (/<version_[abc]>/i.test(content)) {
    const titleMatch = content.match(/(?:email|subject|campaign)\s*(?:for|about|:)\s*[""]?([^""<>\n]+)/i);
    return {
      isArtifact: true,
      kind: 'email',
      confidence: 'high',
      suggestedTitle: titleMatch?.[1]?.trim() || 'Email Copy',
    };
  }

  // Check for code blocks with language (high confidence for substantial code)
  const codeBlockMatch = content.match(/```(\w+)\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    const language = codeBlockMatch[1];
    const codeContent = codeBlockMatch[2];
    // Only detect as code artifact if it's substantial (10+ lines)
    const lineCount = codeContent.split('\n').length;
    if (lineCount >= 10) {
      return {
        isArtifact: true,
        kind: 'code',
        confidence: 'high',
        suggestedTitle: `${language.charAt(0).toUpperCase() + language.slice(1)} Code`,
      };
    }
  }

  // Check for checklist patterns (high confidence)
  const checkboxPattern = /^[\s]*[-*]?\s*\[([ xX])\]/gm;
  const checkboxMatches = content.match(checkboxPattern);
  if (checkboxMatches && checkboxMatches.length >= 3) {
    return {
      isArtifact: true,
      kind: 'checklist',
      confidence: 'high',
      suggestedTitle: 'Checklist',
    };
  }

  // Check for markdown table (high confidence for spreadsheet)
  const tableHeaderPattern = /^\|(.+\|)+\s*\n\|[\s:|-]+\|\s*\n/m;
  if (tableHeaderPattern.test(content)) {
    const rows = content.match(/^\|.+\|$/gm);
    if (rows && rows.length >= 3) {
      return {
        isArtifact: true,
        kind: 'spreadsheet',
        confidence: 'high',
        suggestedTitle: 'Data Table',
      };
    }
  }

  // Check for subject line list (medium-high confidence)
  const subjectLineCount = (content.match(/^\d+\.\s*.+$/gm) || []).length;
  if (subjectLineCount >= 3) {
    const hasSubjectLineIndicator = /subject\s*lines?/i.test(content);
    if (hasSubjectLineIndicator) {
      return {
        isArtifact: true,
        kind: 'subject_lines',
        confidence: 'high',
        suggestedTitle: 'Subject Line Options',
      };
    }
    return {
      isArtifact: true,
      kind: 'subject_lines',
      confidence: 'medium',
      suggestedTitle: 'Subject Line Options',
    };
  }

  // Check for flow/sequence structure (medium confidence)
  if (/(?:email\s*1|step\s*1|day\s*1)/i.test(content) && /(?:email\s*[2-9]|step\s*[2-9]|day\s*[2-9])/i.test(content)) {
    return {
      isArtifact: true,
      kind: 'flow',
      confidence: 'medium',
      suggestedTitle: 'Email Flow',
    };
  }

  // Check for campaign plan structure (medium confidence)
  if (/(?:campaign|marketing)\s*(?:plan|strategy)/i.test(content) && /(?:objective|goal|audience)/i.test(content)) {
    return {
      isArtifact: true,
      kind: 'campaign',
      confidence: 'medium',
      suggestedTitle: 'Campaign Plan',
    };
  }

  // Check for email with subject/preview (medium confidence)
  if (/subject(?:\s*line)?:/i.test(content) && /preview(?:\s*text)?:/i.test(content)) {
    return {
      isArtifact: true,
      kind: 'email',
      confidence: 'medium',
      suggestedTitle: 'Email Copy',
    };
  }

  // Check for content brief structure (medium confidence)
  if (/(?:brief|outline)/i.test(content) && /(?:objective|key\s*message|audience)/i.test(content)) {
    return {
      isArtifact: true,
      kind: 'content_brief',
      confidence: 'medium',
      suggestedTitle: 'Content Brief',
    };
  }

  // Check for substantial markdown document (medium confidence)
  // Must have multiple headers and be long enough
  const headerCount = (content.match(/^#{1,3}\s+.+$/gm) || []).length;
  if (headerCount >= 3 && content.length > 500) {
    return {
      isArtifact: true,
      kind: 'markdown',
      confidence: 'medium',
      suggestedTitle: 'Document',
    };
  }

  return { isArtifact: false, kind: null, confidence: 'low' };
}

/**
 * Build a complete artifact input from detected content
 */
export function buildArtifactFromContent(
  content: string,
  kind: ArtifactKind,
  title: string
): ArtifactToolInput | null {
  switch (kind) {
    case 'email': {
      const parsed = parseEmailVersionsFromParser(content);
      if (!parsed.hasVersions) return null;

      // Map parsed versions to tool input format
      const versions = parsed.versions.map(v => ({
        id: v.id,
        label: v.label,
        subject_line: '', // Parsed from content separately if needed
        content: v.content,
        approach: v.note,
      }));

      return {
        kind: 'email',
        title,
        content,
        selected_variant: 'a',
        versions,
      };
    }

    case 'subject_lines': {
      const variants = parseSubjectLines(content);
      if (variants.length === 0) return null;

      return {
        kind: 'subject_lines',
        title,
        content: variants.map((v) => v.text).join('\n'),
        subject_line_variants: variants,
      };
    }

    case 'flow': {
      const steps = parseFlowSteps(content);
      if (steps.length === 0) return null;

      return {
        kind: 'flow',
        title,
        content,
        steps,
      };
    }

    case 'campaign':
      return {
        kind: 'campaign',
        title,
        content,
      };

    case 'content_brief':
      return {
        kind: 'content_brief',
        title,
        content,
      };

    case 'template':
      return {
        kind: 'template',
        title,
        content,
      };

    case 'markdown':
      return {
        kind: 'markdown',
        title,
        content,
        markdown_format: 'article',
      };

    case 'code': {
      const parsed = parseCodeBlock(content);
      if (!parsed) return null;

      return {
        kind: 'code',
        title,
        content: parsed.code,
        code_language: parsed.language,
        code_filename: parsed.filename,
      };
    }

    case 'spreadsheet': {
      const parsed = parseMarkdownTable(content);
      if (!parsed) return null;

      return {
        kind: 'spreadsheet',
        title,
        content,
        spreadsheet_columns: parsed.columns,
        spreadsheet_rows: parsed.rows,
        has_header: true,
      };
    }

    case 'checklist': {
      const items = parseChecklistItems(content);
      if (items.length === 0) return null;

      return {
        kind: 'checklist',
        title,
        content,
        checklist_items: items,
        allow_add: true,
        show_progress: true,
      };
    }

    case 'calendar': {
      // Calendar artifacts should be created explicitly with structured data
      // Auto-detection from content is not supported
      return null;
    }

    case 'email_brief': {
      // Email briefs should be created explicitly with structured data
      return null;
    }

    default:
      return null;
  }
}
