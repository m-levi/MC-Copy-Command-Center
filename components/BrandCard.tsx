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
  
  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

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

  // New action handlers
  const handleNewEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsNavigating(true);
    router.push(`/brands/${brand.id}/chat?mode=email_copy&emailType=design&autoCreate=true`);
  };

  const handleNewFlow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsNavigating(true);
    router.push(`/brands/${brand.id}/chat?mode=flow&autoCreate=true`);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
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
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      className={`group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-1 overflow-hidden flex flex-col h-[280px] ${
        isNavigating ? 'opacity-90 pointer-events-none' : ''
      }`}
    >
      {/* Top colored accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="p-6 flex-1 flex flex-col relative">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-100 dark:border-blue-800">
              {getInitials(brand.name)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                {brand.name}
              </h3>
              {brand.website_url && (
                <a 
                  href={brand.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Visit Website
                </a>
              )}
            </div>
          </div>

          {/* Menu Button */}
          <div className="relative">
            {canManage && !isNavigating && (
              <button
                onClick={handleMenuClick}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                  <circle cx="8" cy="2" r="1.5" />
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="8" cy="14" r="1.5" />
                </svg>
              </button>
            )}
            
            {/* Dropdown Menu */}
            {showMenu && canManage && (
              <div className="absolute top-8 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[160px] animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={handleEdit}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Details
                </button>
                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-600 dark:text-red-400 flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Brand
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="flex-1 relative z-0">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3 mb-4">
            {brand.brand_details ? truncateText(brand.brand_details, 150) : (
              <span className="text-gray-400 italic">No description provided. Click to add details about your brand voice and style.</span>
            )}
          </p>
        </div>

        {/* Quick Actions Overlay (Appears on hover) */}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex gap-2 border-t border-gray-100 dark:border-gray-700 z-10">
          <button
            onClick={handleNewEmail}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            New Email
          </button>
          <button
            onClick={handleNewFlow}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-semibold rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            New Flow
          </button>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 group-hover:opacity-0 transition-opacity duration-300">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-600 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-gray-600">
              {creatorName.charAt(0).toUpperCase()}
            </div>
            <span className="truncate max-w-[80px] sm:max-w-[100px]">{creatorName}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span title={`Created on ${new Date(brand.created_at).toLocaleDateString()}`}>
              {formatDate(brand.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isNavigating && (
        <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px] flex items-center justify-center z-10">
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent dark:border-blue-400 dark:border-t-transparent"></div>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Opening...</span>
          </div>
        </div>
      )}
    </div>
  );
}
