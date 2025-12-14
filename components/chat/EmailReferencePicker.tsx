'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { Conversation, Message } from '@/types';
import { isStructuredEmailCopy } from '@/lib/email-copy-parser';
import { Search, Mail, Calendar, ChevronRight, Check, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmailReference {
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  content: string;
  preview: string; // First 150 chars for display
  createdAt: string;
}

interface EmailReferencPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  currentConversationId?: string | null;
  onSelect: (reference: EmailReference) => void;
}

interface ConversationWithEmails extends Conversation {
  emails: Message[];
}

export default function EmailReferencePicker({
  open,
  onOpenChange,
  brandId,
  currentConversationId,
  onSelect,
}: EmailReferencPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<ConversationWithEmails[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<{ convId: string; msgId: string } | null>(null);

  // Fetch conversations and their email messages
  const fetchData = useCallback(async () => {
    if (!brandId) return;
    
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Get conversations for this brand (email_copy mode only, excluding current)
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('id, brand_id, user_id, title, model, conversation_type, mode, created_at, updated_at, last_message_preview, last_message_at')
        .eq('brand_id', brandId)
        .eq('mode', 'email_copy')
        .neq('id', currentConversationId || '')
        .order('updated_at', { ascending: false });

      if (convError) throw convError;
      if (!convData || convData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // For each conversation, get assistant messages that contain email structure
      const conversationsWithEmails: ConversationWithEmails[] = [];
      
      for (const conv of convData) {
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('id, conversation_id, role, content, created_at')
          .eq('conversation_id', conv.id)
          .eq('role', 'assistant')
          .order('created_at', { ascending: false })
          .limit(10); // Limit to recent messages

        if (msgError) continue;

        // Filter to only messages that have email structure
        const emailMessages = (messages || []).filter(msg => 
          msg.content && isStructuredEmailCopy(msg.content)
        );

        if (emailMessages.length > 0) {
          conversationsWithEmails.push({
            ...conv,
            emails: emailMessages,
          });
        }
      }

      setConversations(conversationsWithEmails);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [brandId, currentConversationId]);

  // Fetch data when modal opens
  useEffect(() => {
    if (open) {
      fetchData();
      setSearchQuery('');
      setExpandedConversation(null);
      setSelectedEmail(null);
    }
  }, [open, fetchData]);

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => {
      // Search in conversation title
      if (conv.title.toLowerCase().includes(query)) return true;
      // Search in email content
      return conv.emails.some(email => 
        email.content.toLowerCase().includes(query)
      );
    });
  }, [conversations, searchQuery]);

  // Extract preview from email content
  const getEmailPreview = (content: string): string => {
    // Try to extract headline or first meaningful text
    const headlineMatch = content.match(/Headline:\s*(.+?)(?:\n|$)/i);
    if (headlineMatch) return headlineMatch[1].trim();
    
    // Try to get first subject line
    const subjectMatch = content.match(/Subject(?:\s*Line)?:\s*(.+?)(?:\n|$)/i);
    if (subjectMatch) return subjectMatch[1].trim();
    
    // Clean up markdown and get first 120 chars
    const cleaned = content
      .replace(/\*\*[A-Z][A-Z0-9 _-]*\*\*/g, '') // Remove block headers
      .replace(/\*\*/g, '') // Remove bold
      .replace(/\n+/g, ' ') // Collapse newlines
      .trim();
    
    return cleaned.slice(0, 120) + (cleaned.length > 120 ? '...' : '');
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Handle selection
  const handleSelect = () => {
    if (!selectedEmail) return;
    
    const conv = conversations.find(c => c.id === selectedEmail.convId);
    const email = conv?.emails.find(e => e.id === selectedEmail.msgId);
    
    if (conv && email) {
      onSelect({
        conversationId: conv.id,
        conversationTitle: conv.title,
        messageId: email.id,
        content: email.content,
        preview: getEmailPreview(email.content),
        createdAt: email.created_at,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <Mail className="w-5 h-5 text-blue-500" />
              Reference Previous Email
            </DialogTitle>
          </DialogHeader>
          
          {/* Search Input */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations or email content..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[50vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <span className="text-sm text-gray-500">Loading emails...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 px-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-gray-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {searchQuery ? 'No emails found' : 'No previous emails'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {searchQuery 
                    ? 'Try a different search term' 
                    : 'Create some emails first to reference them'}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredConversations.map((conv) => (
                <div key={conv.id} className="group">
                  {/* Conversation Header */}
                  <button
                    onClick={() => setExpandedConversation(
                      expandedConversation === conv.id ? null : conv.id
                    )}
                    className={cn(
                      "w-full px-6 py-3 flex items-center gap-3 text-left transition-colors",
                      expandedConversation === conv.id
                        ? "bg-blue-50/50 dark:bg-blue-950/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    )}
                  >
                    <ChevronRight 
                      className={cn(
                        "w-4 h-4 text-gray-400 transition-transform",
                        expandedConversation === conv.id && "rotate-90"
                      )} 
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {conv.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {conv.emails.length} email{conv.emails.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(conv.updated_at)}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Email List */}
                  {expandedConversation === conv.id && (
                    <div className="bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
                      {conv.emails.map((email, idx) => {
                        const isSelected = selectedEmail?.convId === conv.id && selectedEmail?.msgId === email.id;
                        
                        return (
                          <button
                            key={email.id}
                            onClick={() => setSelectedEmail({ convId: conv.id, msgId: email.id })}
                            className={cn(
                              "w-full px-6 py-3 pl-14 flex items-start gap-3 text-left transition-all",
                              isSelected 
                                ? "bg-blue-100 dark:bg-blue-900/30 border-l-2 border-blue-500"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800/50 border-l-2 border-transparent"
                            )}
                          >
                            <div className={cn(
                              "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors",
                              isSelected
                                ? "border-blue-500 bg-blue-500"
                                : "border-gray-300 dark:border-gray-600"
                            )}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm leading-relaxed line-clamp-2",
                                isSelected 
                                  ? "text-gray-900 dark:text-white" 
                                  : "text-gray-700 dark:text-gray-300"
                              )}>
                                {getEmailPreview(email.content)}
                              </p>
                              <span className="text-xs text-gray-400 mt-1 block">
                                Version {conv.emails.length - idx} • {formatDate(email.created_at)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {selectedEmail 
                ? 'Email selected - click Add to attach'
                : 'Select an email to reference in your message'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSelect}
                disabled={!selectedEmail}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                  selectedEmail
                    ? "bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                )}
              >
                Add Reference
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
