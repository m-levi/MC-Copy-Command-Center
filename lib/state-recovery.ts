/**
 * State recovery utilities - Persist and restore UI state
 */

export interface ConversationState {
  conversationId: string;
  scrollPosition: number;
  inputContent: string;
  cursorPosition: number;
  lastMessageId: string | null;
  timestamp: number;
}

const STATE_KEY_PREFIX = 'conv_state_';
const MAX_STATE_AGE = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save conversation state
 */
export function saveConversationState(state: ConversationState): void {
  try {
    const key = `${STATE_KEY_PREFIX}${state.conversationId}`;
    localStorage.setItem(key, JSON.stringify({
      ...state,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('Failed to save conversation state:', error);
  }
}

/**
 * Load conversation state
 */
export function loadConversationState(conversationId: string): ConversationState | null {
  try {
    const key = `${STATE_KEY_PREFIX}${conversationId}`;
    const data = localStorage.getItem(key);
    if (!data) return null;

    const state = JSON.parse(data) as ConversationState;

    // Don't return states older than MAX_STATE_AGE
    if (Date.now() - state.timestamp > MAX_STATE_AGE) {
      clearConversationState(conversationId);
      return null;
    }

    return state;
  } catch (error) {
    console.error('Failed to load conversation state:', error);
    return null;
  }
}

/**
 * Clear conversation state
 */
export function clearConversationState(conversationId: string): void {
  try {
    const key = `${STATE_KEY_PREFIX}${conversationId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear conversation state:', error);
  }
}

/**
 * Clear all old conversation states
 */
export function clearOldConversationStates(): void {
  try {
    const now = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STATE_KEY_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const state = JSON.parse(data) as ConversationState;
            if (now - state.timestamp > MAX_STATE_AGE) {
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
    console.error('Failed to clear old conversation states:', error);
  }
}

/**
 * State recovery manager for a conversation
 */
export class ConversationStateManager {
  private conversationId: string;
  private saveTimeout: NodeJS.Timeout | null = null;
  private currentState: ConversationState;

  constructor(conversationId: string) {
    this.conversationId = conversationId;
    
    // Load existing state or create new
    const loaded = loadConversationState(conversationId);
    this.currentState = loaded || {
      conversationId,
      scrollPosition: 0,
      inputContent: '',
      cursorPosition: 0,
      lastMessageId: null,
      timestamp: Date.now(),
    };
  }

  /**
   * Update scroll position
   */
  updateScrollPosition(position: number): void {
    this.currentState.scrollPosition = position;
    this.scheduleSave();
  }

  /**
   * Update input content
   */
  updateInputContent(content: string, cursorPosition: number): void {
    this.currentState.inputContent = content;
    this.currentState.cursorPosition = cursorPosition;
    this.scheduleSave();
  }

  /**
   * Update last message ID
   */
  updateLastMessage(messageId: string): void {
    this.currentState.lastMessageId = messageId;
    this.scheduleSave();
  }

  /**
   * Get current state
   */
  getState(): ConversationState {
    return { ...this.currentState };
  }

  /**
   * Schedule save (debounced)
   */
  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      saveConversationState(this.currentState);
      this.saveTimeout = null;
    }, 500);
  }

  /**
   * Force immediate save
   */
  forceSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    saveConversationState(this.currentState);
  }

  /**
   * Clear state
   */
  clear(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    clearConversationState(this.conversationId);
  }
}

/**
 * Restore scroll position smoothly
 */
export function restoreScrollPosition(
  container: HTMLElement | null,
  position: number,
  smooth: boolean = true
): void {
  if (!container) return;

  try {
    container.scrollTo({
      top: position,
      behavior: smooth ? 'smooth' : 'auto',
    });
  } catch (error) {
    // Fallback for older browsers
    container.scrollTop = position;
  }
}

/**
 * Restore input cursor position
 */
export function restoreCursorPosition(
  input: HTMLTextAreaElement | HTMLInputElement | null,
  position: number
): void {
  if (!input) return;

  try {
    input.setSelectionRange(position, position);
  } catch (error) {
    console.error('Failed to restore cursor position:', error);
  }
}

/**
 * Get current scroll position
 */
export function getCurrentScrollPosition(container: HTMLElement | null): number {
  if (!container) return 0;
  return container.scrollTop;
}

/**
 * Get current cursor position
 */
export function getCurrentCursorPosition(
  input: HTMLTextAreaElement | HTMLInputElement | null
): number {
  if (!input) return 0;
  return input.selectionStart || 0;
}

/**
 * Check if user is at bottom of scroll container
 */
export function isAtBottom(container: HTMLElement | null, threshold: number = 50): boolean {
  if (!container) return true;
  
  const { scrollTop, scrollHeight, clientHeight } = container;
  return scrollHeight - scrollTop - clientHeight < threshold;
}

