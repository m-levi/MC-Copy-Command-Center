/**
 * Pure helper for parsing the newline-delimited JSON stream emitted by
 * /api/chat. Extracted so the regenerate and send paths can share the same
 * logic, and so it can be unit tested without mocking a full Response body.
 *
 * The chat route emits messages shaped like:
 *   {"type":"text","content":"..."}\n
 *   {"type":"thinking","content":"..."}\n
 *   {"type":"status","status":"analyzing_brand"}\n
 *   {"type":"products","products":[...]}\n
 *
 * plus tool / artifact / specialist events this parser ignores.
 */

import type { ProductLink } from '@/types';

export interface StreamParseCallbacks {
  onText?: (delta: string, accumulated: string) => void;
  onThinking?: (delta: string, accumulated: string) => void;
  onStatus?: (status: string) => void;
  onProducts?: (products: ProductLink[]) => void;
  /** Called for every successfully-parsed message (useful in tests). */
  onEvent?: (message: Record<string, unknown>) => void;
}

export interface StreamParseResult {
  /** Concatenated text deltas. */
  text: string;
  /** Concatenated thinking/reasoning deltas. */
  thinking: string;
  /** Last known status. */
  status: string | null;
  /** Last received products array. */
  products: ProductLink[];
}

/**
 * Feed a full stream payload (or a single chunk) through the parser.
 * Returns the running totals after consuming whatever was passed.
 *
 * Callers that stream data incrementally should buffer partial last lines
 * themselves (see feedChunk below) — this function assumes the input ends
 * on a complete line boundary.
 */
export function parseJsonStream(
  payload: string,
  callbacks: StreamParseCallbacks = {}
): StreamParseResult {
  const state: StreamParseResult = {
    text: '',
    thinking: '',
    status: null,
    products: [],
  };

  for (const line of payload.split('\n')) {
    if (!line.trim()) continue;
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(line);
    } catch {
      // Skip malformed lines — the real client skips them too.
      continue;
    }

    callbacks.onEvent?.(message);

    switch (message.type) {
      case 'text': {
        const delta = typeof message.content === 'string' ? message.content : '';
        state.text += delta;
        callbacks.onText?.(delta, state.text);
        break;
      }
      case 'thinking': {
        const delta = typeof message.content === 'string' ? message.content : '';
        state.thinking += delta;
        callbacks.onThinking?.(delta, state.thinking);
        break;
      }
      case 'status': {
        const status = typeof message.status === 'string' ? message.status : null;
        state.status = status;
        if (status) callbacks.onStatus?.(status);
        break;
      }
      case 'products': {
        const products = Array.isArray(message.products)
          ? (message.products as ProductLink[])
          : [];
        state.products = products;
        callbacks.onProducts?.(products);
        break;
      }
      // Other event types (tool_use, artifact_created, specialist_*, etc.)
      // are intentionally ignored here — they're handled by the caller's
      // onEvent hook when needed.
    }
  }

  return state;
}

/**
 * Incremental chunk feeder. Maintains the partial-line buffer between calls.
 * Returns whatever complete lines were consumed plus the new running state.
 *
 * Usage:
 *   const feeder = createChunkedJsonFeeder(callbacks);
 *   feeder.feed('{"type":"text","content":"he');
 *   feeder.feed('llo"}\n{"type":');
 *   feeder.feed('"text","content":" world"}\n');
 *   feeder.state.text === 'hello world';
 */
export function createChunkedJsonFeeder(callbacks: StreamParseCallbacks = {}) {
  let buffer = '';
  const state: StreamParseResult = {
    text: '',
    thinking: '',
    status: null,
    products: [],
  };

  const proxyCallbacks: StreamParseCallbacks = {
    onText: (delta) => {
      state.text += delta;
      callbacks.onText?.(delta, state.text);
    },
    onThinking: (delta) => {
      state.thinking += delta;
      callbacks.onThinking?.(delta, state.thinking);
    },
    onStatus: (status) => {
      state.status = status;
      callbacks.onStatus?.(status);
    },
    onProducts: (products) => {
      state.products = products;
      callbacks.onProducts?.(products);
    },
    onEvent: callbacks.onEvent,
  };

  return {
    get state() {
      return state;
    },
    feed(chunk: string) {
      buffer += chunk;
      const lastNewline = buffer.lastIndexOf('\n');
      if (lastNewline === -1) return;
      const complete = buffer.slice(0, lastNewline);
      buffer = buffer.slice(lastNewline + 1);
      parseJsonStream(complete, proxyCallbacks);
    },
    flush() {
      if (buffer.trim()) {
        parseJsonStream(buffer, proxyCallbacks);
        buffer = '';
      }
    },
  };
}
