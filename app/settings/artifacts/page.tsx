'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import {
  FileText,
  Table,
  Code,
  CheckSquare,
  Mail,
  GitBranch,
  Megaphone,
  Type,
  FileEdit,
  Loader2,
  Settings2,
  Sparkles,
  Info,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  getArtifactPreferences,
  updateArtifactPreferences,
  type ArtifactPreferences,
} from '@/lib/user-preferences';
import { ARTIFACT_KIND_REGISTRY, type ArtifactKind } from '@/types/artifacts';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

// Icon mapping for artifact types
const ARTIFACT_ICONS: Record<string, React.ElementType> = {
  FileText,
  Table,
  Code,
  CheckSquare,
  Mail,
  GitBranch,
  Megaphone,
  Type,
  FileEdit,
};

// Category groupings
const ARTIFACT_CATEGORIES = {
  content: {
    label: 'Content',
    description: 'Documents and written content',
    kinds: ['email', 'markdown', 'content_brief', 'template'] as ArtifactKind[],
  },
  data: {
    label: 'Data & Structure',
    description: 'Structured data and tables',
    kinds: ['spreadsheet', 'flow', 'campaign'] as ArtifactKind[],
  },
  development: {
    label: 'Development',
    description: 'Code and technical content',
    kinds: ['code'] as ArtifactKind[],
  },
  productivity: {
    label: 'Productivity',
    description: 'Task tracking and organization',
    kinds: ['checklist', 'subject_lines'] as ArtifactKind[],
  },
};

export default function ArtifactsSettingsPage() {
  const [preferences, setPreferences] = useState<ArtifactPreferences>({
    disabledArtifactTypes: [],
    artifactAutoCreate: true,
    artifactSuggestionsEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID on mount
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Load preferences when userId is available
  useEffect(() => {
    if (userId) {
      loadPreferences(userId);
    }
  }, [userId]);

  async function loadPreferences(uid: string) {
    try {
      const prefs = await getArtifactPreferences(uid);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      // Don't show error toast - preferences may not exist yet, use defaults
    } finally {
      setLoading(false);
    }
  }

  const savePreferences = useCallback(async (newPrefs: ArtifactPreferences) => {
    if (!userId) return;

    setSaving(true);
    try {
      const success = await updateArtifactPreferences(userId, newPrefs);
      if (success) {
        setPreferences(newPrefs);
        toast.success('Preferences saved');
      } else {
        // Preferences saved locally even if DB failed
        setPreferences(newPrefs);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      // Still update local state
      setPreferences(newPrefs);
    } finally {
      setSaving(false);
    }
  }, [userId]);

  function toggleArtifactType(kind: ArtifactKind, enabled: boolean) {
    const newDisabled = enabled
      ? preferences.disabledArtifactTypes.filter(k => k !== kind)
      : [...preferences.disabledArtifactTypes, kind];

    savePreferences({
      ...preferences,
      disabledArtifactTypes: newDisabled,
    });
  }

  function isTypeEnabled(kind: ArtifactKind) {
    return !preferences.disabledArtifactTypes.includes(kind);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Artifact Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure which artifact types the AI can create and how they behave
        </p>
      </div>

      {/* Global Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Behavior
          </h2>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
          {/* Auto-create toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-900 dark:text-white">
                Auto-create artifacts
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                AI will automatically save content as artifacts when appropriate
              </p>
            </div>
            <Switch
              checked={preferences.artifactAutoCreate}
              onCheckedChange={(checked) => {
                savePreferences({
                  ...preferences,
                  artifactAutoCreate: checked,
                });
              }}
              disabled={saving}
            />
          </div>

          {/* Suggestions toggle */}
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-5">
            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-900 dark:text-white">
                Show artifact suggestions
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Show "Save as artifact" buttons when content could be an artifact
              </p>
            </div>
            <Switch
              checked={preferences.artifactSuggestionsEnabled}
              onCheckedChange={(checked) => {
                savePreferences({
                  ...preferences,
                  artifactSuggestionsEnabled: checked,
                });
              }}
              disabled={saving}
            />
          </div>
        </div>
      </section>

      {/* Artifact Types */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Artifact Types
          </h2>
        </div>

        <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Disable artifact types you don't need. The AI won't create artifacts of disabled types.
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-6">
          {Object.entries(ARTIFACT_CATEGORIES).map(([categoryId, category]) => (
            <div key={categoryId} className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {category.label}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {category.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {category.kinds.map((kind) => {
                  const config = ARTIFACT_KIND_REGISTRY[kind];
                  if (!config) return null;

                  const Icon = ARTIFACT_ICONS[config.icon] || FileText;
                  const enabled = isTypeEnabled(kind);

                  return (
                    <motion.div
                      key={kind}
                      whileHover={{ scale: 1.01 }}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        enabled
                          ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                      }`}
                      onClick={() => toggleArtifactType(kind, !enabled)}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        enabled
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${
                          enabled
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {config.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {config.description}
                        </p>
                      </div>

                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => toggleArtifactType(kind, checked)}
                        disabled={saving}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Saving indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Saving...</span>
        </div>
      )}
    </div>
  );
}
