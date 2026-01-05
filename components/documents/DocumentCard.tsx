'use client';

import { useState, useRef, useEffect } from 'react';
import { BrandDocumentV2, DOCUMENT_CATEGORY_META, DOCUMENT_TYPE_META, DOCUMENT_VISIBILITY_META } from '@/types';
import { cn } from '@/lib/utils';
import {
  FileText,
  Link as LinkIcon,
  FileImage,
  FileCode,
  File,
  FilePlus2,
  ExternalLink,
  Eye,
  Edit3,
  Trash2,
  Share2,
  MoreHorizontal,
  Pin,
  PinOff,
  Download,
  Copy,
  Check,
  Lock,
  Users,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DocumentCardProps {
  doc: BrandDocumentV2;
  viewMode: 'grid' | 'list';
  isSelected?: boolean;
  onSelect?: () => void;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onTogglePin?: () => void;
  onDownload?: () => void;
  onDuplicate?: () => void;
}

// Format relative time without date-fns
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${diffYears}y ago`;
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Get file icon based on type
function getFileIcon(fileType?: string, docType?: string) {
  if (docType === 'text') return FileText;
  if (docType === 'link') return LinkIcon;
  
  if (!fileType) return File;
  
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType.includes('pdf')) return FileText;
  if (fileType.includes('javascript') || fileType.includes('typescript') || fileType.includes('json')) return FileCode;
  if (fileType.includes('text') || fileType.includes('document')) return FileText;
  
  return File;
}

// Get visibility icon
function getVisibilityIcon(visibility: string) {
  switch (visibility) {
    case 'private': return Lock;
    case 'shared': return Users;
    case 'org': return Building2;
    default: return Lock;
  }
}

export default function DocumentCard({
  doc,
  viewMode,
  isSelected = false,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onShare,
  onTogglePin,
  onDownload,
  onDuplicate,
}: DocumentCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const FileIcon = getFileIcon(doc.file_type, doc.doc_type);
  const VisibilityIcon = getVisibilityIcon(doc.visibility);
  const categoryMeta = DOCUMENT_CATEGORY_META[doc.category];
  const typeMeta = DOCUMENT_TYPE_META[doc.doc_type];
  const visibilityMeta = DOCUMENT_VISIBILITY_META[doc.visibility];
  
  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      window.addEventListener('mousedown', handleClickOutside);
      return () => window.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);
  
  const handleCopyLink = async () => {
    const url = doc.doc_type === 'link' ? doc.url : doc.public_url;
    if (url) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setShowMenu(false);
  };
  
  // Grid View
  if (viewMode === 'grid') {
    return (
      <div
        className={cn(
          "group relative bg-white dark:bg-gray-900 border rounded-xl overflow-hidden transition-all hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600",
          isSelected ? "ring-2 ring-blue-500 border-blue-500" : "border-gray-200 dark:border-gray-800"
        )}
      >
        {/* Selection Checkbox */}
        {onSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={cn(
              "absolute top-3 left-3 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
              isSelected
                ? "bg-blue-500 border-blue-500 text-white"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-0 group-hover:opacity-100"
            )}
          >
            {isSelected && <Check className="w-3 h-3" />}
          </button>
        )}
        
        {/* Pinned Badge */}
        {doc.is_pinned && (
          <div className="absolute top-3 right-3 z-10 p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-full">
            <Pin className="w-3 h-3 text-amber-600 dark:text-amber-400 fill-current" />
          </div>
        )}
        
        {/* Preview Area */}
        <div 
          className="relative h-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 flex items-center justify-center cursor-pointer"
          onClick={onView}
        >
          {doc.doc_type === 'link' && doc.url_image ? (
            <img 
              src={doc.url_image} 
              alt={doc.title}
              className="w-full h-full object-cover"
            />
          ) : doc.doc_type === 'file' && doc.file_type?.startsWith('image/') && doc.public_url ? (
            <img 
              src={doc.public_url} 
              alt={doc.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center",
              doc.doc_type === 'file' ? "bg-blue-100 dark:bg-blue-900/30" :
              doc.doc_type === 'text' ? "bg-green-100 dark:bg-green-900/30" :
              "bg-purple-100 dark:bg-purple-900/30"
            )}>
              <FileIcon className={cn(
                "w-7 h-7",
                doc.doc_type === 'file' ? "text-blue-600 dark:text-blue-400" :
                doc.doc_type === 'text' ? "text-green-600 dark:text-green-400" :
                "text-purple-600 dark:text-purple-400"
              )} />
            </div>
          )}
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView?.();
              }}
              className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium shadow-lg transition-opacity flex items-center gap-1.5"
            >
              {doc.doc_type === 'link' ? (
                <>
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Link
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  View
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          {/* Category & Type */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {typeMeta.icon} {typeMeta.label}
            </span>
            {doc.is_indexed && (
              <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <Sparkles className="w-3 h-3" />
                <span className="hidden sm:inline">AI Ready</span>
              </span>
            )}
          </div>
          
          {/* Title */}
          <h3 
            className="font-semibold text-gray-900 dark:text-white text-sm leading-tight mb-2 line-clamp-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            onClick={onView}
            title={doc.title}
          >
            {doc.title}
          </h3>
          
          {/* Description */}
          {doc.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
              {doc.description}
            </p>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <div className="flex items-center gap-2">
              <VisibilityIcon className="w-3.5 h-3.5" />
              <span>{formatRelativeTime(new Date(doc.created_at))}</span>
            </div>
            
            {doc.doc_type === 'file' && doc.file_size && (
              <span>{formatFileSize(doc.file_size)}</span>
            )}
          </div>
          
          {/* Tags */}
          {doc.tags && doc.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {doc.tags.slice(0, 3).map((tag, i) => (
                <span 
                  key={i}
                  className="px-2 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full"
                >
                  {tag}
                </span>
              ))}
              {doc.tags.length > 3 && (
                <span className="px-2 py-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                  +{doc.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Actions Menu */}
        <div className="absolute top-3 right-3 z-20" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              showMenu 
                ? "bg-gray-200 dark:bg-gray-700" 
                : "bg-white/80 dark:bg-gray-800/80 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            <MoreHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
              {onView && (
                <button
                  onClick={() => { onView(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
              )}
              {doc.doc_type === 'text' && onEdit && (
                <button
                  onClick={() => { onEdit(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              )}
              {onTogglePin && (
                <button
                  onClick={() => { onTogglePin(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {doc.is_pinned ? (
                    <>
                      <PinOff className="w-4 h-4" />
                      Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="w-4 h-4" />
                      Pin
                    </>
                  )}
                </button>
              )}
              {onShare && (
                <button
                  onClick={() => { onShare(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              )}
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              {doc.doc_type === 'file' && onDownload && (
                <button
                  onClick={() => { onDownload(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700" />
              {onDelete && (
                <button
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // List View
  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-3 bg-white dark:bg-gray-900 border rounded-lg transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600",
        isSelected ? "ring-2 ring-blue-500 border-blue-500" : "border-gray-200 dark:border-gray-800"
      )}
    >
      {/* Selection Checkbox */}
      {onSelect && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={cn(
            "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
            isSelected
              ? "bg-blue-500 border-blue-500 text-white"
              : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-0 group-hover:opacity-100"
          )}
        >
          {isSelected && <Check className="w-3 h-3" />}
        </button>
      )}
      
      {/* Icon */}
      <div 
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer",
          doc.doc_type === 'file' ? "bg-blue-100 dark:bg-blue-900/30" :
          doc.doc_type === 'text' ? "bg-green-100 dark:bg-green-900/30" :
          "bg-purple-100 dark:bg-purple-900/30"
        )}
        onClick={onView}
      >
        <FileIcon className={cn(
          "w-5 h-5",
          doc.doc_type === 'file' ? "text-blue-600 dark:text-blue-400" :
          doc.doc_type === 'text' ? "text-green-600 dark:text-green-400" :
          "text-purple-600 dark:text-purple-400"
        )} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 
            className="font-medium text-gray-900 dark:text-white text-sm truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            onClick={onView}
          >
            {doc.title}
          </h3>
          {doc.is_pinned && (
            <Pin className="w-3.5 h-3.5 text-amber-500 fill-current flex-shrink-0" />
          )}
          {doc.is_indexed && (
            <Sparkles className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            {categoryMeta.icon} {categoryMeta.label}
          </span>
          {doc.doc_type === 'file' && doc.file_size && (
            <span>{formatFileSize(doc.file_size)}</span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(new Date(doc.created_at))}
          </span>
        </div>
      </div>
      
      {/* Visibility */}
      <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
        <VisibilityIcon className="w-3.5 h-3.5" />
        <span className="hidden md:inline">{visibilityMeta.label}</span>
      </div>
      
      {/* Tags */}
      <div className="hidden lg:flex items-center gap-1 flex-shrink-0 max-w-[180px]">
        {doc.tags && doc.tags.slice(0, 2).map((tag, i) => (
          <span 
            key={i}
            className="px-2 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full truncate"
          >
            {tag}
          </span>
        ))}
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {onView && (
          <button
            onClick={onView}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="View"
          >
            {doc.doc_type === 'link' ? <ExternalLink className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        {doc.doc_type === 'text' && onEdit && (
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
        {onTogglePin && (
          <button
            onClick={onTogglePin}
            className="p-1.5 text-gray-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
            title={doc.is_pinned ? 'Unpin' : 'Pin'}
          >
            {doc.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
        )}
        {onShare && (
          <button
            onClick={onShare}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
        
        {/* More Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              {doc.doc_type === 'file' && onDownload && (
                <button
                  onClick={() => { onDownload(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700" />
              {onDelete && (
                <button
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
