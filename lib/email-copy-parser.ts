/**
 * Email Copy Parser - FULLY DYNAMIC & BULLETPROOF
 * 
 * This parser captures ALL content from AI output without assumptions.
 * It handles ANY section type, ANY field label, and gracefully falls back
 * when the format doesn't match expectations.
 * 
 * GUARANTEES:
 * 1. All text content is captured (never dropped)
 * 2. Unknown section types display properly
 * 3. Unknown field labels display with their labels
 * 4. Lines without labels are captured as "unlabeled content"
 * 5. Raw content is always preserved for fallback/plain view
 * 
 * SUPPORTED BLOCK TYPES:
 * - HERO: Accent, Headline, Subhead, CTA
 * - TEXT: Accent, Headline, Body, CTA
 * - BULLETS: Accent, Headline, Bullets, CTA
 * - PRODUCT CARD: Product Name, Price, One-liner, CTA
 * - PRODUCT GRID: Accent, Headline, Products, CTA
 * - CTA BLOCK: Accent, Headline, Subhead, CTA
 * - SOCIAL PROOF: Quote, Attribution
 * - DISCOUNT BAR: Code, Message, Expiry
 */

export interface EmailField {
  label: string;
  value: string;
  /** Lowercase label for matching */
  labelLower: string;
}

export interface ProductItem {
  name: string;
  price: string;
  description: string;
}

export interface EmailSection {
  /** The section name as it appears in brackets, e.g., "HERO", "TEXT", "PRODUCT CARD" */
  name: string;
  /** Normalized section type for styling */
  type: 'hero' | 'text' | 'bullets' | 'product_card' | 'product_grid' | 'cta_block' | 'social_proof' | 'discount_bar' | 'unknown';
  /** All labeled fields found in this section */
  fields: EmailField[];
  /** Any bullet list items found (lines starting with - or •) */
  bullets: string[];
  /** Products for PRODUCT GRID sections */
  products: ProductItem[];
  /** Any lines that weren't labeled fields or bullets */
  unlabeledContent: string[];
  /** Raw content of the section for fallback display */
  rawContent: string;
}

export interface ParsedEmailCopy {
  /** Content before the first section (approach/strategy notes) */
  preamble: string;
  /** All sections found */
  sections: EmailSection[];
  /** Content after all sections (design notes, etc.) */
  postamble: string;
  /** Original full content for plain text view */
  originalContent: string;
}

/**
 * Normalize section name to type
 */
function getSectionType(name: string): EmailSection['type'] {
  const normalized = name.toUpperCase().replace(/[^A-Z]/g, '');
  
  if (normalized === 'HERO') return 'hero';
  if (normalized === 'TEXT') return 'text';
  if (normalized === 'BULLETS') return 'bullets';
  if (normalized === 'PRODUCTCARD') return 'product_card';
  if (normalized === 'PRODUCTGRID') return 'product_grid';
  if (normalized === 'CTABLOCK') return 'cta_block';
  if (normalized === 'SOCIALPROOF') return 'social_proof';
  if (normalized === 'DISCOUNTBAR') return 'discount_bar';
  
  return 'unknown';
}

/**
 * Check if content appears to be structured email copy
 * Looks for BOLD section markers like **HERO**, **TEXT**, **PRODUCT CARD**
 * NOTE: Accepts ANY uppercase block marker to match parseEmailCopy's capabilities.
 * The parser handles unknown block types gracefully by returning 'unknown' as the section type.
 */
export function isStructuredEmailCopy(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  // Match section markers that are:
  // - Wrapped in ** (bold markdown)
  // - Start with uppercase letter and contain only uppercase letters, numbers, spaces, underscores, or hyphens
  // This matches parseEmailCopy's pattern exactly, allowing any valid block type (not just known ones)
  return /\*\*[A-Z][A-Z0-9 _-]*\*\*/.test(content);
}

/**
 * Parse product items from a section's content
 * Handles formats like:
 * - **Product Name** | $price | Description
 * - Product Name: $price - Description
 */
