'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BrandFile, BrandFileCategory, FILE_CATEGORY_META } from '@/types';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import {
  Upload,
  Search,
  Grid3X3,
  List,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  Download,
  Trash2,
  Eye,
  X,
  Plus,
  CloudUpload,
  CheckCircle2,
  Clock,
  Tag,
  FolderOpen,
  HardDrive,
  Sparkles,
  ArrowUpDown,
  MoreHorizontal,
  RefreshCw,
  Link,
  FileCheck,
  Zap,
  Database,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentStorePanelProps {
  brandId: string;
  brandName: string;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'newest' | 'oldest' | 'name' | 'size';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-6 h-6" />;
  if (mimeType === 'application/pdf') return <FileText className="w-6 h-6" />;
  if (mimeType.includes('word')) return <FileText className="w-6 h-6" />;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileSpreadsheet className="w-6 h-6" />;
  if (mimeType === 'text/csv') return <FileSpreadsheet className="w-6 h-6" />;
  return <File className="w-6 h-6" />;
};

const getCategoryColor = (category: BrandFileCategory) => {
  const colors: Record<BrandFileCategory, string> = {
    brand_guidelines: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    style_guide: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    logo: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
    product_catalog: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    marketing_material: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    research: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    competitor_analysis: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    customer_data: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    general: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
  };
  return colors[category];
};

