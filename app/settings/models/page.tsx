'use client';

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import {
  Sparkles,
  Check,
  Loader2,
  Search,
  Star,
  Wand2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface GatewayModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
  contextLength?: number;
  capabilities?: string[];
}

// Quick presets for common model selections
const MODEL_PRESETS = [
  {
    id: 'essentials',
    name: 'Essentials',
    description: 'Best model from each provider',
    icon: '⚡',
    models: ['anthropic/claude-sonnet-4.5', 'openai/gpt-5.1-thinking', 'google/gemini-3-pro'],
  },
  {
    id: 'anthropic-only',
    name: 'Anthropic Only',
    description: 'Just Claude models',
    icon: '🧠',
    models: ['anthropic/claude-sonnet-4.5', 'anthropic/claude-opus-4.5', 'anthropic/claude-haiku-4.5'],
  },
  {
    id: 'fast',
    name: 'Speed First',
    description: 'Fastest response times',
    icon: '🚀',
    models: ['anthropic/claude-haiku-4.5', 'openai/gpt-5.1-instant', 'google/gemini-3-flash'],
  },
  {
    id: 'powerful',
    name: 'Most Powerful',
    description: 'Best reasoning & quality',
    icon: '💪',
    models: ['anthropic/claude-opus-4.5', 'openai/o3', 'google/gemini-3-pro'],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Just one great model',
    icon: '🎯',
    models: ['anthropic/claude-sonnet-4.5'],
  },
];

const PROVIDER_CONFIG: Record<string, { name: string; color: string; bgColor: string; icon: string }> = {
  anthropic: {
    name: 'Anthropic',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    icon: '🧠',
  },
  openai: {
    name: 'OpenAI',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    icon: '🤖',
  },
  google: {
    name: 'Google',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    icon: '✨',
  },
};


