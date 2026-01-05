/**
 * Artifact Types Management Page
 *
 * Allows users to create and manage custom artifact types
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  FileText, 
  Edit, 
  Trash2, 
  X, 
  Check, 
  Loader2,
  Palette,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Share2,
  MessageSquare,
  Layers,
  Info,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import type { FieldSchema, ArtifactType, CreateArtifactTypeInput } from '@/lib/services/artifact-type.service';

// Available icons for artifact types
const ARTIFACT_ICONS = [
  'FileText', 'Mail', 'MessageSquare', 'FileEdit', 'Newspaper',
  'Megaphone', 'Target', 'Zap', 'Sparkles', 'Star',
  'Heart', 'ThumbsUp', 'Award', 'Gift', 'ShoppingCart',
  'Users', 'User', 'Building', 'Globe', 'Map',
  'Calendar', 'Clock', 'Bell', 'Bookmark', 'Flag',
  'Image', 'Video', 'Music', 'Mic', 'Camera',
  'Code', 'Database', 'Server', 'Cpu', 'Terminal',
];

// Available colors for artifact types
const ARTIFACT_COLORS = [
  { name: 'Blue', value: 'blue', bg: 'bg-blue-500', light: 'bg-blue-100 dark:bg-blue-900/30' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-500', light: 'bg-purple-100 dark:bg-purple-900/30' },
  { name: 'Green', value: 'green', bg: 'bg-green-500', light: 'bg-green-100 dark:bg-green-900/30' },
  { name: 'Orange', value: 'orange', bg: 'bg-orange-500', light: 'bg-orange-100 dark:bg-orange-900/30' },
  { name: 'Pink', value: 'pink', bg: 'bg-pink-500', light: 'bg-pink-100 dark:bg-pink-900/30' },
  { name: 'Cyan', value: 'cyan', bg: 'bg-cyan-500', light: 'bg-cyan-100 dark:bg-cyan-900/30' },
  { name: 'Amber', value: 'amber', bg: 'bg-amber-500', light: 'bg-amber-100 dark:bg-amber-900/30' },
  { name: 'Indigo', value: 'indigo', bg: 'bg-indigo-500', light: 'bg-indigo-100 dark:bg-indigo-900/30' },
  { name: 'Rose', value: 'rose', bg: 'bg-rose-500', light: 'bg-rose-100 dark:bg-rose-900/30' },
  { name: 'Slate', value: 'slate', bg: 'bg-slate-500', light: 'bg-slate-100 dark:bg-slate-900/30' },
];

// Field types available for custom fields
const FIELD_TYPES = [
  { value: 'text', label: 'Short Text', description: 'Single line text input' },
  { value: 'long_text', label: 'Long Text', description: 'Multi-line text area' },
  { value: 'number', label: 'Number', description: 'Numeric value' },
  { value: 'boolean', label: 'Yes/No', description: 'Toggle switch' },
  { value: 'select', label: 'Single Select', description: 'Dropdown with one choice' },
  { value: 'multi_select', label: 'Multi Select', description: 'Multiple choice selection' },
];

export default function ArtifactTypesPage() {
  const [artifactTypes, setArtifactTypes] = useState<ArtifactType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingType, setEditingType] = useState<ArtifactType | null>(null);

  useEffect(() => {
    loadArtifactTypes();
  }, []);

  const loadArtifactTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/artifact-types');
      if (!response.ok) throw new Error('Failed to load artifact types');

      const data = await response.json();
      setArtifactTypes(data.artifact_types || []);
    } catch (error) {
      console.error('Error loading artifact types:', error);
      toast.error('Failed to load artifact types');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string, isSystem: boolean) => {
    if (isSystem) {
      toast.error('Cannot delete built-in artifact types');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const response = await fetch(`/api/artifact-types/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete artifact type');

      toast.success('Artifact type deleted');
      loadArtifactTypes();
    } catch (error) {
      console.error('Error deleting artifact type:', error);
      toast.error('Failed to delete artifact type');
    }
  };

  const handleSave = async (input: CreateArtifactTypeInput) => {
    try {
      const url = editingType 
        ? `/api/artifact-types/${editingType.id}`
        : '/api/artifact-types';
      
      const response = await fetch(url, {
        method: editingType ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save artifact type');
      }

      toast.success(editingType ? 'Artifact type updated' : 'Artifact type created');
      setShowCreateDialog(false);
      setEditingType(null);
      loadArtifactTypes();
    } catch (error) {
      console.error('Error saving artifact type:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save artifact type');
    }
  };

  const systemTypes = artifactTypes.filter((t) => t.is_system);
  const customTypes = artifactTypes.filter((t) => !t.is_system);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Artifact Types
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Define what types of content the AI can create for you.
          </p>
        </div>
        <button
          onClick={() => { setEditingType(null); setShowCreateDialog(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-medium hover:from-violet-600 hover:to-indigo-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Artifact Type
        </button>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/50">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Artifact types define the structure of content the AI creates. Built-in types cover common use cases, 
              but you can create custom types for LinkedIn posts, blog outlines, ad copy, and more.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Built-in Types */}
          {systemTypes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Built-in Types
                </h3>
                <Badge variant="secondary" className="text-xs">
                  System
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {systemTypes.map((type) => (
                  <ArtifactTypeCard 
                    key={type.id} 
                    type={type} 
                    onEdit={() => {}} 
                    onDelete={() => {}}
                    isSystem
                  />
                ))}
              </div>
            </div>
          )}

          {/* Custom Types */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Your Custom Types
              </h3>
              <Badge variant="secondary" className="text-xs">
                {customTypes.length}
              </Badge>
            </div>

            {customTypes.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No custom artifact types yet
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto">
                  Create custom artifact types for LinkedIn posts, blog outlines, 
                  product descriptions, and anything else you need.
                </p>
                <Button onClick={() => { setEditingType(null); setShowCreateDialog(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Type
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {customTypes.map((type) => (
                  <ArtifactTypeCard
                    key={type.id}
                    type={type}
                    onEdit={() => { setEditingType(type); setShowCreateDialog(true); }}
                    onDelete={() => handleDelete(type.id, type.name, type.is_system)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <AnimatePresence>
        {showCreateDialog && (
          <ArtifactTypeBuilder
            existingType={editingType}
            onSave={handleSave}
            onCancel={() => { setShowCreateDialog(false); setEditingType(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Artifact Type Card Component
function ArtifactTypeCard({
  type,
  onEdit,
  onDelete,
  isSystem = false,
}: {
  type: ArtifactType;
  onEdit: () => void;
  onDelete: () => void;
  isSystem?: boolean;
}) {
  const colorConfig = ARTIFACT_COLORS.find(c => c.value === type.color) || ARTIFACT_COLORS[0];

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${colorConfig.light} flex items-center justify-center`}>
              <FileText className={`w-5 h-5 text-${type.color}-600 dark:text-${type.color}-400`} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {type.name}
              </h4>
              <code className="text-xs text-gray-500 dark:text-gray-400">
                {type.kind}
              </code>
            </div>
          </div>

          {!isSystem && (
            <div className="flex gap-1">
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {type.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {type.description}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {type.supports_variants && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Layers className="w-3 h-3" />
              Variants
            </Badge>
          )}
          {type.supports_sharing && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Share2 className="w-3 h-3" />
              Sharing
            </Badge>
          )}
          {type.supports_comments && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <MessageSquare className="w-3 h-3" />
              Comments
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
          <span>Used {type.usage_count} times</span>
          {type.category && (
            <Badge variant="secondary" className="text-[10px]">
              {type.category}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

// Artifact Type Builder Modal
function ArtifactTypeBuilder({
  existingType,
  onSave,
  onCancel,
}: {
  existingType: ArtifactType | null;
  onSave: (input: CreateArtifactTypeInput) => Promise<void>;
  onCancel: () => void;
}) {
  const isEditing = !!existingType;
  
  const [name, setName] = useState(existingType?.name || '');
  const [kind, setKind] = useState(existingType?.kind || '');
  const [description, setDescription] = useState(existingType?.description || '');
  const [icon, setIcon] = useState(existingType?.icon || 'FileText');
  const [color, setColor] = useState(existingType?.color || 'blue');
  const [category, setCategory] = useState(existingType?.category || '');
  const [fields, setFields] = useState<FieldSchema[]>(existingType?.field_schema || []);
  const [supportsVariants, setSupportsVariants] = useState(existingType?.supports_variants ?? false);
  const [supportsSharing, setSupportsSharing] = useState(existingType?.supports_sharing ?? true);
  const [supportsComments, setSupportsComments] = useState(existingType?.supports_comments ?? true);
  
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [expandedField, setExpandedField] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-generate kind from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEditing) {
      const generatedKind = value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
      setKind(generatedKind);
    }
  };

  // Add a new field
  const addField = () => {
    const newField: FieldSchema = {
      name: `field_${fields.length + 1}`,
      label: 'New Field',
      type: 'text',
      required: false,
    };
    setFields([...fields, newField]);
    setExpandedField(fields.length);
  };

  // Remove a field
  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
    if (expandedField === index) setExpandedField(null);
  };

  // Update a field
  const updateField = (index: number, updates: Partial<FieldSchema>) => {
    setFields(fields.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  // Handle save
  const handleSave = async () => {
    if (!name.trim() || !kind.trim()) {
      toast.error('Name and kind are required');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        kind: kind.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        color,
        field_schema: fields,
        supports_variants: supportsVariants,
        supports_sharing: supportsSharing,
        supports_comments: supportsComments,
        category: category.trim() || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const colorConfig = ARTIFACT_COLORS.find(c => c.value === color) || ARTIFACT_COLORS[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Artifact Type' : 'Create Artifact Type'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Basic Info
            </h3>
            
            {/* Icon & Color & Name */}
            <div className="flex gap-3">
              {/* Icon Picker */}
              <div className="relative">
                <button
                  onClick={() => { setShowIconPicker(!showIconPicker); setShowColorPicker(false); }}
                  className={`w-12 h-12 rounded-xl ${colorConfig.light} flex items-center justify-center hover:opacity-80 transition-opacity`}
                >
                  <FileText className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
                </button>
                
                <AnimatePresence>
                  {showIconPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute left-0 top-full mt-2 z-20 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl w-64"
                    >
                      <div className="grid grid-cols-7 gap-1">
                        {ARTIFACT_ICONS.map((iconName) => (
                          <button
                            key={iconName}
                            onClick={() => { setIcon(iconName); setShowIconPicker(false); }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                              icon === iconName ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600' : 'text-gray-600 dark:text-gray-400'
                            }`}
                            title={iconName}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Color Picker */}
              <div className="relative">
                <button
                  onClick={() => { setShowColorPicker(!showColorPicker); setShowIconPicker(false); }}
                  className={`w-12 h-12 rounded-xl ${colorConfig.bg} flex items-center justify-center hover:opacity-80 transition-opacity`}
                >
                  <Palette className="w-5 h-5 text-white" />
                </button>
                
                <AnimatePresence>
                  {showColorPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute left-0 top-full mt-2 z-20 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl"
                    >
                      <div className="grid grid-cols-5 gap-2">
                        {ARTIFACT_COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => { setColor(c.value); setShowColorPicker(false); }}
                            className={`w-8 h-8 rounded-lg ${c.bg} hover:scale-110 transition-transform ${
                              color === c.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                            }`}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Name */}
              <div className="flex-1">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Artifact type name (e.g., LinkedIn Post)"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                />
              </div>
            </div>

            {/* Kind (auto-generated) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kind <span className="text-gray-400 font-normal">(system identifier)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={kind}
                  onChange={(e) => setKind(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="linkedin_post"
                  disabled={isEditing}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 font-mono text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {!isEditing && name && (
                  <button
                    onClick={() => navigator.clipboard.writeText(kind)}
                    className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this artifact type is used for..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Social Media, Content, Ads"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
              />
            </div>
          </div>

          {/* Capabilities */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Capabilities
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setSupportsVariants(!supportsVariants)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  supportsVariants
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Layers className={`w-5 h-5 mx-auto mb-1 ${supportsVariants ? 'text-violet-600' : 'text-gray-400'}`} />
                <div className={`text-xs font-medium ${supportsVariants ? 'text-violet-700 dark:text-violet-300' : 'text-gray-600 dark:text-gray-400'}`}>
                  Variants
                </div>
              </button>

              <button
                onClick={() => setSupportsSharing(!supportsSharing)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  supportsSharing
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Share2 className={`w-5 h-5 mx-auto mb-1 ${supportsSharing ? 'text-violet-600' : 'text-gray-400'}`} />
                <div className={`text-xs font-medium ${supportsSharing ? 'text-violet-700 dark:text-violet-300' : 'text-gray-600 dark:text-gray-400'}`}>
                  Sharing
                </div>
              </button>

              <button
                onClick={() => setSupportsComments(!supportsComments)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  supportsComments
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <MessageSquare className={`w-5 h-5 mx-auto mb-1 ${supportsComments ? 'text-violet-600' : 'text-gray-400'}`} />
                <div className={`text-xs font-medium ${supportsComments ? 'text-violet-700 dark:text-violet-300' : 'text-gray-600 dark:text-gray-400'}`}>
                  Comments
                </div>
              </button>
            </div>
          </div>

          {/* Custom Fields */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                Custom Fields
              </h3>
              <button
                onClick={addField}
                className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Field
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <FileText className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No custom fields yet. Add fields to define the structure of your artifact.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                  >
                    {/* Field Header */}
                    <button
                      onClick={() => setExpandedField(expandedField === index ? null : index)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {field.label}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                        </Badge>
                        {field.required && (
                          <span className="text-xs text-red-500">Required</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); removeField(index); }}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {expandedField === index ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Field Editor */}
                    <AnimatePresence>
                      {expandedField === index && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                  Label
                                </label>
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => updateField(index, { label: e.target.value })}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                  Field Name
                                </label>
                                <input
                                  type="text"
                                  value={field.name}
                                  onChange={(e) => updateField(index, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Field Type
                              </label>
                              <select
                                value={field.type}
                                onChange={(e) => updateField(index, { type: e.target.value as FieldSchema['type'] })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                              >
                                {FIELD_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label} - {type.description}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {(field.type === 'select' || field.type === 'multi_select') && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                  Options (comma separated)
                                </label>
                                <input
                                  type="text"
                                  value={field.options?.join(', ') || ''}
                                  onChange={(e) => updateField(index, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                  placeholder="Option 1, Option 2, Option 3"
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                                />
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`required-${index}`}
                                checked={field.required}
                                onChange={(e) => updateField(index, { required: e.target.checked })}
                                className="rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500"
                              />
                              <label htmlFor={`required-${index}`} className="text-sm text-gray-700 dark:text-gray-300">
                                Required field
                              </label>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !kind.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {isEditing ? 'Save Changes' : 'Create Artifact Type'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
