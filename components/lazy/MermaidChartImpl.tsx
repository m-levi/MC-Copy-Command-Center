/**
 * Mermaid Chart Implementation
 *
 * Renders Mermaid diagrams with proper initialization
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidChartProps {
  chart: string;
  className?: string;
  onError?: (error: Error) => void;
}

// Initialize mermaid once
let initialized = false;

function initMermaid() {
  if (initialized) return;

  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'basis',
    },
  });

  initialized = true;
}

export default function MermaidChartImpl({ chart, className, onError }: MermaidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    initMermaid();
  }, []);

  useEffect(() => {
    if (!chart || !containerRef.current) return;

    const renderChart = async () => {
      try {
        // Generate unique ID for this chart
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        // Render the chart
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to render chart');
        setError(error);
        onError?.(error);
      }
    };

    renderChart();
  }, [chart, onError]);

  if (error) {
    return (
      <div className={`p-4 bg-destructive/10 text-destructive rounded-lg ${className}`}>
        <p className="font-medium">Failed to render diagram</p>
        <pre className="text-sm mt-2 overflow-auto">{error.message}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`mermaid-chart ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
