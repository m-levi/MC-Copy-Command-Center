'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { 
  getMimeTypeLabel, 
  isGoogleWorkspaceApp,
  type DriveFile 
} from '@/lib/google-drive-service';
import {
  X,
  Loader2,
  Search,
  Folder,
  FileText,
  File,
  Image,
  Film,
  Music,
  Table,
  Presentation,
  FileSpreadsheet,
  FolderOpen,
  ChevronRight,
  ArrowLeft,
  Cloud,
  CloudOff,
  Download,
  ExternalLink,
  Check,
  RefreshCw,
} from 'lucide-react';

interface GoogleDrivePickerProps {
  brandId: string;
  onImport: (files: DriveFile[]) => Promise<void>;
  onClose: () => void;
  maxFiles?: number;
}

// Get icon for file type
function getFileIcon(mimeType: string) {
  if (mimeType === 'application/vnd.google-apps.folder') {
    return Folder;
  }
  if (mimeType.includes('document') || mimeType.includes('text')) {
    return FileText;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return FileSpreadsheet;
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return Presentation;
  }
  if (mimeType.includes('image')) {
    return Image;
  }
  if (mimeType.includes('video')) {
    return Film;
  }
  if (mimeType.includes('audio')) {
    return Music;
  }
  return File;
}

// Format file size
function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Format date
function formatDate(dateString?: string): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function GoogleDrivePicker({
  brandId,
  onImport,
  onClose,
  maxFiles = 10,
}: GoogleDrivePickerProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: 'My Drive' },
  ]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/google/drive/status');
      const data = await response.json();
      setIsConnected(data.connected);
      setConnectedEmail(data.email);
      return data.connected;
    } catch (error) {
      console.error('Failed to check Google connection:', error);
      setIsConnected(false);
      return false;
    }
  }, []);

  // Load files from Drive
  const loadFiles = useCallback(async (folderId?: string | null, query?: string, pageToken?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        pageSize: '30',
        ...(folderId && { folderId }),
        ...(query && { q: query }),
        ...(pageToken && { pageToken }),
      });

      const response = await fetch(`/api/google/drive/files?${params}`);
      
      if (!response.ok) {
        const error = await response.json();
        if (error.code === 'not_connected') {
          setIsConnected(false);
          return;
        }
        throw new Error(error.error);
      }

      const data = await response.json();
      
      if (pageToken) {
        setFiles(prev => [...prev, ...data.files]);
      } else {
        setFiles(data.files || []);
      }
      setNextPageToken(data.nextPageToken || null);
    } catch (error) {
      console.error('Failed to load Drive files:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    async function init() {
      const connected = await checkConnection();
      if (connected) {
        loadFiles();
      } else {
        setLoading(false);
      }
    }
    init();
  }, [checkConnection, loadFiles]);

  // Handle search
  useEffect(() => {
    if (isConnected) {
      const timer = setTimeout(() => {
        loadFiles(currentFolderId, searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, isConnected, loadFiles, currentFolderId]);

  // Navigate to folder
  const navigateToFolder = (folder: DriveFile) => {
    setCurrentFolderId(folder.id);
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }]);
    setSearchQuery('');
    loadFiles(folder.id);
  };

  // Navigate back in path
  const navigateBack = (index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    const newFolderId = newPath[newPath.length - 1].id;
    setCurrentFolderId(newFolderId);
    loadFiles(newFolderId);
  };

  // Toggle file selection
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else if (next.size < maxFiles) {
        next.add(fileId);
      }
      return next;
    });
  };

  // Handle import
  const handleImport = async () => {
    const filesToImport = files.filter(f => selectedFiles.has(f.id));
    if (filesToImport.length === 0) return;

    setIsImporting(true);
    try {
      await onImport(filesToImport);
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  // Connect to Google Drive
  const connectGoogle = () => {
    const currentUrl = window.location.pathname;
    window.location.href = `/api/google/drive/auth?redirect=${encodeURIComponent(currentUrl)}&brandId=${brandId}`;
  };

  // Disconnect from Google Drive
  const disconnectGoogle = async () => {
    try {
      await fetch('/api/google/drive/status', { method: 'DELETE' });
      setIsConnected(false);
      setConnectedEmail(null);
      setFiles([]);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 flex items-center justify-center shadow-lg">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Import from Google Drive
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isConnected 
                  ? `Connected as ${connectedEmail}` 
                  : 'Connect your Google account to browse files'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <button
                onClick={disconnectGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <CloudOff className="w-4 h-4" />
                Disconnect
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isConnected === false ? (
          // Not connected state
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
              <Cloud className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Connect Google Drive
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
              Connect your Google account to browse and import files from Google Drive, Docs, Sheets, and Slides.
            </p>
            <button
              onClick={connectGoogle}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md transition-colors"
            >
              <Cloud className="w-5 h-5" />
              Connect Google Drive
            </button>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 space-y-3">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 text-sm overflow-x-auto">
                {folderPath.map((folder, index) => (
                  <div key={folder.id || 'root'} className="flex items-center">
                    {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />}
                    <button
                      onClick={() => navigateBack(index)}
                      className={cn(
                        "px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap",
                        index === folderPath.length - 1
                          ? "font-medium text-gray-900 dark:text-gray-100"
                          : "text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {folder.name}
                    </button>
                  </div>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading && files.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <FolderOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'No files match your search' : 'This folder is empty'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {files.map((file) => {
                    const Icon = getFileIcon(file.mimeType);
                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                    const isSelected = selectedFiles.has(file.id);
                    const isGoogleApp = isGoogleWorkspaceApp(file.mimeType);

                    return (
                      <div
                        key={file.id}
                        onClick={() => isFolder ? navigateToFolder(file) : toggleFileSelection(file.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                      >
                        {/* Selection checkbox (for non-folders) */}
                        {!isFolder && (
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-blue-600 border-blue-600"
                              : "border-gray-300 dark:border-gray-600"
                          )}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        )}

                        {/* Thumbnail or Icon */}
                        {file.thumbnailLink ? (
                          <img
                            src={file.thumbnailLink}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            isFolder 
                              ? "bg-amber-100 dark:bg-amber-900/30" 
                              : "bg-gray-100 dark:bg-gray-800"
                          )}>
                            <Icon className={cn(
                              "w-5 h-5",
                              isFolder ? "text-amber-600" : "text-gray-500"
                            )} />
                          </div>
                        )}

                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {file.name}
                            </span>
                            {isGoogleApp && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                {getMimeTypeLabel(file.mimeType)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            {file.size && <span>{formatFileSize(parseInt(file.size))}</span>}
                            {file.modifiedTime && <span>{formatDate(file.modifiedTime)}</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        {isFolder ? (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        ) : file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Open in Google Drive"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    );
                  })}

                  {/* Load more */}
                  {nextPageToken && (
                    <button
                      onClick={() => loadFiles(currentFolderId, searchQuery, nextPageToken)}
                      disabled={loading}
                      className="w-full py-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        'Load more files'
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {selectedFiles.size > 0 
                  ? `${selectedFiles.size} file${selectedFiles.size > 1 ? 's' : ''} selected`
                  : 'Select files to import'}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  disabled={isImporting}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedFiles.size === 0 || isImporting}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-all",
                    selectedFiles.size === 0 || isImporting
                      ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                  )}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Import {selectedFiles.size > 0 ? `(${selectedFiles.size})` : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

















