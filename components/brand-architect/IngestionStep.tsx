'use client';

import React, { useState, useRef } from 'react';
import { useBrandArchitect } from './BrandArchitectContext';

export default function IngestionStep() {
  const { state, dispatch } = useBrandArchitect();
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      dispatch({
        type: 'SET_UPLOADED_DATA',
        payload: { files: Array.from(e.target.files) },
      });
    }
  };

  const handleNext = () => {
    dispatch({
        type: 'SET_UPLOADED_DATA',
        payload: {
            text: textInput,
            url: urlInput
        }
    });
    
    // Trigger analysis (Phase 1)
    dispatch({ type: 'SET_PROCESSING', payload: true });
    
    // In a real implementation, we would call the API here
    // For now, we'll simulate a delay and move to the next step
    setTimeout(() => {
        dispatch({ type: 'SET_PROCESSING', payload: false });
        dispatch({ type: 'SET_STEP', payload: 'interview' });
        // Add initial system message
        dispatch({
            type: 'ADD_CHAT_MESSAGE',
            payload: {
                id: 'init',
                role: 'assistant',
                content: "Hello! I've analyzed your materials. I have a few questions to help me understand your brand voice better. First, if your brand was a celebrity or a fictional character, who would it be and why?",
                timestamp: Date.now()
            }
        });
    }, 1500);
  };

  const hasData = textInput.trim().length > 0 || state.uploadedData.files.length > 0 || urlInput.trim().length > 0;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Let's start with what you have.
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Upload examples of your best copy, your mission statement, or your website URL.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* File Upload / URL */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Files
            </h4>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.txt,.md,.doc,.docx"
                multiple
              />
              <p className="text-gray-500 dark:text-gray-400">
                Click to upload PDF, TXT, or DOC
              </p>
              {state.uploadedData.files.length > 0 && (
                <div className="mt-4 text-sm text-blue-600 dark:text-blue-400 font-medium">
                  {state.uploadedData.files.length} file(s) selected
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Website URL
            </h4>
            <input
              type="url"
              placeholder="https://yourbrand.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Text Paste */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Paste Text
          </h4>
          <textarea
            placeholder="Paste your mission statement, recent emails, or any other brand copy here..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="flex-1 w-full p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[200px]"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleNext}
          disabled={!hasData || state.isProcessing}
          className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${
            hasData && !state.isProcessing
              ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {state.isProcessing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </span>
          ) : (
            'Start Analysis'
          )}
        </button>
      </div>
    </div>
  );
}

