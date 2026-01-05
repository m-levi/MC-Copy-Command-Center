/**
 * Generic Artifact Viewer
 *
 * Renders any artifact type based on its schema definition.
 * Provides a fallback viewer for custom artifact types.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Share2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Artifact } from '@/types/artifacts';

interface FieldSchema {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

interface ArtifactTypeConfig {
  name: string;
  description: string;
  icon: string;
  supports_variants: boolean;
  field_schema: FieldSchema[];
}

interface GenericArtifactViewerProps {
  artifact: Artifact;
  onShare?: () => void;
}

export function GenericArtifactViewer({ artifact, onShare }: GenericArtifactViewerProps) {
  const [typeConfig, setTypeConfig] = useState<ArtifactTypeConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArtifactTypeConfig();
  }, [artifact.kind]);

  const loadArtifactTypeConfig = async () => {
    try {
      const response = await fetch(`/api/artifact-types?kind=${artifact.kind}`);
      if (!response.ok) throw new Error('Failed to load artifact type');

      const data = await response.json();
      const types = data.artifact_types || [];
      const config = types.find((t: any) => t.kind === artifact.kind);

      setTypeConfig(config);
    } catch (error) {
      console.error('Error loading artifact type config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    toast.success('Copied to clipboard');
  };

  const renderField = (field: FieldSchema, value: unknown): React.ReactNode => {
    if (value === null || value === undefined) return null;

    const renderValue = () => {
      switch (field.type) {
        case 'long_text':
          return (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm">
                {String(value)}
              </pre>
            </div>
          );

        case 'array':
          if (Array.isArray(value)) {
            return (
              <ul className="list-disc list-inside space-y-1 text-sm">
                {value.map((item, idx) => (
                  <li key={idx}>{String(item)}</li>
                ))}
              </ul>
            );
          }
          return <p className="text-sm">{String(value)}</p>;

        case 'object':
          return (
            <pre className="whitespace-pre-wrap bg-muted p-3 rounded-lg text-xs">
              {JSON.stringify(value, null, 2)}
            </pre>
          );

        case 'boolean':
          return (
            <Badge variant={Boolean(value) ? 'default' : 'secondary'}>
              {Boolean(value) ? 'Yes' : 'No'}
            </Badge>
          );

        case 'number':
          return <p className="text-sm font-medium">{String(value)}</p>;

        default:
          return <p className="text-sm">{String(value)}</p>;
      }
    };

    return (
      <div key={field.name} className="space-y-2">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium">{field.label}</h4>
          {field.required && <Badge variant="outline" className="text-xs">Required</Badge>}
        </div>
        {renderValue()}
      </div>
    );
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading artifact...</div>;
  }

  if (!typeConfig) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">Unknown Artifact Type</p>
          <p className="text-sm text-muted-foreground">
            Artifact type &quot;{artifact.kind}&quot; not found
          </p>
        </div>
      </Card>
    );
  }

  // Extract metadata values based on field schema
  // Cast to Record<string, unknown> to allow dynamic field access
  const metadata = (artifact.metadata || {}) as Record<string, unknown>;
  const fieldsWithValues = typeConfig.field_schema
    .map((field) => ({
      field,
      value: metadata[field.name],
    }))
    .filter(({ value }) => value !== null && value !== undefined);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{typeConfig.icon}</span>
            <h2 className="text-xl font-semibold">{artifact.title}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{typeConfig.description}</p>
        </div>

        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>

          {onShare && (
            <Button variant="ghost" size="sm" onClick={onShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          )}
        </div>
      </div>

      {/* Variants Support */}
      {typeConfig.supports_variants && metadata.selected_variant ? (
        <Tabs defaultValue={String(metadata.selected_variant)} className="w-full">
          <TabsList>
            {['a', 'b', 'c'].map((variant) => {
              const content = metadata[`version_${variant}_content`];
              if (!content) return null;

              return (
                <TabsTrigger key={variant} value={variant} className="uppercase">
                  Version {variant}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {['a', 'b', 'c'].map((variant) => {
            const content = metadata[`version_${variant}_content`];
            const approach = metadata[`version_${variant}_approach`];
            if (!content) return null;

            return (
              <TabsContent key={variant} value={variant} className="space-y-4">
                {approach ? (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm">
                      <span className="font-medium">Approach:</span> {String(approach)}
                    </p>
                  </div>
                ) : null}

                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap bg-background border rounded-lg p-4">
                    {String(content)}
                  </pre>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      ) : null}

      {/* Main Content (if no variants) */}
      {!typeConfig.supports_variants && artifact.content && (
        <Card className="p-4">
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm">{artifact.content}</pre>
          </div>
        </Card>
      )}

      {/* Metadata Fields */}
      {fieldsWithValues.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Details</h3>
          <div className="space-y-6">
            {fieldsWithValues.map(({ field, value }) => renderField(field, value))}
          </div>
        </Card>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Version {artifact.version}</span>
          </div>

          <span>
            Created {new Date(artifact.created_at).toLocaleDateString()}
          </span>
        </div>

        {metadata.status ? (
          <Badge variant="secondary" className="text-xs">
            {String(metadata.status)}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
