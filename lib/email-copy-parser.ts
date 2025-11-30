/**
 * Email Copy Parser
 * Parses structured email copy format into semantic sections for beautiful rendering
 */

export interface EmailSection {
  type: 'hero' | 'text' | 'bullets' | 'product_grid' | 'cta_block' | 'social_proof' | 'testimonial' | 'generic';
  /** Original section type name (for unknown/generic types) */
  originalType?: string;
  headline?: string;
  subhead?: string;
  body?: string;
  bullets?: string[];
  cta?: string;
  products?: Array<{
    name: string;
    price?: string;
    description?: string;
  }>;
  /** Catch-all for any other Label: Value fields not explicitly handled */
  extraFields?: Array<{
    label: string;
    value: string;
  }>;
  rawContent?: string;
}

export interface ParsedEmailCopy {
  approach?: string;
  subjectLine?: string;
  previewText?: string;
  sections: EmailSection[];
  designNotes?: string;
}

/**
 * Parse structured email copy into semantic components
 */
export function parseEmailCopy(content: string): ParsedEmailCopy | null {
  if (!content || typeof content !== 'string') return null;
  
  // Check if this looks like structured email copy
  const hasStructuredMarkers = 
    content.includes('SUBJECT LINE:') ||
    content.includes('Subject Line:') ||
    content.includes('[HERO]') ||
    content.includes('[TEXT]') ||
    content.includes('[BULLETS]') ||
    content.includes('[PRODUCT GRID]');
  
  if (!hasStructuredMarkers) return null;
  
  const result: ParsedEmailCopy = {
    sections: [],
  };
  
  // Strip code block markers if present
  let cleanContent = content
    .replace(/^```\n?/gm, '')
    .replace(/\n?```$/gm, '')
    .trim();
  
  // Split by horizontal rules first to separate major parts
  const parts = cleanContent.split(/\n---\n/).map(p => p.trim());
  
  for (const part of parts) {
    // Extract approach/strategy note (usually starts with **Approach: or similar)
    if (part.match(/^\*\*Approach:|^Approach:|^\*\*Strategy:|^Strategy:/i)) {
      result.approach = part
        .replace(/^\*\*/g, '')
        .replace(/\*\*$/g, '')
        .replace(/^Approach:\s*/i, '')
        .replace(/^Strategy:\s*/i, '')
        .trim();
      continue;
    }
    
    // Extract subject line and preview text
    const subjectMatch = part.match(/(?:SUBJECT LINE|Subject Line):\s*(.+?)(?:\n|$)/i);
    if (subjectMatch) {
      result.subjectLine = subjectMatch[1].trim();
    }
    
    const previewMatch = part.match(/(?:PREVIEW TEXT|Preview Text):\s*(.+?)(?:\n|$)/i);
    if (previewMatch) {
      result.previewText = previewMatch[1].trim();
    }
    
    // If this part has subject/preview, skip further section parsing for it
    if (subjectMatch || previewMatch) continue;
    
    // Extract design notes
    if (part.match(/^Design notes:|^Design Notes:|^\*\*Design notes:/i)) {
      result.designNotes = part
        .replace(/^\*\*Design notes:\*\*/i, '')
        .replace(/^Design notes:/i, '')
        .replace(/^Design Notes:/i, '')
        .trim();
      continue;
    }
    
    // Parse sections - match ANY bracketed section marker like [HERO], [TEXT], [ANYTHING NEW]
    // This ensures we gracefully handle any new section types the AI might create
    const sectionMatches = part.matchAll(/\[([A-Z][A-Z0-9 _-]*)\]/gi);
    const sectionPositions: Array<{type: string; start: number}> = [];
    
    for (const match of sectionMatches) {
      sectionPositions.push({
        type: match[1].toUpperCase(),
        start: match.index!,
      });
    }
    
    // If no sections found in this part but it has content, check for standalone content
    if (sectionPositions.length === 0 && part.trim()) {
      // This could be a continuation or standalone content - skip for now
      continue;
    }
    
    // Extract each section's content
    for (let i = 0; i < sectionPositions.length; i++) {
      const current = sectionPositions[i];
      const next = sectionPositions[i + 1];
      const endPos = next ? next.start : part.length;
      
      const sectionContent = part.slice(current.start, endPos).trim();
      const section = parseSectionContent(current.type, sectionContent);
      
      if (section) {
        result.sections.push(section);
      }
    }
  }
  
  // Only return result if we found meaningful content
  if (!result.subjectLine && result.sections.length === 0) {
    return null;
  }
  
  return result;
}

/**
 * Parse individual section content
 * Handles both known and unknown section types gracefully
 * Uses a catch-all for any "Label: Value" patterns not explicitly handled
 */
