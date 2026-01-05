'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { DocumentCategory, DocumentVisibility, DOCUMENT_CATEGORY_META } from '@/types';
import { cn } from '@/lib/utils';
import { 
  Upload, 
  X, 
  FileText, 
  Image, 
  File,
  Loader2,
  Check
} from 'lucide-react';

interface DocumentUploaderProps {
  brandId: string;
  onUpload: (files: FileUploadData[]) => Promise<void>;
  onClose: () => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  initialFiles?: File[];
}

interface FileUploadData {
  file: File;
  title: string;
  description: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  tags: string[];
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string | null;
}

const ACCEPTED_TYPES = {
  'image/jpeg': true,
  'image/png': true,
  'image/gif': true,
  'image/webp': true,
  'application/pdf': true,
  'application/msword': true,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
  'application/vnd.ms-excel': true,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
  'text/plain': true,
  'text/markdown': true,
  'text/csv': true,
  'application/json': true,
};

// Static validation function for use outside of component instance
function validateFileStatic(file: File, maxSizeBytes: number): string | null {
  if (!ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES]) {
    return `File type "${file.type || 'unknown'}" is not supported`;
  }
  if (file.size > maxSizeBytes) {
    return `File is too large (max ${maxSizeBytes / (1024 * 1024)}MB)`;
  }
  return null;
}

export default function DocumentUploader({
  brandId,
  onUpload,
  onClose,
  maxFiles = 10,
  maxSizeBytes = 100 * 1024 * 1024, // 100MB
  initialFiles = [],
}: DocumentUploaderProps) {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [globalCategory, setGlobalCategory] = useState<DocumentCategory>('general');
  const [globalVisibility, setGlobalVisibility] = useState<DocumentVisibility>('private');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialFilesProcessed = useRef(false);

  // Process initial files on mount (from drag-and-drop on page)
  useEffect(() => {
    if (initialFiles.length > 0 && !initialFilesProcessed.current) {
      initialFilesProcessed.current = true;
      const uploadingFiles: UploadingFile[] = initialFiles.slice(0, maxFiles).map((file) => {
        const error = validateFileStatic(file, maxSizeBytes);
        return {
          file,
          progress: 0,
          status: error ? 'error' : 'pending',
          error,
        };
      });
      setFiles(uploadingFiles);
    }
  }, [initialFiles, maxFiles, maxSizeBytes]);

  // Cleanup: Reset file input when component unmounts
  useEffect(() => {
    return () => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isUploading, onClose]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES]) {
      return `File type "${file.type || 'unknown'}" is not supported`;
    }
    if (file.size > maxSizeBytes) {
      return `File is too large (max ${maxSizeBytes / (1024 * 1024)}MB)`;
    }
    return null;
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    
    if (files.length + fileArray.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} files at a time`);
      return;
    }

    const uploadingFiles: UploadingFile[] = fileArray.map((file) => {
      const error = validateFile(file);
      return {
        file,
        progress: 0,
        status: error ? 'error' : 'pending',
        error,
      };
    });

    setFiles((prev) => [...prev, ...uploadingFiles]);
  }, [files.length, maxFiles, maxSizeBytes]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  }, [addFiles]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = async () => {
    const validFiles = files.filter((f) => f.status !== 'error');
    if (validFiles.length === 0) return;

    setIsUploading(true);

    const uploadData: FileUploadData[] = validFiles.map((f) => ({
      file: f.file,
      title: f.file.name.replace(/\.[^/.]+$/, ''), // Remove extension for title
      description: '',
      category: globalCategory,
      visibility: globalVisibility,
      tags: [],
    }));

    try {
      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: f.status === 'pending' ? 'uploading' : f.status,
        }))
      );

      await onUpload(uploadData);

      // Mark all as done
      setFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: f.status === 'uploading' ? 'done' : f.status,
          progress: 100,
        }))
      );

      // Close after brief delay
      setTimeout(onClose, 1000);
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: f.status === 'uploading' ? 'error' : f.status,
          error: 'Upload failed',
        }))
      );
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-5 h-5" />;
    }
    if (file.type === 'application/pdf' || file.type.includes('document')) {
      return <FileText className="w-5 h-5" />;
    }
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Upload Documents
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add files to your brand document store
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer text-center',
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={Object.keys(ACCEPTED_TYPES).join(',')}
              onChange={handleFileInput}
              className="hidden"
            />
            
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center mb-4',
                isDragging
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
              )}>
                <Upload className="w-7 h-7" />
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                {isDragging ? 'Drop files here' : 'Drag and drop files here'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                or click to browse
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                PDF, Word, Excel, images, text files up to 100MB
              </p>
            </div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Selected files ({files.length})
              </h3>
              
              {files.map((f, index) => (
                <div
                  key={`${f.file.name}-${index}`}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    f.status === 'error'
                      ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30'
                      : f.status === 'done'
                        ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                    f.status === 'error'
                      ? 'bg-red-100 dark:bg-red-900/50 text-red-600'
                      : f.status === 'done'
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-600'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  )}>
                    {f.status === 'uploading' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : f.status === 'done' ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      getFileIcon(f.file)
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {f.file.name}
                    </p>
                    <p className={cn(
                      'text-xs',
                      f.status === 'error'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-500 dark:text-gray-400'
                    )}>
                      {f.error || formatFileSize(f.file.size)}
                    </p>
                  </div>
                  
                  {f.status !== 'uploading' && f.status !== 'done' && (
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Global settings */}
          {pendingCount > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={globalCategory}
                  onChange={(e) => setGlobalCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(DOCUMENT_CATEGORY_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.icon} {meta.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Visibility
                </label>
                <select
                  value={globalVisibility}
                  onChange={(e) => setGlobalVisibility(e.target.value as DocumentVisibility)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="private">🔒 Private</option>
                  <option value="shared">👥 Shared</option>
                  <option value="org">🏢 Organization</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || pendingCount === 0}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2',
              isUploading || pendingCount === 0
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload {pendingCount} {pendingCount === 1 ? 'file' : 'files'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

