'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Brand, Organization, OrganizationRole } from '@/types';
import BrandCard from '@/components/BrandCard';
import BrandModal from '@/components/BrandModal';
import { BrandGridSkeleton } from '@/components/SkeletonLoader';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<OrganizationRole | null>(null);
  const [canManageBrands, setCanManageBrands] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUserId(user.id);

      console.log('Fetching org membership for user:', user.id);

      // Get user's organization membership
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .single();

      console.log('Organization membership query result:', {
        data: memberData,
        error: memberError,
        hasData: !!memberData,
        hasError: !!memberError
      });

      if (memberError || !memberData) {
        console.error('Organization membership error:', memberError);
        console.error('User ID being queried:', user.id);
        console.error('Full error object:', JSON.stringify(memberError, null, 2));
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
        console.error('Organization fetch error:', orgError);
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

      // Load all brands for the organization (not just user's brands)
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Brands fetch error:', error);
        throw error;
      }

      // Fetch creator profiles separately for each brand
      const brandsWithCreators = await Promise.all(
        (data || []).map(async (brand) => {
          if (brand.created_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', brand.created_by)
              .single();
            
            return { ...brand, creator: profile };
          }
          return brand;
        })
      );

      setBrands(brandsWithCreators);
    } catch (error: any) {
      console.error('Error loading brands:', error);
      toast.error(error.message || 'Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBrand = () => {
    setEditingBrand(null);
    setIsModalOpen(true);
  };

  const handleEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setIsModalOpen(true);
  };

  const handleSaveBrand = async (brandData: Partial<Brand>) => {
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
      console.error('Error saving brand:', error);
      toast.error(error.message || 'Failed to save brand');
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId);

      if (error) throw error;

      toast.success('Brand deleted successfully');
      await loadBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast.error('Failed to delete brand');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 animate-in fade-in duration-300">
        <Toaster position="top-right" />
        
        {/* Header Skeleton */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        </header>

        {/* Main content with skeleton */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-5 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="h-12 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          </div>

          <BrandGridSkeleton count={6} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 animate-in fade-in duration-300">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Email Copywriter AI</h1>
            {organization && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{organization.name}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {userRole === 'admin' && (
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                Team Management
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-150 cursor-pointer hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded px-2 py-1"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Brands</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Select a brand to start writing email copy</p>
          </div>
          {canManageBrands && (
            <button
              onClick={handleCreateBrand}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold rounded-lg transition-all duration-150 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              + Create New Brand
            </button>
          )}
        </div>

        {brands.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 max-w-md mx-auto border border-gray-200 dark:border-gray-700">
              <svg
                className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4"
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
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">No brands yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by creating your first brand</p>
              <button
                onClick={handleCreateBrand}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold rounded-lg transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              >
                Create Your First Brand
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {brands.map((brand, index) => (
              <div
                key={brand.id}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <BrandCard
                  brand={brand}
                  currentUserId={currentUserId}
                  canManage={canManageBrands}
                  onEdit={handleEditBrand}
                  onDelete={handleDeleteBrand}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <BrandModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveBrand}
        brand={editingBrand}
      />
    </div>
  );
}
