'use client';

import { Brand } from '@/types';
import { useState, useEffect } from 'react';

interface BrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (brandData: Partial<Brand>) => Promise<void>;
  brand?: Brand | null;
}

export default function BrandModal({ isOpen, onClose, onSave, brand }: BrandModalProps) {
  const [name, setName] = useState('');
  const [brandDetails, setBrandDetails] = useState('');
  const [brandGuidelines, setBrandGuidelines] = useState('');
  const [copywritingStyleGuide, setCopywritingStyleGuide] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (brand) {
      setName(brand.name);
      setBrandDetails(brand.brand_details || '');
      setBrandGuidelines(brand.brand_guidelines || '');
      setCopywritingStyleGuide(brand.copywriting_style_guide || '');
    } else {
      setName('');
      setBrandDetails('');
      setBrandGuidelines('');
      setCopywritingStyleGuide('');
    }
    setError('');
  }, [brand, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Brand name is required');
      return;
    }

    setLoading(true);

    try {
      await onSave({
        name: name.trim(),
        brand_details: brandDetails.trim(),
        brand_guidelines: brandGuidelines.trim(),
        copywriting_style_guide: copywritingStyleGuide.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save brand');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {brand ? 'Edit Brand' : 'Create New Brand'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Brand Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Acme Co."
            />
          </div>

          <div>
            <label htmlFor="brandDetails" className="block text-sm font-medium text-gray-700 mb-2">
              Brand Details
            </label>
            <textarea
              id="brandDetails"
              value={brandDetails}
              onChange={(e) => setBrandDetails(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Describe your brand, products, target audience, mission, etc."
            />
            <p className="text-xs text-gray-500 mt-1">1-2 paragraphs recommended</p>
          </div>

          <div>
            <label htmlFor="brandGuidelines" className="block text-sm font-medium text-gray-700 mb-2">
              Brand Guidelines
            </label>
            <textarea
              id="brandGuidelines"
              value={brandGuidelines}
              onChange={(e) => setBrandGuidelines(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Brand voice, tone, values, things to avoid, etc."
            />
          </div>

          <div>
            <label htmlFor="styleGuide" className="block text-sm font-medium text-gray-700 mb-2">
              Copywriting Style Guide
            </label>
            <textarea
              id="styleGuide"
              value={copywritingStyleGuide}
              onChange={(e) => setCopywritingStyleGuide(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Writing style preferences, formatting guidelines, example phrases, etc."
            />
            <p className="text-xs text-gray-500 mt-1">1-2 paragraphs recommended</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : brand ? 'Update Brand' : 'Create Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


