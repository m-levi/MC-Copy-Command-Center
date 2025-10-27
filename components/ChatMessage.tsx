'use client';

import { Message } from '@/types';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import EmailSectionCard, { parseEmailSections } from './EmailSectionCard';
import MessageEditor from './MessageEditor';

interface ChatMessageProps {
  message: Message;
  onRegenerate?: () => void;
  onRegenerateSection?: (sectionType: string, sectionTitle: string) => void;
  onEdit?: (newContent: string) => void;
  onReaction?: (reaction: 'thumbs_up' | 'thumbs_down') => void;
  isRegenerating?: boolean;
}

export default function ChatMessage({
  message,
  onRegenerate,
  onRegenerateSection,
  onEdit,
  onReaction,
  isRegenerating = false,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showSections, setShowSections] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [reaction, setReaction] = useState<'thumbs_up' | 'thumbs_down' | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = (newContent: string) => {
    setIsEditing(false);
    onEdit?.(newContent);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleReaction = (reactionType: 'thumbs_up' | 'thumbs_down') => {
    setReaction(reactionType);
    onReaction?.(reactionType);
  };

  const isUser = message.role === 'user';
  const emailSections = !isUser ? parseEmailSections(message.content) : null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div
        className={`
          max-w-[85%] rounded-lg transition-all
          ${isUser ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2.5 shadow-md' : 'w-full'}
        `}
      >
        {isUser ? (
          <div className="w-full">
            {isEditing ? (
              <MessageEditor
                initialContent={message.content}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
              />
            ) : (
              <div>
                <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-xs opacity-70">
                    {new Date(message.created_at).toLocaleTimeString()}
                    {message.edited_at && ' (edited)'}
                  </p>
                  {onEdit && (
                    <button
                      onClick={handleEdit}
                      className="text-xs opacity-0 group-hover:opacity-100 hover:underline transition-opacity"
                      title="Edit message"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Action Toolbar for AI Messages */}
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-gray-500">
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
              <div className="flex items-center gap-1">
                {emailSections && (
                  <button
                    onClick={() => setShowSections(!showSections)}
                    className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    title={showSections ? 'Show markdown view' : 'Show sections view'}
                  >
                    {showSections ? (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        Markdown
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        Sections
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  title="Copy all"
                >
                  {copied ? (
                    <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    disabled={isRegenerating}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Regenerate"
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-gray-600 dark:text-gray-400 ${isRegenerating ? 'animate-spin' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
                {onReaction && (
                  <>
                    <button
                      onClick={() => handleReaction('thumbs_up')}
                      className={`p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors ${reaction === 'thumbs_up' ? 'bg-green-100 dark:bg-green-900/30' : ''}`}
                      title="Good response"
                    >
                      <svg className={`w-3.5 h-3.5 ${reaction === 'thumbs_up' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleReaction('thumbs_down')}
                      className={`p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors ${reaction === 'thumbs_down' ? 'bg-red-100 dark:bg-red-900/30' : ''}`}
                      title="Needs improvement"
                    >
                      <svg className={`w-3.5 h-3.5 ${reaction === 'thumbs_down' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Message Content */}
            {emailSections && showSections ? (
              <div className="space-y-1">
                {emailSections.map((section, index) => (
                  <EmailSectionCard
                    key={index}
                    section={section}
                    onRegenerateSection={onRegenerateSection || (() => {})}
                    isRegenerating={isRegenerating}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
                <div className="prose prose-sm max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-900 dark:prose-p:text-gray-100 prose-li:text-gray-900 dark:prose-li:text-gray-100 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-code:text-gray-900 dark:prose-code:text-gray-100 prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-pre:font-mono prose-pre:text-xs prose-pre:text-gray-900 dark:prose-pre:text-gray-100 text-gray-900 dark:text-gray-100">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


