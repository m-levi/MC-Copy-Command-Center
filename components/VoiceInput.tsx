'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

interface VoiceInputProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  disabled?: boolean;
  onStateChange?: (isRecording: boolean) => void;
}

export default function VoiceInput({ onTranscript, disabled, onStateChange }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startListening = useCallback(async () => {
    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    try {
      console.log('[Voice] Starting Speech Recognition...');
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('[Voice] ✅ Recognition started successfully');
        setIsListening(true);
        onStateChange?.(true);
        setDuration(0);
        timerRef.current = setInterval(() => {
          setDuration(d => d + 1);
        }, 1000);
        toast.success('Listening...', { id: 'voice-status', duration: 2000 });
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          onTranscript(finalTranscript, true);
        } else if (interimTranscript) {
          onTranscript(interimTranscript, false);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[Voice] ❌ Recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Check browser permissions.', { duration: 4000 });
        } else if (event.error === 'no-speech') {
          toast('No speech detected', { icon: '🔇' });
        } else if (event.error !== 'aborted') {
          toast.error(`Voice error: ${event.error}`);
        }
        
        stopListening();
      };

      recognition.onend = () => {
        console.log('[Voice] Recognition ended');
        if (isListening) {
          stopListening();
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      
    } catch (error: any) {
      console.error('[Voice] Failed to start:', error);
      toast.error('Failed to start voice input');
    }
  }, [onTranscript, onStateChange, isListening]);

  const stopListening = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    setIsListening(false);
    onStateChange?.(false);
    toast.dismiss('voice-status');
  }, [onStateChange]);

  const handleClick = () => {
    if (disabled) return;
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Recording UI
  if (isListening) {
    return (
      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 rounded-full pl-3 pr-1 py-1 border border-red-200 dark:border-red-800/50 animate-in fade-in slide-in-from-right-2 duration-200">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        
        <span className="text-xs font-mono font-medium text-red-600 dark:text-red-400 tabular-nums">
          {formatTime(duration)}
        </span>
        
        <div className="flex items-center gap-px h-4 mx-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-0.5 bg-red-500 dark:bg-red-400 rounded-full animate-pulse"
              style={{
                height: `${40 + Math.random() * 60}%`,
                animationDelay: `${i * 150}ms`,
                animationDuration: '500ms'
              }}
            />
          ))}
        </div>
        
        <button
          onClick={stopListening}
          className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors ml-1"
          title="Stop listening"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200
        bg-gray-100 dark:bg-gray-800 
        text-gray-500 dark:text-gray-400 
        hover:bg-red-50 dark:hover:bg-red-900/30 
        hover:text-red-500 dark:hover:text-red-400
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95
      `}
      title="Start voice input"
      aria-label="Start voice input"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    </button>
  );
}
