'use client';

import { useEffect, useState, useMemo, useCallback, lazy, Suspense, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Brand, Organization, OrganizationRole } from '@/types';
import BrandCard from '@/components/BrandCard';
import BrandListItem from '@/components/BrandListItem';
import { BrandGridSkeleton } from '@/components/SkeletonLoader';
import RecentActivityList from '@/components/dashboard/RecentActivityList';
import RecentBrandsList from '@/components/dashboard/RecentBrandsList';
import QuickStartAction from '@/components/dashboard/QuickStartAction';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { logger } from '@/lib/logger';
import { MoonCommerceLogo } from '@/components/MoonCommerceLogo';
import NotificationCenter from '@/components/NotificationCenter';
import { RequestCoalescer } from '@/lib/performance-utils';

// Lazy load the modal since it's not needed on initial render
const BrandModal = lazy(() => import('@/components/BrandModal'));

export const dynamic = 'force-dynamic';

type SortOption = 'newest' | 'oldest' | 'a-z' | 'z-a' | 'updated';
type ViewMode = 'grid' | 'list';

export default function HomePage({ params, searchParams }: { params?: any; searchParams?: any }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandActivityMap, setBrandActivityMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<OrganizationRole | null>(null);
  const [canManageBrands, setCanManageBrands] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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

  const loadBrands = async (silent = false) => {
    return requestCoalescerRef.current.execute(async () => {
      try {
        if (!silent) setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        setCurrentUserId(user.id);

        // Get user's organization membership
        const { data: memberData, error: memberError } = await supabase
          .from('organization_members')
          .select('role, organization_id')
          .eq('user_id', user.id)
          .single();

        if (memberError || !memberData) {
          toast.error('You are not part of any organization. Please contact an admin.');
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }

        // Get organization details separately
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, slug')
          .eq('id', memberData.organization_id)
          .single();

        if (orgError || !orgData) {
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
          throw error;
        }

        setBrands(data || []);

        // Fetch recent activity
        const { data: recentActivity } = await supabase
          .from('conversations')
          .select('brand_id, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(100);
          
        if (recentActivity) {
          const activityMap = new Map<string, string>();
          recentActivity.forEach(item => {
            if (!activityMap.has(item.brand_id)) {
              activityMap.set(item.brand_id, item.updated_at);
            }
          });
          setBrandActivityMap(activityMap);
        }

      } catch (error: any) {
        logger.error('Error loading brands:', error);
        toast.error(error.message || 'Failed to load brands');
      } finally {
        if (!silent) setLoading(false);
        setIsRefreshing(false);
      }
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadBrands(true);
  };

  const handleCreateBrand = useCallback(() => {
    setEditingBrand(null);
    setIsModalOpen(true);
  }, []);

  const handleEditBrand = useCallback((brand: Brand) => {
    router.push(`/brands/${brand.id}`);
  }, [router]);

  const handleSaveBrand = useCallback(async (brandData: Partial<Brand>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !organization) return;

    try {
      if (editingBrand) {
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
      await loadBrands(true);
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
      await loadBrands(true);
    } catch (error) {
      logger.error('Error deleting brand:', error);
      toast.error('Failed to delete brand');
    }
  }, [supabase]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [supabase, router]);

  const filteredAndSortedBrands = useMemo(() => {
    let filtered = brands;

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
          const timeA = brandActivityMap.get(a.id) 
            ? new Date(brandActivityMap.get(a.id)!).getTime() 
            : new Date(a.updated_at || a.created_at).getTime();
            
          const timeB = brandActivityMap.get(b.id) 
            ? new Date(brandActivityMap.get(b.id)!).getTime() 
            : new Date(b.updated_at || b.created_at).getTime();
            
          return timeB - timeA;
        default:
          return 0;
      }
    });

    return sorted;
  }, [brands, searchQuery, sortBy, brandActivityMap]);

  const getSortLabel = () => {
    switch (sortBy) {
      case 'newest': return 'Newest';
      case 'oldest': return 'Oldest';
      case 'a-z': return 'A-Z';
      case 'z-a': return 'Z-A';
      case 'updated': return 'Active';
      default: return 'Sort';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 animate-in fade-in duration-300">
        <Toaster position="top-right" />
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 h-16" />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="h-20 w-1/3 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-8"></div>
          <div className="h-64 w-full bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse mb-8"></div>
          <BrandGridSkeleton count={6} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 animate-in fade-in duration-300">
      <Toaster position="top-right" />
      
      {/* Top Navigation Bar */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <MoonCommerceLogo className="h-[1.2rem] w-auto text-gray-900 dark:text-white" />
            {organization && (
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
            )}
            {organization && (
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {organization.name}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {userRole === 'admin' && (
              <button
                onClick={() => router.push('/admin')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                title="Team Management"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </button>
            )}
            <div className="relative">
              <NotificationCenter />
            </div>
            <button
              onClick={() => router.push('/settings')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        
        <DashboardHeader />

        {/* Top Section: Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12 items-start">
          
          {/* Left Column: Quick Start Action (Chat Box) & Jump Back In */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <QuickStartAction brands={brands} />
            <RecentActivityList />
          </div>

          {/* Right Column: Recent Brands */}
          <div className="lg:col-span-4 h-full">
            {/* Quick Brand View (Most Recent Brands) */}
            <RecentBrandsList brands={brands} activityMap={brandActivityMap} />
          </div>
        </div>

        {/* Brands Workspace Section */}
        <section className="space-y-6 pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Your Brands</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Manage brand profiles and view all history</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search brands..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border-none ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all"
                />
              </div>

              <div className="h-8 w-px bg-gray-200 dark:bg-gray-800 mx-1 hidden sm:block"></div>

              {/* View Controls - Simplified */}
              <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-all ${
                    viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-all ${
                    viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {canManageBrands && (
                <button
                  onClick={handleCreateBrand}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm hover:shadow transition-all text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Brand</span>
                </button>
              )}
            </div>
          </div>

          {/* Brands Grid/List */}
          {brands.length === 0 ? (
             <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No brands yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">Get started by creating your first brand profile to generate tailored AI content.</p>
                {canManageBrands && (
                  <button
                    onClick={handleCreateBrand}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Create Brand
                  </button>
                )}
             </div>
          ) : filteredAndSortedBrands.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No brands match your search.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'flex flex-col gap-3'
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
        </section>
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
