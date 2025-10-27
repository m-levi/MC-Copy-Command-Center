'use client';

import { Brand } from '@/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BrandCardProps {
  brand: Brand;
  onEdit: (brand: Brand) => void;
  onDelete: (brandId: string) => void;
}

export default function BrandCard({ brand, onEdit, onDelete }: BrandCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/brands/${brand.id}/chat`);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onEdit(brand);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (confirm(`Are you sure you want to delete "${brand.name}"?`)) {
      onDelete(brand.id);
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div
      onClick={handleCardClick}
      className="relative bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer p-6 border border-gray-200"
    >
      {/* Three-dot menu button */}
      <button
        onClick={handleMenuClick}
        className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <svg
          className="w-5 h-5 text-gray-600"
          fill="currentColor"
          viewBox="0 0 16 16"
        >
          <circle cx="8" cy="2" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="14" r="1.5" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <div className="absolute top-12 right-4 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[150px]">
          <button
            onClick={handleEdit}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
          >
            Edit Brand Details
          </button>
          <button
            onClick={handleDelete}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
          >
            Delete Brand
          </button>
        </div>
      )}

      {/* Brand content */}
      <h3 className="text-xl font-bold text-gray-800 mb-3 pr-8">
        {brand.name}
      </h3>
      <p className="text-sm text-gray-600 line-clamp-3">
        {truncateText(brand.brand_details || 'No details provided', 150)}
      </p>
    </div>
  );
}


