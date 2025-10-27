'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Brand } from '@/types';
import BrandCard from '@/components/BrandCard';
import BrandModal from '@/components/BrandModal';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
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

      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBrands(data || []);
    } catch (error) {
      console.error('Error loading brands:', error);
      toast.error('Failed to load brands');
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
    if (!user) return;

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
        });

      if (error) throw error;
      toast.success('Brand created successfully');
    }

    await loadBrands();
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading brands...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Email Copywriter AI</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Your Brands</h2>
            <p className="text-gray-600 mt-1">Select a brand to start writing email copy</p>
          </div>
          <button
            onClick={handleCreateBrand}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md"
          >
            + Create New Brand
          </button>
        </div>

        {brands.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-lg shadow-md p-12 max-w-md mx-auto">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
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
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No brands yet</h3>
              <p className="text-gray-600 mb-6">Get started by creating your first brand</p>
              <button
                onClick={handleCreateBrand}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Create Your First Brand
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brand) => (
              <BrandCard
                key={brand.id}
                brand={brand}
                onEdit={handleEditBrand}
                onDelete={handleDeleteBrand}
              />
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
