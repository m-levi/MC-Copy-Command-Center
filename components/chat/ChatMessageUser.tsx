'use client';

import { useState, memo } from 'react';
import { Message, MessageAttachment } from '@/types';
import MessageEditor from '../MessageEditor';
import toast from 'react-hot-toast';
import { FileTextIcon, ImageIcon, FileIcon } from 'lucide-react';

interface ChatMessageUserProps {
  message: Message;
  onEdit?: (newContent: string) => void;
  isGrouped?: boolean; // Is this message grouped with previous from same user
}

const ChatMessageUserBase = function ChatMessageUser({
  message,
  onEdit,
  isGrouped = false,
}: ChatMessageUserProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const messageContent = message.content ?? '';
  const attachments = message.metadata?.attachments || [];
  const formattedTimestamp = new Date(message.created_at).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  // Get user display name - fallback to "You" if no profile
  const userName = message.user?.full_name || message.user?.email?.split('@')[0] || 'You';

  // Get icon for attachment type
  const getAttachmentIcon = (attachment: MessageAttachment) => {
    if (attachment.type === 'image') {
      return <ImageIcon className="w-3.5 h-3.5" />;
    }
    if (attachment.mimeType === 'application/pdf') {
      return <FileTextIcon className="w-3.5 h-3.5" />;
    }
    return <FileIcon className="w-3.5 h-3.5" />;
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(messageContent);
    setCopied(true);
    toast.success('Copied to clipboard!');
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

  return (
    <div className={`flex w-full justify-end group animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards ${isGrouped ? 'mb-1' : 'mb-6 sm:mb-8'}`}>
      <div className="flex flex-col items-end max-w-[85%] sm:max-w-[70%]">
        {/* Small sender name above message */}
        {!isGrouped && (
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {userName}
            </span>
          </div>
        )}
        
        {/* Message bubble - consistent blue color */}
        <div className="bg-blue-600 dark:bg-blue-700 text-white rounded-2xl rounded-tr-sm px-5 py-3.5 transition-all shadow-sm">
          {/* Attachment indicators */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2.5 pb-2.5 border-b border-blue-500/30">
              {attachments.map((attachment, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/40 rounded-lg text-xs font-medium"
                  title={`${attachment.name}${attachment.size ? ` (${formatFileSize(attachment.size)})` : ''}`}
                >
                  {getAttachmentIcon(attachment)}
                  <span className="max-w-[120px] truncate">{attachment.name}</span>
                </div>
              ))}
            </div>
          )}
          
          {isEditing ? (
            <MessageEditor
              initialContent={messageContent}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
            />
          ) : (
            <p className="whitespace-pre-wrap break-words text-[15px] sm:text-base leading-relaxed font-normal text-white">
              {messageContent}
            </p>
          )}
        </div>
        
        {/* User message actions - visible on hover (desktop), always visible on mobile */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
          <span>{formattedTimestamp}</span>
          {message.edited_at && message.edited_at !== message.created_at && (
            <span className="italic opacity-80">(Edited)</span>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              title="Copy message"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? 'Copied!' : 'Copy'}
            </button>
            {onEdit && !isEditing && (
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                title="Edit message"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatMessageUser = memo(ChatMessageUserBase);
