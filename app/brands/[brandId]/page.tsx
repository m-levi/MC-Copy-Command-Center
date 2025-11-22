'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Brand, BrandDocument } from '@/types';
import { useBrandAutoSave } from '@/hooks/useBrandAutoSave';
import BrandSettingsTabs from '@/components/BrandSettingsTabs';
import BrandDocumentManager from '@/components/BrandDocumentManager';
import StarredEmailsManager from '@/components/StarredEmailsManager';
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
  const [showDocuments, setShowDocuments] = useState(false);

  // Auto-save hook
  const { saveStatus, saveBrand } = useBrandAutoSave({
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
      }
    } catch (error) {
      logger.error('Error loading brand:', error);
      toast.error('Failed to load brand details');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleBrandUpdate = (updates: Partial<Brand>) => {
    if (!brand) return;
    
    // Update local state
    setBrand({ ...brand, ...updates });
    
    // Save to database
    saveBrand(updates);
  };

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

      // Load memories
      const { data: memories } = await supabase
        .from('brand_memories')
        .select('*')
        .eq('brand_id', brandId)
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

      // Memories
      if (memories && memories.length > 0) {
        markdown += `---\n\n## Memories & Notes\n\n`;
        
        // Group by category
        const byCategory: Record<string, any[]> = {};
        memories.forEach(memory => {
          if (!byCategory[memory.category]) {
            byCategory[memory.category] = [];
          }
          byCategory[memory.category].push(memory);
        });

        const categoryLabels: Record<string, string> = {
          general: 'General Memories',
          dos_donts: "Do's & Don'ts",
          preference: 'Preferences',
          guideline: 'Guidelines',
          fact: 'Facts',
        };

        Object.entries(byCategory).forEach(([category, mems]) => {
          markdown += `### ${categoryLabels[category] || category}\n\n`;
          mems.forEach(mem => {
            markdown += `#### ${mem.title}\n\n`;
            markdown += `${mem.content}\n\n`;
            markdown += `*Added: ${new Date(mem.created_at).toLocaleDateString()}*\n\n`;
            markdown += `---\n\n`;
          });
        });
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col">
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
            <div className="flex items-center gap-3">
              {/* Knowledge Base Button */}
              <button
                onClick={() => setShowDocuments(true)}
                className="px-4 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Knowledge Base
              </button>
              {/* Starred Emails Button */}
              <button
                onClick={() => setShowStarredEmails(true)}
                className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:hover:bg-yellow-900/60 text-yellow-800 dark:text-yellow-300 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Starred Emails
              </button>
              {/* Export button */}
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content with tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <BrandSettingsTabs
          brand={brand}
          onUpdate={handleBrandUpdate}
          saveStatus={saveStatus}
        />
      </div>

      {/* Starred Emails Modal */}
      {showStarredEmails && (
        <StarredEmailsManager
          brandId={brandId}
          onClose={() => setShowStarredEmails(false)}
        />
      )}

      {/* Knowledge Base Modal */}
      {showDocuments && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Knowledge Base</h2>
              <button
                onClick={() => setShowDocuments(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <BrandDocumentManager brandId={brandId} brandName={brand.name} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