export default function DocumentStorePanel({ brandId, brandName }: DocumentStorePanelProps) {
  const [files, setFiles] = useState<BrandFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BrandFileCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [selectedFile, setSelectedFile] = useState<BrandFile | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [uploadMeta, setUploadMeta] = useState({
    category: 'general' as BrandFileCategory,
    description: '',
    tags: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files
  const loadFiles = useCallback(async () => {
    try {
      const url = selectedCategory === 'all'
        ? `/api/brands/${brandId}/files`
        : `/api/brands/${brandId}/files?category=${selectedCategory}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load files');
      
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      logger.error('Error loading files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [brandId, selectedCategory]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Filter and sort files
  const filteredFiles = files
    .filter(file => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        file.file_name.toLowerCase().includes(query) ||
        file.description?.toLowerCase().includes(query) ||
        file.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name':
          return a.file_name.localeCompare(b.file_name);
        case 'size':
          return b.file_size - a.file_size;
        default:
          return 0;
      }
    });

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFilesSelect(droppedFiles);
    }
  }, []);

  // Handle file selection (supports multiple)
  const handleFilesSelect = (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter(file => {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 50MB limit`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setPendingFiles(validFiles);
      setShowUploadModal(true);
    }
  };

  // Handle actual upload (multiple files)
  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    const uploadedFiles: BrandFile[] = [];
    const totalFiles = pendingFiles.length;

    try {
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', uploadMeta.category);
        if (uploadMeta.description) {
          formData.append('description', uploadMeta.description);
        }
        if (uploadMeta.tags) {
          formData.append('tags', uploadMeta.tags);
        }

        const response = await fetch(`/api/brands/${brandId}/files`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Failed to upload ${file.name}`);
        }

        const data = await response.json();
        uploadedFiles.push(data.file);
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      setFiles(prev => [...uploadedFiles, ...prev]);
      toast.success(`${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} uploaded successfully!`);
      setShowUploadModal(false);
      setPendingFiles([]);
      setUploadMeta({ category: 'general', description: '', tags: '' });
    } catch (error) {
      logger.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // Handle file deletion
  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/brands/${brandId}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });

      if (!response.ok) throw new Error('Delete failed');

      setFiles(prev => prev.filter(f => f.id !== fileId));
      if (selectedFile?.id === fileId) setSelectedFile(null);
      selectedFiles.delete(fileId);
      setSelectedFiles(new Set(selectedFiles));
      toast.success('File deleted');
    } catch (error) {
      logger.error('Delete error:', error);
      toast.error('Failed to delete file');
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;
    if (!confirm(`Delete ${selectedFiles.size} selected files? This cannot be undone.`)) return;

    const deletePromises = Array.from(selectedFiles).map(fileId =>
      fetch(`/api/brands/${brandId}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      })
    );

    try {
      await Promise.all(deletePromises);
      setFiles(prev => prev.filter(f => !selectedFiles.has(f.id)));
      setSelectedFiles(new Set());
      toast.success(`${selectedFiles.size} files deleted`);
    } catch (error) {
      toast.error('Some files failed to delete');
      loadFiles();
    }
  };

  // Handle download
  const handleDownload = (file: BrandFile) => {
    if (file.public_url) {
      window.open(file.public_url, '_blank');
    } else {
      toast.error('Download URL not available');
    }
  };

  // Toggle file selection
  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const categories = Object.entries(FILE_CATEGORY_META);

  // Stats
  const totalFiles = files.length;
  const totalSize = files.reduce((acc, f) => acc + f.file_size, 0);
  const indexedCount = files.filter(f => f.is_indexed).length;
  const categoryBreakdown = categories.map(([key]) => ({
    key,
    count: files.filter(f => f.category === key).length,
  })).filter(c => c.count > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-8 text-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40' fill='%23ffffff' fill-opacity='0.4'/%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Document Store</h2>
              <p className="text-emerald-100 text-sm max-w-md">
                Your central hub for brand assets, guidelines, and reference materials. AI-powered indexing makes everything searchable.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/20">
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <HardDrive className="w-4 h-4 opacity-70" />
                <p className="text-2xl font-bold">{totalFiles}</p>
              </div>
              <p className="text-xs text-emerald-100">Files</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold">{formatFileSize(totalSize)}</p>
              <p className="text-xs text-emerald-100">Storage</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <Brain className="w-4 h-4 opacity-70" />
                <p className="text-2xl font-bold">{indexedCount}</p>
              </div>
              <p className="text-xs text-emerald-100">AI Indexed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Upload Zone - Larger and more prominent */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer group',
          dragActive
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 scale-[1.01] shadow-lg shadow-emerald-500/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-600 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 hover:shadow-md'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={(e) => e.target.files && handleFilesSelect(Array.from(e.target.files))}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg"
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            'w-20 h-20 rounded-2xl flex items-center justify-center transition-all',
            dragActive
              ? 'bg-emerald-500 scale-110 rotate-3'
              : 'bg-gradient-to-br from-emerald-500 to-teal-600 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-emerald-500/30'
          )}>
            <CloudUpload className="w-10 h-10 text-white" />
          </div>
          
          <div>
            <p className={cn(
              'text-lg font-semibold transition-colors mb-1',
              dragActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-800 dark:text-gray-200'
            )}>
              {dragActive ? 'Drop files to upload' : 'Drag & drop files or click to browse'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload multiple files at once • Max 50MB per file
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {['PDF', 'Word', 'Excel', 'Images', 'Markdown', 'CSV'].map(type => (
              <span key={type} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400">
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* Feature badges */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-500" />
            Auto-indexed for AI
          </span>
          <span className="flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
            Text extraction
          </span>
          <span className="flex items-center gap-1.5">
            <Link className="w-3.5 h-3.5 text-emerald-500" />
            Shareable links
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search and filters */}
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Sort dropdown */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name (A-Z)</option>
            <option value="size">Largest first</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Bulk actions */}
          {selectedFiles.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                {selectedFiles.size} selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
              >
                Delete all
              </button>
              <button
                onClick={() => setSelectedFiles(new Set())}
                className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-md transition-all',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-md transition-all',
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={loadFiles}
            className="p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
            selectedCategory === 'all'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          )}
        >
          All Files ({totalFiles})
        </button>
        {categories.map(([key, meta]) => {
          const count = files.filter(f => f.category === key).length;
          if (count === 0 && selectedCategory !== key) return null;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key as BrandFileCategory)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all border flex items-center gap-2',
                selectedCategory === key
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <span>{meta.icon}</span>
              {meta.label}
              {count > 0 && <span className="opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-2xl">
          <FolderOpen className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">
            {searchQuery ? 'No files match your search' : 'No files uploaded yet'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6 max-w-md mx-auto">
            {searchQuery ? 'Try different search terms or clear the filters' : 'Upload brand guidelines, logos, product catalogs, and other assets to get started'}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload your first file
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => {
            const categoryMeta = FILE_CATEGORY_META[file.category];
            const isImage = file.file_type.startsWith('image/');
            const isSelected = selectedFiles.has(file.id);
            
            return (
              <div
                key={file.id}
                className={cn(
                  'group bg-white dark:bg-gray-800 border rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer relative',
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                {/* Selection checkbox */}
                <div className="absolute top-3 left-3 z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFileSelection(file.id); }}
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-white/80 bg-black/20 group-hover:bg-white/90 group-hover:border-gray-300 dark:group-hover:border-gray-600'
                    )}
                  >
                    {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>
                </div>

                {/* Preview Area */}
                <div 
                  className="relative h-36 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center overflow-hidden"
                  onClick={() => setSelectedFile(file)}
                >
                  {isImage && file.public_url ? (
                    <img
                      src={file.public_url}
                      alt={file.file_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400 dark:text-gray-500">
                      {getFileIcon(file.file_type)}
                    </div>
                  )}
                  
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(file); }}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(file.id, file.file_name); }}
                      className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  
                  {/* Category Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={cn(
                      'text-xs px-2 py-1 rounded-full border font-medium backdrop-blur-sm bg-white/80 dark:bg-gray-900/80',
                      getCategoryColor(file.category)
                    )}>
                      {categoryMeta.icon}
                    </span>
                  </div>
                  
                  {/* AI Indexed Badge */}
                  {file.is_indexed && (
                    <div className="absolute bottom-3 right-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500 text-white font-medium flex items-center gap-1 shadow-lg">
                        <Sparkles className="w-3 h-3" />
                        AI
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="p-4" onClick={() => setSelectedFile(file)}>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate mb-1">
                    {file.file_name}
                  </h4>
                  {file.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">
                      {file.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>{new Date(file.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFiles.map((file) => {
            const categoryMeta = FILE_CATEGORY_META[file.category];
            const isSelected = selectedFiles.has(file.id);
            
            return (
              <div
                key={file.id}
                className={cn(
                  'group bg-white dark:bg-gray-800 border rounded-xl p-4 hover:shadow-md transition-all',
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Selection */}
                  <button
                    onClick={() => toggleFileSelection(file.id)}
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
                    )}
                  >
                    {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>

                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                    {getFileIcon(file.file_type)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {file.file_name}
                      </h4>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0',
                        getCategoryColor(file.category)
                      )}>
                        {categoryMeta.icon} {categoryMeta.label}
                      </span>
                      {file.is_indexed && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium flex-shrink-0 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Indexed
                        </span>
                      )}
                    </div>
                    {file.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mb-1">
                        {file.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(file.created_at).toLocaleDateString()}
                      </span>
                      {file.uploader && (
                        <span>by {file.uploader.full_name || file.uploader.email}</span>
                      )}
                    </div>
                    {file.tags && file.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {file.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setSelectedFile(file)}
                      className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Preview"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(file.id, file.file_name)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && pendingFiles.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500 rounded-xl text-white">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Upload {pendingFiles.length} File{pendingFiles.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-gray-500">{formatFileSize(pendingFiles.reduce((acc, f) => acc + f.size, 0))} total</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setPendingFiles([]);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Files Preview */}
              <div className="max-h-40 overflow-y-auto space-y-2">
                {pendingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={uploadMeta.category}
                  onChange={(e) => setUploadMeta(prev => ({ ...prev, category: e.target.value as BrandFileCategory }))}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {categories.map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.icon} {meta.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={uploadMeta.description}
                  onChange={(e) => setUploadMeta(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of these files"
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags (optional)
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={uploadMeta.tags}
                    onChange={(e) => setUploadMeta(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="e.g., 2024, spring, campaign"
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
              </div>

              {/* Progress */}
              {uploadProgress !== null && (
                <div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadModal(false);
                  setPendingFiles([]);
                  setUploadMeta({ category: 'general', description: '', tags: '' });
                }}
                disabled={uploading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || pendingFiles.length === 0}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              >
                {uploading ? 'Uploading...' : `Upload ${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                  {getFileIcon(selectedFile.file_type)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {selectedFile.file_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.file_size)} • {new Date(selectedFile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-6">
              {selectedFile.file_type.startsWith('image/') && selectedFile.public_url ? (
                <img
                  src={selectedFile.public_url}
                  alt={selectedFile.file_name}
                  className="max-w-full h-auto rounded-lg mx-auto shadow-lg"
                />
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4 text-gray-400">
                    {getFileIcon(selectedFile.file_type)}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Preview not available for this file type
                  </p>
                  <Button onClick={() => handleDownload(selectedFile)} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download to view
                  </Button>
                </div>
              )}

              {/* File Details */}
              <div className="mt-8 grid md:grid-cols-2 gap-6">
                {selectedFile.description && (
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-xl p-4">{selectedFile.description}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</h4>
                  <span className={cn(
                    'text-sm px-4 py-2 rounded-xl border font-medium inline-flex items-center gap-2',
                    getCategoryColor(selectedFile.category)
                  )}>
                    {FILE_CATEGORY_META[selectedFile.category].icon} {FILE_CATEGORY_META[selectedFile.category].label}
                  </span>
                </div>
                
                {selectedFile.is_indexed && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Status</h4>
                    <span className="text-sm px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium inline-flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Indexed for AI Search
                    </span>
                  </div>
                )}

                {selectedFile.tags && selectedFile.tags.length > 0 && (
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedFile.tags.map((tag, i) => (
                        <span key={i} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <Button
                variant="outline"
                onClick={() => handleDelete(selectedFile.id, selectedFile.file_name)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <div className="flex-1" />
              <Button
                onClick={() => handleDownload(selectedFile)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




