"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";

export interface QueuedPrompt {
  id: string;
  text: string;
  createdAt: number;
}

export interface PromptQueueApi {
  queue: QueuedPrompt[];
  enqueue: (text: string) => void;
  dequeue: (id: string) => void;
  clear: () => void;
  /** Call on each chat status tick; pops + sends the next prompt when idle. */
  drain: (isBusy: boolean, send: (text: string) => void) => void;
}

/**
 * Tiny FIFO queue for prompts the user submits while the current response
 * is still streaming. The AI Elements `Queue` component renders it; this
 * hook owns the state machine. `drain` is idempotent — call it from a
 * useEffect that watches `status`.
 */
export function usePromptQueue(): PromptQueueApi {
  const [queue, setQueue] = useState<QueuedPrompt[]>([]);
  const sendingRef = useRef<string | null>(null);

  const enqueue = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setQueue((q) => [...q, { id: nanoid(8), text: trimmed, createdAt: Date.now() }]);
  }, []);

  const dequeue = useCallback((id: string) => {
    setQueue((q) => q.filter((x) => x.id !== id));
  }, []);

  const clear = useCallback(() => {
    setQueue([]);
    sendingRef.current = null;
  }, []);

  const drain = useCallback(
    (isBusy: boolean, send: (text: string) => void) => {
      if (isBusy) return;
      if (queue.length === 0) return;
      const next = queue[0];
      if (sendingRef.current === next.id) return;
      sendingRef.current = next.id;
      setQueue((q) => q.slice(1));
      send(next.text);
      // Clear the guard next tick so the effect can run again.
      setTimeout(() => {
        sendingRef.current = null;
      }, 0);
    },
    [queue],
  );

  // If the consumer unmounts without clearing, just let GC collect state.
  useEffect(() => () => undefined, []);

  return { queue, enqueue, dequeue, clear, drain };
}
