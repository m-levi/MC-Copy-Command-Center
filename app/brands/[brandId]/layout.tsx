'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Brand } from '@/types';
import BrandViewHeader from '@/components/BrandViewHeader';
import { logger } from '@/lib/logger';
import { isPersonalAI, PERSONAL_AI_INFO, PERSONAL_AI_BRAND_ID } from '@/lib/personal-ai';

interface BrandLayoutProps {
  children: React.ReactNode;
  params: Promise<{ brandId: string }>;
}

// Virtual brand object for Personal AI
const PERSONAL_AI_BRAND: Brand = {
  id: PERSONAL_AI_BRAND_ID,
  user_id: '',
  organization_id: '',
  created_by: '',
  name: PERSONAL_AI_INFO.name,
  brand_details: PERSONAL_AI_INFO.description,
  brand_guidelines: '',
  copywriting_style_guide: '',
  website_url: undefined,
  shopify_domain: undefined,
  brand_voice: undefined,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export default function BrandLayout({ children, params }: BrandLayoutProps) {
  const resolvedParams = use(params);
  const brandId = resolvedParams.brandId;
  const router = useRouter();
  const supabase = createClient();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBrandData();
  }, [brandId]);

  const loadBrandData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/login');
        return;
      }

      // Handle Personal AI - use virtual brand, no database fetch needed
      if (isPersonalAI(brandId)) {
        setBrand(PERSONAL_AI_BRAND);

        // Still load all brands for the switcher
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (membership) {
          const { data: brands } = await supabase
            .from('brands')
            .select('*')
            .eq('organization_id', membership.organization_id)
            .order('name');

          setAllBrands(brands || []);
        }
        setLoading(false);
        return;
      }

      // Load current brand from database
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (brandError || !brandData) {
        logger.error('Brand not found:', brandError);
        setError('Brand not found');
        return;
      }

      setBrand(brandData);

      // Load all brands for the user (for the switcher)
      // First get user's organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (membership) {
        const { data: brands } = await supabase
          .from('brands')
          .select('*')
          .eq('organization_id', membership.organization_id)
          .order('name');

        setAllBrands(brands || []);
      }
    } catch (err) {
      logger.error('Error loading brand data:', err);
      setError('Failed to load brand');
    } finally {
      setLoading(false);
    }
  };

  const handleBrandSwitch = (newBrandId: string) => {
    // Navigate to same tab on new brand
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/');
    const currentTab = pathParts[pathParts.length - 1];
    
    // Default to chat if on root brand page
    const targetTab = ['chat', 'documents', 'settings'].includes(currentTab) 
      ? currentTab 
      : 'chat';
    
    router.push(`/brands/${newBrandId}/${targetTab}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Skeleton header */}
        <div className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="hidden sm:block">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mt-1 animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
            <div className="w-[150px]" />
          </div>
        </div>
        
        {/* Skeleton content */}
        <div className="flex items-center justify-center h-[calc(100vh-60px)]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 dark:text-gray-400">Loading brand...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {error || 'Brand not found'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The brand you're looking for doesn't exist or you don't have access to it.
          </p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <BrandViewHeader 
        brand={brand} 
        allBrands={allBrands}
        onBrandSwitch={handleBrandSwitch}
      />
      <main className="flex-1 min-h-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

