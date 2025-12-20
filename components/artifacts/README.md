# Artifact System

The artifact system is designed to be **extensible** - supporting email copy today, but easily extendable to support flows, campaigns, templates, and other content types in the future.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      ArtifactContext                        │
│  - Manages artifact state                                   │
│  - Provides CRUD operations                                 │
│  - Handles streaming, sharing, versioning                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      ArtifactSidebar                        │
│  - Renders appropriate viewer based on artifact kind        │
│  - Uses kindConfig for feature toggles                      │
│  - Shows tabs: Content | Comments | History                 │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
        ┌───────────┐  ┌───────────┐  ┌───────────┐
        │EmailArtif │  │FlowViewer │  │ Campaign  │
        │  actView  │  │ (future)  │  │  Viewer   │
        └───────────┘  └───────────┘  └───────────┘
```

## Core Types (`types/artifacts.ts`)

### ArtifactKind
Defines all supported artifact types:
```typescript
type ArtifactKind = 
  | 'email'           // Email copy with A/B/C variants
  | 'flow'            // Email flow/automation sequences  
  | 'campaign'        // Full campaign plans
  | 'template'        // Reusable templates
  | 'subject_lines'   // Subject line variants
  | 'content_brief';  // Content briefs/outlines
```

### BaseArtifact
Generic interface that all artifacts extend:
```typescript
interface BaseArtifact<K extends ArtifactKind, M = Record<string, unknown>> {
  id: string;
  kind: K;
  conversation_id: string;
  user_id: string;
  title: string;
  content: string;
  version: number;
  metadata: M & SharedMetadata;
  created_at: string;
  updated_at: string;
}
```

### ARTIFACT_KIND_REGISTRY
Configuration for each artifact kind:
```typescript
const ARTIFACT_KIND_REGISTRY: Record<ArtifactKind, ArtifactKindConfig> = {
  email: {
    kind: 'email',
    label: 'Email Copy',
    icon: 'Mail',
    description: 'Email copy with A/B/C variants',
    supportsVariants: true,
    supportsSharing: true,
    supportsComments: true,
  },
  // ... other kinds
};
```

## Adding a New Artifact Type

### 1. Add the kind to `ArtifactKind` type

```typescript
// In types/artifacts.ts
export type ArtifactKind = 
  | 'email'
  | 'flow'
  | 'my_new_type';  // Add here
```

### 2. Define the metadata interface

```typescript
// In types/artifacts.ts
export interface MyNewTypeMetadata extends SharedMetadata {
  // Type-specific fields
  customField?: string;
  anotherField?: number;
}

export interface MyNewTypeArtifact extends BaseArtifact<'my_new_type', MyNewTypeMetadata> {}
```

### 3. Add to the registry

```typescript
// In types/artifacts.ts
export const ARTIFACT_KIND_REGISTRY: Record<ArtifactKind, ArtifactKindConfig> = {
  // ...existing
  my_new_type: {
    kind: 'my_new_type',
    label: 'My New Type',
    icon: 'FileCode',  // Lucide icon name
    description: 'Description of what this artifact type is for',
    supportsVariants: false,
    supportsSharing: true,
    supportsComments: true,
  },
};
```

### 4. Create a viewer component

```typescript
// In components/artifacts/MyNewTypeView.tsx
export function MyNewTypeView({ artifact }: { artifact: MyNewTypeArtifact }) {
  return (
    <div className="p-4">
      {/* Render your artifact-specific view */}
    </div>
  );
}
```

### 5. Create a type-specific hook (optional)

If you need type-specific logic beyond the base `useArtifacts` hook:

```typescript
// In hooks/useMyNewTypeArtifacts.ts
import { useArtifacts } from './useArtifacts';

export function useMyNewTypeArtifacts({ conversationId }: { conversationId: string }) {
  const base = useArtifacts<'my_new_type', MyNewTypeArtifact>({
    conversationId,
    kind: 'my_new_type',
  });

  // Add type-specific methods
  const customMethod = useCallback(async () => {
    // Custom logic
  }, []);

  return {
    ...base,
    customMethod,
  };
}
```

### 6. Register the viewer in ArtifactSidebar

```typescript
// In components/artifacts/ArtifactSidebar.tsx
// Add to the icon map
const ARTIFACT_KIND_ICONS: Record<string, React.ComponentType> = {
  // ...existing
  my_new_type: FileCodeIcon,
};

// Add to the content rendering
{activeTab === 'content' && activeArtifact?.kind === 'my_new_type' && (
  <MyNewTypeView artifact={activeArtifact} />
)}
```

## Database Schema

The `artifacts` table uses a flexible schema with a `metadata` JSONB column:

```sql
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  kind VARCHAR NOT NULL DEFAULT 'email',  -- The artifact type
  title TEXT,
  content TEXT NOT NULL,  -- Primary content
  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}',  -- Type-specific data
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Key Features

### Variants (Email-specific)
Email artifacts support A/B/C variants stored in metadata:
```typescript
metadata: {
  version_a_content: '...',
  version_b_content: '...',
  version_c_content: '...',
  selected_variant: 'a',
}
```

### Version History
All artifacts support version history via `artifact_versions` table.

### Sharing
Public share links are generated with tokens stored in metadata:
```typescript
metadata: {
  share_token: 'share_abc123_xyz',
  is_shared: true,
  shared_at: '2024-01-15T...',
}
```

### Comments
Comments are stored in `conversation_comments` with artifact reference in metadata:
```typescript
metadata: {
  artifact_id: '...',
  artifact_variant: 'a',
}
```

## Components

- `ArtifactSidebar` - Main sidebar container with tabs
- `EmailArtifactView` - Email-specific viewer with variants
- `ArtifactVersionHistory` - Version history timeline
- `ArtifactComments` - Integrated comments panel
- `ArtifactCard` - Compact card for artifact lists

## Hooks

- `useArtifacts` - Generic base hook for any artifact type
- `useEmailArtifacts` - Email-specific hook with variant handling

## Context

- `ArtifactProvider` - Wraps chat page to provide artifact state
- `useArtifactContext` - Access artifact state and actions
- `useOptionalArtifactContext` - Safe hook that returns null outside provider






