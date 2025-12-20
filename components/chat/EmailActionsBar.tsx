'use client';

import { useState, useCallback, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { 
  ZapIcon, 
  LinkIcon, 
  XIcon, 
  CopyIcon, 
  CheckIcon, 
  SparklesIcon, 
  RefreshCwIcon,
  MailIcon,
  ExternalLinkIcon,
  ImageIcon
} from 'lucide-react';
import { ProductLink } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface SubjectLineOption {
  subject: string;
  preview_text: string;
  type: string;
  score: number;
  explanation: string;
}

interface EmailActionsBarProps {
  emailContent: string;
  productLinks?: ProductLink[];
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getTypeBadgeStyle(type: string) {
  const t = type.toLowerCase();
  if (t.includes('urgent') || t.includes('fomo')) {
    return 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400';
  }
  if (t.includes('benefit') || t.includes('value')) {
    return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
  }
  if (t.includes('curiosity') || t.includes('question')) {
    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
  }
  if (t.includes('personal') || t.includes('direct')) {
    return 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400';
  }
  return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
}

// ============================================================================
// Modal Wrapper Component
// ============================================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accentColor?: 'amber' | 'blue';
}

function Modal({ isOpen, onClose, title, icon, children, accentColor = 'amber' }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const accentStyles = {
    amber: {
      iconBg: 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    blue: {
      iconBg: 'bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
  };

  const styles = accentStyles[accentColor];

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${styles.iconBg} flex items-center justify-center`}>
              <span className={styles.iconColor}>{icon}</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// Subject Lines Modal Content (receives pre-generated options)
// ============================================================================

interface SubjectLinesModalContentProps {
  options: SubjectLineOption[];
  isGenerating: boolean;
  onGenerateMore: () => void;
}

function SubjectLinesModalContent({ options, isGenerating, onGenerateMore }: SubjectLinesModalContentProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Copied!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (options.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <ZapIcon className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">No subject lines yet</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {options.map((option, index) => (
        <div 
          key={index} 
          className="group relative p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
        >
          {/* Type badge + Score */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${getTypeBadgeStyle(option.type)}`}>
              {option.type}
            </span>
            {option.score > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-500">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {option.score}
              </span>
            )}
          </div>
          
          {/* Subject line */}
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed flex-1">
              {option.subject}
            </p>
            <button
              onClick={() => handleCopy(option.subject, index)}
              className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
              title="Copy subject"
            >
              {copiedIndex === index ? (
                <CheckIcon className="w-4 h-4 text-green-500" />
              ) : (
                <CopyIcon className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Preview text */}
          {option.preview_text && (
            <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
              <MailIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
                {option.preview_text}
              </p>
              <button
                onClick={() => handleCopy(option.preview_text, index + 100)}
                className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-amber-600 transition-colors"
                title="Copy preview"
              >
                {copiedIndex === index + 100 ? (
                  <CheckIcon className="w-3 h-3 text-green-500" />
                ) : (
                  <CopyIcon className="w-3 h-3" />
                )}
              </button>
            </div>
          )}
        </div>
      ))}
      
      {/* Generate more button */}
      <button
        onClick={onGenerateMore}
        disabled={isGenerating}
        className="w-full py-3 rounded-xl border-2 border-dashed border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <RefreshCwIcon className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Generating...</span>
          </>
        ) : (
          <>
            <SparklesIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Generate More</span>
          </>
        )}
      </button>
    </div>
  );
}

// ============================================================================
// Product Links Modal Content
// ============================================================================

interface ProductLinksContentProps {
  productLinks: ProductLink[];
}

