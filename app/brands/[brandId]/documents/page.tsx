'use client';

import { useState, useEffect, useCallback, use, useMemo, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import {
  BrandDocumentV2,
  DocumentFilters,
  DocumentSortOption,
  DocumentCategory,
  DocumentVisibility,
  BrandDocType,
  DocumentFolder,
  FolderColor,
  DOCUMENT_TYPE_META,
} from '@/types';
import { 
  DocumentCard, 
  DocumentUploader, 
  LinkAdder,
  ShareDialog 
} from '@/components/documents';
import DocumentSidebar from '@/components/documents/DocumentSidebar';
import GoogleDrivePicker from '@/components/documents/GoogleDrivePicker';
import { DocumentGridSkeleton, DocumentListSkeleton } from '@/components/documents/DocumentSkeleton';
import { DriveFile } from '@/lib/google-drive-service';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Upload, 
  FileText, 
  Link as LinkIcon,
  Search,
  Grid,
  List,
  SortAsc,
  Loader2,
  FolderOpen,
  Sparkles,
  X,
  ChevronRight,
  Home,
  Filter,
  LayoutGrid,
  Menu,
  ArrowUpDown,
  Check,
  CloudUpload,
  Wand2,
  Cloud,
} from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { SidebarPanelContext } from '@/contexts/SidebarPanelContext';

// Sidebar Panel Wrapper for consistent collapse behavior with chat
function DocumentsSidebarPanelWrapper({ 
  children, 
  defaultSize, 
  minSize, 
  maxSize, 
  collapsedSize = 5,
  className 
}: { 
  children: React.ReactNode;
  defaultSize: number;
  minSize: number;
  maxSize: number;
  collapsedSize?: number;
  className?: string;
}) {
  const panelRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('docSidebarCollapsed') === 'true';
    }
    return false;
  });

  // Sync collapsed state with localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('docSidebarCollapsed', String(isCollapsed));
    }
  }, [isCollapsed]);

  const toggleCollapse = useCallback(() => {
    if (!panelRef.current) return;
    
    if (isCollapsed) {
      panelRef.current.expand();
    } else {
      panelRef.current.collapse();
    }
  }, [isCollapsed]);

  const handleCollapse = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const handleExpand = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  return (
    <SidebarPanelContext.Provider value={{ isCollapsed, toggleCollapse }}>
      <ResizablePanel 
        ref={panelRef}
        id="doc-sidebar-panel"
        defaultSize={isCollapsed ? collapsedSize : defaultSize}
        minSize={minSize} 
        maxSize={maxSize}
        collapsible={true}
        collapsedSize={collapsedSize}
        onCollapse={handleCollapse}
        onExpand={handleExpand}
        className={className}
      >
        {children}
      </ResizablePanel>
    </SidebarPanelContext.Provider>
  );
}

