'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';
import {
  CustomMode, ModeColor, ModeVersion, MODE_COLOR_META, MODE_ICONS, ModeToolConfig, DEFAULT_MODE_TOOL_CONFIG, AgentType
} from '@/types';
import { 
  Sparkles, FileText, X, History, Check, Wrench, Search, Brain, Image, ShoppingBag, MessageSquare, Zap, Bot, Users, Network
} from 'lucide-react';

interface ModeEditorProps {
  mode: CustomMode | null;
  onClose: () => void;
  onSave: () => void;
}

type EditorTab = 'basics' | 'prompt' | 'tools' | 'agents';

const TABS: { id: EditorTab; label: string; icon: React.ElementType }[] = [
  { id: 'basics', label: 'Basics', icon: Sparkles },
  { id: 'prompt', label: 'Prompt', icon: FileText },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'agents', label: 'Agent Config', icon: Bot },
];

const AGENT_TYPES: { value: AgentType; label: string; description: string; icon: React.ElementType }[] = [
  { 
    value: 'specialist', 
    label: 'Specialist', 
    description: 'Focused on a specific task, like writing emails or planning calendars',
    icon: Bot
  },
  { 
    value: 'orchestrator', 
    label: 'Orchestrator', 
    description: 'Routes requests to other specialist agents',
    icon: Network
  },
  { 
    value: 'hybrid', 
    label: 'Hybrid', 
    description: 'Can both perform tasks and invoke other agents',
    icon: Users
  },
];

