'use client';

import { useState, useCallback } from 'react';
import {
  BrandDocType,
  DocumentFolder,
  FolderColor,
  DOCUMENT_TYPE_META,
  FOLDER_COLOR_META,
} from '@/types';
import { cn } from '@/lib/utils';
import { useSidebarPanel } from '@/contexts/SidebarPanelContext';
import { 
  Folder,
  FolderOpen,
  FileText,
  Link as LinkIcon,
  FileUp,
  Plus,
  ChevronRight,
  ChevronDown,
  Star,
  Clock,
  Home,
  Settings,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderPlus,
  Sparkles,
  Wand2,
  Loader2,
  Palette,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

interface DocumentSidebarProps {
  brandId: string;
  folders: DocumentFolder[];
  currentFolderId: string | null;
  currentDocType: BrandDocType | null;
  showPinned: boolean;
  showRecent: boolean;
  documentCounts: {
    total: number;
    pinned: number;
    byType: Record<BrandDocType, number>;
    byFolder: Record<string, number>;
  };
  onSelectFolder: (folderId: string | null) => void;
  onSelectDocType: (docType: BrandDocType | null) => void;
  onTogglePinned: () => void;
  onToggleRecent: () => void;
  onCreateFolder: (name: string, color?: FolderColor, icon?: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onUpdateFolderColor?: (folderId: string, color: FolderColor) => void;
  onOrganizeWithAI?: () => void;
  isOrganizing?: boolean;
  isLoadingFolders?: boolean;
}

const FOLDER_COLORS: FolderColor[] = ['blue', 'purple', 'pink', 'green', 'yellow', 'red', 'indigo', 'cyan', 'orange', 'gray'];
const FOLDER_ICONS = ['📁', '📂', '📦', '🎨', '📣', '🔬', '⭐', '📚', '💼', '🎯', '📝', '💡'];

export default function DocumentSidebar({
  brandId,
  folders,
  currentFolderId,
  currentDocType,
  showPinned,
  showRecent,
  documentCounts,
  onSelectFolder,
  onSelectDocType,
  onTogglePinned,
  onToggleRecent,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onUpdateFolderColor,
  onOrganizeWithAI,
  isOrganizing = false,
  isLoadingFolders = false,
}: DocumentSidebarProps) {
  // Use the SidebarPanelContext for collapse state (if in resizable panel)
  const sidebarPanel = useSidebarPanel();
  const isCollapsed = sidebarPanel?.isCollapsed ?? false;
  const toggleCollapse = sidebarPanel?.toggleCollapse;

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['quick', 'folders', 'smartFolders', 'types'])
  );
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState<FolderColor>('blue');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null);
  const [colorPickerFolderId, setColorPickerFolderId] = useState<string | null>(null);

  // Separate smart and regular folders
  const smartFolders = folders.filter(f => f.is_smart);
  const regularFolders = folders.filter(f => !f.is_smart);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), newFolderColor, newFolderIcon);
      setNewFolderName('');
      setNewFolderColor('blue');
      setNewFolderIcon('📁');
      setIsCreatingFolder(false);
      setShowColorPicker(false);
    }
  };

  const handleRenameFolder = (folderId: string) => {
    if (editingFolderName.trim()) {
      onRenameFolder(folderId, editingFolderName.trim());
      setEditingFolderId(null);
      setEditingFolderName('');
    }
  };

  const startEditingFolder = (folder: DocumentFolder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
    setFolderMenuOpen(null);
  };

  const getFolderIcon = (folder: DocumentFolder, isOpen: boolean) => {
    if (folder.icon && folder.icon !== '📁') {
      return <span className="text-base">{folder.icon}</span>;
    }
    const colorClass = FOLDER_COLOR_META[folder.color]?.icon || 'text-gray-400';
    return isOpen 
      ? <FolderOpen className={cn("w-4 h-4", colorClass)} />
      : <Folder className={cn("w-4 h-4", colorClass)} />;
  };

  // Collapsed view - minimal icons only
  if (isCollapsed) {
    return (
      <div className="w-full h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col items-center py-4 gap-2">
        {toggleCollapse && (
          <button
            onClick={toggleCollapse}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mb-2"
            title="Expand sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}
        
        <div className="w-8 h-px bg-gray-200 dark:bg-gray-700 my-2" />
        
        <button
          onClick={() => { onSelectFolder(null); onSelectDocType(null); }}
          className={cn(
            "p-2 rounded-lg transition-colors",
            !currentFolderId && !currentDocType && !showPinned && !showRecent
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
          title="All Documents"
        >
          <Home className="w-5 h-5" />
        </button>
        
        <button
          onClick={onTogglePinned}
          className={cn(
            "p-2 rounded-lg transition-colors",
            showPinned
              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
          title="Pinned"
        >
          <Star className="w-5 h-5" />
        </button>
        
        <button
          onClick={onToggleRecent}
          className={cn(
            "p-2 rounded-lg transition-colors",
            showRecent
              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
          title="Recent"
        >
          <Clock className="w-5 h-5" />
        </button>
        
        <div className="w-8 h-px bg-gray-200 dark:bg-gray-700 my-2" />
        
        {/* Smart folders in collapsed view */}
        {smartFolders.slice(0, 3).map(folder => (
          <button
            key={folder.id}
            onClick={() => onSelectFolder(folder.id)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              currentFolderId === folder.id
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
            title={`✨ ${folder.name}`}
          >
            <Sparkles className="w-5 h-5" />
          </button>
        ))}
        
        {/* Regular folders in collapsed view */}
        {regularFolders.slice(0, 5).map(folder => (
          <button
            key={folder.id}
            onClick={() => onSelectFolder(folder.id)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              currentFolderId === folder.id
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
            title={folder.name}
          >
            {getFolderIcon(folder, currentFolderId === folder.id)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Documents</h2>
          {toggleCollapse && (
            <button
              onClick={toggleCollapse}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {documentCounts.total} documents
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Quick Access */}
        <div className="px-3 mb-2">
          <button
            onClick={() => toggleSection('quick')}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300"
          >
            {expandedSections.has('quick') ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Quick Access
          </button>
          
          {expandedSections.has('quick') && (
            <div className="mt-1 space-y-0.5">
              <button
                onClick={() => { onSelectFolder(null); onSelectDocType(null); }}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-all duration-200",
                  !currentFolderId && !currentDocType && !showPinned && !showRecent
                    ? "bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 font-medium shadow-sm ring-1 ring-black/5 dark:ring-white/5 border-l-4 border-l-blue-600 dark:border-l-blue-500"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 border-l-transparent"
                )}
              >
                <Home className="w-4 h-4" />
                All Documents
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                  {documentCounts.total}
                </span>
              </button>

              <button
                onClick={onTogglePinned}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-all duration-200",
                  showPinned
                    ? "bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 font-medium shadow-sm ring-1 ring-black/5 dark:ring-white/5 border-l-4 border-l-amber-500"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 border-l-transparent"
                )}
              >
                <Star className="w-4 h-4" />
                Pinned
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                  {documentCounts.pinned}
                </span>
              </button>

              <button
                onClick={onToggleRecent}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-all duration-200",
                  showRecent
                    ? "bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 font-medium shadow-sm ring-1 ring-black/5 dark:ring-white/5 border-l-4 border-l-purple-500"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 border-l-transparent"
                )}
              >
                <Clock className="w-4 h-4" />
                Recent
              </button>
            </div>
          )}
        </div>

        {/* Smart Folders (AI-powered) */}
        <div className="px-3 mb-2">
          <div className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <button
              onClick={() => toggleSection('smartFolders')}
              className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {expandedSections.has('smartFolders') ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <Sparkles className="w-3 h-3 text-purple-500" />
              Smart Folders
            </button>
            {onOrganizeWithAI && (
              <button
                onClick={onOrganizeWithAI}
                disabled={isOrganizing}
                className="ml-auto p-1 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors disabled:opacity-50"
                title="Organize with AI"
              >
                {isOrganizing ? (
                  <Loader2 className="w-3 h-3 animate-spin text-purple-500" />
                ) : (
                  <Wand2 className="w-3 h-3 text-purple-500" />
                )}
              </button>
            )}
          </div>
          
          {expandedSections.has('smartFolders') && (
            <div className="mt-1 space-y-0.5">
              {isLoadingFolders ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              ) : smartFolders.length === 0 ? (
                <div className="px-3 py-3 text-center">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                    No smart folders yet
                  </p>
                  {onOrganizeWithAI && (
                    <button
                      onClick={onOrganizeWithAI}
                      disabled={isOrganizing}
                      className="flex items-center gap-1.5 mx-auto px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isOrganizing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Wand2 className="w-3 h-3" />
                      )}
                      Create Smart Folders
                    </button>
                  )}
                </div>
              ) : (
                smartFolders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => onSelectFolder(folder.id)}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-all duration-200 group",
                      currentFolderId === folder.id
                        ? "bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 font-medium shadow-sm ring-1 ring-black/5 dark:ring-white/5 border-l-4 border-l-purple-500"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 border-l-transparent"
                    )}
                  >
                    <span className="text-base">{folder.icon || '✨'}</span>
                    <span className="truncate flex-1 text-left">{folder.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                      {folder.document_count}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Regular Folders */}
        <div className="px-3 mb-2">
          <div className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <button
              onClick={() => toggleSection('folders')}
              className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {expandedSections.has('folders') ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              Folders
            </button>
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="ml-auto p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="New folder"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          
          {expandedSections.has('folders') && (
            <div className="mt-1 space-y-0.5">
              {/* New Folder Input */}
              {isCreatingFolder && (
                <div className="px-2 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      title="Change icon & color"
                    >
                      <span className="text-base">{newFolderIcon}</span>
                    </button>
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateFolder();
                        if (e.key === 'Escape') {
                          setIsCreatingFolder(false);
                          setNewFolderName('');
                          setShowColorPicker(false);
                        }
                      }}
                      placeholder="Folder name..."
                      className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                  
                  {/* Color & Icon Picker */}
                  {showColorPicker && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {FOLDER_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setNewFolderColor(color)}
                            className={cn(
                              "w-5 h-5 rounded-full transition-all",
                              FOLDER_COLOR_META[color].bg,
                              newFolderColor === color && "ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-500"
                            )}
                            title={color}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {FOLDER_ICONS.map(icon => (
                          <button
                            key={icon}
                            onClick={() => setNewFolderIcon(icon)}
                            className={cn(
                              "w-6 h-6 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-sm",
                              newFolderIcon === icon && "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateFolder}
                      disabled={!newFolderName.trim()}
                      className="flex-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingFolder(false);
                        setNewFolderName('');
                        setShowColorPicker(false);
                      }}
                      className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {isLoadingFolders ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              ) : regularFolders.length === 0 && !isCreatingFolder ? (
                <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500 italic">
                  No folders yet
                </p>
              ) : (
                regularFolders.map(folder => (
                  <div key={folder.id} className="relative group">
                    {editingFolderId === folder.id ? (
                      <div className="flex items-center gap-2 px-3 py-1.5">
                        {getFolderIcon(folder, false)}
                        <input
                          type="text"
                          value={editingFolderName}
                          onChange={(e) => setEditingFolderName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameFolder(folder.id);
                            if (e.key === 'Escape') {
                              setEditingFolderId(null);
                              setEditingFolderName('');
                            }
                          }}
                          onBlur={() => handleRenameFolder(folder.id)}
                          className="flex-1 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => onSelectFolder(folder.id)}
                        className={cn(
                          "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-all duration-200",
                          currentFolderId === folder.id
                            ? cn(
                                "font-medium bg-white dark:bg-gray-800 shadow-sm ring-1 ring-black/5 dark:ring-white/5 border-l-4",
                                FOLDER_COLOR_META[folder.color]?.text || 'text-blue-700',
                                FOLDER_COLOR_META[folder.color]?.darkText || 'dark:text-blue-300',
                                FOLDER_COLOR_META[folder.color]?.borderActive || 'border-l-blue-600'
                              )
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 border-l-transparent"
                        )}
                      >
                        {getFolderIcon(folder, currentFolderId === folder.id)}
                        <span className="truncate flex-1 text-left">{folder.name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                          {folder.document_count}
                        </span>
                        
                        {/* Folder Actions */}
                        <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id);
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </button>
                    )}
                    
                    {/* Folder Context Menu */}
                    {folderMenuOpen === folder.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-40"
                          onClick={() => setFolderMenuOpen(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                          <button
                            onClick={() => startEditingFolder(folder)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Rename
                          </button>
                          {onUpdateFolderColor && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setColorPickerFolderId(colorPickerFolderId === folder.id ? null : folder.id);
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Palette className="w-3.5 h-3.5" />
                              Change Color
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setFolderMenuOpen(null);
                              onDeleteFolder(folder.id);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                        
                        {/* Color Picker Submenu */}
                        {colorPickerFolderId === folder.id && (
                          <div className="absolute right-full top-0 mr-1 w-auto p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                            <div className="flex flex-wrap gap-1 max-w-[120px]">
                              {FOLDER_COLORS.map(color => (
                                <button
                                  key={color}
                                  onClick={() => {
                                    onUpdateFolderColor?.(folder.id, color);
                                    setColorPickerFolderId(null);
                                    setFolderMenuOpen(null);
                                  }}
                                  className={cn(
                                    "w-6 h-6 rounded-full transition-all",
                                    FOLDER_COLOR_META[color].bg,
                                    folder.color === color && "ring-2 ring-offset-1 ring-gray-400"
                                  )}
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>


        {/* Document Types */}
        <div className="px-3 mb-2">
          <button
            onClick={() => toggleSection('types')}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300"
          >
            {expandedSections.has('types') ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Types
          </button>
          
          {expandedSections.has('types') && (
            <div className="mt-1 space-y-0.5">
              {Object.entries(DOCUMENT_TYPE_META).map(([key, meta]) => {
                const docType = key as BrandDocType;
                const count = documentCounts.byType[docType] || 0;
                const Icon = docType === 'file' ? FileUp : docType === 'link' ? LinkIcon : FileText;
                
                return (
                  <button
                    key={key}
                    onClick={() => onSelectDocType(currentDocType === docType ? null : docType)}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-all duration-200",
                      currentDocType === docType
                        ? "bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 font-medium shadow-sm ring-1 ring-black/5 dark:ring-white/5 border-l-4 border-l-blue-600 dark:border-l-blue-500"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 border-l-transparent"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="truncate">{meta.label}</span>
                    <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => {/* Open settings or help */}}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          Document Settings
        </button>
      </div>
    </div>
  );
}
