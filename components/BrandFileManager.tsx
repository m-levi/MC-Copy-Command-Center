'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BrandFile, BrandFileCategory, FILE_CATEGORY_META } from '@/types';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

interface BrandFileManagerProps {
  brandId: string;
  brandName: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📕';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType === 'text/csv') return '📊';
  if (mimeType.startsWith('text/')) return '📄';
  return '📎';
};

export default function BrandFileManager({ brandId, brandName }: BrandFileManagerProps) {
  const [files, setFiles] = useState<BrandFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BrandFileCategory | 'all'>('all');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadMeta, setUploadMeta] = useState({
    category: 'general' as BrandFileCategory,
    description: '',
    tags: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

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

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0]);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = (file: File) => {
    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds 50MB limit');
      return;
    }

    setPendingFile(file);
    setShowUploadModal(true);
  };

  // Handle actual upload
  const handleUpload = async () => {
    if (!pendingFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', pendingFile);
      formData.append('category', uploadMeta.category);
      if (uploadMeta.description) {
        formData.append('description', uploadMeta.description);
      }
      if (uploadMeta.tags) {
        formData.append('tags', uploadMeta.tags);
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => prev !== null ? Math.min(prev + 10, 90) : 10);
      }, 200);

      const response = await fetch(`/api/brands/${brandId}/files`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setFiles(prev => [data.file, ...prev]);
      
      toast.success('File uploaded successfully!');
      setShowUploadModal(false);
      setPendingFile(null);
      setUploadMeta({ category: 'general', description: '', tags: '' });
    } catch (error) {
      logger.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
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
      toast.success('File deleted');
    } catch (error) {
      logger.error('Delete error:', error);
      toast.error('Failed to delete file');
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

  const categories = Object.entries(FILE_CATEGORY_META);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Document Store
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Upload and manage brand files, guidelines, and assets
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg"
        />
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          All Files
        </button>
        {categories.map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key as BrandFileCategory)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              selectedCategory === key
                ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span>{meta.icon}</span>
            {meta.label}
          </button>
        ))}
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
            dragActive
              ? 'bg-blue-100 dark:bg-blue-900'
              : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            <svg className={`w-8 h-8 ${dragActive ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {dragActive ? 'Drop your file here' : 'Drag & drop files here'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              or click &quot;Upload File&quot; to browse
            </p>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-600">
            Supports: PDF, Word, Excel, Images, Text files (up to 50MB)
          </p>
        </div>
      </div>

      {/* Files List */}
      {files.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
          <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No files uploaded yet
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Upload brand guidelines, logos, and other assets
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {files.map((file) => {
            const categoryMeta = FILE_CATEGORY_META[file.category];
            return (
              <div
                key={file.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start gap-4">
                  {/* File Icon */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl">
                    {getFileIcon(file.file_type)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {file.file_name}
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium bg-${categoryMeta.color}-100 dark:bg-${categoryMeta.color}-950/30 text-${categoryMeta.color}-700 dark:text-${categoryMeta.color}-300`}>
                        {categoryMeta.icon} {categoryMeta.label}
                      </span>
                    </div>
                    {file.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 line-clamp-1">
                        {file.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                      {file.uploader && (
                        <>
                          <span>•</span>
                          <span>by {file.uploader.full_name || file.uploader.email}</span>
                        </>
                      )}
                      {file.is_indexed && (
                        <>
                          <span>•</span>
                          <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Indexed for AI
                          </span>
                        </>
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
                      onClick={() => handleDownload(file)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      title="Download"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(file.id, file.file_name)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && pendingFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Upload File
            </h3>

            {/* File Preview */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4">
              <span className="text-2xl">{getFileIcon(pendingFile.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                  {pendingFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(pendingFile.size)}
                </p>
              </div>
            </div>

            {/* Category Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={uploadMeta.category}
                onChange={(e) => setUploadMeta(prev => ({ ...prev, category: e.target.value as BrandFileCategory }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.icon} {meta.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (optional)
              </label>
              <input
                type="text"
                value={uploadMeta.description}
                onChange={(e) => setUploadMeta(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this file"
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Tags */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags (optional)
              </label>
              <input
                type="text"
                value={uploadMeta.tags}
                onChange={(e) => setUploadMeta(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="e.g., 2024, spring, campaign (comma separated)"
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Progress Bar */}
            {uploadProgress !== null && (
              <div className="mb-4">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setPendingFile(null);
                  setUploadMeta({ category: 'general', description: '', tags: '' });
                }}
                disabled={uploading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




























