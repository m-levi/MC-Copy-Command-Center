/**
 * Smart streaming parser - Progressively parse and batch chunks
 */

export interface StreamSection {
  type: 'subject' | 'hero' | 'body' | 'cta' | 'notes' | 'unknown';
  title: string;
  content: string;
  order: number;
  complete: boolean;
}

export interface StreamState {
  fullContent: string;
  sections: StreamSection[];
  currentSection: StreamSection | null;
  buffer: string;
  chunkCount: number;
  lastUpdate: number;
}

const SECTION_DELIMITER = '---';
const MIN_BATCH_SIZE = 50; // Minimum characters before rendering update
const MIN_BATCH_TIME = 16; // Minimum ms between updates (60fps)

/**
 * Create initial stream state
 */
export function createStreamState(): StreamState {
  return {
    fullContent: '',
    sections: [],
    currentSection: null,
    buffer: '',
    chunkCount: 0,
    lastUpdate: Date.now(),
  };
}

/**
 * Detect section type from header
 */
function detectSectionType(header: string): StreamSection['type'] {
  const normalized = header.toLowerCase().trim();
  
  if (normalized.includes('email subject') || normalized.includes('subject line')) {
    return 'subject';
  }
  if (normalized.includes('hero')) {
    return 'hero';
  }
  if (normalized.includes('cta') || normalized.includes('call-to-action')) {
    return 'cta';
  }
  if (normalized.includes('design note') || normalized.includes('note')) {
    return 'notes';
  }
  if (normalized.match(/section \d+/i)) {
    return 'body';
  }
  
  return 'body'; // Default to body for most sections
}

/**
 * Parse section header and content
 */
function parseSection(content: string, order: number): StreamSection {
  const lines = content.trim().split('\n');
  const firstLine = lines[0] || '';
  
  // Extract title from first line
  const title = firstLine.replace(/^#+\s*/, '').replace(/^[A-Z\s]+:/, '').trim();
  const type = detectSectionType(firstLine);
  
  // Rest is content
  const sectionContent = lines.slice(1).join('\n').trim();
  
  return {
    type,
    title: title || `Section ${order + 1}`,
    content: sectionContent,
    order,
    complete: false,
  };
}

/**
 * Process a chunk of streamed text
 */
export function processStreamChunk(
  state: StreamState,
  chunk: string
): {
  state: StreamState;
  shouldRender: boolean;
  completedSections: StreamSection[];
} {
  state.buffer += chunk;
  state.fullContent += chunk;
  state.chunkCount++;

  const completedSections: StreamSection[] = [];

  // Check if we have complete sections (delimited by ---)
  const parts = state.buffer.split(SECTION_DELIMITER);
  
  if (parts.length > 1) {
    // We have at least one complete section
    for (let i = 0; i < parts.length - 1; i++) {
      const sectionContent = parts[i].trim();
      
      if (sectionContent) {
        // Mark previous section as complete
        if (state.currentSection) {
          state.currentSection.complete = true;
          completedSections.push({ ...state.currentSection });
        }
        
        // Parse new section
        const section = parseSection(sectionContent, state.sections.length);
        section.complete = true;
        state.sections.push(section);
        state.currentSection = null;
      }
    }
    
    // Keep the last part as buffer (incomplete section)
    state.buffer = parts[parts.length - 1];
    
    if (state.buffer.trim()) {
      const section = parseSection(state.buffer, state.sections.length);
      state.currentSection = section;
      state.sections.push(section);
    }
  } else {
    // No complete section yet, update current section
    if (!state.currentSection && state.buffer.trim()) {
      const section = parseSection(state.buffer, state.sections.length);
      state.currentSection = section;
      state.sections.push(section);
    } else if (state.currentSection) {
      // Update existing section content
      const updated = parseSection(state.buffer, state.currentSection.order);
      state.currentSection.content = updated.content;
      state.currentSection.title = updated.title;
      state.currentSection.type = updated.type;
      
      // Update in sections array
      const index = state.sections.findIndex(s => s.order === state.currentSection!.order);
      if (index !== -1) {
        state.sections[index] = { ...state.currentSection };
      }
    }
  }

  // Determine if we should render
  const now = Date.now();
  const timeSinceLastUpdate = now - state.lastUpdate;
  const bufferSize = state.buffer.length;
  
  const shouldRender = 
    completedSections.length > 0 || // Always render when section completes
    bufferSize >= MIN_BATCH_SIZE || // Render when buffer is large enough
    timeSinceLastUpdate >= MIN_BATCH_TIME * 3; // Render if too much time passed

  if (shouldRender) {
    state.lastUpdate = now;
  }

  return {
    state,
    shouldRender,
    completedSections,
  };
}

/**
 * Finalize stream - mark all sections as complete and clean up content
 */
export function finalizeStream(state: StreamState): StreamState {
  // Clean up any stray markers or formatting issues at the end
  state.fullContent = state.fullContent
    // Remove any stray closing brackets that might be left from marker removal
    .replace(/\s*\]\s*$/g, '')
    // Remove any trailing marker remnants
    .replace(/\[PRODUCTS:.*?\]\s*$/g, '')
    .replace(/\[REMEMBER:.*?\]\s*$/g, '')
    .replace(/\[STATUS:.*?\]\s*$/g, '')
    // Clean up excessive whitespace at the end
    .replace(/\s{3,}$/g, '\n\n')
    .trim();
  
  // Mark current section as complete if exists
  if (state.currentSection) {
    state.currentSection.complete = true;
    const index = state.sections.findIndex(s => s.order === state.currentSection!.order);
    if (index !== -1) {
      state.sections[index] = { ...state.currentSection };
    }
  }

  // Mark all sections as complete
  state.sections = state.sections.map(s => ({ ...s, complete: true }));
  
  return state;
}

