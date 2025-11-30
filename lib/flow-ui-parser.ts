/**
 * Flow UI Parser
 * 
 * Parses AI response content for flow-specific markers and extracts structured data
 * for rendering interactive UI components.
 */

export interface FlowSuggestion {
  text: string;
}

export interface FlowTask {
  seq: number;
  title: string;
  timing: string;
  emailType: 'design' | 'letter';
  content: string;
  keyPoints: string[];
  cta: string;
}

export interface FlowPlan {
  title: string;
  goal: string;
  audience: string;
  flowType: string;
  tasks: FlowTask[];
}

export interface FlowConfirm {
  action: string;
  content: string;
}

export interface ParsedFlowContent {
  // Regular text segments (content between/outside markers)
  segments: Array<{
    type: 'text' | 'suggestions' | 'plan' | 'confirm';
    content: string;
    data?: FlowSuggestion[] | FlowPlan | FlowConfirm;
  }>;
  // Quick access to parsed elements
  suggestions: FlowSuggestion[];
  plan: FlowPlan | null;
  confirm: FlowConfirm | null;
  hasFlowElements: boolean;
}

/**
 * Parse suggestion markers from text
 * Format: [Option 1] [Option 2] [Option 3]
 */
function parseSuggestions(text: string): { text: string; suggestions: FlowSuggestion[] } {
  const suggestionPattern = /\[([^\]]+)\]/g;
  const suggestions: FlowSuggestion[] = [];
  let match;
  
  // Find all suggestions in the text
  while ((match = suggestionPattern.exec(text)) !== null) {
    suggestions.push({ text: match[1] });
  }
  
  // Remove suggestion markers from text
  const cleanText = text.replace(suggestionPattern, '').trim();
  
  return { text: cleanText, suggestions };
}

/**
 * Parse task attributes and content
 * Format: :::task{seq=1 title="..." timing="..." emailType="..."}
 */
function parseTask(taskBlock: string): FlowTask | null {
  // Extract attributes from the opening tag
  const attrMatch = taskBlock.match(/:::task\{([^}]+)\}/);
  if (!attrMatch) return null;
  
  const attrStr = attrMatch[1];
  const attrs: Record<string, string> = {};
  
  // Parse attributes (handles both quoted and unquoted values)
  const attrPattern = /(\w+)=(?:"([^"]*)"|(\S+))/g;
  let attrMatchResult;
  while ((attrMatchResult = attrPattern.exec(attrStr)) !== null) {
    attrs[attrMatchResult[1]] = attrMatchResult[2] || attrMatchResult[3];
  }
  
  // Extract content after the opening tag
  const contentStart = taskBlock.indexOf('}') + 1;
  const content = taskBlock.substring(contentStart).trim();
  
  // Parse key points from content
  const keyPoints: string[] = [];
  const keyPointsMatch = content.match(/Key points:\n((?:- .+\n?)+)/i);
  if (keyPointsMatch) {
    const points = keyPointsMatch[1].split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim());
    keyPoints.push(...points);
  }
  
  // Parse CTA
  const ctaMatch = content.match(/CTA:\s*(.+)/i);
  const cta = ctaMatch ? ctaMatch[1].trim() : '';
  
  // Get purpose (first paragraph before Key points)
  const purposeMatch = content.match(/^(.+?)(?=\nKey points:|$)/s);
  const purpose = purposeMatch ? purposeMatch[1].trim() : content;
  
  return {
    seq: parseInt(attrs.seq) || 0,
    title: attrs.title || '',
    timing: attrs.timing || '',
    emailType: (attrs.emailType as 'design' | 'letter') || 'design',
    content: purpose,
    keyPoints,
    cta,
  };
}

/**
 * Parse plan block
 * Format: :::plan{attributes}...tasks...:::plan-end:::
 */
