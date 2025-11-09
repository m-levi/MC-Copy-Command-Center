'use client';

import { Brand } from '@/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BrandListItemProps {
  brand: Brand & { creator?: { full_name?: string; email: string } };
  currentUserId: string;
  canManage: boolean;
  onEdit: (brand: Brand) => void;
  onDelete: (brandId: string) => void;
}

export default function BrandListItem({ brand, currentUserId, canManage, onEdit, onDelete }: BrandListItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const creatorName = brand.creator?.full_name || brand.creator?.email || 'Unknown';

  const handleRowClick = () => {
    setIsNavigating(true);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div
      onClick={handleRowClick}
      className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer p-5 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 group ${
        isNavigating ? 'opacity-50 scale-[0.99] pointer-events-none' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-6">
        {/* Left section - Brand info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">
              {brand.name}
            </h3>
            {brand.website_url && (
              <a
                href={brand.website_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Visit
              </a>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
            {truncateText(brand.brand_details || 'No details provided', 200)}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {creatorName}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(brand.created_at)}
            </span>
            {brand.updated_at && brand.updated_at !== brand.created_at && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Updated {formatDate(brand.updated_at)}
              </span>
            )}
          </div>
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center gap-3">
          {/* Arrow indicator */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>

          {/* Three-dot menu - only show if user can manage brands */}
          {canManage && (
            <button
              onClick={handleMenuClick}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 focus:ring-2 focus:ring-blue-500"
              aria-label="Brand menu"
            >
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
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
      </div>

      {/* Dropdown menu */}
      {showMenu && canManage && (
        <div className="absolute top-16 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 min-w-[150px]">
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

      {/* Loading indicator */}
      {isNavigating && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}














