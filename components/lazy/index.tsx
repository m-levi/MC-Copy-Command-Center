/**
 * Lazy-loaded Components
 *
 * Dynamic imports for heavy components to improve initial bundle size.
 * These components are loaded on-demand when first rendered.
 */

'use client';

import dynamic from 'next/dynamic';
import { ComponentType, ReactNode } from 'react';

// ============================================================================
// LOADING SKELETONS
// ============================================================================

function EditorSkeleton() {
  return (
    <div className="w-full h-64 bg-muted animate-pulse rounded-lg" />
  );
}

function ChartSkeleton() {
  return (
    <div className="w-full h-96 bg-muted animate-pulse rounded-lg flex items-center justify-center">
      <span className="text-muted-foreground">Loading chart...</span>
    </div>
  );
}

function FlowSkeleton() {
  return (
    <div className="w-full h-[500px] bg-muted animate-pulse rounded-lg flex items-center justify-center">
      <span className="text-muted-foreground">Loading flow diagram...</span>
    </div>
  );
}

function ModalSkeleton() {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-background w-full max-w-lg h-96 rounded-lg animate-pulse" />
    </div>
  );
}

// ============================================================================
// TIPTAP EDITOR (Heavy: ~500KB)
// ============================================================================

export const TiptapEditor = dynamic(
  () => import('@tiptap/react').then((mod) => {
    // Return a wrapper component that uses Tiptap
    const TiptapWrapper: ComponentType<{
      content?: string;
      onChange?: (content: string) => void;
      placeholder?: string;
      editable?: boolean;
      className?: string;
    }> = ({ content = '', onChange, placeholder, editable = true, className }) => {
      const { useEditor, EditorContent } = mod;
      // These need to be imported separately in actual usage
      // This is a simplified version for the lazy loading pattern
      return (
        <div className={className}>
          {/* Editor would render here */}
          <div className="prose max-w-none">{content}</div>
        </div>
      );
    };
    return { default: TiptapWrapper };
  }),
  {
    loading: () => <EditorSkeleton />,
    ssr: false, // Tiptap requires DOM
  }
);

// ============================================================================
// MERMAID CHARTS (Heavy: ~300KB)
// ============================================================================

export const MermaidChart = dynamic(
  () => import('./MermaidChartImpl'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // Mermaid requires DOM
  }
);

// ============================================================================
// REACT FLOW (Heavy: ~400KB)
// ============================================================================

export const FlowDiagram = dynamic(
  () => import('./FlowDiagramImpl'),
  {
    loading: () => <FlowSkeleton />,
    ssr: false, // React Flow requires DOM
  }
);

// ============================================================================
// PDF VIEWER (Heavy: ~200KB)
// ============================================================================

export const PDFViewer = dynamic(
  () => import('./PDFViewerImpl'),
  {
    loading: () => (
      <div className="w-full h-[600px] bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">Loading PDF viewer...</span>
      </div>
    ),
    ssr: false,
  }
);

// ============================================================================
// CODE HIGHLIGHTER (Heavy: ~150KB with all languages)
// ============================================================================

export const CodeHighlighter = dynamic(
  () => import('./CodeHighlighterImpl'),
  {
    loading: () => (
      <pre className="bg-muted p-4 rounded-lg animate-pulse">
        <code className="text-transparent">Loading code...</code>
      </pre>
    ),
    ssr: false,
  }
);

// ============================================================================
// MODALS (Moderate: Loaded on interaction)
// ============================================================================

export const ImportExportModal = dynamic(
  () => import('@/components/modes/ImportExportModal'),
  {
    loading: () => <ModalSkeleton />,
  }
);

export const TemplatesBrowser = dynamic(
  () => import('@/components/modes/TemplatesBrowser'),
  {
    loading: () => <ModalSkeleton />,
  }
);

// ============================================================================
// MOTION ANIMATIONS (Heavy: ~100KB)
// ============================================================================

// Re-export motion with lazy loading for less-used animations
export const AnimatedList = dynamic(
  () => import('./AnimatedListImpl'),
  {
    ssr: false,
  }
);

// ============================================================================
// HELPER: Preload component
// ============================================================================

/**
 * Preload a lazy component when user is likely to need it
 * Call this on hover or when idle
 */
export function preloadComponent(component: 'editor' | 'mermaid' | 'flow' | 'pdf') {
  switch (component) {
    case 'editor':
      import('@tiptap/react');
      break;
    case 'mermaid':
      import('./MermaidChartImpl');
      break;
    case 'flow':
      import('./FlowDiagramImpl');
      break;
    case 'pdf':
      import('./PDFViewerImpl');
      break;
  }
}
