import { useState, useRef, useCallback } from 'react';
import { AIStatus, Message } from '@/types';
import { createStreamState, processStreamChunk, finalizeStream } from '@/lib/stream-parser';
import { saveCheckpoint, loadCheckpoint, clearCheckpoint } from '@/lib/stream-recovery';
import { generateCacheKey, cacheResponse } from '@/lib/response-cache';
import { trackEvent } from '@/lib/analytics';
import DOMPurify from 'dompurify';
import toast from 'react-hot-toast';

const CHECKPOINT_INTERVAL = 100; // Create checkpoint every 100 chunks

/**
 * Sanitize AI-generated content before saving to database
 */
const sanitizeContent = (content: string): string => {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
};

/**
 * Clean email content by removing any preamble before the actual email structure
 */
const cleanEmailContent = (content: string): string => {
  return content
    .replace(/<email_strategy>[\s\S]*?<\/email_strategy>/gi, '')
    .trim();
};

/**
 * Hook for handling streaming AI responses
 */
export function useStreamingResponse() {
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle');
  const [sending, setSending] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Parse and process streaming response
   */
  const processStream = useCallback(async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    messageId: string,
    conversationId: string,
    onUpdate: (content: string, thinking?: string) => void
  ): Promise<{ content: string; thinking: string; productLinks: any[] }> => {
    const decoder = new TextDecoder();
    let streamState = createStreamState();
    let productLinks: any[] = [];
    let checkpointCounter = 0;
    let rawStreamContent = '';
    let thinkingContent = '';
    let isInThinkingBlock = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        rawStreamContent += chunk;
        
        // Parse thinking markers
        if (chunk.includes('[THINKING:START]')) {
          isInThinkingBlock = true;
          continue;
        }
        if (chunk.includes('[THINKING:END]')) {
          isInThinkingBlock = false;
          continue;
        }
        
        // Parse thinking chunk content
        const thinkingChunkMatch = chunk.match(/\[THINKING:CHUNK\]([\s\S]*?)(?=\[|$)/);
        if (thinkingChunkMatch) {
          const thinkingText = thinkingChunkMatch[1];
          thinkingContent += thinkingText;
          onUpdate(streamState.fullContent, thinkingContent);
          continue;
        }
        
        // Parse status markers
        const statusMatch = chunk.match(/\[STATUS:(\w+)\]/g);
        if (statusMatch) {
          statusMatch.forEach((match) => {
            const status = match.replace('[STATUS:', '').replace(']', '') as AIStatus;
            setAiStatus(status);
          });
        }
        
        // Clean markers from content
        let cleanChunk = chunk
          .replace(/\[STATUS:\w+\]/g, '')
          .replace(/\[THINKING:START\]/g, '')
          .replace(/\[THINKING:END\]/g, '')
          .replace(/\[THINKING:CHUNK\][\s\S]*?(?=\[|$)/g, '')
          .replace(/\[PRODUCTS:[\s\S]*?\]/g, '')
          .replace(/\[REMEMBER:[^\]]+\]/g, ''); // Remove memory instruction markers
        
        // Only process content chunks if we have actual content and not in thinking
        if (cleanChunk && !isInThinkingBlock) {
          // Aggressively filter out any leaked strategy tags or meta-commentary
          cleanChunk = cleanChunk
            .replace(/<email_strategy>[\s\S]*?<\/email_strategy>/gi, '')
            .replace(/\*\*EMAIL_BRIEF Analysis:\*\*/gi, '')
            .replace(/\*\*Context Analysis:\*\*/gi, '')
            .replace(/\*\*Brief Analysis:\*\*/gi, '')
            .replace(/\*\*Brand Analysis:\*\*/gi, '')
            .replace(/\*\*Audience Psychology:\*\*/gi, '')
            .replace(/\*\*Product Listing:\*\*/gi, '')
            .replace(/\*\*Hero Strategy:\*\*/gi, '')
            .replace(/\*\*Structure Planning:\*\*/gi, '')
            .replace(/\*\*CTA Strategy:\*\*/gi, '')
            .replace(/\*\*Objection Handling:\*\*/gi, '')
            .replace(/\*\*Product Integration:\*\*/gi, '')
            .replace(/^I need to (create|analyze|search for|work through)[\s\S]*?(?=HERO SECTION|EMAIL SUBJECT|SUBJECT LINE)/i, '')
            .replace(/^Let me (start by|analyze|search for|create)[\s\S]*?(?=HERO SECTION|EMAIL SUBJECT|SUBJECT LINE)/i, '')
            .replace(/^Based on (my analysis|the requirements)[\s\S]*?(?=HERO SECTION|EMAIL SUBJECT|SUBJECT LINE)/i, '');
          
          // If chunk still doesn't contain email structure markers, skip it
          // This prevents preamble from being added to content
          const result = processStreamChunk(streamState, cleanChunk);
          streamState = result.state;
          
          // Only update UI when needed (batching for 60fps)
          if (result.shouldRender) {
            onUpdate(streamState.fullContent, thinkingContent);
          }
        }
        
        // Create checkpoint periodically for recovery
        checkpointCounter++;
        if (checkpointCounter % CHECKPOINT_INTERVAL === 0) {
          saveCheckpoint({
            conversationId,
            messageId,
            content: streamState.fullContent,
            timestamp: Date.now(),
            isComplete: false,
          });
        }
      }
      
      // Finalize stream
      streamState = finalizeStream(streamState);
      
      // Post-process: Remove any preamble before the actual email structure
      streamState.fullContent = cleanEmailContent(streamState.fullContent);
      
      // Extract product links from complete stream
      const productMatch = rawStreamContent.match(/\[PRODUCTS:([\s\S]*?)\](?:\s|$)/);
      if (productMatch) {
        try {
          const jsonString = productMatch[1].trim();
          if (jsonString && jsonString.startsWith('[') && jsonString.endsWith(']')) {
            productLinks = JSON.parse(jsonString);
            if (!Array.isArray(productLinks)) {
              productLinks = [];
            }
          }
        } catch (e) {
          console.error('Failed to parse product links:', e);
          productLinks = [];
        }
      }
      
      // Clear checkpoint after successful completion
      clearCheckpoint(messageId);
      
      return {
        content: streamState.fullContent,
        thinking: thinkingContent,
        productLinks
      };
    } catch (streamError) {
      // Try to recover from last checkpoint
      const recovered = loadCheckpoint(messageId);
      if (recovered) {
        console.log('Recovered stream from checkpoint:', recovered);
        return {
          content: recovered.content,
          thinking: thinkingContent,
          productLinks: []
        };
      }
      throw streamError;
    }
  }, []);

  /**
   * Start a new streaming request
   */
  const startStream = useCallback(() => {
    abortControllerRef.current = new AbortController();
    setSending(true);
    setAiStatus('analyzing_brand');
    return abortControllerRef.current;
  }, []);

  /**
   * Stop current streaming request
   */
  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSending(false);
    setAiStatus('idle');
  }, []);

  /**
   * Complete streaming (cleanup)
   */
  const completeStream = useCallback(() => {
    setSending(false);
    setAiStatus('idle');
    abortControllerRef.current = null;
  }, []);

  return {
    aiStatus,
    sending,
    processStream,
    startStream,
    stopStream,
    completeStream,
    setAiStatus,
    sanitizeContent
  };
}