function parsePlan(content: string): FlowPlan | null {
  const planMatch = content.match(/:::plan\{([^}]+)\}([\s\S]*?):::plan-end:::/);
  if (!planMatch) return null;
  
  const attrStr = planMatch[1];
  const planContent = planMatch[2];
  
  // Parse plan attributes
  const attrs: Record<string, string> = {};
  const attrPattern = /(\w+)=(?:"([^"]*)"|(\S+))/g;
  let attrMatchResult;
  while ((attrMatchResult = attrPattern.exec(attrStr)) !== null) {
    attrs[attrMatchResult[1]] = attrMatchResult[2] || attrMatchResult[3];
  }
  
  // Parse tasks within the plan
  const taskPattern = /:::task\{[^}]+\}[\s\S]*?(?=:::task|:::plan-end|$)/g;
  const taskBlocks = planContent.match(taskPattern) || [];
  const tasks = taskBlocks.map(parseTask).filter((t): t is FlowTask => t !== null);
  
  return {
    title: attrs.title || '',
    goal: attrs.goal || '',
    audience: attrs.audience || '',
    flowType: attrs.flowType || '',
    tasks,
  };
}

/**
 * Parse confirm block
 * Format: :::confirm{action="..."}...content...:::confirm-end:::
 */
function parseConfirm(content: string): FlowConfirm | null {
  const confirmMatch = content.match(/:::confirm\{([^}]+)\}([\s\S]*?):::confirm-end:::/);
  if (!confirmMatch) return null;
  
  const attrStr = confirmMatch[1];
  const confirmContent = confirmMatch[2].trim();
  
  // Parse action attribute
  const actionMatch = attrStr.match(/action="([^"]+)"/);
  
  return {
    action: actionMatch ? actionMatch[1] : '',
    content: confirmContent,
  };
}

/**
 * Main parser function - parses content and extracts all flow UI elements
 * NOTE: Inline suggestions [Option] are NO LONGER extracted as buttons.
 * They remain as plain text and are rendered naturally in markdown.
 * Only structured blocks (plan, confirm, task) are parsed as UI elements.
 */
export function parseFlowContent(content: string): ParsedFlowContent {
  const segments: ParsedFlowContent['segments'] = [];
  const suggestions: FlowSuggestion[] = []; // No longer populated - kept for interface compatibility
  let plan: FlowPlan | null = null;
  let confirm: FlowConfirm | null = null;
  
  // First, extract plan and confirm blocks
  plan = parsePlan(content);
  confirm = parseConfirm(content);
  
  // Remove plan and confirm blocks from content for segment processing
  let processedContent = content
    .replace(/:::plan\{[^}]+\}[\s\S]*?:::plan-end:::/g, '{{PLAN_PLACEHOLDER}}')
    .replace(/:::confirm\{[^}]+\}[\s\S]*?:::confirm-end:::/g, '{{CONFIRM_PLACEHOLDER}}');
  
  // Split by placeholders and process each segment
  const parts = processedContent.split(/({{PLAN_PLACEHOLDER}}|{{CONFIRM_PLACEHOLDER}})/);
  
  for (const part of parts) {
    if (part === '{{PLAN_PLACEHOLDER}}' && plan) {
      segments.push({
        type: 'plan',
        content: '',
        data: plan,
      });
    } else if (part === '{{CONFIRM_PLACEHOLDER}}' && confirm) {
      segments.push({
        type: 'confirm',
        content: '',
        data: confirm,
      });
    } else if (part.trim()) {
      // Just add the text as-is, without parsing suggestions into buttons
      // Square brackets [Option] will render as plain text in markdown
      segments.push({
        type: 'text',
        content: part.trim(),
      });
    }
  }
  
  // hasFlowElements only true if we have actual structured blocks (plan/confirm)
  // NOT for inline suggestions anymore
  const hasFlowElements = plan !== null || confirm !== null;
  
  return {
    segments,
    suggestions,
    plan,
    confirm,
    hasFlowElements,
  };
}

/**
 * Check if content contains flow UI markers
 * Only detects actual structured flow blocks (plan, confirm, task)
 * Does NOT detect inline suggestion brackets [Option] - those should render as plain text
 */
export function hasFlowMarkers(content: string): boolean {
  return (
    content.includes(':::plan{') ||
    content.includes(':::confirm{') ||
    content.includes(':::task{')
  );
}

/**
 * Strip all flow markers from content (for plain text display)
 */
export function stripFlowMarkers(content: string): string {
  return content
    .replace(/:::plan\{[^}]+\}/g, '')
    .replace(/:::plan-end:::/g, '')
    .replace(/:::task\{[^}]+\}/g, '')
    .replace(/:::confirm\{[^}]+\}/g, '')
    .replace(/:::confirm-end:::/g, '')
    .replace(/\[([^\]]+)\]/g, '$1') // Keep suggestion text but remove brackets
    .trim();
}

