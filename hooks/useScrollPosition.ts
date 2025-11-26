'use client';

import { useState, useEffect, useCallback, useRef, RefObject } from 'react';

interface UseScrollPositionOptions {
  /** Threshold in pixels to consider "near bottom" */
  bottomThreshold?: number;
  /** Throttle scroll events (ms) */
  throttleMs?: number;
}

interface UseScrollPositionReturn {
  /** Whether the user is near the bottom of the scroll container */
  isNearBottom: boolean;
  /** Whether to show a "scroll to bottom" button */
  showScrollToBottom: boolean;
  /** Scroll to the bottom of the container */
  scrollToBottom: (instant?: boolean) => void;
  /** Distance from the bottom in pixels */
  distanceFromBottom: number;
}

/**
 * Hook for managing scroll position in a scrollable container
 * Useful for auto-scroll in chat interfaces
 */
export function useScrollPosition(
  containerRef: RefObject<HTMLElement | null>,
  options: UseScrollPositionOptions = {}
): UseScrollPositionReturn {
  const { bottomThreshold = 100, throttleMs = 16 } = options;
  
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [distanceFromBottom, setDistanceFromBottom] = useState(0);
  
  const lastScrollTime = useRef(0);

  const updateScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const now = Date.now();
    if (now - lastScrollTime.current < throttleMs) return;
    lastScrollTime.current = now;

    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    setDistanceFromBottom(distance);
    setIsNearBottom(distance < bottomThreshold);
    setShowScrollToBottom(distance > 300);
  }, [containerRef, bottomThreshold, throttleMs]);

  const scrollToBottom = useCallback((instant = false) => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: instant ? 'instant' : 'smooth',
    });
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateScrollPosition();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, updateScrollPosition]);

  return {
    isNearBottom,
    showScrollToBottom,
    scrollToBottom,
    distanceFromBottom,
  };
}

