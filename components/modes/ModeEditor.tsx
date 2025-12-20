'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  CustomMode, ModeColor, ModeVersion, MODE_COLOR_META, MODE_ICONS,
  ModeBaseType, ModeToolsConfig, ModeContextConfig, ModeOutputConfig, ModeModelConfig,
  ModeCategory, ModeOutputType, ModeEmailFormat,
  DEFAULT_MODE_TOOLS, DEFAULT_MODE_CONTEXT, DEFAULT_MODE_OUTPUT, DEFAULT_MODE_MODEL
} from '@/types';
import { AI_MODELS } from '@/lib/ai-models';
import { 
  Sparkles, Wand2, FileText, Settings, Cpu, Zap,
  Globe, Brain, ShoppingBag, Image, Code, Database,
  MessageSquare, FileCode, Mail, BarChart3, 
  ChevronDown, Check, X, History, Copy, Eye, EyeOff,
  Tag, Folder, Share2, Users
} from 'lucide-react';

interface ModeEditorProps {
  mode: CustomMode | null;
  onClose: () => void;
  onSave: () => void;
}

type EditorTab = 'basics' | 'prompt' | 'tools' | 'context' | 'output' | 'model';

const TABS: { id: EditorTab; label: string; icon: React.ElementType }[] = [
  { id: 'basics', label: 'Basics', icon: Sparkles },
  { id: 'prompt', label: 'Prompt', icon: FileText },
  { id: 'tools', label: 'Tools', icon: Wand2 },
  { id: 'context', label: 'Context', icon: Database },
  { id: 'output', label: 'Output', icon: FileCode },
  { id: 'model', label: 'Model', icon: Cpu },
];

const PROMPT_VARIABLES = [
  { name: '{{BRAND_NAME}}', description: 'The brand name' },
  { name: '{{BRAND_INFO}}', description: 'Brand details, guidelines, and voice' },
  { name: '{{WEBSITE_URL}}', description: 'Brand website URL' },
  { name: '{{COPY_BRIEF}}', description: "The user's message/request" },
  { name: '{{PRODUCTS}}', description: 'Relevant product information' },
  { name: '{{CONTEXT}}', description: 'Conversation context and history' },
];

const COLORS: ModeColor[] = ['blue', 'purple', 'pink', 'green', 'yellow', 'red', 'indigo', 'cyan', 'orange', 'gray'];

const CATEGORIES: { id: ModeCategory; label: string; icon: React.ElementType }[] = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'research', label: 'Research', icon: Globe },
  { id: 'brand', label: 'Brand', icon: Tag },
  { id: 'product', label: 'Product', icon: ShoppingBag },
  { id: 'strategy', label: 'Strategy', icon: BarChart3 },
  { id: 'custom', label: 'Custom', icon: Settings },
];

const BASE_MODES: { id: ModeBaseType; label: string; description: string }[] = [
  { id: 'chat', label: 'Chat', description: 'Conversational, back-and-forth dialogue' },
  { id: 'create', label: 'Create', description: 'Generate content, copy, or documents' },
  { id: 'analyze', label: 'Analyze', description: 'Research, analyze, and synthesize information' },
];

const OUTPUT_TYPES: { id: ModeOutputType; label: string; description: string }[] = [
  { id: 'freeform', label: 'Freeform', description: 'Natural conversational responses' },
  { id: 'structured', label: 'Structured', description: 'Organized with sections/bullets' },
  { id: 'email', label: 'Email', description: 'Formatted email content' },
  { id: 'analysis', label: 'Analysis', description: 'Detailed research/analysis format' },
  { id: 'code', label: 'Code', description: 'Code and technical output' },
];

interface FormState {
  name: string;
  description: string;
  icon: string;
  color: ModeColor;
  system_prompt: string;
  base_mode: ModeBaseType;
  tools: ModeToolsConfig;
  context_sources: ModeContextConfig;
  output_config: ModeOutputConfig;
  model_config: ModeModelConfig;
  category: ModeCategory;
  tags: string[];
  is_active: boolean;
  is_shared: boolean;
}

