'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BuilderMessage, CopySample, DoOrDont } from '@/types/brand-builder';
import { CopySampleCard } from './CopySampleCard';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Sparkles,
  Loader2,
  User,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BuilderChatProps {
  messages: BuilderMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  quickActions?: Array<{
    label: string;
    action: string;
  }>;
  onCopySampleFeedback?: (sampleId: string, feedback: 'approve' | 'tweak' | 'reject') => void;
  onApproveOutput?: () => void;
  approveLabel?: string;
  showApproveButton?: boolean;
  currentDraft?: string;
}

export function BuilderChat({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = 'Type your message...',
  quickActions,
  onCopySampleFeedback,
  onApproveOutput,
  approveLabel = 'Approve & Continue',
  showApproveButton = false,
  currentDraft,
}: BuilderChatProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when not loading
  useEffect(() => {
    if (!isLoading && !sending) {
      inputRef.current?.focus();
    }
  }, [isLoading, sending]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setInput('');

    try {
      await onSendMessage(trimmed);
    } finally {
      setSending(false);
    }
  }, [input, sending, onSendMessage]);

  const handleQuickAction = useCallback(async (action: string) => {
    if (sending) return;
    setSending(true);

    try {
      await onSendMessage(action);
    } finally {
      setSending(false);
    }
  }, [sending, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onCopySampleFeedback={onCopySampleFeedback}
            />
          ))}

          {/* Loading indicator */}
          {(isLoading || sending) && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-white rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Current Draft Preview (if provided) */}
      {currentDraft && showApproveButton && (
        <div className="border-t border-gray-200 dark:border-gray-800 bg-emerald-50 dark:bg-emerald-950/20 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                  Current Draft
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                  {currentDraft}
                </p>
              </div>
              <Button
                onClick={onApproveOutput}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
              >
                {approveLabel}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {quickActions && quickActions.length > 0 && !isLoading && !sending && (
        <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">
              Quick responses
            </p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickAction(action.action)}
                  disabled={sending}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-md transition-all disabled:opacity-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="sticky bottom-0 bg-gradient-to-t from-indigo-50 via-indigo-50 to-transparent dark:from-gray-950 dark:via-gray-950 pt-4 pb-6 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-shadow focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500">
            <div className="p-4">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={sending || isLoading}
                rows={1}
                className="w-full text-base bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none resize-none max-h-32 disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-between px-4 pb-4">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Press Enter to send</span>
              </div>

              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending || isLoading}
                size="sm"
                className={cn(
                  'rounded-xl',
                  input.trim()
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                )}
              >
                {sending || isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: BuilderMessage;
  onCopySampleFeedback?: (sampleId: string, feedback: 'approve' | 'tweak' | 'reject') => void;
}

function MessageBubble({ message, onCopySampleFeedback }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="flex items-start gap-3 max-w-[80%]">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-100 dark:to-white text-white dark:text-gray-900 rounded-2xl rounded-tr-md px-5 py-3 shadow-lg">
            <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="flex gap-3 max-w-[90%]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="space-y-4 flex-1">
          {/* Message Content */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-md px-5 py-4 shadow-sm">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="text-gray-700 dark:text-gray-300 mb-3 last:mb-0 leading-relaxed">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900 dark:text-white">
                      {children}
                    </strong>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-4 space-y-1 text-gray-700 dark:text-gray-300">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-4 space-y-1 text-gray-700 dark:text-gray-300">
                      {children}
                    </ol>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="font-bold text-gray-900 dark:text-white mt-3 mb-1">
                      {children}
                    </h3>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>

          {/* Copy Samples */}
          {message.metadata?.copySamples && message.metadata.copySamples.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Copy Samples
              </p>
              <div className="grid gap-3">
                {message.metadata.copySamples.map((sample) => (
                  <CopySampleCard
                    key={sample.id}
                    sample={sample}
                    onFeedback={onCopySampleFeedback}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Suggested Output */}
          {message.metadata?.suggestedOutput && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                Suggested Draft
              </h4>
              <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                {message.metadata.suggestedOutput}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