/**
 * Batch small chunks to reduce render thrashing
 */
export class ChunkBatcher {
  private buffer: string[];
  private timeout: NodeJS.Timeout | null;
  private onFlush: (batch: string) => void;
  private batchDelay: number;
  private maxBatchSize: number;

  constructor(
    onFlush: (batch: string) => void,
    batchDelay: number = MIN_BATCH_TIME,
    maxBatchSize: number = MIN_BATCH_SIZE
  ) {
    this.buffer = [];
    this.timeout = null;
    this.onFlush = onFlush;
    this.batchDelay = batchDelay;
    this.maxBatchSize = maxBatchSize;
  }

  add(chunk: string): void {
    this.buffer.push(chunk);

    const totalSize = this.buffer.reduce((sum, c) => sum + c.length, 0);

    // Flush immediately if batch is large enough
    if (totalSize >= this.maxBatchSize) {
      this.flush();
    } else {
      // Schedule flush
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.timeout) {
      return; // Already scheduled
    }

    this.timeout = setTimeout(() => {
      this.flush();
    }, this.batchDelay);
  }

  flush(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (this.buffer.length === 0) {
      return;
    }

    const batch = this.buffer.join('');
    this.buffer = [];
    this.onFlush(batch);
  }

  clear(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.buffer = [];
  }
}

/**
 * Extract special markers from stream (STATUS, PRODUCTS, etc.)
 */
export function extractMarkers(
  chunk: string
): {
  cleanChunk: string;
  status?: string;
  products?: any[];
} {
  let cleanChunk = chunk;
  let status: string | undefined;
  let products: any[] | undefined;

  // Extract status markers
  const statusMatch = chunk.match(/\[STATUS:(\w+)\]/);
  if (statusMatch) {
    status = statusMatch[1];
    cleanChunk = cleanChunk.replace(/\[STATUS:\w+\]/g, '');
  }

  // Extract product markers
  const productMatch = chunk.match(/\[PRODUCTS:([\s\S]*?)\]/);
  if (productMatch) {
    try {
      products = JSON.parse(productMatch[1]);
      cleanChunk = cleanChunk.replace(/\[PRODUCTS:[\s\S]*?\]/, '');
    } catch (e) {
      console.error('Failed to parse products:', e);
    }
  }

  // Remove memory instruction markers (invisible to user)
  cleanChunk = cleanChunk.replace(/\[REMEMBER:[^\]]+\]/g, '');

  return { cleanChunk, status, products };
}

