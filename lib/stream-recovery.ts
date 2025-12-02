/**
 * Stream recovery utilities - Handle interrupted streams and resume
 */

export interface StreamCheckpoint {
  conversationId: string;
  messageId: string;
  content: string;
  thinking?: string;  // Thinking content for recovery
  rawContent?: string; // Optional: raw JSON for debugging (not used in recovery)
  timestamp: number;
  isComplete: boolean;
}

/**
 * Parse raw JSON streaming content into text
 * This handles the case where checkpoint content is raw JSON chunks
 * Format: {"type":"text","content":"..."}\n{"type":"thinking","content":"..."}\n...
 */
export function parseRawJsonStreamContent(rawContent: string): { content: string; thinking: string } {
  let content = '';
  let thinking = '';
  
  // Check if this looks like JSON streaming format
  if (!rawContent.includes('{"type":')) {
    // Not JSON format, return as-is
    return { content: rawContent, thinking: '' };
  }
  
  // Split by newlines and parse each JSON object
  const lines = rawContent.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    try {
      const message = JSON.parse(trimmedLine);
      
      switch (message.type) {
        case 'text':
          content += message.content || '';
          break;
        case 'thinking':
          thinking += message.content || '';
          break;
        // Ignore status, tool_use, and other message types
      }
    } catch {
      // If we can't parse as JSON, it might be partial or corrupted
      // Skip this line
    }
  }
  
  return { content, thinking };
}

const CHECKPOINT_INTERVAL = 100; // Save checkpoint every N chunks
const CHECKPOINT_KEY_PREFIX = 'stream_checkpoint_';

/**
 * Save stream checkpoint to localStorage
 */
export function saveCheckpoint(checkpoint: StreamCheckpoint): void {
  try {
    const key = `${CHECKPOINT_KEY_PREFIX}${checkpoint.messageId}`;
    localStorage.setItem(key, JSON.stringify(checkpoint));
  } catch (error) {
    console.error('Failed to save checkpoint:', error);
  }
}

/**
 * Load stream checkpoint from localStorage
 */
export function loadCheckpoint(messageId: string): StreamCheckpoint | null {
  try {
    const key = `${CHECKPOINT_KEY_PREFIX}${messageId}`;
    const data = localStorage.getItem(key);
    if (!data) return null;

    const checkpoint = JSON.parse(data) as StreamCheckpoint;
    
    // Don't return checkpoints older than 1 hour
    if (Date.now() - checkpoint.timestamp > 60 * 60 * 1000) {
      clearCheckpoint(messageId);
      return null;
    }

    return checkpoint;
  } catch (error) {
    console.error('Failed to load checkpoint:', error);
    return null;
  }
}

/**
 * Clear stream checkpoint
 */
