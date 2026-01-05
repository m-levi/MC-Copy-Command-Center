'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Brand } from '@/types';
import { cn } from '@/lib/utils';
import { 
  MessageSquare, 
  FileText, 
  Settings, 
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import BrandSelectorDropdown from './BrandSelectorDropdown';

interface BrandViewHeaderProps {
  brand: Brand;
  allBrands?: Brand[];
  onBrandSwitch?: (brandId: string) => void;
}

type TabId = 'chat' | 'documents' | 'settings';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  href: string;
}

export default function BrandViewHeader({
  brand,
  allBrands = [],
  onBrandSwitch,
}: BrandViewHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showBrandSwitcher, setShowBrandSwitcher] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const brandSwitcherRef = useRef<HTMLButtonElement>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  // Determine active tab from pathname
  const getActiveTab = (): TabId => {
    if (pathname?.includes('/documents')) return 'documents';
    if (pathname?.includes('/settings')) return 'settings';
    return 'chat'; // Default to chat
  };
  
  const activeTab = getActiveTab();

  const tabs: Tab[] = [
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageSquare className="w-4 h-4" />,
      href: `/brands/${brand.id}/chat`,
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: <FileText className="w-4 h-4" />,
      href: `/brands/${brand.id}/documents`,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      href: `/brands/${brand.id}/settings`,
    },
  ];

  // Handle brand selection
  const handleBrandSelect = useCallback((brandId: string) => {
    setShowBrandSwitcher(false);
    if (onBrandSwitch) {
      onBrandSwitch(brandId);
    } else {
      // Navigate to same tab on new brand
      const currentTab = activeTab;
      router.push(`/brands/${brandId}/${currentTab === 'chat' ? 'chat' : currentTab}`);
    }
  }, [onBrandSwitch, router, activeTab]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Brand switcher
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBrandSwitcher]);

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false);
  }, [pathname]);

  // Close mobile menu on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMobileMenu(false);
        setShowBrandSwitcher(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-3 sm:px-4 h-14">
          {/* Left: Brand Switcher */}
          <div className="relative flex-shrink-0">
            <button
              ref={brandSwitcherRef}
              type="button"
              onClick={() => setShowBrandSwitcher(!showBrandSwitcher)}
              className={cn(
                "flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all cursor-pointer group",
                "px-2 py-1.5 sm:px-2.5"
              )}
              aria-expanded={showBrandSwitcher}
              aria-haspopup="listbox"
            >
              {/* Brand Avatar */}
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-bold text-sm">
                  {brand.name.charAt(0).toUpperCase()}
                </span>
              </div>
              
              {/* Brand Name - hidden on mobile */}
              <div className="text-left hidden md:block min-w-0">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[140px] lg:max-w-[180px]">
                  {brand.name}
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">Switch brand</p>
              </div>
              
              <ChevronDown 
                className={cn(
                  'w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 hidden sm:block',
                  showBrandSwitcher && 'rotate-180'
                )} 
              />
            </button>

            {/* Desktop Dropdown */}
            {showBrandSwitcher && (
              <div 
                ref={dropdownContainerRef}
                className="absolute top-full left-0 mt-1 z-[100] hidden sm:block"
              >
                <BrandSelectorDropdown
                  allBrands={allBrands}
                  currentBrandId={brand.id}
                  onBrandSelect={handleBrandSelect}
                  onNavigateHome={() => {
                    setShowBrandSwitcher(false);
                    router.push('/');
                  }}
                  onClose={() => setShowBrandSwitcher(false)}
                />
              </div>
            )}
          </div>

          {/* Center: Desktop Tabs */}
          <nav className="hidden sm:flex items-center justify-center flex-1">
            <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-lg p-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    className={cn(
                      'flex items-center gap-2 px-3 lg:px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                      isActive
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    )}
                  >
                    {tab.icon}
                    <span className="hidden lg:inline">{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Mobile: Current Tab Label + Menu Button */}
          <div className="flex items-center gap-2 sm:hidden flex-1 justify-center">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {tabs.find(t => t.id === activeTab)?.label}
            </span>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="sm:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {showMobileMenu ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            {/* Desktop: Empty spacer for balance */}
            <div className="hidden sm:block w-[140px] lg:w-[180px]" />
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div 
          className={cn(
            "sm:hidden overflow-hidden transition-all duration-200 ease-in-out border-t border-gray-200 dark:border-gray-800",
            showMobileMenu ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0 border-t-0"
          )}
        >
          <div className="p-3 space-y-2 bg-gray-50 dark:bg-gray-900/50">
            {/* Mobile Tabs */}
            <div className="space-y-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full',
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Mobile Brand Switcher */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  setShowBrandSwitcher(true);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all w-full"
              >
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">
                    {brand.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="flex-1 text-left truncate">{brand.name}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* All Brands Link */}
            <button
              onClick={() => {
                setShowMobileMenu(false);
                router.push('/');
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all w-full"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              All Brands
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Brand Switcher Modal */}
      {showBrandSwitcher && (
        <div className="sm:hidden fixed inset-0 z-[100]">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowBrandSwitcher(false)}
          />
          
          {/* Modal */}
          <div className="absolute inset-x-4 top-4 bottom-auto max-h-[80vh]">
            <BrandSelectorDropdown
              allBrands={allBrands}
              currentBrandId={brand.id}
              onBrandSelect={handleBrandSelect}
              onNavigateHome={() => {
                setShowBrandSwitcher(false);
                router.push('/');
              }}
              onClose={() => setShowBrandSwitcher(false)}
              isMobile={true}
            />
          </div>
        </div>
      )}
    </>
  );
}
