'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BrandDocument } from '@/types';
import { CompactEmailPreview } from './EmailPreview';
import toast from 'react-hot-toast';

interface StarredEmailsManagerProps {
  brandId: string;
  onClose: () => void;
  onSelectEmail?: (email: BrandDocument) => void;
}

export default function StarredEmailsManager({
  brandId,
  onClose,
  onSelectEmail,
}: StarredEmailsManagerProps) {
  const [starredEmails, setStarredEmails] = useState<BrandDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<BrandDocument | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadStarredEmails();
  }, [brandId]);

  const loadStarredEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('brand_documents')
        .select('*')
        .eq('brand_id', brandId)
        .eq('doc_type', 'example')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStarredEmails(data || []);
    } catch (error) {
      console.error('Error loading starred emails:', error);
      toast.error('Failed to load starred emails');
    } finally {
      setLoading(false);
    }
  };

  const handleUnstar = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('brand_documents')
        .delete()
        .eq('id', emailId);

      if (error) throw error;

      setStarredEmails(prev => prev.filter(e => e.id !== emailId));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
      
      toast.success('Email removed from favorites');
    } catch (error) {
      console.error('Error removing starred email:', error);
      toast.error('Failed to remove email');
    }
  };

  const handleSelectEmail = (email: BrandDocument) => {
    setSelectedEmail(email);
    onSelectEmail?.(email);
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400 fill-current" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Starred Emails
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {starredEmails.length} {starredEmails.length === 1 ? 'email' : 'emails'} saved as reference examples
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-800 px-6 py-3">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">How Starred Emails Improve AI Results</p>
              <p className="text-blue-700 dark:text-blue-200">
                When you star an email, it's added to your brand's knowledge base. The AI automatically uses these examples to learn your preferred style, tone, and structure, making future emails better aligned with your standards.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Email List */}
          <div className="w-2/5 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : starredEmails.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <p className="text-gray-600 dark:text-gray-400 mb-2">No starred emails yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Star your favorite emails to build a reference library
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {starredEmails.map((email) => (
                  <CompactEmailPreview
                    key={email.id}
                    content={email.content}
                    timestamp={email.created_at}
                    onUnstar={() => handleUnstar(email.id)}
                    onClick={() => handleSelectEmail(email)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Email Preview */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950">
            {selectedEmail ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {selectedEmail.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Starred on {new Date(selectedEmail.created_at).toLocaleDateString()} at{' '}
                    {new Date(selectedEmail.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="prose prose-blue dark:prose-invert max-w-none">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300">
                      {selectedEmail.content}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p>Select an email to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              💡 <strong>Tip:</strong> Star 3-5 high-quality emails for best AI learning results
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

