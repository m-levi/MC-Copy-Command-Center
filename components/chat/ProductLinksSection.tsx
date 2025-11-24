'use client';

import { useState, memo } from 'react';
import { ProductLink } from '@/types';

interface ProductLinksSectionProps {
  productLinks: ProductLink[];
}

export const ProductLinksSection = memo(function ProductLinksSection({
  productLinks
}: ProductLinksSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!productLinks || productLinks.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded">
            <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Product Links ({productLinks.length})
          </span>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {productLinks.map((product, index) => {
            if (!product?.url || !product?.name) return null;
            
            return (
              <a
                key={index}
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-150 group"
              >
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {product.name}
                  </div>
                  {product.description && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 mt-0.5">
                      {product.description}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium mt-1 group-hover:underline">
                    <span>View product</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
});


