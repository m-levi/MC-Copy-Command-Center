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
    if (isGenerating) {
      setDisplayedProgress(currentEmail);
    } else {
      setDisplayedProgress(0);
    }
  }, [currentEmail, isGenerating]);

  if (!isGenerating) return null;

  const progress = (displayedProgress / totalEmails) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto my-4 animate-in slide-in-from-bottom duration-300">
      {/* AI Message Style Container */}
      <div className="flex gap-3 items-start">
        {/* AI Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        {/* Progress Content */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center animate-pulse">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Generating Your Email Flow
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {displayedProgress === 0 ? (
                  'Preparing to generate emails...'
                ) : displayedProgress >= totalEmails ? (
                  'Completing generation and saving...'
                ) : displayedProgress === totalEmails - 1 ? (
                  `Creating final email (${totalEmails} of ${totalEmails})...`
                ) : (
                  `Creating email ${displayedProgress} of ${totalEmails}...`
                )}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 mb-5">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2.5 rounded-full transition-all duration-500 ease-out"
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
                className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ${
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
                    <div className="w-5 h-5 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : emailNum === displayedProgress ? (
                    // In Progress
                    <div className="w-5 h-5 rounded-full border-2 border-blue-500 dark:border-blue-400 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse"></div>
                    </div>
                  ) : (
                    // Pending
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
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
                  {emailNum === displayedProgress && <span className="ml-2 text-xs opacity-75">Generating...</span>}
                </span>
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              ⏱️ This may take up to {totalEmails * 5} seconds. Please wait...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


