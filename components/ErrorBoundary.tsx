'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { trackError } from '@/lib/analytics';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component for graceful error handling
 * Catches React errors in component tree and displays fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Track error for analytics
    trackError(error, 'ErrorBoundary');
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Something went wrong
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  An unexpected error occurred
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Reload page
              </button>
            </div>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full mt-3 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-sm transition-colors cursor-pointer"
            >
              ← Back to home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight error boundary for smaller sections
 */
export function SectionErrorBoundary({ children, sectionName }: { children: ReactNode; sectionName: string }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load {sectionName}. Please try refreshing the page.
          </p>
        </div>
      }
      onError={(error) => {
        console.error(`Error in ${sectionName}:`, error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
