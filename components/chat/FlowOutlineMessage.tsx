'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlowOutlineData, FlowOutlineEmail } from '@/types';
import { 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Mail, 
  Target, 
  Users,
  Sparkles,
  LayoutTemplate,
  FileText,
  Loader2
} from 'lucide-react';
import FlowchartViewer from '@/components/FlowchartViewer';
import { generateMermaidChart } from '@/lib/mermaid-generator';

interface GeneratedEmail {
  id: string;
  title: string;
  sequence: number;
}

interface FlowOutlineMessageProps {
  outline: FlowOutlineData;
  mermaidChart?: string;
  isApproved?: boolean;
  isGenerating?: boolean;
  generationProgress?: {
    current: number;
    total: number;
    currentEmailTitle: string | null;
  };
  generatedEmails?: GeneratedEmail[];
  onApprove?: () => void;
  onRequestChanges?: (request: string) => void;
  onViewEmail?: (emailId: string) => void;
}

function EmailTypeIcon({ type }: { type: 'design' | 'letter' }) {
  return type === 'design' ? (
    <LayoutTemplate className="w-3.5 h-3.5" />
  ) : (
    <FileText className="w-3.5 h-3.5" />
  );
}

function EmailRow({ email, index }: { email: FlowOutlineEmail; index: number }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {/* Sequence number */}
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
          <span className="text-xs font-bold text-violet-700 dark:text-violet-300">
            {email.sequence}
          </span>
        </div>
        
        {/* Title and timing */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {email.title}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              {email.timing}
            </span>
            <span className={`
              flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium
              ${email.emailType === 'design' 
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              }
            `}>
              <EmailTypeIcon type={email.emailType} />
              {email.emailType}
            </span>
          </div>
        </div>
        
        {/* Expand icon */}
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      
      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 space-y-2 border-t border-gray-100 dark:border-gray-800">
              <div className="pt-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Purpose
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                  {email.purpose}
                </p>
              </div>
              
              {email.keyPoints.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Key Points
                  </p>
                  <ul className="mt-1 space-y-1">
                    {email.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-violet-500 mt-1">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Call to Action
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                  {email.cta}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FlowOutlineMessage({
  outline,
  mermaidChart,
  isApproved,
  isGenerating,
  generationProgress,
  generatedEmails,
  onApprove,
  onRequestChanges,
  onViewEmail
}: FlowOutlineMessageProps) {
  const [showFlowchart, setShowFlowchart] = useState(false);
  
  // Generate mermaid chart if not provided
  const chartToShow = mermaidChart || generateMermaidChart(outline);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20 rounded-t-xl p-4 border border-violet-200 dark:border-violet-800 border-b-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500 rounded-lg text-white">
            <Mail className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {outline.flowName}
              </h3>
              {isApproved && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                  <Check className="w-3 h-3" />
                  Approved
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {outline.emails.length} emails in sequence
            </p>
          </div>
        </div>
        
        {/* Goal and Audience */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <Target className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Goal
              </p>
              <p className="text-sm text-gray-800 dark:text-gray-200">
                {outline.goal}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Target Audience
              </p>
              <p className="text-sm text-gray-800 dark:text-gray-200">
                {outline.targetAudience}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Email list */}
      <div className="border border-violet-200 dark:border-violet-800 border-t-0 rounded-b-xl bg-white dark:bg-gray-900 p-4 space-y-2">
        {outline.emails.map((email, index) => (
          <EmailRow key={email.sequence} email={email} index={index} />
        ))}
        
        {/* Flowchart toggle */}
        {chartToShow && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowFlowchart(!showFlowchart)}
              className="flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
            >
              {showFlowchart ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              {showFlowchart ? 'Hide' : 'View'} Flow Visualization
            </button>
            
            <AnimatePresence>
              {showFlowchart && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 overflow-hidden"
                >
                  <FlowchartViewer
                    mermaidChart={chartToShow}
                    flowName={outline.flowName}
                    isVisible={true}
                    onToggle={() => {}}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        {/* Generation progress */}
        {isGenerating && generationProgress && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {generationProgress.current === 0 ? (
                  <>Starting generation of {generationProgress.total} emails...</>
                ) : generationProgress.current >= generationProgress.total ? (
                  <>Finalizing {generationProgress.total} emails...</>
                ) : (
                  <>Generated {generationProgress.current} of {generationProgress.total} emails
                  {generationProgress.currentEmailTitle && ` — ${generationProgress.currentEmailTitle}`}</>
                )}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div 
                className="bg-gradient-to-r from-violet-500 to-purple-500 h-2"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${Math.max(5, (generationProgress.current / generationProgress.total) * 100)}%` 
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              This may take a minute. Each email is being crafted individually.
            </p>
          </div>
        )}
        
        {/* Approval section */}
        {!isApproved && !isGenerating && onApprove && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onApprove}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg shadow-violet-500/25 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-5 h-5" />
              Approve & Generate Emails
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
              Type a message to request changes (e.g., &quot;add a 4th email about reviews&quot;)
            </p>
          </div>
        )}
        
        {/* Completed state */}
        {isApproved && !isGenerating && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4"
          >
            {/* Success banner */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-800 dark:text-green-300">
                  🎉 Flow Generated Successfully!
                </h4>
                <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
                  All {outline.emails.length} emails are ready. Click any email below to view and edit.
                </p>
              </div>
            </div>
            
            {/* Generated emails list */}
            {generatedEmails && generatedEmails.length > 0 && onViewEmail && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
                  View Generated Emails
                </p>
                <div className="grid gap-2">
                  {generatedEmails.sort((a, b) => a.sequence - b.sequence).map((email, index) => (
                    <motion.button
                      key={email.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => onViewEmail(email.id)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all group text-left"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center group-hover:bg-violet-200 dark:group-hover:bg-violet-800/60 transition-colors">
                        <span className="text-sm font-bold text-violet-700 dark:text-violet-300">
                          {email.sequence}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
                          {email.title}
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-violet-500 -rotate-90 transition-colors" />
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Fallback if no generated emails data */}
            {(!generatedEmails || generatedEmails.length === 0) && (
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-2">
                Check the sidebar to view your generated emails.
              </p>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default FlowOutlineMessage;

