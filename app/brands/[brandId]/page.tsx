'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Brand, BrandDocument } from '@/types';
import { useBrandAutoSave } from '@/hooks/useBrandAutoSave';
import BrandDocumentManager from '@/components/BrandDocumentManager';
import StarredEmailsManager from '@/components/StarredEmailsManager';
import StyleGuideWizard from '@/components/StyleGuideWizard';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export default function BrandDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  const supabase = createClient();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStarredEmails, setShowStarredEmails] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [brandDetails, setBrandDetails] = useState('');
  const [brandGuidelines, setBrandGuidelines] = useState('');
  const [copywritingStyleGuide, setCopywritingStyleGuide] = useState('');

  // Auto-save hook
  const { saveStatus, saveBrand, hasUnsavedChanges } = useBrandAutoSave({
    brandId,
    debounceMs: 500,
  });

  // Load brand data
  useEffect(() => {
    loadBrand();
  }, [brandId]);

  const loadBrand = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (error) throw error;

      if (data) {
        setBrand(data);
        setName(data.name || '');
        setWebsiteUrl(data.website_url || '');
        setBrandDetails(data.brand_details || '');
        setBrandGuidelines(data.brand_guidelines || '');
        setCopywritingStyleGuide(data.copywriting_style_guide || '');
      }
    } catch (error) {
      logger.error('Error loading brand:', error);
      toast.error('Failed to load brand details');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  // Auto-save handlers - debounced
  useEffect(() => {
    if (!brand || loading) return;
    
    const hasChanges = 
      name !== brand.name ||
      websiteUrl !== (brand.website_url || '') ||
      brandDetails !== (brand.brand_details || '') ||
      brandGuidelines !== (brand.brand_guidelines || '') ||
      copywritingStyleGuide !== (brand.copywriting_style_guide || '');

    if (hasChanges) {
      saveBrand({
        name,
        website_url: websiteUrl,
        brand_details: brandDetails,
        brand_guidelines: brandGuidelines,
        copywriting_style_guide: copywritingStyleGuide,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, websiteUrl, brandDetails, brandGuidelines, copywritingStyleGuide]);

  // Export to markdown
  const handleExport = async () => {
    if (!brand) return;

    try {
      // Load all documents
      const { data: documents } = await supabase
        .from('brand_documents')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });

      // Load starred emails (example type documents)
      const { data: starredEmails } = await supabase
        .from('brand_documents')
        .select('*')
        .eq('brand_id', brandId)
        .eq('doc_type', 'example')
        .order('created_at', { ascending: false });

      // Generate markdown content
      let markdown = `# ${brand.name}\n\n`;
      markdown += `**Exported:** ${new Date().toLocaleString()}\n\n`;
      
      if (brand.website_url) {
        markdown += `**Website:** ${brand.website_url}\n\n`;
      }

      markdown += `---\n\n`;

      // Brand Details
      if (brand.brand_details) {
        markdown += `## Brand Details\n\n${brand.brand_details}\n\n`;
      }

      // Brand Guidelines
      if (brand.brand_guidelines) {
        markdown += `## Brand Guidelines\n\n${brand.brand_guidelines}\n\n`;
      }

      // Copywriting Style Guide
      if (brand.copywriting_style_guide) {
        markdown += `## Copywriting Style Guide\n\n${brand.copywriting_style_guide}\n\n`;
      }

      // Knowledge Base Documents
      if (documents && documents.length > 0) {
        markdown += `---\n\n## Knowledge Base\n\n`;
        
        // Group by type
        const byType: Record<string, BrandDocument[]> = {};
        documents.forEach(doc => {
          if (!byType[doc.doc_type]) {
            byType[doc.doc_type] = [];
          }
          byType[doc.doc_type].push(doc);
        });

        const typeLabels: Record<string, string> = {
          example: 'Example Emails',
          competitor: 'Competitor Analysis',
          research: 'Research',
          testimonial: 'Customer Testimonials',
        };

        Object.entries(byType).forEach(([type, docs]) => {
          markdown += `### ${typeLabels[type] || type}\n\n`;
          docs.forEach(doc => {
            markdown += `#### ${doc.title}\n\n`;
            markdown += `*Added: ${new Date(doc.created_at).toLocaleDateString()}*\n\n`;
            markdown += `${doc.content}\n\n`;
            markdown += `---\n\n`;
          });
        });
      }

      // Starred Emails
      if (starredEmails && starredEmails.length > 0) {
        markdown += `---\n\n## Starred Emails\n\n`;
        markdown += `*${starredEmails.length} ${starredEmails.length === 1 ? 'email' : 'emails'} saved as reference examples*\n\n`;
        
        starredEmails.forEach((email, index) => {
          markdown += `### ${email.title || `Email ${index + 1}`}\n\n`;
          markdown += `*Starred: ${new Date(email.created_at).toLocaleDateString()}*\n\n`;
          markdown += `${email.content}\n\n`;
          markdown += `---\n\n`;
        });
      }

      // Download file
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${brand.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Brand exported successfully!');
    } catch (error) {
      logger.error('Error exporting brand:', error);
      toast.error('Failed to export brand');
    }
  };

  // Save status indicator
  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Error saving';
      default:
        return hasUnsavedChanges ? 'Unsaved changes' : '';
    }
  };

  const getSaveStatusColor = () => {
    switch (saveStatus) {
      case 'saving':
        return 'text-blue-600 dark:text-blue-400';
      case 'saved':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Brand not found</h1>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all hover:scale-105 active:scale-95"
                title="Back to brands"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">{brand.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                      {brand.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Brand Settings</p>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Last updated {new Date(brand.updated_at || brand.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Save status */}
              {saveStatus !== 'idle' && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  saveStatus === 'saving' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' :
                  saveStatus === 'saved' ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300' :
                  'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                }`}>
                  {saveStatus === 'saving' && (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {saveStatus === 'saved' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {saveStatus === 'error' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span>{getSaveStatusText()}</span>
                </div>
              )}
              {/* Export button */}
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to Markdown
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Core Info Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Core Information</h2>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Brand Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter brand name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Website URL
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="https://www.example.com"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Used to search for product information when AI mentions products
              </p>
            </div>
          </div>
        </div>

        {/* Brand Details Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Brand Details</h2>
          </div>
          <textarea
            value={brandDetails}
            onChange={(e) => setBrandDetails(e.target.value)}
            rows={7}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y transition-all font-sans"
            placeholder="Describe your brand, products, target audience, mission, etc."
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            1-2 paragraphs recommended
          </p>
        </div>

        {/* Brand Guidelines Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Brand Guidelines</h2>
          </div>
          <textarea
            value={brandGuidelines}
            onChange={(e) => setBrandGuidelines(e.target.value)}
            rows={7}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y transition-all font-sans"
            placeholder="Brand voice, tone, values, things to avoid, etc."
          />
        </div>

        {/* Copywriting Style Guide Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Copywriting Style Guide</h2>
            </div>
            {!copywritingStyleGuide && (
              <button
                onClick={() => setShowWizard(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Build with AI Wizard
              </button>
            )}
            {copywritingStyleGuide && (
              <button
                onClick={() => setShowWizard(true)}
                className="px-4 py-2 border border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate with Wizard
              </button>
            )}
          </div>
          <textarea
            value={copywritingStyleGuide}
            onChange={(e) => setCopywritingStyleGuide(e.target.value)}
            rows={7}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y transition-all font-sans"
            placeholder="Writing style preferences, formatting guidelines, example phrases, etc. Or use the AI Wizard to build one!"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            1-2 paragraphs recommended
          </p>
        </div>

        {/* Knowledge Base Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 hover:shadow-md transition-shadow">
          <BrandDocumentManager brandId={brandId} brandName={brand.name} />
        </div>

        {/* Starred Emails Section */}
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 rounded-xl shadow-sm border border-yellow-200 dark:border-yellow-900/30 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 fill-current" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Starred Emails</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Reference examples saved from conversations
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowStarredEmails(true)}
              className="px-5 py-2.5 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:hover:bg-yellow-900/60 text-yellow-800 dark:text-yellow-300 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              View Starred Emails
            </button>
          </div>
        </div>
      </main>

      {/* Starred Emails Modal */}
      {showStarredEmails && (
        <StarredEmailsManager
          brandId={brandId}
          onClose={() => setShowStarredEmails(false)}
        />
      )}

      {/* Style Guide Wizard */}
      {showWizard && (
        <StyleGuideWizard
          brandId={brandId}
          brandName={brand.name}
          initialStyleGuide={copywritingStyleGuide}
          onComplete={(styleGuide) => {
            setCopywritingStyleGuide(styleGuide);
            setShowWizard(false);
          }}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}

