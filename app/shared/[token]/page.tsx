'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Message, Conversation } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

export default function SharedConversationPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const router = useRouter();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [share, setShare] = useState<any>(null);

  useEffect(() => {
    const loadSharedConversation = async () => {
      try {
        console.log('[Shared Page] Fetching conversation for token:', token);
        
        // Fetch shared conversation via API
        const response = await fetch(`/api/shared/${token}`);
        
        console.log('[Shared Page] Response received:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        // Get response text first to see what we actually received
        const responseText = await response.text();
        console.log('[Shared Page] Raw response text:', responseText);
        
        let data;
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          console.error('[Shared Page] Failed to parse JSON:', parseError);
          console.error('[Shared Page] Response was:', responseText);
          setError('Server returned invalid response');
          return;
        }
        
        console.log('[Shared Page] Parsed response data:', {
          hasShare: !!data.share,
          hasConversation: !!data.conversation,
          hasMessages: !!data.messages,
          messageCount: data.messages?.length,
          error: data.error,
          fullData: data
        });

        if (!response.ok) {
          console.error('[Shared Page] API returned error:', data);
          setError(data.error || 'Failed to load shared conversation');
          return;
        }

        setShare(data.share);
        setConversation(data.conversation);
        setMessages(data.messages || []);
        
        console.log('[Shared Page] State updated successfully');
      } catch (err) {
        console.error('[Shared Page] Error loading shared conversation:', err);
        setError('Failed to load shared conversation');
      } finally {
        setLoading(false);
      }
    };

    loadSharedConversation();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading shared conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <Toaster position="top-right" />
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 text-red-500 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {error}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This link may be invalid, expired, or you don't have permission to view it.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Conversation not found</div>
      </div>
    );
  }

  const permissionText = share?.permission_level === 'view' 
    ? 'View Only' 
    : share?.permission_level === 'comment' 
    ? 'Can Comment' 
    : 'Can Edit';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Shared Conversation
                </span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {conversation.title || 'Untitled Conversation'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
                {permissionText}
              </span>
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {share?.expires_at && share.expires_at && new Date(share.expires_at) > new Date() && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium">
                This link expires on {new Date(share.expires_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No messages in this conversation yet.
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div 
                key={message.id} 
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden ${
                  message.role === 'assistant' ? 'border-2 border-purple-200 dark:border-purple-800' : ''
                }`}
              >
                {/* Message Header */}
                <div className={`px-6 py-3 border-b border-gray-200 dark:border-gray-700 ${
                  message.role === 'assistant' 
                    ? 'bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20' 
                    : 'bg-gray-50 dark:bg-gray-700/50'
                }`}>
                  <div className="flex items-center gap-3">
                    {message.role === 'user' ? (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white shadow-md">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-md">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {message.role === 'user' ? 'Request' : 'Generated Email'}
                        </span>
                        {message.role === 'assistant' && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                            AI Output
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(message.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message Content */}
                <div className="p-6">
                  <div className={`prose dark:prose-invert max-w-none ${
                    message.role === 'assistant' 
                      ? 'prose-lg prose-headings:text-gray-900 dark:prose-headings:text-gray-100' 
                      : ''
                  }`}>
                    <div className="whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300 leading-relaxed">
                      {message.content}
                    </div>
                  </div>
                </div>

                {/* Assistant message footer with actions */}
                {message.role === 'assistant' && share?.permission_level !== 'view' && (
                  <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      <span>Comments coming soon...</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p className="mb-2">
              Shared by{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {share?.shared_by_email || 'a team member'}
              </span>
            </p>
            <p>
              {share?.permission_level === 'view' && 'You can view this conversation'}
              {share?.permission_level === 'comment' && 'You can view and comment on this conversation'}
              {share?.permission_level === 'edit' && 'You can view, comment, and edit this conversation'}
            </p>
            <div className="mt-4">
              <button
                onClick={() => router.push('/login')}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Sign in to access full features →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

