'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CustomMode, ModeColor, MODE_COLOR_META, MODE_ICONS } from '@/types';
import ModeEditor from '@/components/modes/ModeEditor';
import TemplatesBrowser from '@/components/modes/TemplatesBrowser';
import ImportExportModal from '@/components/modes/ImportExportModal';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

export const dynamic = 'force-dynamic';

type SortOption = 'name' | 'created' | 'updated';
type SortDirection = 'asc' | 'desc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'created', label: 'Date Created' },
  { value: 'updated', label: 'Last Modified' },
];

export default function ModesPage() {
  const [modes, setModes] = useState<CustomMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingMode, setEditingMode] = useState<CustomMode | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [deletingMode, setDeletingMode] = useState<CustomMode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    loadModes();
  }, []);

  const loadModes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/modes');
      if (response.ok) {
        const data = await response.json();
        setModes(data);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingMode(null);
    setShowEditor(true);
  };

  const handleEdit = (mode: CustomMode) => {
    setEditingMode(mode);
    setShowEditor(true);
  };

  const handleDuplicate = async (mode: CustomMode) => {
    try {
      const response = await fetch(`/api/modes/${mode.id}/duplicate`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to duplicate mode');
      
      toast.success('Agent duplicated');
      loadModes();
    } catch (error) {
      console.error('Error duplicating agent:', error);
      toast.error('Failed to duplicate agent');
    }
  };

  const handleDelete = (mode: CustomMode) => {
    setDeletingMode(mode);
  };

  const handleConfirmDelete = async () => {
    if (!deletingMode) return;

    try {
      const response = await fetch(`/api/modes/${deletingMode.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete mode');

      toast.success('Agent deleted');
      loadModes();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent');
    } finally {
      setDeletingMode(null);
    }
  };

  const handleToggleActive = async (mode: CustomMode) => {
    try {
      const response = await fetch(`/api/modes/${mode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !mode.is_active }),
      });
      
      if (!response.ok) throw new Error('Failed to update mode');
      
      toast.success(mode.is_active ? 'Agent hidden from selector' : 'Agent shown in selector');
      loadModes();
    } catch (error) {
      console.error('Error updating agent:', error);
      toast.error('Failed to update agent');
    }
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingMode(null);
  };

  const handleEditorSave = () => {
    handleEditorClose();
    loadModes();
  };

  const getColorClasses = (color: ModeColor) => {
    const meta = MODE_COLOR_META[color];
    return `${meta.bg} ${meta.text} ${meta.border} ${meta.darkBg} ${meta.darkText} ${meta.darkBorder}`;
  };

  // Filter and sort modes
  const filteredAndSortedModes = useMemo(() => {
    let result = [...modes];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (mode) =>
          mode.name.toLowerCase().includes(query) ||
          (mode.description?.toLowerCase().includes(query) ?? false) ||
          mode.system_prompt.toLowerCase().includes(query)
      );
    }

    // Sort modes
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [modes, searchQuery, sortBy, sortDirection]);

  const activeModes = filteredAndSortedModes.filter(m => m.is_active);
  const inactiveModes = filteredAndSortedModes.filter(m => !m.is_active);

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            Agent Builder
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 ml-13">
            Create and customize AI agents with specialized capabilities
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Agent
        </button>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setShowTemplates(true)}
          className="group p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 rounded-xl border border-purple-200 dark:border-purple-800 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">Templates</span>
        </button>

        <Link
          href="/settings/modes/sandbox"
          className="group p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 hover:from-indigo-100 hover:to-blue-100 dark:hover:from-indigo-900/30 dark:hover:to-blue-900/30 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">Sandbox</span>
        </Link>

        <Link
          href="/settings/modes/compare"
          className="group p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 rounded-xl border border-green-200 dark:border-green-800 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">A/B Compare</span>
        </Link>

        <Link
          href="/settings/modes/history"
          className="group p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 hover:from-orange-100 hover:to-amber-100 dark:hover:from-orange-900/30 dark:hover:to-amber-900/30 rounded-xl border border-orange-200 dark:border-orange-800 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">History</span>
        </Link>

        <Link
          href="/settings/modes/analytics"
          className="group p-4 bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 hover:from-cyan-100 hover:to-teal-100 dark:hover:from-cyan-900/30 dark:hover:to-teal-900/30 rounded-xl border border-cyan-200 dark:border-cyan-800 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">Analytics</span>
        </Link>

        <button
          onClick={() => setShowImportExport(true)}
          className="group p-4 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 hover:from-gray-100 hover:to-slate-100 dark:hover:from-gray-700 dark:hover:to-slate-700 rounded-xl border border-gray-200 dark:border-gray-700 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">Import/Export</span>
        </button>
      </div>

      {/* Search and Sort Controls */}
      {modes.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search agents by name, description, or prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={toggleSortDirection}
              className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              title={sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'}
            >
              {sortDirection === 'asc' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Search Results Info */}
      {searchQuery && modes.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>
            {filteredAndSortedModes.length === 0
              ? 'No agents found'
              : `Showing ${filteredAndSortedModes.length} of ${modes.length} agent${modes.length !== 1 ? 's' : ''}`}
          </span>
          {filteredAndSortedModes.length > 0 && searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Modes List */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading agents...</p>
        </div>
      ) : modes.length > 0 && filteredAndSortedModes.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No agents match your search</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Try adjusting your search terms or clear the filter
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
          >
            Clear Search
          </button>
        </div>
      ) : modes.length === 0 ? (
        <div className="text-center py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l.8 1.6a2.25 2.25 0 01-2.012 3.1H5.412a2.25 2.25 0 01-2.012-3.1l.8-1.6" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No custom agents yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Create your first agent to start building specialized AI capabilities for your workflow.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleCreateNew}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all"
            >
              Create Your First Agent
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              className="px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-xl transition-all"
            >
              Browse Templates
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Agents */}
          {activeModes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Agents</h2>
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                  {activeModes.length}
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeModes.map((mode) => (
                  <ModeCard
                    key={mode.id}
                    mode={mode}
                    onEdit={handleEdit}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                    getColorClasses={getColorClasses}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Agents */}
          {inactiveModes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Hidden Agents</h2>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-full">
                  {inactiveModes.length}
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {inactiveModes.map((mode) => (
                  <ModeCard
                    key={mode.id}
                    mode={mode}
                    onEdit={handleEdit}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                    getColorClasses={getColorClasses}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode Editor Dialog */}
      {showEditor && (
        <ModeEditor
          mode={editingMode}
          onClose={handleEditorClose}
          onSave={handleEditorSave}
        />
      )}

      {/* Templates Browser */}
      <TemplatesBrowser
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onCreateFromTemplate={() => {
          loadModes();
        }}
      />

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        onImportComplete={() => {
          loadModes();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deletingMode}
        onClose={() => setDeletingMode(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete "${deletingMode?.name}"?`}
        description="This agent will be permanently deleted. Any conversations using this agent will keep their existing messages, but the agent won't be available for new conversations."
        confirmText="Delete Agent"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

// Agent Card Component
function ModeCard({
  mode,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleActive,
  getColorClasses,
}: {
  mode: CustomMode;
  onEdit: (mode: CustomMode) => void;
  onDuplicate: (mode: CustomMode) => void;
  onDelete: (mode: CustomMode) => void;
  onToggleActive: (mode: CustomMode) => void;
  getColorClasses: (color: ModeColor) => string;
}) {
  // Get agent type badge
  const getAgentTypeBadge = () => {
    const type = mode.agent_type || 'specialist';
    const badges: Record<string, { label: string; className: string }> = {
      orchestrator: { label: 'Orchestrator', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
      specialist: { label: 'Specialist', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
      hybrid: { label: 'Hybrid', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    };
    return badges[type] || badges.specialist;
  };

  const badge = getAgentTypeBadge();

  return (
    <div
      className={`group relative bg-white dark:bg-gray-800 rounded-xl border transition-all hover:shadow-lg ${
        mode.is_active 
          ? 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700' 
          : 'border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-100'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${getColorClasses(mode.color)}`}>
              {mode.icon}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {mode.name}
                </h3>
                {mode.is_active && (
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.className}`}>
                  {badge.label}
                </span>
                {mode.can_invoke_agents && mode.can_invoke_agents.length > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    • Can invoke {mode.can_invoke_agents.length} agent{mode.can_invoke_agents.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Preview */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-3 mb-4">
          <p className="text-xs font-mono text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {mode.system_prompt.substring(0, 150)}...
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(mode)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              title="Edit"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </button>
            <button
              onClick={() => onDuplicate(mode)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              title="Duplicate"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(mode)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => onToggleActive(mode)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              mode.is_active
                ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
            }`}
          >
            {mode.is_active ? 'Hide' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}























