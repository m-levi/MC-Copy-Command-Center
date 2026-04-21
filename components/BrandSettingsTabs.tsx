'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '@/types';
import BrandDetailsTab from './BrandDetailsTab';
import BrandStyleGuideTab from './BrandStyleGuideTab';
import BrandGuidelinesTab from './BrandGuidelinesTab';
import BrandMemoriesTab from './BrandMemoriesTab';
import BrandDosAndDontsTab from './BrandDosAndDontsTab';

interface BrandSettingsTabsProps {
  brand: Brand;
  onUpdate: (updates: Partial<Brand>) => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

export type TabId = 'details' | 'style-guide' | 'guidelines' | 'memories' | 'dos-donts';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactElement;
  badge?: number;
}

export default function BrandSettingsTabs({ brand, onUpdate, saveStatus }: BrandSettingsTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('details');
  // const [showWizard, setShowWizard] = useState(false); // Wizard is now a page

  const tabs: Tab[] = [
    {
      id: 'details',
      label: 'Brand Details',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'style-guide',
      label: 'Style Guide',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      id: 'guidelines',
      label: 'Guidelines',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: 'memories',
      label: 'Memories & Notes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: 'dos-donts',
      label: "Do's & Don'ts",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return <BrandDetailsTab brand={brand} onUpdate={onUpdate} />;
      case 'style-guide':
        return <BrandStyleGuideTab brand={brand} onUpdate={onUpdate} />;
      case 'guidelines':
        return <BrandGuidelinesTab brand={brand} onUpdate={onUpdate} />;
      case 'memories':
        return <BrandMemoriesTab brandId={brand.id} />;
      case 'dos-donts':
        return <BrandDosAndDontsTab brandId={brand.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-2">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide mask-linear-fade">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-all relative flex-shrink-0
                  ${
                    activeTab === tab.id
                      ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }
                `}
              >
                <span className={activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : ''}>
                  {tab.icon}
                </span>
                <span className="hidden sm:inline">{tab.label}</span>
                {/* Show label on mobile only for active tab if space allows, or just use icons for all on very small screens */}
                <span className="sm:hidden">{activeTab === tab.id ? tab.label : ''}</span>
                
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => router.push(`/brands/${brand.id}/voice-builder`)}
            className="ml-2 sm:ml-4 px-3 sm:px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-violet-700 hover:to-purple-700 shadow-sm transition-all hover:scale-105 flex items-center gap-2 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="hidden sm:inline">Brand Voice</span>
          </button>
        </div>
      </div>

      {/* Save Status Indicator */}
      {saveStatus !== 'idle' && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-6 py-2">
            <div className={`flex items-center gap-2 text-sm ${
              saveStatus === 'saving' ? 'text-blue-600 dark:text-blue-400' :
              saveStatus === 'saved' ? 'text-green-600 dark:text-green-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {saveStatus === 'saving' && (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Saving changes...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>All changes saved</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Error saving changes</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