export default function ModelsSettingsPage() {
  const [models, setModels] = useState<GatewayModel[]>([]);
  const [enabledModels, setEnabledModels] = useState<Set<string>>(new Set());
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch available models and user preferences in parallel
      const [modelsResponse, prefsResponse] = await Promise.all([
        fetch('/api/ai-models'),
        fetch('/api/user-preferences'),
      ]);

      if (!modelsResponse.ok) throw new Error('Failed to fetch models');
      if (!prefsResponse.ok) throw new Error('Failed to fetch preferences');

      const modelsData = await modelsResponse.json();
      const prefsData = await prefsResponse.json();

      setModels(modelsData.models || []);
      
      // If user has no enabled_models set (null), enable all models by default
      if (prefsData.enabled_models === null) {
        setEnabledModels(new Set(modelsData.models.map((m: GatewayModel) => m.id)));
      } else {
        setEnabledModels(new Set(prefsData.enabled_models));
      }
      
      setDefaultModel(prefsData.default_model);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load AI models');
    } finally {
      setLoading(false);
    }
  };

  const toggleModel = (modelId: string) => {
    setEnabledModels(prev => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
        // If this was the default model, clear it
        if (defaultModel === modelId) {
          setDefaultModel(null);
        }
      } else {
        next.add(modelId);
      }
      return next;
    });
    setHasChanges(true);
  };

  const setAsDefault = (modelId: string) => {
    // Enable the model if not already enabled
    if (!enabledModels.has(modelId)) {
      setEnabledModels(prev => new Set([...prev, modelId]));
    }
    setDefaultModel(modelId);
    setHasChanges(true);
  };

  const applyPreset = (presetId: string) => {
    const preset = MODEL_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    
    // Only enable models that exist in our available models
    const validModels = preset.models.filter(id => models.some(m => m.id === id));
    setEnabledModels(new Set(validModels));
    
    // Set first model as default
    if (validModels.length > 0) {
      setDefaultModel(validModels[0]);
    }
    
    setHasChanges(true);
    toast.success(`Applied "${preset.name}" preset`);
  };

  const clearAll = () => {
    setEnabledModels(new Set());
    setDefaultModel(null);
    setHasChanges(true);
  };

  const enableAll = () => {
    setEnabledModels(new Set(models.map(m => m.id)));
    setHasChanges(true);
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled_models: Array.from(enabledModels),
          default_model: defaultModel,
        }),
      });

      if (!response.ok) throw new Error('Failed to save preferences');
      
      toast.success('Model preferences saved');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const modelsByProvider = useMemo(() => {
    const filtered = searchQuery
      ? models.filter(m => 
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : models;

    return filtered.reduce((acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    }, {} as Record<string, GatewayModel[]>);
  }, [models, searchQuery]);

  const providers = Object.keys(modelsByProvider).sort((a, b) => {
    const order = ['anthropic', 'openai', 'google'];
    return order.indexOf(a) - order.indexOf(b);
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading AI models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Models
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Pick which models appear in your model picker. Use presets for quick setup.
          </p>
        </div>
      </div>

      {/* Quick Presets - Most Important Section */}
      <div className="p-4 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/40 dark:via-blue-950/40 dark:to-indigo-950/40 rounded-xl border border-purple-200/50 dark:border-purple-800/50">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Quick Presets</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {MODEL_PRESETS.map(preset => {
            const isActive = preset.models.length === enabledModels.size && 
              preset.models.every(id => enabledModels.has(id));
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={cn(
                  "relative p-3 rounded-lg border text-left transition-all hover:scale-[1.02]",
                  isActive
                    ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/25"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
                )}
              >
                <span className="text-lg mb-1 block">{preset.icon}</span>
                <span className={cn(
                  "text-sm font-medium block",
                  isActive ? "text-white" : "text-gray-900 dark:text-gray-100"
                )}>
                  {preset.name}
                </span>
                <span className={cn(
                  "text-xs block mt-0.5",
                  isActive ? "text-purple-100" : "text-gray-500 dark:text-gray-400"
                )}>
                  {preset.models.length} model{preset.models.length !== 1 ? 's' : ''}
                </span>
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats & Actions Bar */}
      <div className="flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enabled</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {enabledModels.size} model{enabledModels.size !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {defaultModel && (
            <>
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <Star className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Default</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {models.find(m => m.id === defaultModel)?.name || 'None'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={enableAll}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Enable All
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search models..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
        />
      </div>

      {/* Compact Model List - Grouped by Provider */}
      <div className="space-y-3">
        {providers.map(provider => {
          const config = PROVIDER_CONFIG[provider] || {
            name: provider.charAt(0).toUpperCase() + provider.slice(1),
            color: 'text-gray-600 dark:text-gray-400',
            bgColor: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
            icon: '🔮',
          };
          const providerModels = modelsByProvider[provider];

          return (
            <div key={provider} className="space-y-2">
              {/* Provider Label */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-sm">{config.icon}</span>
                <span className={cn("text-xs font-semibold uppercase tracking-wider", config.color)}>
                  {config.name}
                </span>
              </div>
              
              {/* Compact Model Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {providerModels.map(model => {
                  const isEnabled = enabledModels.has(model.id);
                  const isDefault = defaultModel === model.id;

                  return (
                    <div
                      key={model.id}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer group",
                        isEnabled
                          ? "bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-800 shadow-sm"
                          : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                      )}
                      onClick={() => toggleModel(model.id)}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
                          isEnabled
                            ? "bg-purple-600 border-purple-600 text-white"
                            : "border-gray-300 dark:border-gray-600 group-hover:border-purple-400"
                        )}
                      >
                        {isEnabled && <Check className="w-2.5 h-2.5" />}
                      </div>

                      {/* Model Name */}
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          "text-sm font-medium",
                          isEnabled ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"
                        )}>
                          {model.name}
                        </span>
                      </div>

                      {/* Default Star */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAsDefault(model.id);
                        }}
                        className={cn(
                          "p-1 rounded transition-all shrink-0",
                          isDefault
                            ? "text-amber-500"
                            : "text-gray-300 dark:text-gray-600 hover:text-amber-400 opacity-0 group-hover:opacity-100"
                        )}
                        title={isDefault ? "Default model" : "Set as default"}
                      >
                        <Star className={cn("w-4 h-4", isDefault && "fill-current")} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-4 flex justify-end"
        >
          <button
            onClick={savePreferences}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Tip */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        💡 Click a preset above for quick setup, or toggle individual models. Star ⭐ a model to make it your default.
      </p>
    </div>
  );
}

