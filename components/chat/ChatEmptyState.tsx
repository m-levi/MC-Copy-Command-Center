'use client';

import { ConversationMode } from '@/types';
import { useChatSuggestions, ChatSuggestion } from '@/hooks/useChatSuggestions';
import { RefreshCw, Sparkles, Lightbulb, Pencil, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatEmptyStateProps {
  mode: ConversationMode;
  brandId?: string | null;
  onNewConversation: () => void;
  onSuggestionClick?: (prompt: string) => void;
  isPersonalAI?: boolean;
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  campaign: { 
    bg: 'bg-blue-50 dark:bg-blue-950/30', 
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800/50'
  },
  content: { 
    bg: 'bg-purple-50 dark:bg-purple-950/30', 
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800/50'
  },
  strategy: { 
    bg: 'bg-emerald-50 dark:bg-emerald-950/30', 
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800/50'
  },
  optimization: { 
    bg: 'bg-amber-50 dark:bg-amber-950/30', 
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/50'
  },
};

function SuggestionCard({ 
  suggestion, 
  onClick,
  index 
}: { 
  suggestion: ChatSuggestion; 
  onClick: () => void;
  index: number;
}) {
  const colors = categoryColors[suggestion.category] || categoryColors.content;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full text-left p-4 rounded-xl border transition-all duration-200",
        "bg-white dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-800/70",
        "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700",
        "hover:shadow-md hover:-translate-y-0.5",
        "animate-in fade-in slide-in-from-bottom-2"
      )}
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'both' }}
    >
      {/* Category indicator */}
      <div className={cn(
        "absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide",
        colors.bg, colors.text
      )}>
        {suggestion.category}
      </div>
      
      {/* Icon */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl",
          colors.bg
        )}>
          {suggestion.icon}
        </div>
        
        <div className="flex-1 min-w-0 pr-16">
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {suggestion.title}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {suggestion.description}
          </p>
        </div>
      </div>
      
      {/* Hover arrow */}
      <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="w-4 h-4 text-blue-500" />
      </div>
    </button>
  );
}

function SuggestionSkeleton({ index }: { index: number }) {
  return (
    <div 
      className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 animate-pulse"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
        </div>
      </div>
    </div>
  );
}

export default function ChatEmptyState({ 
  mode, 
  brandId,
  onNewConversation, 
  onSuggestionClick,
  isPersonalAI = false 
}: ChatEmptyStateProps) {
  const { suggestions, isLoading, refresh } = useChatSuggestions({
    brandId: brandId || null,
    mode,
    enabled: !isPersonalAI && !!brandId,
  });

  // Personal AI mode: show a different empty state
  if (isPersonalAI) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-2xl px-4 sm:px-6">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center text-4xl shadow-lg">
              ✨
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            AI Assistant
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
            Chat with any AI model directly. No brand context, no templates - just you and the AI.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left">
              <div className="text-xl mb-2">💡</div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">Ask anything</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Get help with any topic</div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left">
              <div className="text-xl mb-2">✍️</div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">Write & edit</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Content, code, and more</div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left">
              <div className="text-xl mb-2">🧠</div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">Brainstorm</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Generate creative ideas</div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left">
              <div className="text-xl mb-2">📊</div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">Analyze</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Break down complex topics</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasSuggestions = suggestions.length > 0 || isLoading;
  const ModeIcon = mode === 'planning' ? Lightbulb : Pencil;

  return (
    <div className="flex items-center justify-center h-full px-4 sm:px-6">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm",
              mode === 'planning' 
                ? "bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30" 
                : "bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30"
            )}>
              <ModeIcon className={cn(
                "w-8 h-8",
                mode === 'planning' 
                  ? "text-emerald-600 dark:text-emerald-400" 
                  : "text-blue-600 dark:text-blue-400"
              )} />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {mode === 'planning' ? 'What can I help you plan?' : 'What would you like to create?'}
          </h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            {mode === 'planning' 
              ? 'I can help with strategy, brainstorming, campaign planning, and marketing advice.'
              : 'Describe the email you want and I\'ll create high-converting copy tailored to your brand.'}
          </p>
        </div>

        {/* Suggestions Section */}
        {hasSuggestions && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="font-medium">Suggested for you</span>
              </div>
              {!isLoading && (
                <button
                  onClick={refresh}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isLoading ? (
                <>
                  <SuggestionSkeleton index={0} />
                  <SuggestionSkeleton index={1} />
                  <SuggestionSkeleton index={2} />
                  <SuggestionSkeleton index={3} />
                </>
              ) : (
                suggestions.map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    index={index}
                    onClick={() => onSuggestionClick?.(suggestion.prompt)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Fallback tips when no suggestions */}
        {!hasSuggestions && !isLoading && (
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {mode === 'planning' ? '💡 Quick start ideas:' : '✉️ Tips for great emails:'}
            </p>
            {mode === 'planning' ? (
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>Ask for marketing advice on specific topics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>Brainstorm campaign ideas for upcoming events</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>Plan re-engagement or retention strategies</span>
                </li>
              </ul>
            ) : (
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Be specific about your product or offer</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Mention your target audience</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>Include key details like discounts or timeframes</span>
                </li>
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function NoConversationState({ onNewConversation }: { onNewConversation: () => void }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md px-4">
        <div className="mb-6">
          <svg
            className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No conversation selected
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Select a conversation from the sidebar or start a new one to begin creating email copy.
        </p>
        <button
          onClick={() => onNewConversation()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm hover:shadow-md"
        >
          Start New Conversation
        </button>
      </div>
    </div>
  );
}

export function PreparingResponseIndicator() {
  return (
    <div className="mb-3 inline-block">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
          <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
          <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
        </div>
        <span className="font-medium">preparing response</span>
      </div>
    </div>
  );
}
