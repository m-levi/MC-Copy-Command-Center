'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CopyIcon, CheckIcon, MailIcon, ClockIcon, SparklesIcon } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface SharedArtifactData {
  id: string;
  title: string;
  content: string;
  version: number;
  created_at: string;
  updated_at: string;
  metadata: {
    version_a_content?: string;
    version_a_approach?: string;
    version_b_content?: string;
    version_b_approach?: string;
    version_c_content?: string;
    version_c_approach?: string;
    selected_variant?: 'a' | 'b' | 'c';
    email_type?: string;
  };
}

export default function SharedEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const shareToken = resolvedParams.token;
  
  const [artifact, setArtifact] = useState<SharedArtifactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<'a' | 'b' | 'c'>('a');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchSharedArtifact() {
      const supabase = createClient();
      
      try {
        // Find artifact by share token in metadata
        const { data, error: fetchError } = await supabase
          .from('artifacts')
          .select('*')
          .eq('metadata->>share_token', shareToken)
          .eq('metadata->>is_shared', 'true')
          .single();

        if (fetchError || !data) {
          setError('This shared email could not be found or has been unshared.');
          return;
        }

        setArtifact(data as SharedArtifactData);
        setSelectedVariant(data.metadata?.selected_variant || 'a');
      } catch (err) {
        console.error('Error fetching shared artifact:', err);
        setError('Something went wrong. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchSharedArtifact();
  }, [shareToken]);

  const getContent = () => {
    if (!artifact) return '';
    const meta = artifact.metadata || {};
    switch (selectedVariant) {
      case 'a': return meta.version_a_content || artifact.content || '';
      case 'b': return meta.version_b_content || '';
      case 'c': return meta.version_c_content || '';
      default: return meta.version_a_content || artifact.content || '';
    }
  };

  const getApproach = () => {
    if (!artifact) return undefined;
    const meta = artifact.metadata || {};
    switch (selectedVariant) {
      case 'a': return meta.version_a_approach;
      case 'b': return meta.version_b_approach;
      case 'c': return meta.version_c_approach;
      default: return meta.version_a_approach;
    }
  };

  const availableVariants = artifact ? (['a', 'b', 'c'] as const).filter(v => {
    const meta = artifact.metadata || {};
    if (v === 'a') return !!(meta.version_a_content || artifact.content);
    if (v === 'b') return !!meta.version_b_content;
    if (v === 'c') return !!meta.version_c_content;
    return false;
  }) : [];

  const handleCopy = async () => {
    const content = getContent();
    const clean = content.replace(/^```\n?/gm, '').replace(/\n?```$/gm, '').trim();
    await navigator.clipboard.writeText(clean);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center animate-pulse">
            <MailIcon className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !artifact) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="max-w-md text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <MailIcon className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Email Not Found
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {error || 'This shared email could not be found.'}
          </p>
        </div>
      </div>
    );
  }

  const content = getContent();
  const approach = getApproach();
  const cleanContent = content.replace(/^```\n?/gm, '').replace(/\n?```$/gm, '').trim();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <MailIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-white">
                {artifact.title}
              </h1>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  {new Date(artifact.updated_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" />
                  v{artifact.version}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              copied
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {copied ? (
              <>
                <CheckIcon className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <CopyIcon className="w-4 h-4" />
                Copy Email
              </>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Variant Selector */}
        {availableVariants.length > 1 && (
          <div className="mb-6 flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Version:</span>
            <div className="flex gap-1">
              {availableVariants.map((v) => (
                <button
                  key={v}
                  onClick={() => setSelectedVariant(v)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                    selectedVariant === v
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Approach Note */}
        {approach && (
          <div className="mb-6 px-4 py-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border-l-2 border-violet-400">
            <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">Approach</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{approach}</p>
          </div>
        )}

        {/* Email Content */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="p-6">
            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
              {cleanContent}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
          Shared via MoonCommerce Command Center
        </div>
      </main>
    </div>
  );
}







