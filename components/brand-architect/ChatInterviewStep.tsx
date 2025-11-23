'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useBrandArchitect } from './BrandArchitectContext';
import { ChatMessage } from '@/types/brand-architect';
import WizardChatInput from './WizardChatInput';
import WizardChatMessage from './WizardChatMessage';

export default function ChatInterviewStep() {
  const { state, dispatch } = useBrandArchitect();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      // Smooth scroll behavior
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [state.chatHistory, streamingMessage, state.isProcessing]);

  const simulateStreamingResponse = (fullContent: string, onComplete: () => void) => {
    let currentText = "";
    const speed = 15; // ms per char
    
    // Create a temporary ID for the streaming message
    const tempId = 'streaming-' + Date.now();
    
    // Set initial empty streaming message
    setStreamingMessage("");

    let i = 0;
    const interval = setInterval(() => {
        if (i < fullContent.length) {
            currentText += fullContent.charAt(i);
            setStreamingMessage(currentText);
            i++;
        } else {
            clearInterval(interval);
            setStreamingMessage(null);
            onComplete();
        }
    }, speed);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // 1. Add User Message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });
    
    // 2. Set Processing State (shows typing indicator)
    dispatch({ type: 'SET_PROCESSING', payload: true });

    // 3. Mock API Response Logic
    // In a real app, this would be an API call.
    // We simulate a network delay, then a "streaming" effect.
    
    setTimeout(() => {
      // Determine next response based on conversation length
      const userMsgCount = state.chatHistory.filter(m => m.role === 'user').length + 1;
      let responseContent = "";
      
      if (userMsgCount >= 3) {
          responseContent = "Great! I think I have a good sense of your brand voice now. Let's move on to the calibration phase where we'll test some copy variations.";
      } else {
          responseContent = userMsgCount === 1 
            ? "That helps a lot. Now, regarding emojis: how strictly do you avoid them in professional communications? Or do you use them to add flavor?" 
            : "Understood. One last question before we test: Are we aiming for a funny, witty tone, or something more serious and authoritative?";
      }

      // Start "streaming" effect
      // We keep isProcessing=true while "waiting" for API, 
      // but once we have the text, we stop "processing" (dots) and start "streaming" (typing text)
      // Actually, let's keep processing=true until stream starts to avoid flicker
      
      dispatch({ type: 'SET_PROCESSING', payload: false }); // Stop "..." dots
      
      simulateStreamingResponse(responseContent, () => {
          // When streaming is done, add the final message to state
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            payload: {
              id: Date.now().toString(),
              role: 'assistant',
              content: responseContent,
              timestamp: Date.now(),
            },
          });

          // If this was the last step, trigger navigation
          if (userMsgCount >= 3) {
              setTimeout(() => {
                   dispatch({ type: 'SET_STEP', payload: 'calibration' });
                   // Init calibration data
                   dispatch({
                        type: 'START_CALIBRATION',
                        payload: {
                            roundNumber: 1,
                            options: [
                                {
                                    id: 'A',
                                    label: 'Option A',
                                    content: "Subject: You're going to love this.\n\nHi [Name],\n\nWe've got something special for you. It's bold, it's new, and it's exactly what you've been waiting for. Dive in and see what all the fuss is about.",
                                    style_notes: "Direct, punchy, slightly mysterious."
                                },
                                {
                                    id: 'B',
                                    label: 'Option B',
                                    content: "Subject: A little treat to brighten your day ✨\n\nHi [Name]!\n\nWe hope you're having a wonderful week. We wanted to share our latest creation with you - crafted with care and designed to bring a smile to your face.",
                                    style_notes: "Warm, friendly, emoji-inclusive."
                                }
                            ]
                        }
                    });
              }, 1000);
          }
      });

    }, 1500); // 1.5s simulated network delay
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800" ref={scrollRef}>
        {/* Welcome / Context Setter if empty history? No, Wizard usually starts with one msg from IngestionStep */}
        
        {state.chatHistory.map((msg) => (
          <WizardChatMessage key={msg.id} message={msg} />
        ))}

        {/* Streaming Message (Typing Effect) */}
        {streamingMessage && (
            <WizardChatMessage 
                message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: streamingMessage,
                    timestamp: Date.now()
                }} 
            />
        )}

        {/* Processing Indicator (Three dots) */}
        {state.isProcessing && !streamingMessage && (
           <WizardChatMessage 
                message={{
                    id: 'processing',
                    role: 'assistant',
                    content: '',
                    timestamp: Date.now()
                }} 
                isTyping={true}
            />
        )}
        
        <div className="h-4" /> {/* Spacer at bottom */}
      </div>

      {/* Input Area */}
      <div className="p-4 sm:p-6 bg-white dark:bg-gray-900/50 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800/50 sticky bottom-0 z-10">
        <WizardChatInput 
            onSend={handleSendMessage} 
            disabled={state.isProcessing || !!streamingMessage}
            isGenerating={state.isProcessing || !!streamingMessage}
            autoFocus={true}
        />
      </div>
    </div>
  );
}
