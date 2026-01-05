'use client';

import { useState, useEffect } from 'react';
import { Brand } from '@/types';
import { ShoppingBag, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface BrandDetailsTabProps {
  brand: Brand;
  onUpdate: (updates: Partial<Brand>) => void;
}

export default function BrandDetailsTab({ brand, onUpdate }: BrandDetailsTabProps) {
  const [name, setName] = useState(brand.name || '');
  const [websiteUrl, setWebsiteUrl] = useState(brand.website_url || '');
  const [shopifyDomain, setShopifyDomain] = useState(brand.shopify_domain || '');
  const [brandDetails, setBrandDetails] = useState(brand.brand_details || '');
  const [shopifyStatus, setShopifyStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');

  // Auto-detect Shopify domain from website URL
  const handleAutoDetect = () => {
    console.log('[Auto-Detect] Button clicked, websiteUrl:', websiteUrl);
    
    if (!websiteUrl) {
      toast.error('Please enter a website URL first');
      return;
    }
    
    try {
      // Handle URLs with or without protocol
      let urlToParse = websiteUrl.trim();
      
      // Add protocol if missing
      if (!urlToParse.match(/^https?:\/\//i)) {
        urlToParse = 'https://' + urlToParse;
      }
      
      const url = new URL(urlToParse);
      const hostname = url.hostname;
      
      // Remove www. prefix if present
      const cleanHostname = hostname.replace(/^www\./, '');
      
      console.log('[Auto-Detect] Extracted hostname:', cleanHostname);
      
      // Check if it's a Shopify domain
      if (cleanHostname.includes('myshopify.com')) {
        setShopifyDomain(cleanHostname);
        toast.success('✓ Shopify domain detected!');
        console.log('[Auto-Detect] Shopify domain set:', cleanHostname);
      } else {
        // Try the domain anyway (could be custom domain)
        setShopifyDomain(cleanHostname);
        toast.success('✓ Domain set - verifying Shopify connection...');
        console.log('[Auto-Detect] Custom domain set:', cleanHostname);
      }
    } catch (error) {
      console.error('[Auto-Detect] Error parsing URL:', error);
      toast.error('Unable to parse URL. Please check the format.');
    }
  };

  useEffect(() => {
    const hasChanges =
      name !== brand.name ||
      websiteUrl !== (brand.website_url || '') ||
      shopifyDomain !== (brand.shopify_domain || '') ||
      brandDetails !== (brand.brand_details || '');

    if (hasChanges) {
      const timeoutId = setTimeout(() => {
        onUpdate({
          name,
          website_url: websiteUrl,
          shopify_domain: shopifyDomain || undefined,
          brand_details: brandDetails,
        });
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [name, websiteUrl, shopifyDomain, brandDetails, brand.name, brand.website_url, brand.shopify_domain, brand.brand_details, onUpdate]);

  // Check Shopify MCP connection when domain changes
  useEffect(() => {
    if (!shopifyDomain) {
      setShopifyStatus('idle');
      return;
    }

    const checkConnection = async () => {
      setShopifyStatus('checking');
      try {
        // Try to access the MCP endpoint to verify connection
        const response = await fetch(`/api/shopify/check-mcp?domain=${encodeURIComponent(shopifyDomain)}`);
        const data = await response.json();
        setShopifyStatus(data.connected ? 'connected' : 'error');
      } catch {
        setShopifyStatus('error');
      }
    };

    const timeoutId = setTimeout(checkConnection, 1000);
    return () => clearTimeout(timeoutId);
  }, [shopifyDomain]);

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

      {/* Shopify Integration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-green-600 dark:text-green-400" />
          Shopify Store Integration
          <span className="ml-auto text-xs font-normal px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
            MCP Enabled
          </span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={shopifyDomain}
              onChange={(e) => setShopifyDomain(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              placeholder="your-store.myshopify.com or yourdomain.com"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {shopifyStatus === 'checking' && (
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              )}
              {shopifyStatus === 'connected' && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              {shopifyStatus === 'error' && (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
          </div>
          <button
            onClick={handleAutoDetect}
            disabled={!websiteUrl}
            className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
            title="Auto-detect from website URL"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Auto-Detect
          </button>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Connect your Shopify store to enable AI to directly search your product catalog, get accurate pricing, and access store information via MCP (Model Context Protocol).</p>
          </div>
          {shopifyStatus === 'connected' && (
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              <span>MCP connection verified! AI can now search your Shopify catalog directly.</span>
            </div>
          )}
          {shopifyStatus === 'error' && shopifyDomain && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
              <XCircle className="w-4 h-4" />
              <span>MCP endpoint not available. AI will use web search as fallback.</span>
            </div>
          )}
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

