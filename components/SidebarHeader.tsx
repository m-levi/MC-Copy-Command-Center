'use client';

import { Brand } from '@/types';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import BrandSelectorDropdown from './BrandSelectorDropdown';
import ActiveGenerationsIndicator from './ActiveGenerationsIndicator';

interface SidebarHeaderProps {
  brandName: string;
  brandId?: string;
  allBrands?: Brand[];
  isCollapsed: boolean;
  toggleCollapse?: () => void;
  onBrandSwitch?: (brandId: string) => void;
  onNavigateHome?: () => void;
  onMobileToggle?: (isOpen: boolean) => void;
  onOpenExplorer?: () => void;
  isMobile?: boolean;
  hideBrandSwitcher?: boolean; // Hide brand switcher when it's in the main header
}

export default function SidebarHeader({
  brandName,
  brandId,
  allBrands = [],
  isCollapsed,
  toggleCollapse,
  onBrandSwitch,
  onNavigateHome,
  onMobileToggle,
  onOpenExplorer,
  isMobile = false,
  hideBrandSwitcher = false,
}: SidebarHeaderProps) {
  const [showBrandSwitcher, setShowBrandSwitcher] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const brandSwitcherRef = useRef<HTMLButtonElement>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Set up portal container on mount
  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  // Close brand switcher on resize
  useEffect(() => {
    const handleResize = () => {
      if (showBrandSwitcher) setShowBrandSwitcher(false);
    };

    if (showBrandSwitcher) {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [showBrandSwitcher]);

  // Close brand switcher dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showBrandSwitcher &&
        brandSwitcherRef.current &&
        !brandSwitcherRef.current.contains(event.target as Node) &&
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(event.target as Node)
      ) {
        setShowBrandSwitcher(false);
      }
    };

    if (showBrandSwitcher) {
      // Use setTimeout to avoid catching the opening click
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBrandSwitcher]);

  if (!isCollapsed) {
    return (
      <>
        <div className="p-3">
          {/* Single Row: Brand Name and Switcher (when not hidden by parent header) */}
          <div className="flex items-center justify-between gap-2">
            {/* Brand Switcher - hidden when parent header has it */}
            {!hideBrandSwitcher ? (
              <div className="relative flex-1 min-w-0">
                <button
                  ref={brandSwitcherRef}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowBrandSwitcher(prev => !prev);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-lg transition-all cursor-pointer w-full group"
                  aria-expanded={showBrandSwitcher}
                  aria-haspopup="listbox"
                >
                  <div className="flex-1 min-w-0 text-left">
                    <h2 className="text-sm font-bold truncate text-gray-900 dark:text-white tracking-tight">{brandName}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Switch brand</p>
                  </div>
                  {(allBrands.length > 0 || onNavigateHome) && (
                    <svg 
                      className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${showBrandSwitcher ? 'rotate-180' : ''} group-hover:text-gray-600 dark:group-hover:text-gray-300`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {/* Desktop dropdown - inside relative container */}
                {showBrandSwitcher && !isMobile && (
                  <div ref={dropdownContainerRef} className="absolute top-full left-0 right-0 mt-1 z-[100]">
                    <BrandSelectorDropdown
                      allBrands={allBrands}
                      currentBrandId={brandId}
                      onBrandSelect={(id) => onBrandSwitch?.(id)}
                      onNavigateHome={onNavigateHome}
                      onClose={() => setShowBrandSwitcher(false)}
                    />
                  </div>
                )}
              </div>
            ) : (
              // When brand switcher is hidden, show a simple title
              <div className="flex-1 min-w-0 px-3 py-2">
                <h2 className="text-sm font-bold truncate text-gray-900 dark:text-white tracking-tight">Conversations</h2>
              </div>
            )}

            {/* Right: Simplified Actions */}
            <div className="flex items-center gap-1">
              {/* Active Generations Indicator */}
              <ActiveGenerationsIndicator 
                compact 
                onNavigateToConversation={(convId, navBrandId) => {
                  if (navBrandId === brandId) {
                    // If same brand, dispatch event to select conversation
                    window.dispatchEvent(new CustomEvent('selectConversation', { 
                      detail: { conversationId: convId } 
                    }));
                  } else {
                    router.push(`/brands/${navBrandId}/chat?conversation=${convId}`);
                  }
                }}
              />
              
              {brandId && !hideBrandSwitcher && (
                <button
                  onClick={() => router.push(`/brands/${brandId}/settings`)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all cursor-pointer"
                  title="Brand Settings"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
              {toggleCollapse && (
                <button
                  onClick={toggleCollapse}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all hidden lg:flex items-center justify-center cursor-pointer"
                  title="Collapse Sidebar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {/* Mobile close button - always visible on mobile */}
              <button
                onClick={() => onMobileToggle?.(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all flex lg:hidden items-center justify-center cursor-pointer"
                aria-label="Close sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Portal-based dropdown for mobile to escape transform context */}
        {showBrandSwitcher && portalContainer && isMobile && createPortal(
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/40 z-[9998] lg:hidden"
              onClick={() => setShowBrandSwitcher(false)}
            />
            {/* Dropdown positioned at top of screen */}
            <div 
              ref={dropdownContainerRef}
              className="fixed left-4 right-4 top-4 z-[9999] lg:hidden"
              style={{ maxWidth: '340px' }}
            >
              <BrandSelectorDropdown
                allBrands={allBrands}
                currentBrandId={brandId}
                onBrandSelect={(id) => onBrandSwitch?.(id)}
                onNavigateHome={onNavigateHome}
                onClose={() => setShowBrandSwitcher(false)}
                isMobile={true}
              />
            </div>
          </>,
          portalContainer
        )}
      </>
    );
  }

  // Collapsed header - icon only
  return (
    <div className="hidden lg:flex flex-col items-center py-3 px-2 gap-2">
      {toggleCollapse && (
        <button
          onClick={toggleCollapse}
          className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}
      <button
        onClick={onNavigateHome}
        className="w-11 h-11 flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
        title="All Brands"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </div>
  );
}
