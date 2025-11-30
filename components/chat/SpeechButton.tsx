'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MicIcon, SquareIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Speech recognition types
interface CustomSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: CustomSpeechRecognition, ev: Event) => void) | null;
  onend: ((this: CustomSpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: CustomSpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: CustomSpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

type SpeechRecognitionResultList = {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
};

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

export interface SpeechButtonProps {
  /** Callback when transcript is received. isFinal indicates if it's a final result or interim. */
  onTranscript: (text: string, isFinal: boolean) => void;
  /** Callback when recording state changes */
  onStateChange?: (isRecording: boolean) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Speech input button using AI Elements styling with full functionality.
 * Supports interim results and recording state callbacks.
 */
export function SpeechButton({
  onTranscript,
  onStateChange,
  disabled,
  className,
}: SpeechButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [duration, setDuration] = useState(0);
  const recognitionRef = useRef<CustomSpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use refs for callbacks to avoid recreating recognition on every render
  const onTranscriptRef = useRef(onTranscript);
  const onStateChangeRef = useRef(onStateChange);
  
  // Keep refs in sync with props
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);
  
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  // Initialize speech recognition once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    
    // Only create if we don't already have one
    if (recognitionRef.current) return;
    
    const recognition = new SpeechRecognitionAPI() as CustomSpeechRecognition;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      onStateChangeRef.current?.(true);
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    };

    recognition.onend = () => {
      setIsListening(false);
      onStateChangeRef.current?.(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onTranscriptRef.current(finalTranscript, true);
      } else if (interimTranscript) {
        onTranscriptRef.current(interimTranscript, false);
      }
    };

    recognition.onerror = (event) => {
      console.error('[SpeechButton] Recognition error:', event.error);
      setIsListening(false);
      onStateChangeRef.current?.(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore errors on cleanup
        }
        recognitionRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []); // Empty dependency array - only run once on mount

  const toggleListening = useCallback(async () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Request microphone permission explicitly before starting
      try {
        // This triggers the permission prompt if not already granted
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately - we just needed to trigger permission
        stream.getTracks().forEach(track => track.stop());
        
        // Now start recognition
        recognitionRef.current.start();
      } catch (err) {
        console.error('[SpeechButton] Microphone permission denied:', err);
        // Could show a user-friendly message here
      }
    }
  }, [isListening]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording UI - expanded state
  if (isListening) {
    return (
      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 rounded-full pl-3 pr-1 py-1 border border-red-200 dark:border-red-800/50 animate-in fade-in slide-in-from-right-2 duration-200">
        {/* Pulsing indicator */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        
        {/* Duration */}
        <span className="text-xs font-mono font-medium text-red-600 dark:text-red-400 tabular-nums">
          {formatTime(duration)}
        </span>
        
        {/* Waveform animation */}
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
        
        {/* Stop button */}
        <Button
          onClick={toggleListening}
          size="icon"
          variant="ghost"
          className="h-7 w-7 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full ml-1"
          title="Stop listening"
        >
          <SquareIcon className="h-3 w-3" fill="currentColor" />
        </Button>
      </div>
    );
  }

  // Default button state
  return (
    <Button
      onClick={toggleListening}
      disabled={disabled || !isSupported}
      size="icon"
      variant="ghost"
      className={cn(
        "h-9 w-9 rounded-full transition-all duration-200",
        "bg-gray-100 dark:bg-gray-800",
        "text-gray-500 dark:text-gray-400",
        "hover:bg-red-50 dark:hover:bg-red-900/30",
        "hover:text-red-500 dark:hover:text-red-400",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      title={isSupported ? "Start voice input" : "Voice input not supported"}
    >
      <MicIcon className="h-5 w-5" />
    </Button>
  );
}

export default SpeechButton;

