'use client';

import { useState, useEffect } from 'react';
import { Brand } from '@/types';

interface BrandDetailsTabProps {
  brand: Brand;
  onUpdate: (updates: Partial<Brand>) => void;
}

export default function BrandDetailsTab({ brand, onUpdate }: BrandDetailsTabProps) {
  const [name, setName] = useState(brand.name || '');
  const [websiteUrl, setWebsiteUrl] = useState(brand.website_url || '');
  const [brandDetails, setBrandDetails] = useState(brand.brand_details || '');

  useEffect(() => {
    const hasChanges =
      name !== brand.name ||
      websiteUrl !== (brand.website_url || '') ||
      brandDetails !== (brand.brand_details || '');

    if (hasChanges) {
      const timeoutId = setTimeout(() => {
        onUpdate({
          name,
          website_url: websiteUrl,
          brand_details: brandDetails,
        });
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [name, websiteUrl, brandDetails]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Brand Details
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Core information about your brand, including name, URL, and overview
        </p>
      </div>

      {/* Brand Name */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Brand Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg font-medium"
          placeholder="Enter brand name"
        />
      </div>

      {/* Website URL */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          Website URL
        </label>
        <input
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="https://www.example.com"
        />
        <div className="mt-3 flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>Used to search for product information when AI mentions products in conversations</p>
        </div>
      </div>

      {/* Brand Overview Document */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Brand Overview
        </label>
        <div className="relative">
          <textarea
            value={brandDetails}
            onChange={(e) => setBrandDetails(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y transition-all font-sans leading-relaxed"
            placeholder="Write a comprehensive overview of your brand...

Include details about:
• What your brand does and what products/services you offer
• Your target audience and ideal customers
• Your brand's mission, vision, and values
• What makes your brand unique
• Key selling points and differentiators
• Brand personality and voice characteristics"
          />
          <div className="absolute bottom-3 right-3 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 px-2 py-1 rounded">
            {brandDetails.length} characters
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p>This document helps the AI understand your brand deeply. The more detail you provide, the better the AI can assist you.</p>
        </div>
      </div>
    </div>
  );
}