export default function DocumentsPage({ params }: { params: Promise<{ brandId: string }> }) {
  const resolvedParams = use(params);
  const brandId = resolvedParams.brandId;
  const router = useRouter();
  const supabase = createClient();

  // State
  const [documents, setDocuments] = useState<BrandDocumentV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Filters
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentDocType, setCurrentDocType] = useState<BrandDocType | null>(null);
  const [showPinned, setShowPinned] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [sort, setSort] = useState<DocumentSortOption>('created_at_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Folders - fetched from API
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isOrganizing, setIsOrganizing] = useState(false);
  
  // Modals
  const [showUploader, setShowUploader] = useState(false);
  const [showLinkAdder, setShowLinkAdder] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [sharingDocument, setSharingDocument] = useState<BrandDocumentV2 | null>(null);
  
  // Selection
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  
  // Drag and drop
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const dragCounterRef = useRef(0);

  // Load folders from API
  const loadFolders = useCallback(async () => {
    setIsLoadingFolders(true);
    try {
      const response = await fetch(`/api/brands/${brandId}/folders`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load folders');
      }
      
      setFolders(data.folders || []);
    } catch (error) {
      console.error('Error loading folders:', error);
      // Don't show error toast on initial load - folders table might not exist yet
    } finally {
      setIsLoadingFolders(false);
    }
  }, [brandId]);

  // Load folders on mount
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Calculate document counts
  const documentCounts = useMemo(() => {
    const counts = {
      total: documents.length,
      pinned: documents.filter(d => d.is_pinned).length,
      byType: {} as Record<BrandDocType, number>,
      byFolder: {} as Record<string, number>,
    };

    // Initialize counts
    Object.keys(DOCUMENT_TYPE_META).forEach(type => {
      counts.byType[type as BrandDocType] = 0;
    });
    folders.forEach(f => {
      counts.byFolder[f.id] = 0;
    });

    // Count documents
    documents.forEach(doc => {
      counts.byType[doc.doc_type]++;
      if (doc.folder_id) {
        counts.byFolder[doc.folder_id] = (counts.byFolder[doc.folder_id] || 0) + 1;
      }
    });

    return counts;
  }, [documents, folders]);

  // Load documents
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setIsSearching(!!debouncedSearchQuery);
    try {
      const params = new URLSearchParams();

      if (currentDocType) params.set('docType', currentDocType);
      if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);
      if (showPinned) params.set('isPinned', 'true');
      params.set('sort', sort);

      const response = await fetch(`/api/brands/${brandId}/documents-v2?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load documents');
      }

      let docs = data.documents || [];

      // Filter by recent if needed (last 7 days)
      if (showRecent) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        docs = docs.filter((d: BrandDocumentV2) => new Date(d.created_at) > weekAgo);
      }

      // Filter by folder if selected
      if (currentFolderId) {
        docs = docs.filter((d: BrandDocumentV2) => d.folder_id === currentFolderId);
      }

      setDocuments(docs);
      setTotal(docs.length);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [brandId, currentDocType, sort, debouncedSearchQuery, showPinned, showRecent, currentFolderId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Handle file upload
  const handleFileUpload = async (files: Array<{
    file: File;
    title: string;
    description: string;
    category: DocumentCategory;
    visibility: DocumentVisibility;
    tags: string[];
  }>) => {
    try {
      for (const fileData of files) {
        const formData = new FormData();
        formData.append('file', fileData.file);
        formData.append('title', fileData.title);
        formData.append('description', fileData.description);
        formData.append('category', fileData.category);
        formData.append('visibility', fileData.visibility);
        formData.append('tags', fileData.tags.join(','));
        
        const response = await fetch(`/api/brands/${brandId}/documents-v2`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
      }
      
      toast.success(`${files.length} file(s) uploaded successfully`);
      loadDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
      throw error;
    }
  };

  // Handle text document creation
  const handleCreateTextDoc = async (data: {
    title: string;
    description: string;
    content: string;
    category: DocumentCategory;
    visibility: DocumentVisibility;
    tags: string[];
  }) => {
    try {
      const response = await fetch(`/api/brands/${brandId}/documents-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_type: 'text',
          ...data,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create document');
      }
      
      toast.success('Document created successfully');
      loadDocuments();
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Failed to create document');
      throw error;
    }
  };

  // Handle link creation
  const handleCreateLink = async (data: {
    title: string;
    description: string;
    url: string;
    category: DocumentCategory;
    visibility: DocumentVisibility;
    tags: string[];
  }) => {
    try {
      const response = await fetch(`/api/brands/${brandId}/documents-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_type: 'link',
          ...data,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add link');
      }
      
      toast.success('Link added successfully');
      loadDocuments();
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Failed to add link');
      throw error;
    }
  };

  // Handle document update
  const handleUpdateDocument = async (docId: string, updates: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/brands/${brandId}/documents-v2/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update document');
      }
      
      toast.success('Document updated');
      loadDocuments();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update document');
    }
  };

  // Handle document delete
  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const response = await fetch(`/api/brands/${brandId}/documents-v2/${docId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      toast.success('Document deleted');
      loadDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  // Handle sharing update
  const handleUpdateSharing = async (visibility: DocumentVisibility, sharedWith: string[]) => {
    if (!sharingDocument) return;
    
    try {
      const response = await fetch(`/api/brands/${brandId}/documents-v2/${sharingDocument.id}/share`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility, shared_with: sharedWith }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update sharing');
      }
      
      toast.success('Sharing settings updated');
      loadDocuments();
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to update sharing');
      throw error;
    }
  };

  // Folder management - API-based
  const handleCreateFolder = async (name: string, color?: FolderColor, icon?: string) => {
    try {
      const response = await fetch(`/api/brands/${brandId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          color: color || 'blue',
          icon: icon || '📁',
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create folder');
      }
      
      toast.success('Folder created');
      loadFolders();
    } catch (error) {
      console.error('Create folder error:', error);
      toast.error('Failed to create folder');
    }
  };

  const handleRenameFolder = async (folderId: string, name: string) => {
    try {
      const response = await fetch(`/api/brands/${brandId}/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to rename folder');
      }
      
      toast.success('Folder renamed');
      loadFolders();
    } catch (error) {
      console.error('Rename folder error:', error);
      toast.error('Failed to rename folder');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? Documents in this folder will be moved to "All Documents".')) return;
    
    try {
      const response = await fetch(`/api/brands/${brandId}/folders/${folderId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete folder');
      }
      
      if (currentFolderId === folderId) setCurrentFolderId(null);
      toast.success('Folder deleted');
      loadFolders();
      loadDocuments();
    } catch (error) {
      console.error('Delete folder error:', error);
      toast.error('Failed to delete folder');
    }
  };

  const handleUpdateFolderColor = async (folderId: string, color: FolderColor) => {
    try {
      const response = await fetch(`/api/brands/${brandId}/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update folder color');
      }
      
      loadFolders();
    } catch (error) {
      console.error('Update folder color error:', error);
      toast.error('Failed to update folder color');
    }
  };

  // AI Organize
  const handleOrganizeWithAI = async () => {
    setIsOrganizing(true);
    try {
      const response = await fetch(`/api/brands/${brandId}/folders/organize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apply: true,
          create_smart_folders: folders.filter(f => f.is_smart).length === 0,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to organize documents');
      }
      
      if (data.folders_created > 0) {
        toast.success(`Created ${data.folders_created} smart folders`);
      }
      
      if (data.applied_count > 0) {
        toast.success(`Organized ${data.applied_count} documents into folders`);
      } else if (data.suggested_count === 0) {
        toast.success('All documents are already organized!');
      }
      
      loadFolders();
      loadDocuments();
    } catch (error) {
      console.error('AI organize error:', error);
      toast.error('Failed to organize documents');
    } finally {
      setIsOrganizing(false);
    }
  };

  // Handle Google Drive import
  const handleDriveImport = async (files: DriveFile[]) => {
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const file of files) {
        try {
          const response = await fetch('/api/google/drive/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileId: file.id,
              brandId,
              category: 'general',
              visibility: 'private',
            }),
          });

          if (!response.ok) {
            throw new Error('Import failed');
          }

          successCount++;
        } catch (error) {
          console.error(`Failed to import file ${file.name}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Imported ${successCount} file${successCount > 1 ? 's' : ''} from Google Drive`);
        loadDocuments();
      }
      
      if (errorCount > 0) {
        toast.error(`Failed to import ${errorCount} file${errorCount > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Drive import error:', error);
      toast.error('Failed to import from Google Drive');
      throw error;
    }
  };

  // Toggle document selection
  const toggleSelection = (docId: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setCurrentFolderId(null);
    setCurrentDocType(null);
    setShowPinned(false);
    setShowRecent(false);
    setSearchQuery('');
  };

  const hasActiveFilters = currentFolderId || currentDocType || showPinned || showRecent || searchQuery;

  // Get current view title
  const getViewTitle = () => {
    if (showPinned) return 'Pinned Documents';
    if (showRecent) return 'Recent Documents';
    if (currentFolderId) {
      const folder = folders.find(f => f.id === currentFolderId);
      return folder?.name || 'Folder';
    }
    if (currentDocType) {
      return DOCUMENT_TYPE_META[currentDocType].label + 's';
    }
    return 'All Documents';
  };

  // Get current folder (for smart folder indicator)
  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;

  // Sort options
  const sortOptions: { value: DocumentSortOption; label: string }[] = [
    { value: 'created_at_desc', label: 'Newest first' },
    { value: 'created_at_asc', label: 'Oldest first' },
    { value: 'updated_at_desc', label: 'Recently updated' },
    { value: 'title_asc', label: 'Name A-Z' },
    { value: 'title_desc', label: 'Name Z-A' },
  ];

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setPendingFiles(files);
      setShowUploader(true);
    }
  }, []);

  // Clear pending files when uploader closes
  const handleUploaderClose = useCallback(() => {
    setShowUploader(false);
    setPendingFiles([]);
  }, []);

  return (
    <div 
      className="relative h-full bg-[#fcfcfc] dark:bg-gray-950 overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-[100] bg-blue-500/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-dashed border-blue-500 p-12 text-center max-w-md mx-4">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CloudUpload className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Drop files to upload
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Release to add files to your document store
            </p>
          </div>
        </div>
      )}

      {/* Resizable Panel Layout - matching chat pattern */}
      <ResizablePanelGroup 
        direction="horizontal" 
        className="h-full"
        autoSaveId="documents-layout-panels"
      >
        {/* Sidebar Panel - Desktop only, mobile uses overlay */}
        <DocumentsSidebarPanelWrapper
          defaultSize={22}
          minSize={5}
          maxSize={35}
          collapsedSize={5}
          className="hidden lg:block"
        >
          <DocumentSidebar
            brandId={brandId}
            folders={folders}
            currentFolderId={currentFolderId}
            currentDocType={currentDocType}
            showPinned={showPinned}
            showRecent={showRecent}
            documentCounts={documentCounts}
            onSelectFolder={(id) => {
              setCurrentFolderId(id);
              setCurrentDocType(null);
              setShowPinned(false);
              setShowRecent(false);
              setMobileSidebarOpen(false);
            }}
            onSelectDocType={(type) => {
              setCurrentDocType(type);
              setCurrentFolderId(null);
              setShowPinned(false);
              setShowRecent(false);
              setMobileSidebarOpen(false);
            }}
            onTogglePinned={() => {
              setShowPinned(!showPinned);
              setShowRecent(false);
              setCurrentFolderId(null);
              setCurrentDocType(null);
              setMobileSidebarOpen(false);
            }}
            onToggleRecent={() => {
              setShowRecent(!showRecent);
              setShowPinned(false);
              setCurrentFolderId(null);
              setCurrentDocType(null);
              setMobileSidebarOpen(false);
            }}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onUpdateFolderColor={handleUpdateFolderColor}
            onOrganizeWithAI={handleOrganizeWithAI}
            isOrganizing={isOrganizing}
            isLoadingFolders={isLoadingFolders}
          />
        </DocumentsSidebarPanelWrapper>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <DocumentSidebar
            brandId={brandId}
            folders={folders}
            currentFolderId={currentFolderId}
            currentDocType={currentDocType}
            showPinned={showPinned}
            showRecent={showRecent}
            documentCounts={documentCounts}
            onSelectFolder={(id) => {
              setCurrentFolderId(id);
              setCurrentDocType(null);
              setShowPinned(false);
              setShowRecent(false);
              setMobileSidebarOpen(false);
            }}
            onSelectDocType={(type) => {
              setCurrentDocType(type);
              setCurrentFolderId(null);
              setShowPinned(false);
              setShowRecent(false);
              setMobileSidebarOpen(false);
            }}
            onTogglePinned={() => {
              setShowPinned(!showPinned);
              setShowRecent(false);
              setCurrentFolderId(null);
              setCurrentDocType(null);
              setMobileSidebarOpen(false);
            }}
            onToggleRecent={() => {
              setShowRecent(!showRecent);
              setShowPinned(false);
              setCurrentFolderId(null);
              setCurrentDocType(null);
              setMobileSidebarOpen(false);
            }}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onUpdateFolderColor={handleUpdateFolderColor}
            onOrganizeWithAI={handleOrganizeWithAI}
            isOrganizing={isOrganizing}
            isLoadingFolders={isLoadingFolders}
          />
        </div>

        {/* Resizable Handle - Desktop only */}
        <ResizableHandle withHandle className="hidden lg:flex" />

        {/* Main Content Panel */}
        <ResizablePanel 
          id="doc-main-panel"
          defaultSize={78} 
          minSize={50} 
          className="min-w-0"
        >
          <div className="flex flex-col h-full w-full min-w-0 overflow-hidden">
            {/* Toolbar */}
            <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <div className="px-4 lg:px-6 py-3">
                {/* Top Row: Title and Actions */}
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile menu button */}
                    <button
                      onClick={() => setMobileSidebarOpen(true)}
                      className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    
                    {/* Breadcrumb / Title */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-0.5">
                        <button 
                          onClick={clearFilters}
                          className="hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          Documents
                        </button>
                        {hasActiveFilters && (
                          <>
                            <ChevronRight className="w-4 h-4" />
                            <span className="text-gray-900 dark:text-white font-medium truncate flex items-center gap-1.5">
                              {currentFolder?.is_smart && (
                                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                              )}
                              {getViewTitle()}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
                          {currentFolder?.icon && <span>{currentFolder.icon}</span>}
                          {getViewTitle()}
                        </h1>
                        <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                          ({total})
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Add Button */}
                  <div className="relative group flex-shrink-0">
                    <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors text-sm">
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Add</span>
                    </button>
                    
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <button
                        onClick={() => setShowUploader(true)}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Files
                      </button>
                      <button
                        onClick={() => router.push(`/brands/${brandId}/documents/new`)}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        Create Document
                      </button>
                      <button
                        onClick={() => setShowLinkAdder(true)}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Add Link
                      </button>
                      <div className="border-t border-gray-200 dark:border-gray-700" />
                      <button
                        onClick={() => setShowDrivePicker(true)}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Cloud className="w-4 h-4" />
                        Import from Google Drive
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Bottom Row: Search and View Options */}
                <div className="flex items-center gap-3">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    {(searchQuery && searchQuery !== debouncedSearchQuery) || isSearching ? (
                      <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                    ) : (
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    )}
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search documents..."
                      className={cn(
                        "w-full pl-10 pr-10 py-2 border rounded-lg text-sm transition-all",
                        "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900",
                        searchQuery !== debouncedSearchQuery
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      )}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Sort Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {sortOptions.find(o => o.value === sort)?.label}
                      </span>
                    </button>
                    
                    {showSortMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-40"
                          onClick={() => setShowSortMenu(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                          {sortOptions.map(option => (
                            <button
                              key={option.value}
                              onClick={() => {
                                setSort(option.value);
                                setShowSortMenu(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                                sort === option.value
                                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              )}
                            >
                              {option.label}
                              {sort === option.value && <Check className="w-4 h-4" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        'p-1.5 rounded-md transition-colors',
                        viewMode === 'grid'
                          ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600'
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      )}
                      title="Grid view"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={cn(
                        'p-1.5 rounded-md transition-colors',
                        viewMode === 'list'
                          ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600'
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      )}
                      title="List view"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Document Grid/List */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              {loading ? (
                viewMode === 'grid' 
                  ? <DocumentGridSkeleton count={8} />
                  : <DocumentListSkeleton count={6} />
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <FolderOpen className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {hasActiveFilters ? 'No documents match your filters' : 'No documents yet'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                    {hasActiveFilters
                      ? 'Try adjusting your search or filters to find what you\'re looking for.'
                      : 'Upload files, create text documents, or add web links to build your brand knowledge base.'}
                  </p>
                  {!hasActiveFilters && (
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={() => setShowUploader(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Files
                      </button>
                      <button
                        onClick={() => router.push(`/brands/${brandId}/documents/new`)}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        Create Document
                      </button>
                    </div>
                  )}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* AI Knowledge Info - Show only on All Documents */}
                  {!hasActiveFilters && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            AI-Powered Knowledge Base
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-0.5">
                            Documents are automatically indexed for AI search. Use Smart Folders to auto-organize your documents.
                          </p>
                        </div>
                        {folders.filter(f => f.is_smart).length === 0 && (
                          <button
                            onClick={handleOrganizeWithAI}
                            disabled={isOrganizing}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-900/70 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {isOrganizing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Wand2 className="w-4 h-4" />
                            )}
                            Create Smart Folders
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Smart Folder Info Banner */}
                  {currentFolder?.is_smart && (
                    <div className="mb-6 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl">
                      <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                        <Sparkles className="w-4 h-4" />
                        <span className="font-medium">Smart Folder</span>
                        <span className="text-purple-600 dark:text-purple-400">
                          — Documents are automatically organized here based on AI analysis
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Documents Grid/List */}
                  <div className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                      : 'space-y-2'
                  )}>
                    {documents.map((docItem) => (
                      <DocumentCard
                        key={docItem.id}
                        doc={docItem}
                        viewMode={viewMode}
                        isSelected={selectedDocs.has(docItem.id)}
                        onSelect={() => toggleSelection(docItem.id)}
                        onView={() => {
                          if (docItem.doc_type === 'text') {
                            router.push(`/brands/${brandId}/documents/${docItem.id}/edit`);
                          } else if (docItem.doc_type === 'link' && docItem.url) {
                            window.open(docItem.url, '_blank');
                          } else if (docItem.doc_type === 'file' && docItem.public_url) {
                            window.open(docItem.public_url, '_blank');
                          }
                        }}
                        onEdit={() => {
                          if (docItem.doc_type === 'text') {
                            router.push(`/brands/${brandId}/documents/${docItem.id}/edit`);
                          }
                        }}
                        onDelete={() => handleDeleteDocument(docItem.id)}
                        onShare={() => {
                          setSharingDocument(docItem);
                          setShowShareDialog(true);
                        }}
                        onTogglePin={() => handleUpdateDocument(docItem.id, { is_pinned: !docItem.is_pinned })}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      
      {/* Modals */}
      {showUploader && (
        <DocumentUploader
          brandId={brandId}
          onUpload={handleFileUpload}
          onClose={handleUploaderClose}
          initialFiles={pendingFiles}
        />
      )}
      
      {showLinkAdder && (
        <LinkAdder
          brandId={brandId}
          onSave={handleCreateLink}
          onClose={() => setShowLinkAdder(false)}
        />
      )}
      
      {showShareDialog && sharingDocument && (
        <ShareDialog
          document={sharingDocument}
          brandId={brandId}
          onUpdate={handleUpdateSharing}
          onClose={() => {
            setShowShareDialog(false);
            setSharingDocument(null);
          }}
        />
      )}
      
      {showDrivePicker && (
        <GoogleDrivePicker
          brandId={brandId}
          onImport={handleDriveImport}
          onClose={() => setShowDrivePicker(false)}
        />
      )}
    </div>
  );
}
