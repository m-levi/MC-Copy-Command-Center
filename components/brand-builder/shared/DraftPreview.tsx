'use client';

import React from 'react';
import { BuilderPhase, BrandBuilderDrafts, BUILDER_PHASES } from '@/types/brand-builder';
import { cn } from '@/lib/utils';
import {
  FileText,
  Users,
  PenTool,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface DraftPreviewProps {
  currentPhase: BuilderPhase;
  draftOutputs: BrandBuilderDrafts;
}

export function DraftPreview({ currentPhase, draftOutputs }: DraftPreviewProps) {
  return (
    <aside className="hidden xl:flex w-80 flex-col border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
        <h3 className="font-bold text-gray-900 dark:text-white">
          Your Brand Profile
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Preview of your outputs
        </p>
      </div>

      {/* Drafts */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Brand Overview */}
        <DraftSection
          icon={FileText}
          title="Brand Overview"
          content={draftOutputs.brandOverview}
          isActive={currentPhase === 'overview'}
          color="blue"
        />

        {/* Target Customer */}
        <DraftSection
          icon={Users}
          title="Target Customer"
          content={draftOutputs.targetCustomer}
          isActive={currentPhase === 'customer'}
          color="orange"
        />

        {/* Copywriting Style Guide */}
        <DraftSection
          icon={PenTool}
          title="Copywriting Style"
          content={draftOutputs.copywritingStyleGuide}
          isActive={currentPhase === 'style_guide'}
          color="purple"
        />

        {/* Do's & Don'ts */}
        {draftOutputs.dosDonts && draftOutputs.dosDonts.length > 0 && (
          <div
            className={cn(
              'rounded-xl border p-4 transition-all',
              currentPhase === 'dos_donts'
                ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/20'
                : 'border-gray-200 dark:border-gray-700'
            )}
          >
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Do's & Don'ts
            </h4>
            <div className="space-y-2">
              {draftOutputs.dosDonts.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-start gap-2 text-sm',
                    item.type === 'do'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-700 dark:text-red-400'
                  )}
                >
                  {item.type === 'do' ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )}
                  <span className="line-clamp-2">{item.content}</span>
                </div>
              ))}
              {draftOutputs.dosDonts.length > 6 && (
                <p className="text-xs text-gray-400 mt-2">
                  +{draftOutputs.dosDonts.length - 6} more
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

interface DraftSectionProps {
  icon: React.ElementType;
  title: string;
  content?: string;
  isActive: boolean;
  color: 'blue' | 'orange' | 'purple' | 'green';
}

function DraftSection({ icon: Icon, title, content, isActive, color }: DraftSectionProps) {
  const colorClasses = {
    blue: {
      icon: 'text-blue-500',
      active: 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20',
    },
    orange: {
      icon: 'text-orange-500',
      active: 'border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20',
    },
    purple: {
      icon: 'text-purple-500',
      active: 'border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20',
    },
    green: {
      icon: 'text-green-500',
      active: 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20',
    },
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all',
        isActive
          ? colorClasses[color].active
          : 'border-gray-200 dark:border-gray-700'
      )}
    >
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
        <Icon className={cn('w-4 h-4', colorClasses[color].icon)} />
        {title}
      </h4>
      {content ? (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4">
          {content}
        </p>
      ) : (
        <p className="text-sm text-gray-400 italic">
          Not yet created
        </p>
      )}
    </div>
  );
}