export function clearCheckpoint(messageId: string): void {
  try {
    const key = `${CHECKPOINT_KEY_PREFIX}${messageId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear checkpoint:', error);
  }
}

/**
 * Clear all old checkpoints
 */
export function clearOldCheckpoints(): void {
  try {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CHECKPOINT_KEY_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const checkpoint = JSON.parse(data) as StreamCheckpoint;
            if (now - checkpoint.timestamp > maxAge) {
              localStorage.removeItem(key);
            }
          } catch (e) {
            // Invalid data, remove it
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to clear old checkpoints:', error);
  }
}

/**
 * Stream recovery manager
 */
export class StreamRecoveryManager {
  private messageId: string;
  private chunkCount: number;
  private checkpointInterval: number;
  private lastCheckpoint: StreamCheckpoint | null;

  constructor(messageId: string, checkpointInterval: number = CHECKPOINT_INTERVAL) {
    this.messageId = messageId;
    this.chunkCount = 0;
    this.checkpointInterval = checkpointInterval;
    this.lastCheckpoint = null;

    // Load existing checkpoint
    this.lastCheckpoint = loadCheckpoint(messageId);
  }

  /**
   * Process a chunk and save checkpoint if needed
   */
  processChunk(conversationId: string, content: string): void {
    this.chunkCount++;

    // Save checkpoint periodically
    if (this.chunkCount % this.checkpointInterval === 0) {
      this.saveCheckpoint(conversationId, content, false);
    }
  }

  /**
   * Save checkpoint
   */
  saveCheckpoint(conversationId: string, content: string, isComplete: boolean): void {
    const checkpoint: StreamCheckpoint = {
      conversationId,
      messageId: this.messageId,
      content,
      timestamp: Date.now(),
      isComplete,
    };

    saveCheckpoint(checkpoint);
    this.lastCheckpoint = checkpoint;
  }

  /**
   * Mark stream as complete
   */
  complete(conversationId: string, content: string): void {
    this.saveCheckpoint(conversationId, content, true);
  }

  /**
   * Clean up checkpoint
   */
  cleanup(): void {
    clearCheckpoint(this.messageId);
    this.lastCheckpoint = null;
  }

  /**
   * Get last checkpoint
   */
  getLastCheckpoint(): StreamCheckpoint | null {
    return this.lastCheckpoint;
  }

  /**
   * Check if recovery is possible
   */
  canRecover(): boolean {
    return this.lastCheckpoint !== null && !this.lastCheckpoint.isComplete;
  }
}

/**
 * Detect stream interruption
 */
export function detectStreamInterruption(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeout: number = 30000
): Promise<boolean> {
  return new Promise((resolve) => {
    let hasData = false;
    let timeoutId: NodeJS.Timeout;

    const checkStream = async () => {
      try {
        const { done, value } = await reader.read();
        
        if (done || value) {
          hasData = true;
          clearTimeout(timeoutId);
          resolve(false); // Not interrupted
        }
      } catch (error) {
        clearTimeout(timeoutId);
        resolve(true); // Interrupted
      }
    };

    // Set timeout
    timeoutId = setTimeout(() => {
      if (!hasData) {
        resolve(true); // Interrupted due to timeout
      }
    }, timeout);

    checkStream();
  });
}

/**
 * Retry stream with exponential backoff
 */
export async function retryStream<T>(
  streamFn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await streamFn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Stream attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Stream failed after retries');
}

/**
 * Create resumable stream reader
 */
export class ResumableStreamReader {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private decoder: TextDecoder;
  private onChunk: (chunk: string) => void;
  private onError: (error: Error) => void;
  private onComplete: () => void;
  private recoveryManager: StreamRecoveryManager;
  private conversationId: string;
  private abortController: AbortController;

  constructor(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    messageId: string,
    conversationId: string,
    onChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ) {
    this.reader = reader;
    this.decoder = new TextDecoder();
    this.onChunk = onChunk;
    this.onError = onError;
    this.onComplete = onComplete;
    this.recoveryManager = new StreamRecoveryManager(messageId);
    this.conversationId = conversationId;
    this.abortController = new AbortController();
  }

  async start(): Promise<void> {
    try {
      let fullContent = '';

      // Check if we can resume from checkpoint
      const checkpoint = this.recoveryManager.getLastCheckpoint();
      if (checkpoint && !checkpoint.isComplete) {
        fullContent = checkpoint.content;
        this.onChunk(fullContent); // Restore previous content
      }

      while (true) {
        const { done, value } = await this.reader.read();

        if (done) {
          this.recoveryManager.complete(this.conversationId, fullContent);
          this.onComplete();
          break;
        }

        const chunk = this.decoder.decode(value, { stream: true });
        fullContent += chunk;

        this.recoveryManager.processChunk(this.conversationId, fullContent);
        this.onChunk(chunk);
      }
    } catch (error) {
      // Save checkpoint before erroring
      this.onError(error as Error);
    }
  }

  abort(): void {
    this.abortController.abort();
    this.reader.cancel();
  }

  cleanup(): void {
    this.recoveryManager.cleanup();
  }
}