export default function ModeEditor({ mode, onClose, onSave }: ModeEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('basics');
  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    icon: '💬',
    color: 'blue',
    system_prompt: '',
    base_mode: 'create',
    tools: { ...DEFAULT_MODE_TOOLS },
    context_sources: { ...DEFAULT_MODE_CONTEXT },
    output_config: { ...DEFAULT_MODE_OUTPUT },
    model_config: { ...DEFAULT_MODE_MODEL },
    category: null,
    tags: [],
    is_active: true,
    is_shared: false,
  });
  
  const [saving, setSaving] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [versions, setVersions] = useState<ModeVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const isEditing = mode !== null;

  useEffect(() => {
    if (mode) {
      setForm({
        name: mode.name,
        description: mode.description || '',
        icon: mode.icon,
        color: mode.color,
        system_prompt: mode.system_prompt,
        base_mode: mode.base_mode || 'create',
        tools: mode.tools || { ...DEFAULT_MODE_TOOLS },
        context_sources: mode.context_sources || { ...DEFAULT_MODE_CONTEXT },
        output_config: mode.output_config || { ...DEFAULT_MODE_OUTPUT },
        model_config: mode.model_config || { ...DEFAULT_MODE_MODEL },
        category: mode.category || null,
        tags: mode.tags || [],
        is_active: mode.is_active,
        is_shared: mode.is_shared || false,
      });
    }
  }, [mode]);

  const loadVersions = async () => {
    if (!mode) return;
    setLoadingVersions(true);
    try {
      const response = await fetch(`/api/modes/${mode.id}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleShowVersions = () => {
    if (!showVersions && versions.length === 0) {
      loadVersions();
    }
    setShowVersions(!showVersions);
  };

  const handleRestoreVersion = async (version: ModeVersion) => {
    if (!mode) return;
    if (!confirm('Restore this version? This will create a new version with the restored prompt.')) return;

    try {
      const response = await fetch(`/api/modes/${mode.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_number: version.version_number }),
      });

      if (!response.ok) throw new Error('Failed to restore version');

      const updatedMode = await response.json();
      setForm(prev => ({ ...prev, system_prompt: updatedMode.system_prompt }));
      toast.success('Version restored');
      loadVersions();
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Failed to restore version');
    }
  };

  const updateForm = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateTools = (key: keyof ModeToolsConfig, value: boolean) => {
    setForm(prev => ({ ...prev, tools: { ...prev.tools, [key]: value } }));
  };

  const updateContext = (key: keyof ModeContextConfig, value: boolean | string[]) => {
    setForm(prev => ({ ...prev, context_sources: { ...prev.context_sources, [key]: value } }));
  };

  const updateOutput = <K extends keyof ModeOutputConfig>(key: K, value: ModeOutputConfig[K]) => {
    setForm(prev => ({ ...prev, output_config: { ...prev.output_config, [key]: value } }));
  };

  const updateModel = <K extends keyof ModeModelConfig>(key: K, value: ModeModelConfig[K]) => {
    setForm(prev => ({ ...prev, model_config: { ...prev.model_config, [key]: value } }));
  };

  const insertVariable = (variable: string) => {
    if (promptRef.current) {
      const start = promptRef.current.selectionStart;
      const end = promptRef.current.selectionEnd;
      const currentValue = form.system_prompt;
      const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);
      updateForm('system_prompt', newValue);
      
      setTimeout(() => {
        if (promptRef.current) {
          promptRef.current.selectionStart = promptRef.current.selectionEnd = start + variable.length;
          promptRef.current.focus();
        }
      }, 0);
    } else {
      updateForm('system_prompt', form.system_prompt + variable);
    }
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      updateForm('tags', [...form.tags, tag]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    updateForm('tags', form.tags.filter(t => t !== tag));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      setActiveTab('basics');
      return;
    }
    if (!form.system_prompt.trim()) {
      toast.error('System prompt is required');
      setActiveTab('prompt');
      return;
    }

    setSaving(true);
    try {
      const url = isEditing ? `/api/modes/${mode.id}` : '/api/modes';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save mode');
      }

      toast.success(isEditing ? 'Mode updated' : 'Mode created');
      onSave();
    } catch (error: unknown) {
      console.error('Error saving mode:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save mode');
    } finally {
      setSaving(false);
    }
  };

  const getColorStyle = (color: ModeColor) => {
    const meta = MODE_COLOR_META[color];
    return `${meta.bg} ${meta.border} border`;
  };

  // Tab content renderers
  const renderBasicsTab = () => (
    <div className="space-y-6">
      {/* Name & Description */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Mode Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateForm('name', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            placeholder="e.g. Email Copywriter, Research Assistant"
            maxLength={100}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => updateForm('description', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
            rows={2}
            placeholder="What this mode does and when to use it..."
          />
        </div>
      </div>

      {/* Icon & Color */}
      <div className="flex items-start gap-6">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Icon
          </label>
          <button
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="w-14 h-14 rounded-xl border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-2xl hover:border-indigo-500 transition-colors bg-white dark:bg-gray-800"
          >
            {form.icon}
          </button>
          {showIconPicker && (
            <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 grid grid-cols-8 gap-1.5 w-[280px]">
              {MODE_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => {
                    updateForm('icon', icon);
                    setShowIconPicker(false);
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    form.icon === icon ? 'bg-indigo-100 dark:bg-indigo-900/40 ring-2 ring-indigo-500' : ''
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Color
          </label>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={`w-14 h-14 rounded-xl border-2 ${getColorStyle(form.color)} hover:opacity-80 transition-opacity`}
          />
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 grid grid-cols-5 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    updateForm('color', color);
                    setShowColorPicker(false);
                  }}
                  className={`w-10 h-10 rounded-lg border-2 ${getColorStyle(color)} transition-all ${
                    form.color === color ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900' : ''
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Category
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = form.category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => updateForm('category', isSelected ? null : cat.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all text-sm ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            placeholder="Add a tag..."
          />
          <button
            onClick={addTag}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            Add
          </button>
        </div>
      </div>

      {/* Base Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Base Behavior
        </label>
        <div className="grid grid-cols-3 gap-3">
          {BASE_MODES.map((base) => {
            const isSelected = form.base_mode === base.id;
            return (
              <button
                key={base.id}
                onClick={() => updateForm('base_mode', base.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className={`font-medium text-sm ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-100'}`}>
                  {base.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {base.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Toggles */}
      <div className="flex items-center gap-6 pt-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            onClick={() => updateForm('is_active', !form.is_active)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
              form.is_active ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <button
            onClick={() => updateForm('is_shared', !form.is_shared)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.is_shared ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
              form.is_shared ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
          <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
            <Share2 className="w-3.5 h-3.5" />
            Shared
          </div>
        </label>
      </div>
    </div>
  );

  const renderPromptTab = () => (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">System Prompt</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Define how the AI should behave</p>
        </div>
        {isEditing && (
          <button
            onClick={handleShowVersions}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            {showVersions ? 'Hide History' : 'Version History'}
          </button>
        )}
      </div>

      {/* Prompt Editor */}
      <div className="flex-1 min-h-0 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex flex-col">
        <textarea
          ref={promptRef}
          value={form.system_prompt}
          onChange={(e) => updateForm('system_prompt', e.target.value)}
          className="flex-1 w-full px-4 py-3 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-0 focus:ring-0 resize-none"
          placeholder="You are an expert assistant specializing in..."
          spellCheck={false}
        />
      </div>

      {/* Variables */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Insert Variable:</div>
        <div className="flex flex-wrap gap-1.5">
          {PROMPT_VARIABLES.map((v) => (
            <button
              key={v.name}
              onClick={() => insertVariable(v.name)}
              className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-gray-600 dark:text-gray-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title={v.description}
            >
              {v.name}
            </button>
          ))}
        </div>
      </div>

      {/* Version History */}
      {showVersions && isEditing && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-40">
          <div className="max-h-40 overflow-y-auto">
            {loadingVersions ? (
              <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
            ) : versions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No previous versions</div>
            ) : (
              versions.map((version) => (
                <div key={version.id} className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">v{version.version_number}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {new Date(version.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRestoreVersion(version)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Restore
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderToolsTab = () => {
    const tools: { key: keyof ModeToolsConfig; label: string; description: string; icon: React.ElementType }[] = [
      { key: 'web_search', label: 'Web Search', description: 'Search the web for current information', icon: Globe },
      { key: 'memory', label: 'Memory', description: 'Save and recall information across conversations', icon: Brain },
      { key: 'product_search', label: 'Product Search', description: 'Search the product catalog', icon: ShoppingBag },
      { key: 'image_generation', label: 'Image Generation', description: 'Generate images (coming soon)', icon: Image },
      { key: 'code_execution', label: 'Code Execution', description: 'Run code snippets (coming soon)', icon: Code },
    ];

    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">Available Tools</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Configure what capabilities this mode has</p>
        </div>

        <div className="space-y-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isEnabled = form.tools[tool.key];
            const isComingSoon = tool.key === 'image_generation' || tool.key === 'code_execution';

            return (
              <div
                key={tool.key}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  isEnabled && !isComingSoon
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'
                } ${isComingSoon ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isEnabled && !isComingSoon
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-2">
                      {tool.label}
                      {isComingSoon && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{tool.description}</div>
                  </div>
                </div>
                <button
                  onClick={() => !isComingSoon && updateTools(tool.key, !isEnabled)}
                  disabled={isComingSoon}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  } ${isComingSoon ? 'cursor-not-allowed' : ''}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderContextTab = () => {
    const sources: { key: keyof Omit<ModeContextConfig, 'custom_documents'>; label: string; description: string }[] = [
      { key: 'brand_voice', label: 'Brand Voice', description: 'Include brand voice guidelines and tone' },
      { key: 'brand_details', label: 'Brand Details', description: 'Include brand information and company details' },
      { key: 'product_catalog', label: 'Product Catalog', description: 'Search and include relevant products' },
      { key: 'past_emails', label: 'Past Emails', description: 'Reference previously created emails' },
      { key: 'web_research', label: 'Web Research', description: 'Automatically research relevant topics' },
    ];

    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">Context Sources</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">What information should be included automatically</p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {sources.map((source) => {
            const isEnabled = form.context_sources[source.key] as boolean;

            return (
              <label
                key={source.key}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  isEnabled
                    ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">{source.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{source.description}</div>
                </div>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => updateContext(source.key, e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  const renderOutputTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-gray-900 dark:text-white">Output Configuration</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">How responses should be formatted</p>
      </div>

      {/* Output Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Output Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {OUTPUT_TYPES.map((type) => {
            const isSelected = form.output_config.type === type.id;
            return (
              <button
                key={type.id}
                onClick={() => updateOutput('type', type.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className={`font-medium text-sm ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-100'}`}>
                  {type.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{type.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Email Format (if email type) */}
      {form.output_config.type === 'email' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Format
          </label>
          <div className="flex gap-2">
            {(['design', 'letter', 'any'] as ModeEmailFormat[]).map((format) => {
              if (!format) return null;
              const isSelected = form.output_config.email_format === format;
              return (
                <button
                  key={format}
                  onClick={() => updateOutput('email_format', format)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {format.charAt(0).toUpperCase() + format.slice(1)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Version Count */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Version Count
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          How many versions/variations to generate
        </p>
        <div className="flex gap-2">
          {[1, 2, 3, 5, 10].map((count) => {
            const isSelected = form.output_config.version_count === count;
            return (
              <button
                key={count}
                onClick={() => updateOutput('version_count', count)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                }`}
              >
                {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Show Thinking */}
      <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
        <div className="flex items-center gap-3">
          {form.output_config.show_thinking ? (
            <Eye className="w-5 h-5 text-gray-500" />
          ) : (
            <EyeOff className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <div className="font-medium text-gray-900 dark:text-white text-sm">Show Thinking</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Display AI reasoning process</div>
          </div>
        </div>
        <input
          type="checkbox"
          checked={form.output_config.show_thinking}
          onChange={(e) => updateOutput('show_thinking', e.target.checked)}
          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
      </label>
    </div>
  );

  const renderModelTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-gray-900 dark:text-white">Model Preferences</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Configure AI model settings for this mode</p>
      </div>

      {/* Preferred Model */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Preferred Model
        </label>
        <select
          value={form.model_config.preferred || ''}
          onChange={(e) => updateModel('preferred', e.target.value || null)}
          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        >
          <option value="">Use default / user selection</option>
          {AI_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} - {model.provider}
            </option>
          ))}
        </select>
      </div>

      {/* Temperature */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Temperature
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Higher values make output more creative, lower values more focused
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={form.model_config.temperature ?? 0.7}
            onChange={(e) => updateModel('temperature', parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="w-12 text-center text-sm font-mono text-gray-700 dark:text-gray-300">
            {(form.model_config.temperature ?? 0.7).toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Focused</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Allow Override */}
      <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
        <div>
          <div className="font-medium text-gray-900 dark:text-white text-sm">Allow Model Override</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Let users choose a different model</div>
        </div>
        <input
          type="checkbox"
          checked={form.model_config.allow_override}
          onChange={(e) => updateModel('allow_override', e.target.checked)}
          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
      </label>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basics': return renderBasicsTab();
      case 'prompt': return renderPromptTab();
      case 'tools': return renderToolsTab();
      case 'context': return renderContextTab();
      case 'output': return renderOutputTab();
      case 'model': return renderModelTab();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/30 dark:to-purple-900/30">
          <div className="flex items-center gap-3">
            <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${getColorStyle(form.color)}`}>
              {form.icon}
            </span>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Mode' : 'Create New Mode'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {form.name || 'Configure your custom AI mode'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 bg-gray-50 dark:bg-gray-800/50">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {isEditing && mode?.usage_count ? `Used ${mode.usage_count} times` : ''}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isEditing ? 'Save Changes' : 'Create Mode'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