function parseProductItems(lines: string[]): ProductItem[] {
  const products: ProductItem[] = [];
  
  for (const line of lines) {
    // Try format: **Name** | $price | description
    const pipeMatch = line.match(/^\*?\*?([^|*]+)\*?\*?\s*\|\s*(\$[\d.,]+(?:\s*~~\$[\d.,]+~~)?)\s*\|\s*(.+)$/);
    if (pipeMatch) {
      products.push({
        name: pipeMatch[1].trim(),
        price: pipeMatch[2].trim(),
        description: pipeMatch[3].trim(),
      });
      continue;
    }
    
    // Try format: Name | price | description (without ** markers)
    const simplePipeMatch = line.match(/^([^|]+)\s*\|\s*(\$[\d.,]+(?:\s*~~\$[\d.,]+~~)?)\s*\|\s*(.+)$/);
    if (simplePipeMatch) {
      products.push({
        name: simplePipeMatch[1].trim().replace(/^\*\*|\*\*$/g, ''),
        price: simplePipeMatch[2].trim(),
        description: simplePipeMatch[3].trim(),
      });
    }
  }
  
  return products;
}

/**
 * Parse structured email copy - FULLY DYNAMIC & BULLETPROOF
 * Captures ALL content without dropping anything
 */
export function parseEmailCopy(content: string): ParsedEmailCopy | null {
  if (!content || typeof content !== 'string') return null;
  
  // Check if this looks like structured email copy
  if (!isStructuredEmailCopy(content)) return null;
  
  // Strip code block markers if present
  const cleanContent = content
    .replace(/^```[\w]*\n?/gm, '')  // Handle ```markdown, ```text, etc.
    .replace(/\n?```$/gm, '')
    .trim();
  
  const result: ParsedEmailCopy = {
    preamble: '',
    sections: [],
    postamble: '',
    originalContent: cleanContent,
  };
  
  // Find all section markers and their positions
  // Pattern matches **BLOCK** format (bold markdown)
  // e.g., **HERO**, **TEXT**, **PRODUCT CARD**, **CTA BLOCK**
  const sectionPattern = /\*\*([A-Z][A-Z0-9 _-]*)\*\*/g;
  const sectionMatches: Array<{name: string; start: number; end: number}> = [];
  
  let match;
  while ((match = sectionPattern.exec(cleanContent)) !== null) {
    sectionMatches.push({
      name: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  
  // If no sections found, return null to fall back to default rendering
  if (sectionMatches.length === 0) return null;
  
  // Extract preamble (content before first section)
  // Strip the **Approach:** line since it's displayed separately in the UI
  const firstSectionStart = sectionMatches[0].start;
  if (firstSectionStart > 0) {
    let preamble = cleanContent.slice(0, firstSectionStart).trim();
    // Remove the **Approach:** line - it's shown in the EmailVersionRenderer header
    preamble = preamble.replace(/^\*\*Approach:\*\*\s*.+\n*/im, '').trim();
    result.preamble = preamble;
  }
  
  // Extract each section's content
  for (let i = 0; i < sectionMatches.length; i++) {
    const current = sectionMatches[i];
    const next = sectionMatches[i + 1];
    
    // Get content from after the marker to the next section (or end)
    const contentStart = current.end;
    const contentEnd = next ? next.start : cleanContent.length;
    let sectionContent = cleanContent.slice(contentStart, contentEnd).trim();
    
    // Check for postamble marker (--- followed by design notes)
    // Only do this for the last section
    if (!next) {
      const postambleMatch = sectionContent.match(/\n---\n([\s\S]+)$/);
      if (postambleMatch) {
        result.postamble = postambleMatch[1].trim();
        sectionContent = sectionContent.replace(/\n---\n[\s\S]+$/, '').trim();
      }
    }
    
    // Remove section separator (---) between sections
    sectionContent = sectionContent.replace(/\n?---\s*$/, '').trim();
    
    // Parse the section content
    const section = parseSectionContent(current.name, sectionContent);
    result.sections.push(section);
  }
  
  return result;
}

/**
 * Parse section content into fields, bullets, and unlabeled content
 * BULLETPROOF: Captures everything, never drops content
 */
function parseSectionContent(name: string, content: string): EmailSection {
  const sectionType = getSectionType(name);
  
  const section: EmailSection = {
    name,
    type: sectionType,
    fields: [],
    bullets: [],
    products: [],
    unlabeledContent: [],
    rawContent: content,
  };
  
  if (!content) return section;
  
  // Split content into lines for processing
  const lines = content.split('\n');
  let currentField: EmailField | null = null;
  let isInProductsSection = false;
  const productLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) {
      isInProductsSection = false; // Reset products section on empty line
      continue;
    }
    
    // Skip horizontal rules (but don't drop them silently)
    if (trimmedLine === '---') continue;
    
    // Check if we're starting a Products section
    if (trimmedLine.toLowerCase().startsWith('products:')) {
      isInProductsSection = true;
      continue;
    }
    
    // If we're in products section, collect lines for product parsing
    if (isInProductsSection && trimmedLine.includes('|')) {
      productLines.push(trimmedLine);
      continue;
    }
    
    // Check for bullet items (lines starting with - or • or *)
    if (/^[-•*]\s+/.test(trimmedLine)) {
      const bulletContent = trimmedLine.replace(/^[-•*]\s+/, '').trim();
      if (bulletContent) {
        section.bullets.push(bulletContent);
      }
      currentField = null; // Reset current field
      continue;
    }
    
    // Check for "Label: Value" pattern
    // This regex captures:
    // - Label: starts with a letter, can contain letters/numbers/spaces/hyphens/underscores
    // - Must have a colon followed by at least one space or the value
    // - Value: everything after the colon (handles colons in values like "Time: 10:00 AM")
    const fieldMatch = trimmedLine.match(/^([A-Za-z][A-Za-z0-9 _-]*):\s*(.*)$/);
    
    if (fieldMatch) {
      const label = fieldMatch[1].trim();
      const value = fieldMatch[2].trim();
      
      if (label) {
        currentField = {
          label,
          value: value || '', // Value can be empty initially if it continues on next line
          labelLower: label.toLowerCase().replace(/[^a-z0-9]/g, ''),
        };
        section.fields.push(currentField);
        continue;
      }
    }
    
    // Check if this line might be a continuation of the previous field
    // (starts with whitespace and we have a current field, or is just text)
    if (currentField && currentField.value && /^\s+/.test(line)) {
      // Continuation of previous field value
      currentField.value += ' ' + trimmedLine;
      continue;
    }
    
    // This line doesn't match any pattern - capture as unlabeled content
    // This ensures we NEVER drop content
    section.unlabeledContent.push(trimmedLine);
    currentField = null; // Reset current field
  }
  
  // Parse collected product lines
  if (productLines.length > 0) {
    section.products = parseProductItems(productLines);
  }
  
  return section;
}

/**
 * Helper to get a field value by label (case-insensitive, ignores special chars)
 */
export function getFieldValue(section: EmailSection, ...labels: string[]): string | undefined {
  const labelsNormalized = labels.map(l => l.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const field = section.fields.find(f => labelsNormalized.includes(f.labelLower));
  return field?.value;
}

/**
 * Check if a field label matches known "headline" patterns
 */
export function isHeadlineField(label: string): boolean {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ['headline', 'title', 'header', 'heading', 'h1', 'maintitle'].includes(normalized);
}

/**
 * Check if a field label matches known "subhead" patterns
 */
export function isSubheadField(label: string): boolean {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return [
    'subhead', 'subheadline', 'subhead', 'subtitle', 'tagline', 
    'oneliner', 'supporting', 'subheading', 'h2'
  ].includes(normalized);
}

/**
 * Check if a field label matches known "body" patterns
 */
export function isBodyField(label: string): boolean {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ['body', 'copy', 'content', 'text', 'description', 'paragraph', 'message'].includes(normalized);
}

/**
 * Check if a field label matches known "CTA" patterns
 */
export function isCtaField(label: string): boolean {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ['cta', 'calltoaction', 'button', 'action', 'link', 'buttontext'].includes(normalized);
}

/**
 * Check if a field label matches known "accent" patterns
 */
export function isAccentField(label: string): boolean {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ['accent', 'eyebrow', 'kicker', 'preheadline', 'label', 'tag'].includes(normalized);
}

/**
 * Check if a field label matches known "quote" patterns
 */
export function isQuoteField(label: string): boolean {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ['quote', 'testimonial', 'review', 'feedback'].includes(normalized);
}

/**
 * Check if a field label matches known "attribution" patterns
 */
export function isAttributionField(label: string): boolean {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ['attribution', 'author', 'source', 'name', 'customer', 'by'].includes(normalized);
}

/**
 * Check if a field label matches known "product name" patterns
 */
export function isProductNameField(label: string): boolean {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ['productname', 'product', 'item', 'name'].includes(normalized);
}

/**
 * Check if a field label matches known "price" patterns
 */
export function isPriceField(label: string): boolean {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ['price', 'cost', 'amount', 'value'].includes(normalized);
}

/**
 * Check if a field label matches known "discount code" patterns
 */
export function isCodeField(label: string): boolean {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ['code', 'discountcode', 'promocode', 'coupon'].includes(normalized);
}

/**
 * Check if a field label matches known "expiry" patterns
 */
export function isExpiryField(label: string): boolean {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ['expiry', 'expires', 'expiration', 'validuntil', 'endsdate', 'deadline'].includes(normalized);
}

/**
 * Format a section name for display (Title Case)
 */
export function formatSectionName(name: string): string {
  return name
    .replace(/[_-]/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
