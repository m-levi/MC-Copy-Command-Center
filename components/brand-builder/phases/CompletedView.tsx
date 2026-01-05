'use client';

import React, { useState } from 'react';
import { Brand } from '@/types';
import { BrandBuilderState, BuilderPhase, BUILDER_PHASES } from '@/types/brand-builder';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  FileText,
  Users,
  PenTool,
  XCircle,
  Pencil,
  RotateCcw,
  History,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompletedViewProps {
  brand: Brand;
  state: BrandBuilderState;
  onRefinePhase: (phase: BuilderPhase) => void;
  onStartFresh: () => void;
}

export function CompletedView({
  brand,
  state,
  onRefinePhase,
  onStartFresh,
}: CompletedViewProps) {
  const [showHistory, setShowHistory] = useState(false);

  const dos = state.draftOutputs.dosDonts?.filter((item) => item.type === 'do') || [];
  const donts = state.draftOutputs.dosDonts?.filter((item) => item.type === 'dont') || [];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Brand Profile Complete!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
            Your brand profile for <strong>{brand.name}</strong> is ready. This information will be used to guide all AI-generated content.
          </p>
        </div>

        {/* Profile Sections */}
        <div className="space-y-6">
          {/* Brand Overview */}
          <ProfileSection
            icon={FileText}
            title="Brand Overview"
            content={state.draftOutputs.brandOverview}
            color="blue"
            onRefine={() => onRefinePhase('overview')}
          />

          {/* Target Customer */}
          <ProfileSection
            icon={Users}
            title="Target Customer"
            content={state.draftOutputs.targetCustomer}
            color="orange"
            onRefine={() => onRefinePhase('customer')}
          />

          {/* Copywriting Style Guide */}
          <ProfileSection
            icon={PenTool}
            title="Copywriting Style Guide"
            content={state.draftOutputs.copywritingStyleGuide}
            color="purple"
            onRefine={() => onRefinePhase('style_guide')}
          />

          {/* Do's & Don'ts */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Do's & Don'ts
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRefinePhase('dos_donts')}
                className="text-gray-500 hover:text-gray-700"
              >
                <Pencil className="w-4 h-4 mr-1" />
                Refine
              </Button>
            </div>
            <div className="p-5 grid md:grid-cols-2 gap-6">
              {/* Do's */}
              <div>
                <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Do's
                </h4>
                <div className="space-y-2">
                  {dos.length > 0 ? (
                    dos.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300"
                      >
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{item.content}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 italic">No do's defined</p>
                  )}
                </div>
              </div>

              {/* Don'ts */}
              <div>
                <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Don'ts
                </h4>
                <div className="space-y-2">
                  {donts.length > 0 ? (
                    donts.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300"
                      >
                        <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{item.content}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 italic">No don'ts defined</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => setShowHistory(!showHistory)}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Hide' : 'View'} Conversation History
            {showHistory ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
          <Button variant="outline" onClick={onStartFresh} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Start Fresh
          </Button>
        </div>

        {/* Conversation History */}
        {showHistory && (
          <div className="mt-8 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5" />
              Conversation History
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {state.conversationHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'p-4 rounded-xl',
                    msg.role === 'user'
                      ? 'bg-gray-200 dark:bg-gray-800 ml-8'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mr-8'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {msg.role === 'user' ? 'You' : 'AI'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {BUILDER_PHASES.find((p) => p.id === msg.phase)?.label || msg.phase}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {msg.content.slice(0, 300)}
                    {msg.content.length > 300 && '...'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProfileSectionProps {
  icon: React.ElementType;
  title: string;
  content?: string;
  color: 'blue' | 'orange' | 'purple';
  onRefine: () => void;
}

function ProfileSection({ icon: Icon, title, content, color, onRefine }: ProfileSectionProps) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorClasses[color])}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefine}
          className="text-gray-500 hover:text-gray-700"
        >
          <Pencil className="w-4 h-4 mr-1" />
          Refine
        </Button>
      </div>
      <div className="p-5">
        {content ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {content}
          </p>
        ) : (
          <p className="text-gray-400 italic">Not yet created</p>
        )}
      </div>
    </div>
  );
}