// Available specialists that can be invoked
const AVAILABLE_SPECIALISTS = [
  { id: 'email_writer', name: 'Email Writer', description: 'Creates email copy' },
  { id: 'subject_line_expert', name: 'Subject Line Expert', description: 'Generates subject lines' },
  { id: 'calendar_planner', name: 'Calendar Planner', description: 'Plans marketing calendars' },
  { id: 'flow_architect', name: 'Flow Architect', description: 'Designs automation flows' },
  { id: 'research_analyst', name: 'Research Analyst', description: 'Researches topics' },
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

interface FormState {
  name: string;
  description: string;
  icon: string;
  color: ModeColor;
  system_prompt: string;
  is_active: boolean;
  enabled_tools: ModeToolConfig;
  // Agent-specific fields
  is_agent_enabled: boolean;
  agent_type: AgentType;
  can_invoke_agents: string[];
}

export default function ModeEditor({ mode, onClose, onSave }: ModeEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('basics');
  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    icon: '💬',
    color: 'blue',
    system_prompt: '',
    is_active: true,
    enabled_tools: { ...DEFAULT_MODE_TOOL_CONFIG },
    is_agent_enabled: true,
    agent_type: 'specialist',
    can_invoke_agents: [],
  });
  
  const [saving, setSaving] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [versions, setVersions] = useState<ModeVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  
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
        is_active: mode.is_active,
        enabled_tools: mode.enabled_tools || { ...DEFAULT_MODE_TOOL_CONFIG },
        is_agent_enabled: mode.is_agent_enabled ?? true,
        agent_type: mode.agent_type || 'specialist',
        can_invoke_agents: mode.can_invoke_agents || [],
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
      logger.error('Error loading versions:', error);
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
      logger.error('Error restoring version:', error);
      toast.error('Failed to restore version');
    }
  };

  const updateForm = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
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
        throw new Error(data.error || 'Failed to save agent');
      }

      toast.success(isEditing ? 'Agent updated' : 'Agent created');
      onSave();
    } catch (error: unknown) {
      logger.error('Error saving agent:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save agent');
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
            Agent Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateForm('name', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            placeholder="e.g. Email Writer, Calendar Planner, Research Assistant"
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

      {/* Status Toggle */}
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

  const updateToolConfig = (tool: keyof ModeToolConfig, enabled: boolean) => {
    setForm(prev => ({
      ...prev,
      enabled_tools: {
        ...prev.enabled_tools,
        [tool]: {
          ...prev.enabled_tools[tool],
          enabled,
        },
      },
    }));
  };

  const TOOL_CONFIG = [
    {
      key: 'create_artifact' as const,
      label: 'Create Artifacts',
      description: 'Allow AI to create and save emails, campaigns, and other content',
      icon: FileText,
    },
    {
      key: 'create_conversation' as const,
      label: 'Create Conversations',
      description: 'Allow AI to create new conversations for follow-up tasks',
      icon: MessageSquare,
    },
    {
      key: 'suggest_action' as const,
      label: 'Suggest Actions',
      description: 'Allow AI to suggest quick action buttons',
      icon: Zap,
    },
    {
      key: 'web_search' as const,
      label: 'Web Search',
      description: 'Allow AI to search the web for current information',
      icon: Search,
    },
    {
      key: 'save_memory' as const,
      label: 'Save Memory',
      description: 'Allow AI to save important information for future conversations',
      icon: Brain,
    },
    {
      key: 'generate_image' as const,
      label: 'Generate Images',
      description: 'Allow AI to generate images using DALL-E or Gemini',
      icon: Image,
    },
    {
      key: 'shopify_product_search' as const,
      label: 'Shopify Product Search',
      description: 'Allow AI to search brand\'s Shopify store directly via MCP',
      icon: ShoppingBag,
      badge: 'MCP',
    },
  ];

  const renderToolsTab = () => (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="font-medium text-gray-900 dark:text-white">Tool Configuration</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Choose which tools are available for this agent</p>
      </div>

      {/* Tools Grid */}
      <div className="space-y-3">
        {TOOL_CONFIG.map((tool) => {
          const Icon = tool.icon;
          const isEnabled = form.enabled_tools[tool.key]?.enabled ?? false;
          
          return (
            <div
              key={tool.key}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                isEnabled
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isEnabled
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white text-sm">
                      {tool.label}
                    </span>
                    {'badge' in tool && tool.badge && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {tool.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateToolConfig(tool.key, !isEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-xs text-blue-700 dark:text-blue-300">
        <p className="font-medium mb-1">Note:</p>
        <p>Shopify Product Search requires the brand to have a Shopify store configured in their brand settings. The AI will automatically use this when available.</p>
      </div>
    </div>
  );

  const toggleInvokableAgent = (agentId: string) => {
    setForm(prev => ({
      ...prev,
      can_invoke_agents: prev.can_invoke_agents.includes(agentId)
        ? prev.can_invoke_agents.filter(id => id !== agentId)
        : [...prev.can_invoke_agents, agentId],
    }));
  };

  const renderAgentsTab = () => (
    <div className="space-y-6">
      {/* Agent Enabled Toggle */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
            <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <span className="font-medium text-gray-900 dark:text-white text-sm">Agent Mode</span>
            <p className="text-xs text-gray-500 dark:text-gray-400">Enable advanced agent capabilities</p>
          </div>
        </div>
        <button
          onClick={() => updateForm('is_agent_enabled', !form.is_agent_enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            form.is_agent_enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
            form.is_agent_enabled ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {form.is_agent_enabled && (
        <>
          {/* Agent Type Selection */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Agent Type</h3>
            <div className="grid grid-cols-1 gap-3">
              {AGENT_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = form.agent_type === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => updateForm('agent_type', type.value)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      isSelected
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'
                        }`}>
                          {type.label}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {type.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Invokable Agents - Only show for orchestrator and hybrid */}
          {(form.agent_type === 'orchestrator' || form.agent_type === 'hybrid') && (
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Can Invoke Agents</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Select which specialist agents this agent can call upon
              </p>
              <div className="space-y-2">
                {AVAILABLE_SPECIALISTS.map((specialist) => {
                  const isSelected = form.can_invoke_agents.includes(specialist.id);
                  return (
                    <button
                      key={specialist.id}
                      onClick={() => toggleInvokableAgent(specialist.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="text-left">
                        <span className={`font-medium text-sm ${
                          isSelected ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'
                        }`}>
                          {specialist.name}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {specialist.description}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${
                        isSelected
                          ? 'bg-green-500 text-white'
                          : 'border-2 border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info Note */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-xs text-amber-700 dark:text-amber-300">
            <p className="font-medium mb-1">Agent Behavior:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Specialist:</strong> Performs specific tasks independently</li>
              <li><strong>Orchestrator:</strong> Routes requests and coordinates other agents</li>
              <li><strong>Hybrid:</strong> Can do both - perform tasks and delegate to others</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basics': return renderBasicsTab();
      case 'prompt': return renderPromptTab();
      case 'tools': return renderToolsTab();
      case 'agents': return renderAgentsTab();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/30 dark:to-purple-900/30">
          <div className="flex items-center gap-3">
            <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${getColorStyle(form.color)}`}>
              {form.icon}
            </span>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Agent' : 'Create New Agent'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {form.name || 'Configure your custom AI agent'}
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
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
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
                  {isEditing ? 'Save Changes' : 'Create Agent'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}






