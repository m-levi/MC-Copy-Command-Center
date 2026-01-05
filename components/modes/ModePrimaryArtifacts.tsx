/**
 * Mode Primary Artifacts Configuration
 *
 * Allows users to select which artifact types this mode primarily creates.
 * These artifact types will be injected into the AI's prompt.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Info, Mail, GitBranch, Megaphone, FileText, Type, FileEdit } from 'lucide-react';

interface ArtifactTypeOption {
  kind: string;
  name: string;
  description: string;
  icon: any;
  isSystem: boolean;
}

interface ModePrimaryArtifactsProps {
  selectedKinds: string[];
  onChange: (kinds: string[]) => void;
}

export function ModePrimaryArtifacts({ selectedKinds, onChange }: ModePrimaryArtifactsProps) {
  const [artifactTypes, setArtifactTypes] = useState<ArtifactTypeOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArtifactTypes();
  }, []);

  const loadArtifactTypes = async () => {
    try {
      const response = await fetch('/api/artifact-types');
      if (!response.ok) throw new Error('Failed to load artifact types');

      const data = await response.json();
      const types: ArtifactTypeOption[] = data.artifact_types.map((at: any) => ({
        kind: at.kind,
        name: at.name,
        description: at.description,
        icon: getIconForKind(at.kind),
        isSystem: at.is_system,
      }));

      setArtifactTypes(types);
    } catch (error) {
      console.error('Error loading artifact types:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIconForKind = (kind: string) => {
    const iconMap: Record<string, any> = {
      email: Mail,
      flow: GitBranch,
      campaign: Megaphone,
      template: FileText,
      subject_lines: Type,
      content_brief: FileEdit,
    };
    return iconMap[kind] || FileText;
  };

  const toggleKind = (kind: string) => {
    if (selectedKinds.includes(kind)) {
      onChange(selectedKinds.filter((k) => k !== kind));
    } else {
      onChange([...selectedKinds, kind]);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading artifact types...</div>;
  }

  const systemTypes = artifactTypes.filter((t) => t.isSystem);
  const customTypes = artifactTypes.filter((t) => !t.isSystem);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Primary Artifact Types</h3>
        <p className="text-sm text-muted-foreground">
          Select which artifact types this mode primarily creates. The AI will receive detailed
          schemas for these types.
        </p>
      </div>

      {/* System Artifact Types */}
      {systemTypes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Label className="text-xs font-medium text-muted-foreground">BUILT-IN TYPES</Label>
            <Badge variant="outline" className="text-xs">
              System
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {systemTypes.map((type) => (
              <div
                key={type.kind}
                className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 cursor-pointer"
                onClick={() => toggleKind(type.kind)}
              >
                <Checkbox
                  id={`artifact-${type.kind}`}
                  checked={selectedKinds.includes(type.kind)}
                  onCheckedChange={() => toggleKind(type.kind)}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <type.icon className="h-4 w-4 text-muted-foreground" />
                    <Label
                      htmlFor={`artifact-${type.kind}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {type.name}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Artifact Types */}
      {customTypes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Label className="text-xs font-medium text-muted-foreground">CUSTOM TYPES</Label>
            <Badge variant="outline" className="text-xs">
              User-Created
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {customTypes.map((type) => (
              <div
                key={type.kind}
                className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 cursor-pointer"
                onClick={() => toggleKind(type.kind)}
              >
                <Checkbox
                  id={`artifact-${type.kind}`}
                  checked={selectedKinds.includes(type.kind)}
                  onCheckedChange={() => toggleKind(type.kind)}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <type.icon className="h-4 w-4 text-muted-foreground" />
                    <Label
                      htmlFor={`artifact-${type.kind}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {type.name}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {artifactTypes.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No artifact types available. This shouldn't happen!
        </div>
      )}

      <div className="flex items-start space-x-2 rounded-lg bg-muted/50 p-3">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-medium">Artifact Selection Tips</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
            <li>Select 1-3 artifact types that this mode will primarily create</li>
            <li>Fewer types = more focused AI + lower token costs</li>
            <li>The AI will still see other types but with less detail</li>
            <li>You can create custom artifact types in Settings → Artifact Types</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
