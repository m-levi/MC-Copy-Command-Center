import { AIStatus, ProductLink } from '@/types';

export type ParsedResponseType = 'email_copy' | 'clarification' | 'other';

export interface ParsedAIResponse {
  emailCopy?: string;
  clarification?: string;
  other?: string;
  thinking: string;
  productLinks: ProductLink[];
  statuses: AIStatus[];
  responseType: ParsedResponseType;
}

const CLARIFICATION_FIELDS = [
  {
    label: 'Campaign type or goal',
    patterns: [/campaign type/i, /goal/i, /purpose/i, /email (?:about|type)/i],
  },
  {
    label: 'Product or category to feature',
    patterns: [/product/i, /collection/i, /category/i, /feature/i],
  },
  {
    label: 'Offer or promotion',
    patterns: [/offer/i, /promotion/i, /discount/i, /free shipping/i, /deal/i],
  },
  {
    label: 'Audience segment',
    patterns: [/audience/i, /segment/i, /customers/i, /subscribers/i, /buyers/i],
  },
  {
    label: 'Timing or urgency',
    patterns: [/timing/i, /urgency/i, /deadline/i, /season/i, /campaign (?:end|expires)/i],
  },
];

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, '')
    .replace(/\u2028|\u2029/g, '\n')
    .replace(/\t/g, '  ');
}

function stripControlMarkers(value: string): string {
  // Step 1: Remove thinking chunks more carefully
  // Only match from [THINKING:CHUNK] to the next [ marker (not to end of string!)
  let result = value.replace(/\[THINKING:CHUNK\][^\[]*(?=\[)/g, '');
  
  // Step 2: Handle any remaining THINKING:CHUNK at the end (edge case)
  result = result.replace(/\[THINKING:CHUNK\][^\[]*$/g, '');
  
  // Step 3: Remove other control markers
  result = result
    .replace(/\[THINKING:(?:START|END)\]/g, '')
    .replace(/\[STATUS:\w+\]/g, '')
    .replace(/\[TOOL:\w+:(?:START|END)\]/g, '')
    .replace(/\[PRODUCTS:[\s\S]*?\]\]/g, '') // Changed: Match double closing brackets
    .replace(/\[REMEMBER:[^\]]+\]/g, '');
  
  return result;
}

function extractProductLinks(raw: string): ProductLink[] {
  const markerIndex = raw.indexOf('[PRODUCTS:');
  if (markerIndex === -1) return [];

  const afterMarker = raw.substring(markerIndex + '[PRODUCTS:'.length);
  let bracketDepth = 0;
  let jsonEndIndex = -1;

  for (let i = 0; i < afterMarker.length; i++) {
    const char = afterMarker[i];
    if (char === '[') bracketDepth++;
    if (char === ']') {
      if (bracketDepth === 0) {
        jsonEndIndex = i;
        break;
      }
      bracketDepth--;
    }
  }

  if (jsonEndIndex === -1) return [];

  const jsonString = afterMarker.substring(0, jsonEndIndex).trim();
  if (!jsonString.startsWith('[') || !jsonString.endsWith(']')) return [];

  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          name: String(item.name || ''),
          url: String(item.url || ''),
          description: item.description ? String(item.description) : undefined,
        }))
        .filter((item) => item.name && item.url);
    }
  } catch (error) {
    console.warn('[StreamParser] Failed to parse product links JSON:', error);
  }

  return [];
}

function collectStatuses(raw: string): AIStatus[] {
  const matches = raw.match(/\[STATUS:(\w+)\]/g);
  if (!matches) return [];
  return matches
    .map((match) => match.replace('[STATUS:', '').replace(']', '') as AIStatus)
    .filter(Boolean);
}

function extractThinking(raw: string): string {
  const segments: string[] = [];
  const cleaned = normalizeWhitespace(raw);
  const regex =
    /\[THINKING:CHUNK\]([\s\S]*?)(?=(?:\[THINKING:(?:CHUNK|END)\]|\[STATUS:[^\]]+\]|<clarification_request>|<email_copy>|<non_copy_response>|\[PRODUCTS:|\[TOOL:|$))/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(cleaned)) !== null) {
    const content = match[1]?.trim();
    if (content) {
      segments.push(content);
    }
  }

  return segments.join('\n\n').trim();
}

const EMAIL_STRUCTURE_REGEX = /(HERO SECTION|Section Title:|Call to Action|Call-to-Action|FINAL CTA|Headline:|Sub-headline:|Call to Action Button:)/i;

function hasEmailStructure(content: string): boolean {
  return EMAIL_STRUCTURE_REGEX.test(content);
}

// Detect if content is a flow outline (not email copy)
const FLOW_OUTLINE_PATTERNS = [
  /##\s+.+?\s+OUTLINE/i,
  /\*\*Flow Goal:\*\*/i,
  /\*\*Target Audience:\*\*/i,
  /\*\*Total Emails:\*\*/i,
  /###\s+Email\s+\d+:/i,
  /\*\*Email Type:\*\*/i,
  /\*\*Timing:\*\*/i,
  /\*\*Purpose:\*\*/i,
  /\*\*Key Points:\*\*/i,
];

function isFlowOutlineContent(content: string): boolean {
  // Need at least 3 flow outline patterns to confidently identify
  const matchCount = FLOW_OUTLINE_PATTERNS.filter(pattern => pattern.test(content)).length;
  return matchCount >= 3;
}

