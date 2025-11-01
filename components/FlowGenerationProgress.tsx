'use client';

import { useState, useEffect } from 'react';

interface FlowGenerationProgressProps {
  totalEmails: number;
  currentEmail?: number;
  isGenerating: boolean;
}

export default function FlowGenerationProgress({
  totalEmails,
  currentEmail = 0,
  isGenerating
}: FlowGenerationProgressProps) {
  const [displayedProgress, setDisplayedProgress] = useState(0);

  useEffect(() => {
    if (isGenerating && currentEmail > 0) {
      setDisplayedProgress(currentEmail);
    }
  }, [currentEmail, isGenerating]);

  if (!isGenerating) return null;

  const progress = (displayedProgress / totalEmails) * 100;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
          Generating Your Email Flow
        </h3>

        {/* Status */}
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
          {displayedProgress === 0 ? (
            'Preparing to generate emails...'
          ) : displayedProgress === totalEmails ? (
            'Finalizing...'
          ) : (
            `Creating email ${displayedProgress} of ${totalEmails}...`
          )}
        </p>

        {/* Progress Bar */}
        <div className="space-y-3 mb-6">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{displayedProgress} / {totalEmails} emails</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Email List with Checkmarks */}
        <div className="space-y-2">
          {Array.from({ length: totalEmails }, (_, i) => i + 1).map((emailNum) => (
            <div 
              key={emailNum}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${
                emailNum < displayedProgress 
                  ? 'bg-green-50 dark:bg-green-950/20' 
                  : emailNum === displayedProgress
                    ? 'bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-400 dark:ring-blue-600'
                    : 'bg-gray-50 dark:bg-gray-900'
              }`}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {emailNum < displayedProgress ? (
                  // Completed
                  <div className="w-6 h-6 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : emailNum === displayedProgress ? (
                  // In Progress
                  <div className="w-6 h-6 rounded-full border-2 border-blue-500 dark:border-blue-400 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse"></div>
                  </div>
                ) : (
                  // Pending
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                )}
              </div>

              {/* Text */}
              <span className={`text-sm font-medium ${
                emailNum < displayedProgress 
                  ? 'text-green-700 dark:text-green-400' 
                  : emailNum === displayedProgress
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-500 dark:text-gray-400'
              }`}>
                Email {emailNum}
                {emailNum === displayedProgress && <span className="ml-2 text-xs">Generating...</span>}
              </span>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            This may take up to {totalEmails * 5} seconds. Please wait...
          </p>
        </div>
      </div>
    </div>
  );
}


