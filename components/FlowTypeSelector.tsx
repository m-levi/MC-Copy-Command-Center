'use client';

import { useState } from 'react';
import { FlowType } from '@/types';
import { FLOW_TEMPLATES } from '@/lib/flow-templates';

interface FlowTypeSelectorProps {
  onSelect: (flowType: FlowType) => void;
  onCancel: () => void;
}

export default function FlowTypeSelector({ onSelect, onCancel }: FlowTypeSelectorProps) {
  const [hoveredId, setHoveredId] = useState<FlowType | null>(null);

  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-3xl w-full max-h-[85vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Select Flow Type
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Choose the automation sequence you want to create
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FLOW_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelect(template.id)}
                onMouseEnter={() => setHoveredId(template.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`
                  group relative text-left p-4 rounded-lg border transition-all duration-150
                  ${hoveredId === template.id
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/20 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xl">
                    {template.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {template.name}
                      </h3>
                      {/* Category tag */}
                      <span className={`
                        text-[9px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0
                        ${template.category === 'transactional' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : ''}
                        ${template.category === 'promotional' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : ''}
                        ${template.category === 'nurture' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : ''}
                      `}>
                        {template.category}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {template.description}
                    </p>
                    
                    {/* Email count */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{template.defaultEmailCount} emails</span>
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <svg className={`w-4 h-4 flex-shrink-0 transition-all ${
                    hoveredId === template.id 
                      ? 'text-blue-600 dark:text-blue-400 translate-x-0.5' 
                      : 'text-gray-400'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* Info box - minimal and professional */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              You'll build a detailed outline through conversation with AI, then approve to generate all emails in separate conversations for easy editing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