function parseSectionContent(type: string, content: string): EmailSection | null {
  // Remove ANY section marker (handles unknown types too)
  const cleanContent = content
    .replace(/^\[[A-Z][A-Z0-9 _-]*\]/i, '')
    .trim();
  
  const mappedType = mapSectionType(type);
  const section: EmailSection = {
    type: mappedType,
    // Store original type name for generic/unknown sections
    originalType: mappedType === 'generic' ? type : undefined,
    rawContent: cleanContent,
  };
  
  // Track which fields we've already extracted to avoid duplicates in extraFields
  const extractedLabels = new Set<string>();
  
  // Extract headline (and variations)
  const headlineMatch = cleanContent.match(/(?:Headline|Title):\s*(.+?)(?:\n|$)/i);
  if (headlineMatch) {
    section.headline = headlineMatch[1].trim();
    extractedLabels.add('headline');
    extractedLabels.add('title');
  }
  
  // Extract subhead/subheadline (and variations)
  const subheadMatch = cleanContent.match(/(?:Subhead|Sub-head|Subheadline|Sub-headline|Subtitle|One-liner|Tagline):\s*(.+?)(?:\n|$)/i);
  if (subheadMatch) {
    section.subhead = subheadMatch[1].trim();
    extractedLabels.add('subhead');
    extractedLabels.add('sub-head');
    extractedLabels.add('subheadline');
    extractedLabels.add('sub-headline');
    extractedLabels.add('subtitle');
    extractedLabels.add('one-liner');
    extractedLabels.add('tagline');
  }
  
  // Extract body (and variations)
  const bodyMatch = cleanContent.match(/(?:Body|Content|Copy|Description|Text):\s*(.+?)(?=(?:Headline:|Subhead:|Bullets:|CTA:|Products:|Price:|\n\n\[|$))/is);
  if (bodyMatch) {
    section.body = bodyMatch[1].trim();
    extractedLabels.add('body');
    extractedLabels.add('content');
    extractedLabels.add('copy');
    extractedLabels.add('description');
    extractedLabels.add('text');
  }
  
  // Extract CTA (and variations)
  const ctaMatch = cleanContent.match(/(?:CTA|Call to Action|Button|Action):\s*(.+?)(?:\n|$)/i);
  if (ctaMatch) {
    section.cta = ctaMatch[1].trim();
    extractedLabels.add('cta');
    extractedLabels.add('call to action');
    extractedLabels.add('button');
    extractedLabels.add('action');
  }
  
  // Extract bullets
  const bulletsSection = cleanContent.match(/Bullets:\s*([\s\S]+?)(?=(?:CTA:|Headline:|Products:|Price:|\n\n\[|$))/i);
  if (bulletsSection) {
    const bullets = bulletsSection[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(b => b.length > 0);
    
    if (bullets.length > 0) {
      section.bullets = bullets;
      extractedLabels.add('bullets');
    }
  }
  
  // Extract products for product grid sections
  if (type.includes('PRODUCT') || type === 'PRODUCTS') {
    const productsSection = cleanContent.match(/Products:\s*([\s\S]+?)(?=(?:CTA:|Headline:|\n\n\[|$))/i);
    if (productsSection) {
      const products = productsSection[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => {
          const productLine = line.replace(/^-\s*/, '').trim();
          // Parse format: "Product Name | $Price | Description"
          const parts = productLine.split('|').map(p => p.trim());
          return {
            name: parts[0] || productLine,
            price: parts[1]?.startsWith('$') ? parts[1] : undefined,
            description: parts.length > 2 ? parts.slice(2).join(' | ') : (parts[1] && !parts[1].startsWith('$') ? parts[1] : undefined),
          };
        })
        .filter(p => p.name.length > 0);
      
      if (products.length > 0) {
        section.products = products;
        extractedLabels.add('products');
      }
    }
  }
  
  // CATCH-ALL: Extract any remaining "Label: Value" patterns
  // This ensures we don't lose any data even if AI uses unexpected field names
  const fieldPattern = /^([A-Za-z][A-Za-z0-9 _-]*):\s*(.+?)$/gm;
  const extraFields: Array<{label: string; value: string}> = [];
  let match;
  
  while ((match = fieldPattern.exec(cleanContent)) !== null) {
    const label = match[1].trim();
    const value = match[2].trim();
    const labelLower = label.toLowerCase();
    
    // Skip if we've already extracted this field
    if (extractedLabels.has(labelLower)) continue;
    
    // Skip empty values
    if (!value) continue;
    
    // Add to extraFields
    extraFields.push({ label, value });
    extractedLabels.add(labelLower);
  }
  
  if (extraFields.length > 0) {
    section.extraFields = extraFields;
  }
  
  return section;
}

/**
 * Map section type string to enum
 * Returns 'generic' for any unknown types - these will still render nicely
 */
function mapSectionType(type: string): EmailSection['type'] {
  const normalizedType = type.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
  
  switch (normalizedType) {
    case 'HERO':
      return 'hero';
    case 'TEXT':
    case 'BODY':
    case 'COPY':
      return 'text';
    case 'BULLETS':
    case 'FEATURES':
    case 'BENEFITS':
    case 'LIST':
      return 'bullets';
    case 'PRODUCT_GRID':
    case 'PRODUCTS':
    case 'PRODUCT':
      return 'product_grid';
    case 'CTA_BLOCK':
    case 'CTA':
    case 'CALL_TO_ACTION':
      return 'cta_block';
    case 'SOCIAL_PROOF':
    case 'REVIEWS':
      return 'social_proof';
    case 'TESTIMONIAL':
    case 'QUOTE':
      return 'testimonial';
    default:
      // Return 'generic' for any unknown type - will still render the content nicely
      return 'generic';
  }
}

/**
 * Format a raw section type into a human-readable label
 * Used for unknown/generic section types
 */
export function formatSectionLabel(type: string): string {
  // Convert SNAKE_CASE or kebab-case to Title Case
  return type
    .replace(/[_-]/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check if content appears to be structured email copy
 */
export function isStructuredEmailCopy(content: string): boolean {
  if (!content) return false;
  
  return (
    content.includes('SUBJECT LINE:') ||
    content.includes('Subject Line:') ||
    content.includes('[HERO]') ||
    content.includes('[TEXT]') ||
    content.includes('[BULLETS]') ||
    content.includes('[PRODUCT GRID]')
  );
}

