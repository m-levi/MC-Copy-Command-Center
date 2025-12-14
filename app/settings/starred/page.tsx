'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Brand, BrandDocument } from '@/types';

export const dynamic = 'force-dynamic';

export default function StarredEmailsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [starredEmails, setStarredEmails] = useState<BrandDocument[]>([]);
  const [loadingStarred, setLoadingStarred] = useState(false);
  const [showStarDialog, setShowStarDialog] = useState(false);
  const [emailToStar, setEmailToStar] = useState('');
  const [starringEmail, setStarringEmail] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      loadStarredEmails();
    }
  }, [selectedBrandId]);

  const loadBrands = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: brandsData } = await supabase
      .from('brands')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (brandsData && brandsData.length > 0) {
      setBrands(brandsData as unknown as Brand[]);
      setSelectedBrandId(brandsData[0].id);
    }
  };

  const loadStarredEmails = async () => {
    if (!selectedBrandId) return;
    
    setLoadingStarred(true);
    try {
      const { data, error } = await supabase
        .from('brand_documents')
        .select('*')
        .eq('brand_id', selectedBrandId)
        .eq('doc_type', 'example')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStarredEmails(data || []);
    } catch (error: any) {
      console.error('Error loading starred emails:', error);
      toast.error('Failed to load starred emails');
    } finally {
      setLoadingStarred(false);
    }
  };

  const handleUnstarEmail = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('brand_documents')
        .delete()
        .eq('id', emailId);

      if (error) throw error;

      setStarredEmails(prev => prev.filter(e => e.id !== emailId));
      toast.success('Email removed from starred');
    } catch (error: any) {
      console.error('Error removing starred email:', error);
      toast.error('Failed to remove email');
    }
  };

  const handleStarEmail = async () => {
    if (!emailToStar.trim()) {
      toast.error('Please enter email content');
      return;
    }

    if (!selectedBrandId) {
      toast.error('Please select a brand');
      return;
    }

    if (starredEmails.length >= 10) {
      toast.error('You\'ve reached the limit of 10 starred emails. Please remove some first.');
      return;
    }

    setStarringEmail(true);

    try {
      // Generate title from first line
      const firstLine = emailToStar.split('\n')[0]
        .replace(/^#+\s*/, '')
        .replace(/EMAIL SUBJECT LINE:|SUBJECT:/gi, '')
        .trim()
        .substring(0, 100);

      const title = firstLine || 'Email Copy';

      // Generate embedding
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrandId,
          docType: 'example',
          title,
          content: emailToStar,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to star email');
      }

      toast.success('Email starred successfully!');
      setEmailToStar('');
      setShowStarDialog(false);
      await loadStarredEmails();
    } catch (error: any) {
      console.error('Error starring email:', error);
      toast.error('Failed to star email');
    } finally {
      setStarringEmail(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Starred Emails
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your starred email examples that help train the AI
          </p>
        </div>
        <div className="flex items-center gap-3">
          {brands.length > 1 && (
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowStarDialog(true)}
            disabled={starredEmails.length >= 10}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title={starredEmails.length >= 10 ? 'Remove some emails first' : 'Star a new email'}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            Star Email
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              How starred emails improve AI
            </p>
            <p className="text-blue-700 dark:text-blue-200">
              When you star an email, the AI uses it as a reference example to learn your preferred style, tone, and structure. Star 3-10 high-quality emails for best results.
            </p>
          </div>
        </div>
      </div>

      {loadingStarred ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : starredEmails.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">No starred emails yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Start starring your favorite emails in the chat to build your reference library
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {starredEmails.length} of 10 emails starred
            </p>
            {starredEmails.length >= 10 && (
              <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full">
                ⚠️ Limit reached
              </span>
            )}
          </div>
          <div className="space-y-3">
            {starredEmails.map((email) => {
              const preview = email.content.substring(0, 200).replace(/\n/g, ' ');
              const firstLine = email.title || email.content.split('\n')[0].replace(/^#+\s*/, '').substring(0, 80);
              
              return (
                <div
                  key={email.id}
                  className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" viewBox="0 0 24 24">
                          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {firstLine}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                        {preview}...
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(email.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleUnstarEmail(email.id)}
                      className="p-2 text-yellow-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Unstar this email"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Star Email Dialog */}
      {showStarDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
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
                      Star an Email
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Paste email content to add it as a reference example
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowStarDialog(false);
                    setEmailToStar('');
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Content
              </label>
              <textarea
                value={emailToStar}
                onChange={(e) => setEmailToStar(e.target.value)}
                className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none font-mono text-sm"
                placeholder="Paste your email content here..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                {starredEmails.length}/10 emails starred
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowStarDialog(false);
                  setEmailToStar('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStarEmail}
                disabled={starringEmail || !emailToStar.trim()}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {starringEmail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Starring...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    Star Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




















