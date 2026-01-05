'use client';

import React from 'react';
import {
  BuilderPhase,
  BrandBuilderDrafts,
  BUILDER_PHASES,
  isPhaseComplete,
} from '@/types/brand-builder';
import { cn } from '@/lib/utils';
import {
  Search,
  FileText,
  Users,
  PenTool,
  CheckCircle,
  Check,
} from 'lucide-react';

const PHASE_ICONS: Record<string, React.ElementType> = {
  search: Search,
  'file-text': FileText,
  users: Users,
  'pen-tool': PenTool,
  'check-circle': CheckCircle,
};

interface PhaseProgressProps {
  currentPhase: BuilderPhase;
  draftOutputs: BrandBuilderDrafts;
  compact?: boolean;
  onPhaseClick?: (phase: BuilderPhase) => void;
}

export function PhaseProgress({
  currentPhase,
  draftOutputs,
  compact = false,
  onPhaseClick,
}: PhaseProgressProps) {
  const phases = BUILDER_PHASES.filter(p => p.id !== 'complete');
  const currentIndex = phases.findIndex(p => p.id === currentPhase);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {phases.map((phase, index) => {
          const isActive = phase.id === currentPhase;
          const isComplete = isPhaseComplete(phase.id, draftOutputs) && index < currentIndex;
          const Icon = PHASE_ICONS[phase.icon] || CheckCircle;

          return (
            <React.Fragment key={phase.id}>
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                  isComplete
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 dark:ring-indigo-800'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                )}
                title={phase.label}
              >
                {isComplete ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              {index < phases.length - 1 && (
                <div
                  className={cn(
                    'w-6 h-0.5 rounded-full',
                    index < currentIndex
                      ? 'bg-emerald-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full py-4">
      <div className="flex items-start justify-between">
        {phases.map((phase, index) => {
          const isActive = phase.id === currentPhase;
          const isComplete = isPhaseComplete(phase.id, draftOutputs) && index < currentIndex;
          const isPast = index < currentIndex;
          const Icon = PHASE_ICONS[phase.icon] || CheckCircle;

          return (
            <React.Fragment key={phase.id}>
              <div
                className={cn(
                  'flex flex-col items-center flex-1',
                  onPhaseClick && (isComplete || isPast) && 'cursor-pointer'
                )}
                onClick={() => {
                  if (onPhaseClick && (isComplete || isPast)) {
                    onPhaseClick(phase.id);
                  }
                }}
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center transition-all mb-2',
                    isComplete
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : isActive
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-100 dark:ring-indigo-900/50'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  )}
                >
                  {isComplete ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium text-center',
                    isActive
                      ? 'text-gray-900 dark:text-white'
                      : isComplete
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-400'
                  )}
                >
                  {phase.label}
                </span>
                <span
                  className={cn(
                    'text-xs text-center mt-1 max-w-[120px]',
                    isActive ? 'text-gray-500' : 'text-gray-400'
                  )}
                >
                  {phase.description}
                </span>
              </div>
              {index < phases.length - 1 && (
                <div className="flex-shrink-0 w-12 h-12 flex items-center">
                  <div
                    className={cn(
                      'w-full h-1 rounded-full',
                      isPast
                        ? 'bg-emerald-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
