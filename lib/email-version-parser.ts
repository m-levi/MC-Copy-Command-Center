/**
 * Email Version Parser
 * 
 * Parses AI response content for email version XML tags (version_a, version_b, version_c)
 * and extracts structured data for rendering version switching UI.
 */

export interface EmailVersion {
  id: 'a' | 'b' | 'c';
  label: string;
  content: string;
  note?: string; // The one-line note at the top explaining the approach
}

export interface ParsedEmailVersions {
  versions: EmailVersion[];
  hasVersions: boolean;
  nonVersionedContent: string; // Any content outside of version tags
}

/**
 * Extract the approach note from the beginning of a version's content
 * The note is typically the first paragraph explaining why this approach was chosen
 * NOTE: We extract the note for header display but KEEP it in the content as well
 */
function extractApproachNote(content: string): { note: string | undefined; cleanContent: string } {
  // Look for a note at the very beginning (first line or paragraph before the actual email content)
  // The note typically appears before "---" or "SUBJECT LINE:"
  const lines = content.trim().split('\n');
  
  // Check if first line looks like a note (not a subject line or divider)
  const firstLine = lines[0]?.trim();
  if (
    firstLine &&
    !firstLine.startsWith('---') &&
    !firstLine.toUpperCase().startsWith('SUBJECT') &&
    !firstLine.startsWith('```') &&
    !firstLine.startsWith('[') &&
    !firstLine.startsWith('**SUBJECT') &&
    firstLine.length > 10 &&
    firstLine.length < 300  // Allow longer notes
  ) {
    // This looks like an approach note
    // Extract it for header display but KEEP it in the content
    return {
      note: firstLine.replace(/^\*|\*$/g, '').trim(), // Remove markdown italic markers for header
      cleanContent: content.trim(), // Keep full content including the note
    };
  }
  
  return {
    note: undefined,
    cleanContent: content.trim(),
  };
}

/**
 * Parse a single version tag and extract its content
 */
function parseVersionTag(
  content: string,
  versionId: 'a' | 'b' | 'c'
): EmailVersion | null {
  const tagName = `version_${versionId}`;
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;
  
  const startIndex = content.indexOf(openTag);
  if (startIndex === -1) return null;
  
  const endIndex = content.indexOf(closeTag, startIndex);
  if (endIndex === -1) return null;
  
  const rawContent = content.substring(startIndex + openTag.length, endIndex).trim();
  const { note, cleanContent } = extractApproachNote(rawContent);
  
  const labels: Record<'a' | 'b' | 'c', string> = {
    a: 'Version A',
    b: 'Version B',
    c: 'Version C',
  };
  
  return {
    id: versionId,
    label: labels[versionId],
    content: cleanContent,
    note,
  };
}

/**
 * Main parser function - parses content and extracts all email versions
 */
export function parseEmailVersions(content: string): ParsedEmailVersions {
  const versions: EmailVersion[] = [];
  
  // Try to parse each version
  const versionIds: Array<'a' | 'b' | 'c'> = ['a', 'b', 'c'];
  
  for (const id of versionIds) {
    const version = parseVersionTag(content, id);
    if (version) {
      versions.push(version);
    }
  }
  
  // Extract any content that's not inside version tags
  let nonVersionedContent = content;
  for (const id of versionIds) {
    const tagName = `version_${id}`;
    const pattern = new RegExp(`<${tagName}>[\\s\\S]*?</${tagName}>`, 'g');
    nonVersionedContent = nonVersionedContent.replace(pattern, '');
  }
  nonVersionedContent = nonVersionedContent.trim();
  
  return {
    versions,
    hasVersions: versions.length > 0,
    nonVersionedContent,
  };
}

/**
 * Check if content contains email version markers
 */
export function hasEmailVersionMarkers(content: string): boolean {
  return (
    content.includes('<version_a>') ||
    content.includes('<version_b>') ||
    content.includes('<version_c>')
  );
}

/**
 * Strip all version markers from content (for plain text display)
 */
export function stripVersionMarkers(content: string): string {
  return content
    .replace(/<version_a>[\s\S]*?<\/version_a>/g, '')
    .replace(/<version_b>[\s\S]*?<\/version_b>/g, '')
    .replace(/<version_c>[\s\S]*?<\/version_c>/g, '')
    .trim();
}

/**
 * Get a single version's content by ID
 */
export function getVersionById(
  parsed: ParsedEmailVersions,
  id: 'a' | 'b' | 'c'
): EmailVersion | undefined {
  return parsed.versions.find((v) => v.id === id);
}

/**
 * Get the default version to display (usually version A)
 */
export function getDefaultVersion(parsed: ParsedEmailVersions): EmailVersion | undefined {
  // Prefer version A, then B, then C
  return parsed.versions.find((v) => v.id === 'a') ||
    parsed.versions.find((v) => v.id === 'b') ||
    parsed.versions.find((v) => v.id === 'c');
}

/**
 * Extract streaming/partial content from an incomplete version tag
 * Used to show content while it's still being generated
 */
export function getStreamingVersionContent(content: string, versionId: 'a' | 'b' | 'c'): string | null {
  const tagName = `version_${versionId}`;
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;
  
  const startIndex = content.indexOf(openTag);
  if (startIndex === -1) return null;
  
  const contentStart = startIndex + openTag.length;
  const endIndex = content.indexOf(closeTag, contentStart);
  
  // If we have a closing tag, return complete content
  if (endIndex !== -1) {
    return content.substring(contentStart, endIndex).trim();
  }
  
  // Otherwise return everything after the open tag (streaming content)
  return content.substring(contentStart).trim();
}

/**
 * Get content that appears BEFORE the first version tag (intro text)
 */
export function getContentBeforeVersions(content: string): string {
  // Find the first opening version tag
  const firstOpenA = content.indexOf('<version_a>');
  const firstOpenB = content.indexOf('<version_b>');
  const firstOpenC = content.indexOf('<version_c>');
  
  // Get the earliest tag position (ignoring -1 values)
  const positions = [firstOpenA, firstOpenB, firstOpenC].filter(p => p !== -1);
  if (positions.length === 0) return '';
  
  const firstOpen = Math.min(...positions);
  if (firstOpen <= 0) return '';
  
  return content.substring(0, firstOpen).trim();
}

/**
 * Get content that appears AFTER all version tags (outro/closing text)
 * Only returns content after ALL versions are complete
 * During streaming, returns empty if there's an incomplete version tag
 */
export function getContentAfterVersions(content: string): string {
  // Find the last closing version tag
  const lastCloseC = content.lastIndexOf('</version_c>');
  const lastCloseB = content.lastIndexOf('</version_b>');
  const lastCloseA = content.lastIndexOf('</version_a>');
  
  const lastClose = Math.max(lastCloseC, lastCloseB, lastCloseA);
  
  if (lastClose === -1) return '';
  
  // Determine which closing tag is last
  let tagLength = 0;
  if (lastCloseC === lastClose) tagLength = '</version_c>'.length;
  else if (lastCloseB === lastClose) tagLength = '</version_b>'.length;
  else tagLength = '</version_a>'.length;
  
  const afterContent = content.substring(lastClose + tagLength).trim();
  
  // If there's an incomplete version tag starting, don't return that content
  // (it means we're still streaming a version)
  if (afterContent.includes('<version_')) {
    return '';
  }
  
  // Clean up any remaining closing tags
  return afterContent
    .replace(/<\/version_[abc]>/g, '')
    .trim();
}

