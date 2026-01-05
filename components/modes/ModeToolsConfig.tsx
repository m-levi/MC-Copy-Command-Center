/**
 * Mode Tools Configuration Component
 *
 * Allows users to configure which tools are available for a custom mode.
 */

'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import type { ModeToolConfig } from '@/types';

interface ModeToolsConfigProps {
  toolConfig: ModeToolConfig;
  onChange: (toolConfig: ModeToolConfig) => void;
}

export function ModeToolsConfig({ toolConfig, onChange }: ModeToolsConfigProps) {
  const updateTool = (
    toolName: keyof ModeToolConfig,
    updates: Partial<ModeToolConfig[keyof ModeToolConfig]>
  ) => {
    onChange({
      ...toolConfig,
      [toolName]: {
        ...toolConfig[toolName],
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Available Tools</h3>
        <p className="text-sm text-muted-foreground">
          Configure which tools this mode can use. Tools define what actions the AI can take.
        </p>
      </div>

      {/* Create Artifact Tool */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="tool-create-artifact" className="text-sm font-medium">
              Create Artifact
            </Label>
            <p className="text-xs text-muted-foreground">
              Save generated content as persistent artifacts
            </p>
          </div>
          <Switch
            id="tool-create-artifact"
            checked={toolConfig.create_artifact?.enabled ?? true}
            onCheckedChange={(enabled: boolean) => updateTool('create_artifact', { enabled })}
          />
        </div>

        {toolConfig.create_artifact?.enabled && (
          <div className="ml-4 space-y-2 border-l-2 pl-4">
            <Label className="text-xs text-muted-foreground">
              Allowed Artifact Types (leave empty for all)
            </Label>
            <Input
              placeholder="email, subject_lines, flow..."
              value={toolConfig.create_artifact?.allowed_kinds?.join(', ') || ''}
              onChange={(e) => {
                const value = e.target.value.trim();
                const kinds = value ? value.split(',').map((k) => k.trim()) : null;
                updateTool('create_artifact', { allowed_kinds: kinds });
              }}
              className="text-xs"
            />
          </div>
        )}
      </div>

      {/* Create Conversation Tool */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="tool-create-conversation" className="text-sm font-medium">
              Create Conversation
            </Label>
            <p className="text-xs text-muted-foreground">
              Create new sub-conversations for complex tasks
            </p>
          </div>
          <Switch
            id="tool-create-conversation"
            checked={toolConfig.create_conversation?.enabled ?? true}
            onCheckedChange={(enabled: boolean) => updateTool('create_conversation', { enabled })}
          />
        </div>
      </div>

      {/* Create Bulk Conversations Tool */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="tool-bulk-conversations" className="text-sm font-medium">
              Create Bulk Conversations
              <Badge variant="secondary" className="ml-2 text-xs">
                Advanced
              </Badge>
            </Label>
            <p className="text-xs text-muted-foreground">
              Create multiple conversations at once (for sequences and campaigns)
            </p>
          </div>
          <Switch
            id="tool-bulk-conversations"
            checked={toolConfig.create_bulk_conversations?.enabled ?? false}
            onCheckedChange={(enabled: boolean) => updateTool('create_bulk_conversations', { enabled })}
          />
        </div>
      </div>

      {/* Suggest Action Tool */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="tool-suggest-action" className="text-sm font-medium">
              Suggest Actions
            </Label>
            <p className="text-xs text-muted-foreground">
              Show dynamic action buttons to the user
            </p>
          </div>
          <Switch
            id="tool-suggest-action"
            checked={toolConfig.suggest_action?.enabled ?? true}
            onCheckedChange={(enabled) => updateTool('suggest_action', { enabled })}
          />
        </div>
      </div>

      {/* Web Search Tool */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="tool-web-search" className="text-sm font-medium">
              Web Search
              <Badge variant="secondary" className="ml-2 text-xs">
                External
              </Badge>
            </Label>
            <p className="text-xs text-muted-foreground">
              Search the web for current information
            </p>
          </div>
          <Switch
            id="tool-web-search"
            checked={toolConfig.web_search?.enabled ?? false}
            onCheckedChange={(enabled) => updateTool('web_search', { enabled })}
          />
        </div>

        {toolConfig.web_search?.enabled && (
          <div className="ml-4 space-y-3 border-l-2 pl-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Allowed Domains (comma-separated, leave empty for all)
              </Label>
              <Input
                placeholder="example.com, docs.example.com..."
                value={toolConfig.web_search?.allowed_domains?.join(', ') || ''}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  const domains = value ? value.split(',').map((d) => d.trim()) : [];
                  updateTool('web_search', { allowed_domains: domains });
                }}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Max Uses Per Conversation
              </Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={toolConfig.web_search?.max_uses || 5}
                onChange={(e) => {
                  const max_uses = parseInt(e.target.value, 10) || 5;
                  updateTool('web_search', { max_uses });
                }}
                className="text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Save Memory Tool */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="tool-save-memory" className="text-sm font-medium">
              Save Memory
              <Badge variant="secondary" className="ml-2 text-xs">
                External
              </Badge>
            </Label>
            <p className="text-xs text-muted-foreground">
              Save information for future conversations (requires Supermemory)
            </p>
          </div>
          <Switch
            id="tool-save-memory"
            checked={toolConfig.save_memory?.enabled ?? true}
            onCheckedChange={(enabled) => updateTool('save_memory', { enabled })}
          />
        </div>
      </div>

      <div className="flex items-start space-x-2 rounded-lg bg-muted/50 p-3">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-medium">Tool Configuration Tips</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
            <li>Disable tools to simplify the mode and reduce token usage</li>
            <li>Restrict artifact types to keep the mode focused</li>
            <li>Limit web search domains for security and relevance</li>
            <li>Advanced users can create specialized modes with minimal tools</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
