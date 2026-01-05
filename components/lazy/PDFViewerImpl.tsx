/**
 * PDF Viewer Implementation
 *
 * Simple PDF viewer using iframe or embed fallback
 */

'use client';

import { useState } from 'react';

interface PDFViewerProps {
  url: string;
  title?: string;
  className?: string;
  height?: string | number;
}

export default function PDFViewerImpl({
  url,
  title = 'PDF Document',
  className,
  height = '600px',
}: PDFViewerProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-muted rounded-lg ${className || ''}`}>
        <p className="text-muted-foreground mb-4">Unable to display PDF</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Open PDF in new tab
        </a>
      </div>
    );
  }

  return (
    <div className={`pdf-viewer ${className || ''}`} style={{ height }}>
      <iframe
        src={`${url}#toolbar=0&navpanes=0`}
        title={title}
        className="w-full h-full border-0 rounded-lg"
        onError={() => setError(true)}
      />
    </div>
  );
}
