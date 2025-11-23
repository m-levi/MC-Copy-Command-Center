'use client';

import { Brand } from '@/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface BrandCardProps {
  brand: Brand & { creator?: { full_name?: string; email: string } };
  currentUserId: string;
  canManage: boolean;
  onEdit: (brand: Brand) => void;
  onDelete: (brandId: string) => void;
}

export default function BrandCard({ brand, currentUserId, canManage, onEdit, onDelete }: BrandCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const creatorName = brand.creator?.full_name || brand.creator?.email || 'Unknown';

  const handleCardClick = () => {
    setIsNavigating(true);
    router.push(`/brands/${brand.id}/chat`);
  };

  // Prefetch the route on hover for instant navigation
  const handleMouseEnter = () => {
    router.prefetch(`/brands/${brand.id}/chat`);
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
      onMouseEnter={handleMouseEnter}
      className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-1 group ${
        isNavigating ? 'opacity-90 pointer-events-none' : ''
      }`}
    >
      {/* Active Pulse Indicator (Simulated for active projects) */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        
        {/* Loading indicator - Top right, subtle */}
        {isNavigating && (
          <div className="flex items-center gap-2 animate-in fade-in duration-200">
             <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent dark:border-blue-400 dark:border-t-transparent"></div>
          </div>
        )}

        {/* Three-dot menu button - only show if user can manage brands and not loading */}
        {canManage && !isNavigating && (
          <button
            onClick={handleMenuClick}
            className="p-1.5 -mr-2 -mt-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:ring-2 focus:ring-blue-500"
            aria-label="Brand menu"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <circle cx="8" cy="2" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="8" cy="14" r="1.5" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown menu */}
      {showMenu && canManage && (
        <div className="absolute top-12 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 min-w-[150px]">
          <button
            onClick={handleEdit}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 cursor-pointer transition-colors"
          >
            Edit Brand Details
          </button>
          <button
            onClick={handleDelete}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-red-600 dark:text-red-400 cursor-pointer transition-colors"
          >
            Delete Brand
          </button>
        </div>
      )}

      {/* Footer with metadata */}
      <div className="mb-4 pr-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {brand.name}
        </h3>
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 text-[10px] text-gray-600 dark:text-gray-300">
            {creatorName.charAt(0).toUpperCase()}
          </div>
          <span>{creatorName}</span>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed mb-5 h-10">
        {truncateText(brand.brand_details || 'No description provided for this brand.', 120)}
      </p>
      
      {/* Footer with metadata */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(brand.created_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </div>
        {/* Hover indicator */}
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1">
          <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>
    </div>
  );
}


