'use client';

import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * PageTransition component provides smooth entry animations for pages
 * Uses Tailwind's animate-in utilities for consistent page transitions
 */
export default function PageTransition({ children }: PageTransitionProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      {children}
    </div>
  );
}

