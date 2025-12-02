'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Clock, 
  Users, 
  ArrowRight, 
  Zap,
  Target,
  Gift,
  ShoppingCart,
  Heart,
  Sparkles
} from 'lucide-react';

interface FlowEmail {
  id: string;
  name: string;
  subject: string;
  delay: string;
  description: string;
  trigger?: string;
}

interface FlowOutline {
  flowName: string;
  flowType: string;
  description: string;
  emails: FlowEmail[];
  approved?: boolean;
}

interface FlowUIRendererProps {
  flowOutline: FlowOutline;
  onApprove?: () => void;
  onEdit?: (emailId: string) => void;
  isApproved?: boolean;
}

const flowTypeIcons: Record<string, React.ReactNode> = {
  welcome_series: <Gift className="w-5 h-5" />,
  abandoned_cart: <ShoppingCart className="w-5 h-5" />,
  post_purchase: <Heart className="w-5 h-5" />,
  winback: <Target className="w-5 h-5" />,
  browse_abandonment: <Zap className="w-5 h-5" />,
};

export function FlowUIRenderer({ flowOutline, onApprove, onEdit, isApproved }: FlowUIRendererProps) {
  const flowIcon = flowTypeIcons[flowOutline.flowType] || <Mail className="w-5 h-5" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-3xl mx-auto"
    >
      {/* Flow Header */}
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20 rounded-xl p-6 mb-6 border border-violet-200 dark:border-violet-800">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-violet-500 rounded-xl text-white">
            {flowIcon}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              {flowOutline.flowName}
              {isApproved && (
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                  Approved
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {flowOutline.description}
            </p>
            <div className="flex items-center gap-4 mt-3">
              <span className="inline-flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400">
                <Mail className="w-4 h-4" />
                {flowOutline.emails.length} emails
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400">
                <Sparkles className="w-4 h-4" />
                {flowOutline.flowType.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Flow Timeline */}
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-500 via-purple-500 to-violet-300 dark:from-violet-400 dark:via-purple-400 dark:to-violet-600" />

        {flowOutline.emails.map((email, index) => (
          <motion.div
            key={email.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="relative mb-6 last:mb-0"
          >
            {/* Timeline dot */}
            <div className="absolute -left-5 top-3 w-4 h-4 rounded-full bg-violet-500 dark:bg-violet-400 border-4 border-white dark:border-gray-900 shadow-sm" />

            {/* Email Card */}
            <div 
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => onEdit?.(email.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 text-xs font-semibold">
                      {index + 1}
                    </span>
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {email.name}
                    </h4>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {email.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300">
                      <Clock className="w-3.5 h-3.5" />
                      {email.delay}
                    </span>
                    {email.trigger && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <Zap className="w-3.5 h-3.5" />
                        {email.trigger}
                      </span>
                    )}
                  </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Subject line preview */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide mb-1">
                  Subject Line
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                  {email.subject}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Approval Section */}
      {!isApproved && onApprove && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex justify-center"
        >
          <button
            onClick={onApprove}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:scale-105"
          >
            <Sparkles className="w-5 h-5" />
            Approve Flow Outline
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

export default FlowUIRenderer;
