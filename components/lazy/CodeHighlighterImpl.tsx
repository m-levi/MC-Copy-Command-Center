/**
 * Code Highlighter Implementation
 *
 * Syntax highlighting using Shiki
 */

'use client';

import { useEffect, useState } from 'react';
import { codeToHtml, BundledLanguage, BundledTheme } from 'shiki';

interface CodeHighlighterProps {
  code: string;
  language?: BundledLanguage;
  theme?: BundledTheme;
  className?: string;
  showLineNumbers?: boolean;
}

export default function CodeHighlighterImpl({
  code,
  language = 'typescript',
  theme = 'github-dark',
  className,
  showLineNumbers = false,
}: CodeHighlighterProps) {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const highlight = async () => {
      try {
        setLoading(true);
        const highlighted = await codeToHtml(code, {
          lang: language,
          theme,
        });
        setHtml(highlighted);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Highlighting failed'));
      } finally {
        setLoading(false);
      }
    };

    highlight();
  }, [code, language, theme]);

  if (loading) {
    return (
      <pre className={`bg-muted p-4 rounded-lg overflow-auto ${className || ''}`}>
        <code className="text-muted-foreground">{code}</code>
      </pre>
    );
  }

  if (error) {
    return (
      <pre className={`bg-muted p-4 rounded-lg overflow-auto ${className || ''}`}>
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      className={`shiki-wrapper overflow-auto rounded-lg ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
