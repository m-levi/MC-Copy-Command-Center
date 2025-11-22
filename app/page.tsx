'use client';

import { useEffect, useState, useMemo, useCallback, memo, lazy, Suspense, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Brand, Organization, OrganizationRole } from '@/types';
import BrandCard from '@/components/BrandCard';
import BrandListItem from '@/components/BrandListItem';
import { BrandGridSkeleton } from '@/components/SkeletonLoader';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { logger } from '@/lib/logger';
import NotificationCenter from '@/components/NotificationCenter';
import { RequestCoalescer } from '@/lib/performance-utils';

// Lazy load the modal since it's not needed on initial render
const BrandModal = lazy(() => import('@/components/BrandModal'));

export const dynamic = 'force-dynamic';

type SortOption = 'newest' | 'oldest' | 'a-z' | 'z-a' | 'updated';
type ViewMode = 'grid' | 'list';

export default function HomePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<OrganizationRole | null>(null);
  const [canManageBrands, setCanManageBrands] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const requestCoalescerRef = useRef(new RequestCoalescer<void>());

  // Load preferences from localStorage
  useEffect(() => {
    const savedSort = localStorage.getItem('brandsSortBy') as SortOption;
    const savedView = localStorage.getItem('brandsViewMode') as ViewMode;
    if (savedSort) setSortBy(savedSort);
    if (savedView) setViewMode(savedView);
    loadBrands();
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    if (sortBy) localStorage.setItem('brandsSortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    if (viewMode) localStorage.setItem('brandsViewMode', viewMode);
  }, [viewMode]);

  const loadBrands = async () => {
    return requestCoalescerRef.current.execute(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        setCurrentUserId(user.id);

        logger.log('Fetching org membership for user:', user.id);

        // Get user's organization membership
        const { data: memberData, error: memberError } = await supabase
          .from('organization_members')
          .select('role, organization_id')
          .eq('user_id', user.id)
          .single();

        logger.log('Organization membership query result:', {
          data: memberData,
          error: memberError,
          hasData: !!memberData,
          hasError: !!memberError
        });

        if (memberError || !memberData) {
          logger.error('Organization membership error:', memberError);
          logger.error('User ID being queried:', user.id);
          logger.error('Full error object:', JSON.stringify(memberError, null, 2));
          toast.error('You are not part of any organization. Please contact an admin.');
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }

        // Get organization details separately
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', memberData.organization_id)
          .single();

        if (orgError || !orgData) {
          logger.error('Organization fetch error:', orgError);
          toast.error('Failed to load organization details.');
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }

        const org = orgData as Organization;
        const role = memberData.role as OrganizationRole;
        
        setOrganization(org);
        setUserRole(role);
        setCanManageBrands(role === 'admin' || role === 'brand_manager');

        // Load all brands for the organization
        const { data, error } = await supabase
          .from('brands')
          .select('*')
          .eq('organization_id', org.id)
          .order('created_at', { ascending: false });

        if (error) {
          logger.error('Brands fetch error:', error);
          throw error;
        }

        setBrands(data || []);
      } catch (error: any) {
        logger.error('Error loading brands:', error);
        toast.error(error.message || 'Failed to load brands');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleCreateBrand = useCallback(() => {
    setEditingBrand(null);
    setIsModalOpen(true);
  }, []);

  const handleEditBrand = useCallback((brand: Brand) => {
    // Navigate to brand details page instead of opening modal
    router.push(`/brands/${brand.id}`);
  }, [router]);

  const handleSaveBrand = useCallback(async (brandData: Partial<Brand>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !organization) return;

    try {
      if (editingBrand) {
        // Update existing brand
        const { error } = await supabase
          .from('brands')
          .update({
            ...brandData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingBrand.id);

        if (error) throw error;
        toast.success('Brand updated successfully');
      } else {
        // Create new brand
        const { error } = await supabase
          .from('brands')
          .insert({
            ...brandData,
            user_id: user.id,
            organization_id: organization.id,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success('Brand created successfully');
      }

      setIsModalOpen(false);
      await loadBrands();
    } catch (error: any) {
      logger.error('Error saving brand:', error);
      toast.error(error.message || 'Failed to save brand');
    }
  }, [editingBrand, organization, supabase]);

  const handleDeleteBrand = useCallback(async (brandId: string) => {
    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId);

      if (error) throw error;

      toast.success('Brand deleted successfully');
      await loadBrands();
    } catch (error) {
      logger.error('Error deleting brand:', error);
      toast.error('Failed to delete brand');
    }
  }, [supabase]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [supabase, router]);

  // Filter and sort brands
  const filteredAndSortedBrands = useMemo(() => {
    let filtered = brands;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = brands.filter((brand) => {
        return (
          brand.name.toLowerCase().includes(query) ||
          brand.brand_details?.toLowerCase().includes(query) ||
          brand.brand_guidelines?.toLowerCase().includes(query) ||
          brand.copywriting_style_guide?.toLowerCase().includes(query)
        );
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'a-z':
          return a.name.localeCompare(b.name);
        case 'z-a':
          return b.name.localeCompare(a.name);
        case 'updated':
          return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [brands, searchQuery, sortBy]);

  const getSortLabel = () => {
    switch (sortBy) {
      case 'newest': return 'Newest First';
      case 'oldest': return 'Oldest First';
      case 'a-z': return 'A-Z';
      case 'z-a': return 'Z-A';
      case 'updated': return 'Recently Updated';
      default: return 'Sort';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 animate-in fade-in duration-300">
        <Toaster position="top-right" />
        
        {/* Header Skeleton */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <div className="h-8 w-48 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="h-9 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </header>

        {/* Main content with skeleton */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-5 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="h-12 w-48 bg-gradient-to-r from-blue-200 to-indigo-200 dark:from-blue-800 dark:to-indigo-800 rounded-lg animate-pulse"></div>
          </div>

          {/* Search bar skeleton */}
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-4">
              <div className="flex-1 h-11 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="h-11 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="h-11 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
          </div>

          <BrandGridSkeleton count={6} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 animate-in fade-in duration-300">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              Email Copywriter AI
            </h1>
            {organization && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{organization.name}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {userRole === 'admin' && (
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all cursor-pointer rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Team Management
              </button>
            )}
            <div className="relative">
              <NotificationCenter />
            </div>
            <button
              onClick={() => router.push('/settings')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header with title and create button */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Brands</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Select a brand to start writing email copy</p>
          </div>
          {canManageBrands && (
            <button
              onClick={handleCreateBrand}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 dark:from-blue-500 dark:to-blue-400 dark:hover:from-blue-600 dark:hover:to-blue-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Brand
              </span>
            </button>
          )}
        </div>

        {/* Search and Controls Bar */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Results count */}
              <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {filteredAndSortedBrands.length} {filteredAndSortedBrands.length === 1 ? 'brand' : 'brands'}
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  {getSortLabel()}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showSortDropdown && (
                  <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-10 min-w-[180px]">
                    {[
                      { value: 'newest', label: 'Newest First' },
                      { value: 'oldest', label: 'Oldest First' },
                      { value: 'a-z', label: 'Alphabetical (A-Z)' },
                      { value: 'z-a', label: 'Alphabetical (Z-A)' },
                      { value: 'updated', label: 'Recently Updated' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value as SortOption);
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          sortBy === option.value
                            ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option.label}</span>
                          {sortBy === option.value && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 rounded-md transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  title="Grid view"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 rounded-md transition-all ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  title="List view"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Brands Display */}
        {brands.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-sm p-12 max-w-lg mx-auto border border-blue-100 dark:border-gray-600">
              <div className="mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
              </div>
              <div className="mb-6">
                <svg className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-3">No brands yet</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed max-w-md mx-auto">
                Create your first brand to start generating amazing email copy with AI. Each brand can have its own voice, style, and examples.
              </p>
              {canManageBrands && (
                <button
                  onClick={handleCreateBrand}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Your First Brand
                </button>
              )}
            </div>
          </div>
        ) : filteredAndSortedBrands.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 max-w-lg mx-auto border border-gray-200 dark:border-gray-700">
              <div className="mb-6">
                <svg
                  className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">No brands found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                No brands match your search. Try a different search term.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
              >
                Clear Search
              </button>
            </div>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'flex flex-col gap-4'
          }>
            {filteredAndSortedBrands.map((brand) => (
              viewMode === 'grid' ? (
                <BrandCard
                  key={brand.id}
                  brand={brand}
                  currentUserId={currentUserId}
                  canManage={canManageBrands}
                  onEdit={handleEditBrand}
                  onDelete={handleDeleteBrand}
                />
              ) : (
                <BrandListItem
                  key={brand.id}
                  brand={brand}
                  currentUserId={currentUserId}
                  canManage={canManageBrands}
                  onEdit={handleEditBrand}
                  onDelete={handleDeleteBrand}
                />
              )
            ))}
          </div>
        )}
      </main>

      <Suspense fallback={null}>
        {isModalOpen && (
          <BrandModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveBrand}
            brand={editingBrand}
          />
        )}
      </Suspense>
    </div>
  );
}
