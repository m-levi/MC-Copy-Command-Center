'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Brand, BrandDocument } from '@/types';
import { useBrandAutoSave } from '@/hooks/useBrandAutoSave';
import BrandDetailsTab from '@/components/BrandDetailsTab';
import BrandStyleGuideTab from '@/components/BrandStyleGuideTab';
import BrandGuidelinesTab from '@/components/BrandGuidelinesTab';
import BrandMemoriesTab from '@/components/BrandMemoriesTab';
import BrandDosAndDontsTab from '@/components/BrandDosAndDontsTab';
import BrandDocumentManager from '@/components/BrandDocumentManager';
import StarredEmailsManager from '@/components/StarredEmailsManager';
import { DocumentStorePanel, BrandOverviewCard } from '@/components/brand-settings';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  LayoutDashboard,
  FileText,
  Palette,
  Shield,
  Brain,
  CheckCircle,
  FolderOpen,
  BookOpen,
  Star,
  Download,
  Settings,
  ChevronRight,
  Sparkles,
  Save,
  Loader2,
  AlertCircle,
  MessageSquare,
  Mic,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

type SectionId = 
  | 'overview' 
  | 'details' 
  | 'style-guide' 
  | 'guidelines' 
  | 'memories' 
  | 'dos-donts'
  | 'documents'
  | 'knowledge-base'
  | 'starred';

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { 
    id: 'overview', 
    label: 'Overview', 
    icon: LayoutDashboard, 
    description: 'Brand summary and quick stats' 
  },
  { 
    id: 'details', 
    label: 'Brand Details', 
    icon: FileText, 
    description: 'Core brand information' 
  },
  { 
    id: 'style-guide', 
    label: 'Style Guide', 
    icon: Palette, 
    description: 'Copywriting style and tone' 
  },
  { 
    id: 'guidelines', 
    label: 'Guidelines', 
    icon: Shield, 
    description: 'Brand rules and standards' 
  },
  { 
    id: 'memories', 
    label: 'Memories', 
    icon: Brain, 
    description: 'AI-powered brand memory',
    badge: 'AI'
  },
  { 
    id: 'dos-donts', 
    label: "Do's & Don'ts", 
    icon: CheckCircle, 
    description: 'What to include and avoid' 
  },
  { 
    id: 'documents', 
    label: 'Document Store', 
    icon: FolderOpen, 
    description: 'Files and assets' 
  },
  { 
    id: 'knowledge-base', 
    label: 'Knowledge Base', 
    icon: BookOpen, 
    description: 'Reference documents' 
  },
  { 
    id: 'starred', 
    label: 'Starred Emails', 
    icon: Star, 
    description: 'Saved email examples' 
  },
];

export default function BrandDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  const supabase = createClient();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showStarredModal, setShowStarredModal] = useState(false);

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

      // Load memories from Supermemory API
      let memories: Array<{
        id: string;
        title: string;
        content: string;
        category: string;
        created_at: string;
      }> = [];
      try {
        const memoriesResponse = await fetch(`/api/brands/${brandId}/memories`);
        if (memoriesResponse.ok) {
          const memoriesData = await memoriesResponse.json();
          memories = memoriesData.memories || [];
        }
      } catch (e) {
        // Memories are optional for export
      }

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
        
        const byCategory: Record<string, typeof memories> = {};
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

  const renderSection = () => {
    if (!brand) return null;

    switch (activeSection) {
      case 'overview':
        return <BrandOverviewCard brand={brand} />;
      case 'details':
        return <BrandDetailsTab brand={brand} onUpdate={handleBrandUpdate} />;
      case 'style-guide':
        return <BrandStyleGuideTab brand={brand} onUpdate={handleBrandUpdate} />;
      case 'guidelines':
        return <BrandGuidelinesTab brand={brand} onUpdate={handleBrandUpdate} />;
      case 'memories':
        return <BrandMemoriesTab brandId={brand.id} />;
      case 'dos-donts':
        return <BrandDosAndDontsTab brandId={brand.id} />;
      case 'documents':
        return <DocumentStorePanel brandId={brand.id} brandName={brand.name} />;
      case 'knowledge-base':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white shadow-lg">
                  <BookOpen className="w-6 h-6" />
                </div>
                Knowledge Base
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Upload documents to enhance AI responses with brand-specific context
              </p>
            </div>
            <BrandDocumentManager brandId={brand.id} brandName={brand.name} />
          </div>
        );
      case 'starred':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-lg">
                  <Star className="w-6 h-6" />
                </div>
                Starred Emails
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Saved email examples for reference and inspiration
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <StarredEmailsManager brandId={brand.id} inlineMode />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading brand...</p>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Brand not found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The brand you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          'fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-30 transition-all duration-300 flex flex-col',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                    <span className="text-white font-bold text-sm">
                      {brand.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {brand.name}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  )}
                >
                  <Icon className={cn(
                    'w-5 h-5 flex-shrink-0',
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                  )} />
                  {!sidebarCollapsed && (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        'w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity',
                        isActive && 'opacity-100'
                      )} />
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          {!sidebarCollapsed && (
            <div className="space-y-2">
              <Link
                href={`/brands/${brand.id}/chat`}
                className="flex items-center gap-2 w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Start Chat
              </Link>
              <Link
                href={`/brands/${brand.id}/voice-builder`}
                className="flex items-center gap-2 w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Mic className="w-4 h-4" />
                Voice Builder
              </Link>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              'flex items-center justify-center w-full p-2 mt-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors',
              sidebarCollapsed && 'mx-auto'
            )}
          >
            <ChevronRight className={cn(
              'w-5 h-5 text-gray-400 transition-transform',
              sidebarCollapsed ? 'rotate-0' : 'rotate-180'
            )} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={cn(
          'flex-1 transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {navItems.find(item => item.id === activeSection)?.label}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {navItems.find(item => item.id === activeSection)?.description}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Save Status */}
                {saveStatus !== 'idle' && (
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
                    saveStatus === 'saving' && 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
                    saveStatus === 'saved' && 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400',
                    saveStatus === 'error' && 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                  )}>
                    {saveStatus === 'saving' && (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    )}
                    {saveStatus === 'saved' && (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Saved</span>
                      </>
                    )}
                    {saveStatus === 'error' && (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        <span>Error</span>
                      </>
                    )}
                  </div>
                )}

                {/* Export Button */}
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="shadow-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          {renderSection()}
        </div>
      </main>

      {/* Starred Emails Modal (for backwards compatibility if needed) */}
      {showStarredModal && (
        <StarredEmailsManager
          brandId={brandId}
          onClose={() => setShowStarredModal(false)}
        />
      )}
    </div>
  );
}
