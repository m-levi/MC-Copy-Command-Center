'use client';

import dynamic from 'next/dynamic';

// Lazy-load debug components - only rendered in development
const DebugPanel = dynamic(() => import('@/components/DebugPanel'), {
  ssr: false,
  loading: () => null,
});

const DebugPromptSelector = dynamic(() => import('@/components/DebugPromptSelector'), {
  ssr: false,
  loading: () => null,
});

export default function DebugComponentsWrapper() {
  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      <DebugPanel />
      <DebugPromptSelector />
    </>
  );
}
