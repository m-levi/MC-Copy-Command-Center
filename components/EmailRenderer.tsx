'use client';

interface EmailRendererProps {
  content: string;
}

/**
 * Simple, clean email renderer - displays email copy in a monospace code block
 * No toggles, no complexity - just the content
 */
export default function EmailRenderer({ content }: EmailRendererProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5 font-mono text-sm overflow-hidden">
      <pre className="whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 leading-relaxed">
        {content}
      </pre>
    </div>
  );
}

