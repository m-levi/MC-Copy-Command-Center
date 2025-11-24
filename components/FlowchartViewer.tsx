'use client';

import { useEffect, useRef, useState } from 'react';
import { exportChartToPDF } from '@/lib/pdf-generator';
import toast from 'react-hot-toast';

// Mermaid instance - loaded dynamically
let mermaidInstance: typeof import('mermaid').default | null = null;
let mermaidInitialized = false;

interface FlowchartViewerProps {
  mermaidChart: string;
  flowName: string;
  isVisible: boolean;
  onToggle: () => void;
}

export default function FlowchartViewer({
  mermaidChart,
  flowName,
  isVisible
}: FlowchartViewerProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const chartIdRef = useRef(`mermaid-chart-${Date.now()}`);

  // Load and initialize Mermaid dynamically
  const loadMermaid = async () => {
    if (mermaidInstance && mermaidInitialized) return mermaidInstance;
    
    const mermaid = (await import('mermaid')).default;
    mermaidInstance = mermaid;
    
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
          primaryColor: '#3b82f6',
          primaryTextColor: '#fff',
          primaryBorderColor: '#2563eb',
          lineColor: '#6b7280',
          secondaryColor: '#a855f7',
          tertiaryColor: '#10b981',
          fontSize: '16px',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif'
        },
        flowchart: {
          useMaxWidth: false,
          htmlLabels: false,
          curve: 'linear',
          padding: 15,
          nodeSpacing: 50,
          rankSpacing: 50
        },
        fontSize: 14
      });
      mermaidInitialized = true;
    }
    
    return mermaid;
  };

  // Render chart when visible and chart data is available
  useEffect(() => {
    if (!isVisible || !mermaidChart || !chartRef.current) {
      return;
    }

    let isMounted = true;

    const renderChart = async () => {
      setIsRendering(true);
      setHasError(false);

      try {
        // Double-check ref is still valid
        if (!chartRef.current || !isMounted) {
          console.warn('Chart ref became null or component unmounted');
          return;
        }

        // Clear previous content completely
        chartRef.current.innerHTML = '';
        containerRef.current = null;

        // Load mermaid dynamically
        const mermaid = await loadMermaid();

        // Generate unique ID for this render
        const chartId = `${chartIdRef.current}-${Date.now()}`;
        
        // Render with Mermaid - use the correct API
        const { svg } = await mermaid.render(chartId, mermaidChart);
        
        // Check ref again after async operation
        if (!chartRef.current || !isMounted) {
          console.warn('Chart ref became null or component unmounted after Mermaid render');
          return;
        }
        
        // Create a container div with the chart ID for PDF export
        const container = document.createElement('div');
        container.id = chartIdRef.current; // Use the persistent ID for PDF export
        container.className = 'mermaid-chart-container';
        container.style.width = '100%';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.innerHTML = svg;
        
        chartRef.current.appendChild(container);
        
        // Store reference for PDF export
        containerRef.current = container;
      } catch (error) {
        console.error('Error rendering Mermaid chart:', error);
        setHasError(true);
        if (chartRef.current) {
          chartRef.current.innerHTML = `
            <div class="p-8 text-center text-gray-500 dark:text-gray-400">
              <svg class="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-sm font-medium">Failed to render flowchart</p>
              <p class="text-xs mt-1">Please try refreshing the page</p>
            </div>
          `;
        }
      } finally {
        if (isMounted) {
          setIsRendering(false);
        }
      }
    };

    renderChart();

    // Cleanup function
    return () => {
      isMounted = false;
      if (chartRef.current) {
        chartRef.current.innerHTML = '';
      }
      containerRef.current = null;
    };
  }, [isVisible, mermaidChart]);

  const handleDownloadPDF = async () => {
    if (!containerRef.current) {
      toast.error('Chart not ready for export. Please wait for it to finish rendering.');
      return;
    }

    setIsExporting(true);
    
    try {
      await exportChartToPDF(chartIdRef.current, flowName);
      toast.success('Flowchart downloaded successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export flowchart. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm"
      role="region"
      aria-label="Flow visualization chart"
    >
      {/* Header with Download Button */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Flow Visualization</span>
        </div>
        
        <button
          onClick={handleDownloadPDF}
          disabled={isExporting || isRendering || hasError}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
          aria-label={`Download ${flowName} flowchart as PDF`}
        >
          {isExporting ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download PDF</span>
            </>
          )}
        </button>
      </div>

      {/* Chart Container - Scrollable */}
      <div 
        className="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800"
        style={{
          height: '500px',
          overflowY: 'scroll',
          overflowX: 'hidden',
          position: 'relative'
        }}
      >
        <div className="p-6">
          {isRendering ? (
            <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400" style={{ minHeight: '200px', paddingTop: '80px' }}>
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm">Rendering flowchart...</p>
            </div>
          ) : hasError ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400" style={{ paddingTop: '80px' }}>
              <svg className="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium">Failed to render flowchart</p>
              <p className="text-xs mt-1">Please try refreshing the page</p>
            </div>
          ) : (
            <div 
              ref={chartRef}
              className="w-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}

