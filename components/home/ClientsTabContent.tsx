'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Brand } from '@/types';
import { PERSONAL_AI_INFO } from '@/lib/personal-ai';
import { cn } from '@/lib/utils';
import { Search, Sparkles, Building2, ArrowRight, MoreVertical, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';

interface ClientsTabContentProps {
  brands: Brand[];
  recentBrandIds: string[];
  onBrandSelect: (brandId: string) => void;
  onCreateBrand?: () => void;
  onEditBrand?: (brand: Brand) => void;
  onDeleteBrand?: (brandId: string) => void;
  canManageBrands?: boolean;
}

interface MenuPosition {
  x: number;
  y: number;
  brand: Brand;
}

export default function ClientsTabContent({
  brands,
  recentBrandIds,
  onBrandSelect,
  onCreateBrand,
  onEditBrand,
  onDeleteBrand,
  canManageBrands = false,
}: ClientsTabContentProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllClients, setShowAllClients] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Recent brands
  const recentBrands = useMemo(() => {
    return recentBrandIds
      .map(id => brands.find(b => b.id === id))
      .filter((b): b is Brand => b !== undefined)
      .slice(0, 3);
  }, [recentBrandIds, brands]);

  // Filtered brands
  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands;
    const query = searchQuery.toLowerCase();
    return brands.filter(brand => brand.name.toLowerCase().includes(query));
  }, [brands, searchQuery]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuPosition(null);
      }
    };

    if (menuPosition) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuPosition]);

  // Close menu on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuPosition(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleBrandClick = (brandId: string) => {
    onBrandSelect(brandId);
    router.push(`/brands/${brandId}`);
  };

  const handleThreeDotsClick = (e: React.MouseEvent, brand: Brand) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setMenuPosition({
      x: rect.right - 160,
      y: rect.bottom + 4,
      brand,
    });
  };

  const handleMenuAction = (action: 'edit' | 'delete' | 'open', brand: Brand) => {
    setMenuPosition(null);
    if (action === 'edit' && onEditBrand) {
      onEditBrand(brand);
    } else if (action === 'delete' && onDeleteBrand) {
      onDeleteBrand(brand.id);
    } else if (action === 'open') {
      router.push(`/brands/${brand.id}`);
    }
  };

  const renderBrandItem = (brand: Brand, showArrow = false) => (
    <div
      key={brand.id}
      className="group relative"
    >
      <button
        onClick={() => handleBrandClick(brand.id)}
        className={cn(
          "w-full px-3 py-2 text-left rounded-lg transition-all cursor-pointer",
          "hover:bg-gray-50 dark:hover:bg-gray-800/50",
          "flex items-center gap-2.5"
        )}
      >
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
          "bg-gradient-to-br from-gray-400 to-gray-500 group-hover:from-blue-400 group-hover:to-indigo-500",
          "transition-all"
        )}>
          <span className="text-white font-bold text-xs">
            {brand.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
          {brand.name}
        </span>
        {showArrow && !canManageBrands && (
          <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>

      {/* Three-dot menu button */}
      {canManageBrands && (
        <button
          onClick={(e) => handleThreeDotsClick(e, brand)}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-all cursor-pointer",
            "opacity-0 group-hover:opacity-100",
            "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
            "hover:bg-gray-100 dark:hover:bg-gray-700"
          )}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  // Context menu portal
  const contextMenu = menuPosition && typeof document !== 'undefined' && createPortal(
    <div
      ref={menuRef}
      className={cn(
        "fixed z-[9999] bg-white dark:bg-gray-800 rounded-xl shadow-2xl",
        "border border-gray-200 dark:border-gray-700",
        "py-1.5 min-w-[160px]",
        "animate-in fade-in zoom-in-95 duration-150"
      )}
      style={{
        left: Math.max(8, Math.min(menuPosition.x, window.innerWidth - 168)),
        top: Math.min(menuPosition.y, window.innerHeight - 150),
      }}
    >
      <button
        onClick={() => handleMenuAction('open', menuPosition.brand)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2 text-sm",
          "hover:bg-gray-100 dark:hover:bg-gray-700",
          "text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
        )}
      >
        <ExternalLink className="w-4 h-4" />
        <span>Open Client</span>
      </button>
      <button
        onClick={() => handleMenuAction('edit', menuPosition.brand)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2 text-sm",
          "hover:bg-gray-100 dark:hover:bg-gray-700",
          "text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
        )}
      >
        <Pencil className="w-4 h-4" />
        <span>Edit Client</span>
      </button>
      <div className="my-1.5 mx-2 border-t border-gray-200 dark:border-gray-700" />
      <button
        onClick={() => handleMenuAction('delete', menuPosition.brand)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2 text-sm",
          "hover:bg-red-50 dark:hover:bg-red-900/20",
          "text-red-600 dark:text-red-400 transition-colors cursor-pointer"
        )}
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete Client</span>
      </button>
    </div>,
    document.body
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header with search and create button */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients..."
              className={cn(
                "w-full pl-9 pr-3 py-2 text-sm rounded-lg",
                "bg-gray-100 dark:bg-gray-800 border-0",
                "text-gray-900 dark:text-white placeholder:text-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-blue-500"
              )}
            />
          </div>
          {canManageBrands && onCreateBrand && (
            <button
              onClick={onCreateBrand}
              className={cn(
                "p-2 rounded-lg transition-colors cursor-pointer",
                "bg-gray-900 dark:bg-white text-white dark:text-gray-900",
                "hover:bg-gray-800 dark:hover:bg-gray-100"
              )}
              title="Create new client"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Personal AI Option */}
        <div className="p-2 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => handleBrandClick(PERSONAL_AI_INFO.id)}
            className={cn(
              "w-full px-3 py-2 text-left rounded-lg transition-all group cursor-pointer",
              "hover:bg-violet-50 dark:hover:bg-violet-900/30",
              "flex items-center gap-2.5"
            )}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-violet-100 dark:bg-violet-900/30">
              <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1">
              {PERSONAL_AI_INFO.name}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 rounded-full">
              Private
            </span>
          </button>
        </div>

        {/* Recent Brands */}
        {recentBrands.length > 0 && !searchQuery && !showAllClients && (
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Recent
            </div>
            {recentBrands.map(brand => renderBrandItem(brand))}
          </div>
        )}

        {/* All Brands */}
        <div className="p-2">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center justify-between">
            <span>{searchQuery ? `${filteredBrands.length} results` : 'All Clients'}</span>
            {!searchQuery && brands.length > 5 && !showAllClients && (
              <button
                onClick={() => setShowAllClients(true)}
                className="text-blue-600 dark:text-blue-400 hover:underline normal-case font-medium cursor-pointer"
              >
                See all ({brands.length})
              </button>
            )}
            {showAllClients && (
              <button
                onClick={() => setShowAllClients(false)}
                className="text-gray-500 dark:text-gray-400 hover:underline normal-case font-medium cursor-pointer"
              >
                Show less
              </button>
            )}
          </div>

          {filteredBrands.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No clients found' : 'No clients yet'}
              </p>
              {canManageBrands && onCreateBrand && !searchQuery && (
                <button
                  onClick={onCreateBrand}
                  className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Create your first client
                </button>
              )}
            </div>
          ) : (
            (showAllClients || searchQuery ? filteredBrands : filteredBrands.slice(0, 5)).map(brand =>
              renderBrandItem(brand, true)
            )
          )}
        </div>
      </div>

      {contextMenu}
    </div>
  );
}
