'use client';

import { useState } from 'react';

interface ConversationAnalytics {
  messageCount: number;
  wordCount?: number;
  tokensUsed?: number;
  lastActivityMinutesAgo?: number;
}

interface ConversationAnalyticsBadgeProps {
  analytics: ConversationAnalytics;
  compact?: boolean;
}

export default function ConversationAnalyticsBadge({
  analytics,
  compact = false
}: ConversationAnalyticsBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getActivityColor = () => {
    if (!analytics.lastActivityMinutesAgo) return 'text-gray-500';
    if (analytics.lastActivityMinutesAgo < 5) return 'text-green-500';
    if (analytics.lastActivityMinutesAgo < 60) return 'text-blue-500';
    if (analytics.lastActivityMinutesAgo < 1440) return 'text-yellow-500';
    return 'text-gray-500';
  };

  const formatActivity = () => {
    if (!analytics.lastActivityMinutesAgo) return 'No activity';
    const minutes = analytics.lastActivityMinutesAgo;
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${Math.floor(minutes)}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  if (compact) {
    return (
      <div 
        className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className="flex items-center gap-0.5">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
          {analytics.messageCount}
        </span>

        {analytics.wordCount !== undefined && (
          <span className="flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            {analytics.wordCount > 1000 ? `${(analytics.wordCount / 1000).toFixed(1)}k` : analytics.wordCount}
          </span>
        )}

        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-[10px] rounded shadow-lg whitespace-nowrap z-50">
            {analytics.messageCount} messages • {analytics.wordCount || 0} words
            {analytics.tokensUsed && ` • ${analytics.tokensUsed} tokens`}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Messages */}
      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
        </svg>
        <span className="font-medium">{analytics.messageCount}</span>
      </div>

      {/* Words */}
      {analytics.wordCount !== undefined && (
        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
          <span className="font-medium">
            {analytics.wordCount > 1000 ? `${(analytics.wordCount / 1000).toFixed(1)}k` : analytics.wordCount}
          </span>
        </div>
      )}

      {/* Tokens */}
      {analytics.tokensUsed !== undefined && (
        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">
            {analytics.tokensUsed > 1000 ? `${(analytics.tokensUsed / 1000).toFixed(1)}k` : analytics.tokensUsed}
          </span>
        </div>
      )}

      {/* Activity */}
      {analytics.lastActivityMinutesAgo !== undefined && (
        <div className={`flex items-center gap-1 ${getActivityColor()}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
          <span className="font-medium">{formatActivity()}</span>
        </div>
      )}
    </div>
  );
}

