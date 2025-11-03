'use client';

import { Message, ConversationMode } from '@/types';
import { useEffect, useRef, useState, useCallback } from 'react';
import ChatMessage from './ChatMessage';

interface VirtualizedMessageListProps {
  messages: Message[];
  brandId: string;
  mode: ConversationMode;
  sending: boolean;
  regeneratingMessageId: string | null;
  onRegenerate: (index: number) => void;
  onRegenerateSection: (sectionType: string, sectionTitle: string) => void;
  onEdit: (index: number, newContent: string) => void;
  onReaction: (messageId: string, reaction: 'thumbs_up' | 'thumbs_down') => void;
  aiStatus?: string;
}

const ESTIMATED_MESSAGE_HEIGHT = 400; // Estimated average message height in pixels
const BUFFER_SIZE = 5; // Number of messages to render above/below viewport
const VIRTUALIZATION_THRESHOLD = 50; // Only virtualize if more than this many messages

export default function VirtualizedMessageList({
  messages,
  brandId,
  mode,
  sending,
  regeneratingMessageId,
  onRegenerate,
  onRegenerateSection,
  onEdit,
  onReaction,
  aiStatus = 'idle',
}: VirtualizedMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: messages.length });
  const [messageHeights, setMessageHeights] = useState<Map<string, number>>(new Map());
  const measureRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Don't virtualize if message count is below threshold
  const shouldVirtualize = messages.length > VIRTUALIZATION_THRESHOLD;

  // Calculate which messages should be visible
  const calculateVisibleRange = useCallback(() => {
    if (!containerRef.current || !shouldVirtualize) {
      setVisibleRange({ start: 0, end: messages.length });
      return;
    }

    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;

    let currentY = 0;
    let start = 0;
    let end = messages.length;

    // Find start index
    for (let i = 0; i < messages.length; i++) {
      const height = messageHeights.get(messages[i].id) || ESTIMATED_MESSAGE_HEIGHT;
      if (currentY + height >= scrollTop) {
        start = Math.max(0, i - BUFFER_SIZE);
        break;
      }
      currentY += height;
    }

    // Find end index
    currentY = 0;
    for (let i = 0; i < messages.length; i++) {
      const height = messageHeights.get(messages[i].id) || ESTIMATED_MESSAGE_HEIGHT;
      currentY += height;
      if (currentY >= scrollTop + viewportHeight) {
        end = Math.min(messages.length, i + BUFFER_SIZE + 1);
        break;
      }
    }

    setVisibleRange({ start, end });
  }, [messages, messageHeights, shouldVirtualize]);

  // Update visible range on scroll
  useEffect(() => {
    if (!shouldVirtualize) return;

    const container = containerRef.current;
    if (!container) return;

    let rafId: number;
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculateVisibleRange);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    calculateVisibleRange(); // Initial calculation

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [calculateVisibleRange, shouldVirtualize]);

  // Measure message heights
  useEffect(() => {
    if (!shouldVirtualize) return;

    const observer = new ResizeObserver((entries) => {
      const newHeights = new Map(messageHeights);
      let changed = false;

      entries.forEach((entry) => {
        const messageId = entry.target.getAttribute('data-message-id');
        if (messageId) {
          const height = entry.contentRect.height;
          if (newHeights.get(messageId) !== height) {
            newHeights.set(messageId, height);
            changed = true;
          }
        }
      });

      if (changed) {
        setMessageHeights(newHeights);
        calculateVisibleRange();
      }
    });

    // Observe all rendered message elements
    measureRefs.current.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [messages, shouldVirtualize, calculateVisibleRange, messageHeights]);

  // Recalculate when messages change
  useEffect(() => {
    if (shouldVirtualize) {
      calculateVisibleRange();
    }
  }, [messages.length, calculateVisibleRange, shouldVirtualize]);

  // Calculate total height and offset
  const getTotalHeight = () => {
    if (!shouldVirtualize) return 'auto';
    
    let total = 0;
    messages.forEach((msg) => {
      total += messageHeights.get(msg.id) || ESTIMATED_MESSAGE_HEIGHT;
    });
    return total;
  };

  const getOffsetY = () => {
    if (!shouldVirtualize) return 0;
    
    let offset = 0;
    for (let i = 0; i < visibleRange.start; i++) {
      offset += messageHeights.get(messages[i].id) || ESTIMATED_MESSAGE_HEIGHT;
    }
    return offset;
  };

  const visibleMessages = shouldVirtualize
    ? messages.slice(visibleRange.start, visibleRange.end)
    : messages;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-8 py-8 bg-[#fcfcfc] dark:bg-gray-950"
      style={{ 
        position: 'relative',
        // Performance optimizations for smooth scrolling
        willChange: 'scroll-position',
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth',
        contain: 'layout style paint',
      }}
    >
      <div
        style={{
          height: shouldVirtualize ? getTotalHeight() : 'auto',
          position: 'relative',
        }}
      >
        <div
          style={{
            transform: shouldVirtualize ? `translateY(${getOffsetY()}px)` : 'none',
            position: shouldVirtualize ? 'absolute' : 'relative',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleMessages.map((message, relativeIndex) => {
            const actualIndex = shouldVirtualize ? visibleRange.start + relativeIndex : relativeIndex;
            
            return (
              <div
                key={message.id}
                data-message-id={message.id}
                ref={(el) => {
                  if (el) {
                    measureRefs.current.set(message.id, el);
                  } else {
                    measureRefs.current.delete(message.id);
                  }
                }}
              >
                <ChatMessage
                  message={message}
                  brandId={brandId}
                  mode={mode}
                  onRegenerate={
                    message.role === 'assistant' &&
                    actualIndex === messages.length - 1 &&
                    !sending
                      ? () => onRegenerate(actualIndex)
                      : undefined
                  }
                  onRegenerateSection={onRegenerateSection}
                  onEdit={
                    message.role === 'user'
                      ? (newContent) => onEdit(actualIndex, newContent)
                      : undefined
                  }
                  onReaction={
                    message.role === 'assistant'
                      ? (reaction) => onReaction(message.id, reaction)
                      : undefined
                  }
                  isRegenerating={regeneratingMessageId === message.id}
                  isStreaming={message.role === 'assistant' && actualIndex === messages.length - 1 && sending}
                  aiStatus={aiStatus}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

