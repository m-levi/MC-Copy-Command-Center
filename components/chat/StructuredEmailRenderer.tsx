'use client';

import { useMemo, useState } from 'react';
import { 
  parseEmailCopy, 
  EmailSection, 
  ProductItem,
  isStructuredEmailCopy, 
  formatSectionName,
  getFieldValue,
  isHeadlineField,
  isSubheadField,
  isBodyField,
  isCtaField,
  isAccentField,
  isQuoteField,
  isAttributionField,
  isProductNameField,
  isPriceField,
  isCodeField,
  isExpiryField,
} from '@/lib/email-copy-parser';
import { cn } from '@/lib/utils';

interface StructuredEmailRendererProps {
  content: string;
  onCopy?: () => void;
}

/**
 * Beautiful Email Copy Renderer
 * 
 * Renders email blocks with distinct, visually appealing designs:
 * - HERO: Large headline with gradient accent
 * - TEXT: Clean prose sections
 * - BULLETS: Feature lists with custom bullets
 * - PRODUCT CARD: Single product showcase
 * - PRODUCT GRID: Multi-product display
 * - CTA BLOCK: Action-focused cards
 * - SOCIAL PROOF: Quote cards with attribution
 * - DISCOUNT BAR: Eye-catching promo codes
 */
export default function StructuredEmailRenderer({ content, onCopy }: StructuredEmailRendererProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'blocks' | 'plain'>('plain');
  
  const parsedEmail = useMemo(() => parseEmailCopy(content), [content]);
  
  // Clean content for plain text view and copying
  const cleanContent = useMemo(() => {
    return content
      .replace(/^```\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim();
  }, [content]);
  
  // If parsing failed, return null to fall back to default rendering
  if (!parsedEmail) return null;
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(cleanContent);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="space-y-4">
      {/* View Toggle & Copy Controls */}
      <div className="flex items-center justify-between">
        {/* View Toggle - Raw first, then Preview */}
        <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('plain')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all',
              viewMode === 'plain'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Raw
          </button>
          <button
            onClick={() => setViewMode('blocks')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all',
              viewMode === 'blocks'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Preview
          </button>
        </div>
        
        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      
      {/* Raw View - Lightly formatted */}
      {viewMode === 'plain' && (
        <div className="p-5 sm:p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <FormattedRawView content={cleanContent} />
        </div>
      )}
      
      {/* Blocks View - Beautiful email preview */}
      {viewMode === 'blocks' && (
        <div className="space-y-4">
          {/* Preamble (Approach/Strategy notes) - only show if it's NOT just the approach line */}
          {/* The approach is already shown in EmailVersionRenderer's approach card */}
          {parsedEmail.preamble && !parsedEmail.preamble.match(/^\*\*Approach:\*?\*?\s*.+$/im) && (
            <ApproachCard content={parsedEmail.preamble} />
          )}
          
          {/* Email Blocks Container */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* All Sections */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {parsedEmail.sections.map((section, index) => (
                <SectionRenderer key={index} section={section} isFirst={index === 0} />
              ))}
            </div>
          </div>
          
          {/* Postamble (Why this works notes) */}
          {parsedEmail.postamble && (
            <WhyThisWorksCard content={parsedEmail.postamble} />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Approach card - Shows the creative angle for this version
 */
function ApproachCard({ content }: { content: string }) {
  // Check if it starts with "Approach:" and extract it
  const approachMatch = content.match(/^(?:\*\*)?Approach:?\*?\*?\s*(.+)/i);
  const displayContent = approachMatch ? approachMatch[1].trim() : content;
  
  return (
    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 rounded-xl border border-violet-200/60 dark:border-violet-800/40">
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-sm">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1">
          Approach
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          {displayContent}
        </p>
      </div>
    </div>
  );
}

/**
 * Formatted Raw View - Light formatting for readability
 * - Block headers (**HERO**) shown in gray (de-emphasized)
 * - Field labels (Headline:, Body:, CTA:) shown in bold with black copy
 * - No indentation for easier reading
 */
function FormattedRawView({ content }: { content: string }) {
  // Known field labels that should be bold
  const knownLabels = [
    'Headline', 'Subhead', 'Subheadline', 'Body', 'CTA', 'Accent',
    'Quote', 'Attribution', 'Product Name', 'Price', 'One-liner',
    'Code', 'Message', 'Expiry', 'Products'
  ];
  const labelPattern = new RegExp(`^(${knownLabels.join('|')}):`, 'i');
  
  const lines = content.split('\n');
  
  return (
    <div className="text-[15px] sm:text-base leading-7 space-y-1">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        
        // Empty line
        if (!trimmed) {
          return <div key={index} className="h-3" />;
        }
        
        // Block header: **HERO**, **TEXT**, etc. - subtle section divider
        const blockMatch = trimmed.match(/^\*\*([A-Z][A-Z0-9 _-]*)\*\*$/);
        if (blockMatch) {
          return (
            <div key={index} className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pt-4 pb-0.5 first:pt-0">
              {blockMatch[1]}
            </div>
          );
        }
        
        // Approach line: **Approach:** ...
        const approachMatch = trimmed.match(/^\*\*Approach:\*?\*?\s*(.+)/i);
        if (approachMatch) {
          return (
            <div key={index} className="text-gray-800 dark:text-gray-200">
              <span className="font-semibold text-gray-900 dark:text-gray-100">Approach:</span> {approachMatch[1]}
            </div>
          );
        }
        
        // Field with known label: Headline: ..., Body: ..., CTA: ...
        const fieldMatch = trimmed.match(labelPattern);
        if (fieldMatch) {
          const colonIndex = trimmed.indexOf(':');
          const label = trimmed.slice(0, colonIndex);
          const value = trimmed.slice(colonIndex + 1).trim();
          return (
            <div key={index} className="text-gray-800 dark:text-gray-200">
              <span className="font-semibold text-gray-900 dark:text-gray-100">{label}:</span> {value}
            </div>
          );
        }
        
        // Bullet point
        if (/^[•\-\*]\s+/.test(trimmed)) {
          const bulletContent = trimmed.replace(/^[•\-\*]\s+/, '');
          return (
            <div key={index} className="text-gray-800 dark:text-gray-200 pl-1">
              <span className="text-gray-400 dark:text-gray-500 mr-2">•</span>{bulletContent}
            </div>
          );
        }
        
        // Separator line (---)
        if (/^-{2,}$/.test(trimmed)) {
          return <div key={index} className="h-px bg-gray-200 dark:bg-gray-700 my-2" />;
        }
        
        // Regular text
        return (
          <div key={index} className="text-gray-800 dark:text-gray-200">
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Why This Works card - Design rationale
 */
function WhyThisWorksCard({ content }: { content: string }) {
  const cleanContent = content.replace(/^\*\*Why this works:?\*?\*?\s*/i, '').trim();
  
  return (
    <div className="flex items-start gap-3 p-4 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-sm">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
          Why This Works
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          {cleanContent}
        </p>
      </div>
    </div>
  );
}

/**
 * Main section renderer - Routes to appropriate block design
 */
function SectionRenderer({ section, isFirst }: { section: EmailSection; isFirst: boolean }) {
  switch (section.type) {
    case 'hero':
      return <HeroBlock section={section} isFirst={isFirst} />;
    case 'text':
      return <TextBlock section={section} />;
    case 'bullets':
      return <BulletsBlock section={section} />;
    case 'product_card':
      return <ProductCardBlock section={section} />;
    case 'product_grid':
      return <ProductGridBlock section={section} />;
    case 'cta_block':
      return <CtaBlockBlock section={section} />;
    case 'social_proof':
      return <SocialProofBlock section={section} />;
    case 'discount_bar':
      return <DiscountBarBlock section={section} />;
    default:
      return <GenericBlock section={section} />;
  }
}

/**
 * HERO Block - Large, impactful header section
 */
function HeroBlock({ section, isFirst }: { section: EmailSection; isFirst: boolean }) {
  const accent = getFieldValue(section, 'accent', 'eyebrow', 'kicker');
  const headline = getFieldValue(section, 'headline', 'title', 'header');
  const subhead = getFieldValue(section, 'subhead', 'subheadline', 'subtitle', 'tagline');
  const cta = getFieldValue(section, 'cta', 'button', 'action');
  
  return (
    <div className={cn(
      'relative px-6 py-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50',
      isFirst && 'rounded-t-xl'
    )}>
      {/* Section Label */}
      <div className="absolute top-3 right-3 px-2 py-0.5 bg-white/80 dark:bg-gray-800/80 rounded text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 backdrop-blur-sm">
        Hero
      </div>
      
      <div className="max-w-lg">
        {/* Accent */}
        {accent && (
          <div className="inline-block px-2.5 py-1 mb-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-bold uppercase tracking-widest rounded">
            {accent}
          </div>
        )}
        
        {/* Headline */}
        {headline && (
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-3">
            {headline}
          </h2>
        )}
        
        {/* Subhead */}
        {subhead && (
          <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
            {subhead}
          </p>
        )}
        
        {/* CTA Button */}
        {cta && (
          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
            {cta}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Unlabeled content fallback */}
      {section.unlabeledContent.length > 0 && !headline && (
        <div className="space-y-2">
          {section.unlabeledContent.map((line, i) => (
            <p key={i} className="text-gray-700 dark:text-gray-200">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * TEXT Block - Simple prose section
 */
function TextBlock({ section }: { section: EmailSection }) {
  const accent = getFieldValue(section, 'accent', 'eyebrow', 'kicker');
  const headline = getFieldValue(section, 'headline', 'title', 'header');
  const body = getFieldValue(section, 'body', 'copy', 'content', 'text', 'description');
  const cta = getFieldValue(section, 'cta', 'button', 'action');
  
  return (
    <div className="px-6 py-5">
      {/* Section Label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Text
        </span>
        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
      </div>
      
      {/* Accent */}
      {accent && (
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
          {accent}
        </div>
      )}
      
      {/* Headline */}
      {headline && (
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
          {headline}
        </h3>
      )}
      
      {/* Body */}
      {body && (
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {body}
        </p>
      )}
      
      {/* CTA */}
      {cta && (
        <button className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          {cta}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      )}
      
      {/* Unlabeled content fallback */}
      {section.unlabeledContent.length > 0 && !body && (
        <div className="space-y-2">
          {section.unlabeledContent.map((line, i) => (
            <p key={i} className="text-sm text-gray-600 dark:text-gray-300">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * BULLETS Block - Feature/benefit lists
 */
function BulletsBlock({ section }: { section: EmailSection }) {
  const accent = getFieldValue(section, 'accent', 'eyebrow', 'kicker');
  const headline = getFieldValue(section, 'headline', 'title', 'header');
  const cta = getFieldValue(section, 'cta', 'button', 'action');
  
  return (
    <div className="px-6 py-5">
      {/* Section Label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Bullets
        </span>
        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
      </div>
      
      {/* Accent */}
      {accent && (
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
          {accent}
        </div>
      )}
      
      {/* Headline */}
      {headline && (
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
          {headline}
        </h3>
      )}
      
      {/* Bullets */}
      {section.bullets.length > 0 && (
        <ul className="space-y-2">
          {section.bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{bullet}</span>
            </li>
          ))}
        </ul>
      )}
      
      {/* CTA */}
      {cta && (
        <button className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          {cta}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * PRODUCT CARD Block - Single product showcase
 */
function ProductCardBlock({ section }: { section: EmailSection }) {
  const productName = getFieldValue(section, 'product name', 'productname', 'name', 'product', 'item');
  const price = getFieldValue(section, 'price', 'cost');
  const oneLiner = getFieldValue(section, 'one-liner', 'oneliner', 'description', 'tagline', 'subtitle');
  const cta = getFieldValue(section, 'cta', 'button', 'action');
  
  return (
    <div className="px-6 py-5">
      {/* Section Label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Product Card
        </span>
        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
        {/* Product Image Placeholder */}
        <div className="flex-shrink-0 w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        
        {/* Product Info */}
        <div className="flex-1 min-w-0">
          {productName && (
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{productName}</h4>
          )}
          {price && (
            <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">{price}</p>
          )}
          {oneLiner && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{oneLiner}</p>
          )}
          {cta && (
            <button className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
              {cta}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * PRODUCT GRID Block - Multiple products
 */
function ProductGridBlock({ section }: { section: EmailSection }) {
  const accent = getFieldValue(section, 'accent', 'eyebrow', 'kicker');
  const headline = getFieldValue(section, 'headline', 'title', 'header');
  const cta = getFieldValue(section, 'cta', 'button', 'action');
  
  return (
    <div className="px-6 py-5">
      {/* Section Label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Product Grid
        </span>
        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
      </div>
      
      {/* Accent */}
      {accent && (
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
          {accent}
        </div>
      )}
      
      {/* Headline */}
      {headline && (
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          {headline}
        </h3>
      )}
      
      {/* Products Grid */}
      {section.products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {section.products.map((product, i) => (
            <ProductGridItem key={i} product={product} />
          ))}
        </div>
      ) : (
        /* Fallback: Show unlabeled content as product items */
        section.unlabeledContent.length > 0 && (
          <div className="space-y-2">
            {section.unlabeledContent.map((line, i) => (
              <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-200">{line}</p>
              </div>
            ))}
          </div>
        )
      )}
      
      {/* CTA */}
      {cta && (
        <button className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          {cta}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * Individual product item in a grid
 */
function ProductGridItem({ product }: { product: ProductItem }) {
  // Parse price for strikethrough (e.g., "$68 ~~$97~~")
  const priceMatch = product.price.match(/^(\$[\d.,]+)\s*(?:~~(\$[\d.,]+)~~)?/);
  const currentPrice = priceMatch?.[1] || product.price;
  const originalPrice = priceMatch?.[2];
  
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
      {/* Product Image Placeholder */}
      <div className="w-full aspect-square mb-3 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      
      <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">{product.name}</h4>
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold text-gray-900 dark:text-white">{currentPrice}</span>
        {originalPrice && (
          <span className="text-sm text-gray-400 line-through">{originalPrice}</span>
        )}
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">{product.description}</p>
    </div>
  );
}

/**
 * CTA BLOCK - Standalone call-to-action
 */
function CtaBlockBlock({ section }: { section: EmailSection }) {
  const accent = getFieldValue(section, 'accent', 'eyebrow', 'kicker');
  const headline = getFieldValue(section, 'headline', 'title', 'header');
  const subhead = getFieldValue(section, 'subhead', 'subheadline', 'subtitle');
  const cta = getFieldValue(section, 'cta', 'button', 'action');
  
  return (
    <div className="px-6 py-6 bg-gray-50 dark:bg-gray-800/30">
      {/* Section Label */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          CTA Block
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
      
      <div className="text-center">
        {/* Accent */}
        {accent && (
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
            {accent}
          </div>
        )}
        
        {/* Headline */}
        {headline && (
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {headline}
          </h3>
        )}
        
        {/* Subhead */}
        {subhead && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {subhead}
          </p>
        )}
        
        {/* CTA Button */}
        {cta && (
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm">
            {cta}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Unlabeled content fallback */}
      {section.unlabeledContent.length > 0 && !headline && (
        <div className="space-y-2 text-center">
          {section.unlabeledContent.map((line, i) => (
            <p key={i} className="text-gray-700 dark:text-gray-200">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * SOCIAL PROOF Block - Testimonial/quote
 */
function SocialProofBlock({ section }: { section: EmailSection }) {
  const quote = getFieldValue(section, 'quote', 'testimonial', 'review', 'feedback');
  const attribution = getFieldValue(section, 'attribution', 'author', 'source', 'name', 'customer', 'by');
  
  return (
    <div className="px-6 py-5">
      {/* Section Label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Social Proof
        </span>
        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
      </div>
      
      <div className="relative pl-5 border-l-4 border-gray-200 dark:border-gray-700">
        {/* Quote Icon */}
        <div className="absolute -left-3 -top-1 w-6 h-6 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
        </div>
        
        {/* Quote */}
        {quote && (
          <blockquote className="text-base italic text-gray-700 dark:text-gray-200 mb-2">
            &ldquo;{quote}&rdquo;
          </blockquote>
        )}
        
        {/* Attribution */}
        {attribution && (
          <cite className="text-sm font-medium text-gray-500 dark:text-gray-400 not-italic">
            {attribution}
          </cite>
        )}
      </div>
      
      {/* Unlabeled content fallback */}
      {section.unlabeledContent.length > 0 && !quote && (
        <div className="space-y-2">
          {section.unlabeledContent.map((line, i) => (
            <p key={i} className="text-gray-700 dark:text-gray-200 italic">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * DISCOUNT BAR Block - Promo code display
 */
function DiscountBarBlock({ section }: { section: EmailSection }) {
  const code = getFieldValue(section, 'code', 'discountcode', 'promocode', 'coupon');
  const message = getFieldValue(section, 'message', 'text', 'body', 'description');
  const expiry = getFieldValue(section, 'expiry', 'expires', 'expiration', 'validuntil', 'deadline');
  
  return (
    <div className="px-6 py-4">
      {/* Section Label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Discount Bar
        </span>
        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700">
        {/* Code Badge */}
        {code && (
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white dark:bg-gray-900 rounded-lg border border-emerald-200 dark:border-emerald-700 shadow-sm">
              <span className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400 tracking-wider">
                {code}
              </span>
            </div>
            {message && (
              <span className="text-sm text-gray-700 dark:text-gray-200">{message}</span>
            )}
          </div>
        )}
        
        {/* Expiry */}
        {expiry && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {expiry}
          </div>
        )}
      </div>
      
      {/* Unlabeled content fallback */}
      {section.unlabeledContent.length > 0 && !code && (
        <div className="space-y-2">
          {section.unlabeledContent.map((line, i) => (
            <p key={i} className="text-gray-700 dark:text-gray-200">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Generic Block - Fallback for unknown section types
 */
function GenericBlock({ section }: { section: EmailSection }) {
  const sectionLabel = formatSectionName(section.name);
  
  // Separate fields by type for rendering order
  const accentFields = section.fields.filter(f => isAccentField(f.label));
  const headlineFields = section.fields.filter(f => isHeadlineField(f.label));
  const subheadFields = section.fields.filter(f => isSubheadField(f.label));
  const bodyFields = section.fields.filter(f => isBodyField(f.label));
  const ctaFields = section.fields.filter(f => isCtaField(f.label));
  
  // All other fields (not matching known patterns)
  const otherFields = section.fields.filter(f => 
    !isAccentField(f.label) &&
    !isHeadlineField(f.label) &&
    !isSubheadField(f.label) &&
    !isBodyField(f.label) &&
    !isCtaField(f.label)
  );
  
  return (
    <div className="px-6 py-5">
      {/* Section Label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {sectionLabel}
        </span>
        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
      </div>
      
      <div className="space-y-2">
        {/* Accent fields */}
        {accentFields.map((field, i) => (
          <div key={`accent-${i}`} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            {field.value}
          </div>
        ))}
        
        {/* Headline fields */}
        {headlineFields.map((field, i) => (
          <div key={`headline-${i}`} className="text-base font-semibold text-gray-900 dark:text-white">
            {field.value}
          </div>
        ))}
        
        {/* Subhead fields */}
        {subheadFields.map((field, i) => (
          <div key={`subhead-${i}`} className="text-sm text-gray-600 dark:text-gray-300">
            {field.value}
          </div>
        ))}
        
        {/* Body fields */}
        {bodyFields.map((field, i) => (
          <div key={`body-${i}`} className="text-sm text-gray-700 dark:text-gray-200">
            {field.value}
          </div>
        ))}
        
        {/* Other fields */}
        {otherFields.map((field, i) => (
          <div key={`other-${i}`} className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">{field.label}:</span>{' '}
            <span className="text-gray-900 dark:text-gray-100">{field.value}</span>
          </div>
        ))}
        
        {/* Bullets */}
        {section.bullets.length > 0 && (
          <ul className="space-y-1 mt-2">
            {section.bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-gray-400 dark:bg-gray-500 rounded-full" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
        
        {/* CTA fields */}
        {ctaFields.map((field, i) => (
          <div key={`cta-${i}`} className="pt-2">
            <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium">
              {field.value}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        ))}
        
        {/* Unlabeled content */}
        {section.unlabeledContent.length > 0 && (
          <div className="space-y-1">
            {section.unlabeledContent.map((line, i) => (
              <p key={`unlabeled-${i}`} className="text-sm text-gray-700 dark:text-gray-200">{line}</p>
            ))}
          </div>
        )}
        
        {/* Fallback: raw content */}
        {section.fields.length === 0 && 
         section.bullets.length === 0 && 
         section.unlabeledContent.length === 0 && 
         section.rawContent && (
          <div className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
            {section.rawContent}
          </div>
        )}
      </div>
    </div>
  );
}

export { isStructuredEmailCopy };