const CLARIFICATION_SIGNAL_PATTERNS = [
  /need more information/i,
  /missing required/i,
  /please provide/i,
  /can you clarify/i,
  /what is this email/i,
  /campaign type/i,
  /primary goal/i,
  /offer or promotion/i,
  /timing or urgency/i,
  /target segment/i,
];

function containsClarificationSignals(text: string): boolean {
  return CLARIFICATION_SIGNAL_PATTERNS.some((regex) => regex.test(text));
}

function sanitizeClarification(content: string | undefined): string | undefined {
  if (!content) return undefined;

  const normalized = stripControlMarkers(normalizeWhitespace(content));
  const detectedFields: string[] = [];

  for (const field of CLARIFICATION_FIELDS) {
    const found = field.patterns.some((regex) => regex.test(normalized));
    if (found) {
      detectedFields.push(field.label);
    }
  }

  const fieldsToUse = detectedFields.length > 0 ? detectedFields : CLARIFICATION_FIELDS.map((f) => f.label);

  const opener = 'Need a quick clarification before I write the email:';
  const bullets = fieldsToUse.map((field) => `• ${field}`).join('\n');

  return `${opener}\n\n${bullets}`;
}

function sanitizeEmailCopy(content: string | undefined): string | undefined {
  if (!content) return undefined;
  return stripControlMarkers(normalizeWhitespace(content)).trim();
}

function sanitizeOther(content: string | undefined): string | undefined {
  if (!content) return undefined;
  return stripControlMarkers(normalizeWhitespace(content)).trim();
}

export function parseAIResponse(raw: string): ParsedAIResponse {
  console.log('═'.repeat(70));
  console.log('🔍 [PARSER] parseAIResponse called');
  console.log('═'.repeat(70));
  console.log('[PARSER] Raw input length:', raw.length);
  console.log('[PARSER] Raw input preview (first 500 chars):', raw.substring(0, 500));
  console.log('═'.repeat(70));
  
  // Handle empty or invalid input
  if (!raw || raw.trim().length === 0) {
    console.warn('[PARSER] Empty or invalid raw input received');
    return {
      emailCopy: undefined,
      clarification: undefined,
      other: undefined,
      thinking: '',
      productLinks: [],
      statuses: [],
      responseType: 'other',
    };
  }
  
  const normalized = normalizeWhitespace(raw);
  const cleaned = stripControlMarkers(normalized);

  console.log('[PARSER] After normalization and cleaning:', cleaned.substring(0, 300));
  
  const emailMatch = normalized.match(/<email_copy>([\s\S]*?)<\/email_copy>/i);
  const clarificationMatch = normalized.match(/<clarification_request>([\s\S]*?)<\/clarification_request>/i);
  const otherMatch = normalized.match(/<non_copy_response>([\s\S]*?)<\/non_copy_response>/i);

  console.log('[PARSER] Tag matches:', {
    hasEmailCopyTag: !!emailMatch,
    hasClarificationTag: !!clarificationMatch,
    hasOtherTag: !!otherMatch
  });

  let emailCopy = sanitizeEmailCopy(emailMatch?.[1]);
  let clarification = sanitizeClarification(clarificationMatch?.[1]);
  let other = sanitizeOther(otherMatch?.[1]);
  const productLinks = extractProductLinks(normalized);
  const statuses = collectStatuses(normalized);
  const thinking = extractThinking(normalized);

  // Heuristic: if no tagged content, use pattern detection to determine type
  if (!emailCopy && !clarification && !other) {
    const trimmedCleaned = cleaned.trim();
    
    // Check if this is a flow outline (should be treated as 'other', not email)
    if (isFlowOutlineContent(trimmedCleaned)) {
      console.log('[PARSER] Detected flow outline content');
      other = trimmedCleaned;
    }
    // Check if structure looks like email copy
    else if (hasEmailStructure(trimmedCleaned)) {
      console.log('[PARSER] Detected email structure');
      emailCopy = trimmedCleaned;
    }
    // Check for clarification signals
    else if (containsClarificationSignals(trimmedCleaned)) {
      console.log('[PARSER] Detected clarification signals');
      clarification = sanitizeClarification(trimmedCleaned);
    }
    // Default: treat as general response (other)
    else if (trimmedCleaned.length > 0) {
      console.log('[PARSER] Defaulting to other content type');
      other = trimmedCleaned;
    } else {
      console.warn('[PARSER] No content detected after cleaning and pattern matching');
    }
  }

  let responseType: ParsedResponseType = 'other';
  if (emailCopy && emailCopy.length > 0) {
    responseType = 'email_copy';
  } else if (clarification && clarification.length > 0) {
    responseType = 'clarification';
  } else if (other && other.length > 0) {
    responseType = 'other';
  }

  console.log('═'.repeat(70));
  console.log('📤 [PARSER] Returning parsed response:');
  console.log('═'.repeat(70));
  console.log('[PARSER] Response type:', responseType);
  console.log('[PARSER] Email copy length:', emailCopy?.length || 0);
  console.log('[PARSER] Email copy preview:', emailCopy?.substring(0, 300) || 'None');
  console.log('[PARSER] Clarification length:', clarification?.length || 0);
  console.log('[PARSER] Other length:', other?.length || 0);
  console.log('[PARSER] Thinking length:', thinking?.length || 0);
  console.log('[PARSER] Product links:', productLinks.length);
  console.log('═'.repeat(70));

  return {
    emailCopy,
    clarification,
    other,
    thinking,
    productLinks,
    statuses,
    responseType,
  };
}