function ProductLinksContent({ productLinks }: ProductLinksContentProps) {
  if (!productLinks || productLinks.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <LinkIcon className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">No product links found</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {productLinks.map((product, index) => {
        if (!product?.url || !product?.name) return null;
        
        return (
          <a
            key={index}
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200 group"
          >
            {/* Product image/icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden flex items-center justify-center">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-5 h-5 text-gray-400" />
              )}
            </div>
            
            {/* Product info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                  {product.name}
                </h3>
                <ExternalLinkIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
              </div>
              {product.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                  {product.description}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-2 font-medium">
                <span className="text-blue-500 truncate">
                  {new URL(product.url).hostname.replace('www.', '')}
                </span>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main EmailActionsBar Component
// ============================================================================

function EmailActionsBarBase({ emailContent, productLinks = [], className = '' }: EmailActionsBarProps) {
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [linksModalOpen, setLinksModalOpen] = useState(false);
  
  // Subject lines state - generation happens in background
  const [subjectLines, setSubjectLines] = useState<SubjectLineOption[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const hasProductLinks = productLinks && productLinks.length > 0;

  // Generate subject lines in background
  const handleGenerateSubjectLines = useCallback(async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/generate-subject-lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate');
      }

      const data = await response.json();
      if (data.options && Array.isArray(data.options)) {
        setSubjectLines(prev => [...prev, ...data.options]);
        setHasGenerated(true);
        // Auto-open modal once generated
        setSubjectModalOpen(true);
      }
    } catch (err) {
      toast.error('Failed to generate subject lines');
    } finally {
      setIsGenerating(false);
    }
  }, [emailContent, isGenerating]);

  // Handle button click
  const handleSubjectLinesClick = useCallback(() => {
    if (hasGenerated && subjectLines.length > 0) {
      // Already have subject lines - just open modal
      setSubjectModalOpen(true);
    } else if (!isGenerating) {
      // Start generating
      handleGenerateSubjectLines();
    }
  }, [hasGenerated, subjectLines.length, isGenerating, handleGenerateSubjectLines]);

  // Generate more subject lines (from within modal)
  const handleGenerateMore = useCallback(async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/generate-subject-lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate');
      }

      const data = await response.json();
      if (data.options && Array.isArray(data.options)) {
        setSubjectLines(prev => [...prev, ...data.options]);
      }
    } catch (err) {
      toast.error('Failed to generate more subject lines');
    } finally {
      setIsGenerating(false);
    }
  }, [emailContent, isGenerating]);

  return (
    <>
      {/* Action Pills Row */}
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        {/* Subject Lines Action */}
        <button
          onClick={handleSubjectLinesClick}
          disabled={isGenerating}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border group ${
            isGenerating
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
              : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/50 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-sm'
          }`}
        >
          {isGenerating ? (
            <>
              <RefreshCwIcon className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <ZapIcon className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
              <span>Subject Lines</span>
              {hasGenerated && subjectLines.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-800/40 text-[10px] font-bold">
                  {subjectLines.length}
                </span>
              )}
            </>
          )}
        </button>

        {/* Product Links Action (only if links exist) */}
        {hasProductLinks && (
          <button
            onClick={() => setLinksModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm group"
          >
            <LinkIcon className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
            <span>Products</span>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-200/60 dark:bg-blue-800/40 text-[10px] font-bold">
              {productLinks.length}
            </span>
          </button>
        )}
      </div>

      {/* Subject Lines Modal */}
      <Modal
        isOpen={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title="Subject Lines"
        icon={<ZapIcon className="w-5 h-5" />}
        accentColor="amber"
      >
        <SubjectLinesModalContent 
          options={subjectLines} 
          isGenerating={isGenerating}
          onGenerateMore={handleGenerateMore}
        />
      </Modal>

      {/* Product Links Modal */}
      <Modal
        isOpen={linksModalOpen}
        onClose={() => setLinksModalOpen(false)}
        title="Product Links"
        icon={<LinkIcon className="w-5 h-5" />}
        accentColor="blue"
      >
        <ProductLinksContent productLinks={productLinks} />
      </Modal>
    </>
  );
}

export const EmailActionsBar = memo(EmailActionsBarBase);
export default EmailActionsBar;






