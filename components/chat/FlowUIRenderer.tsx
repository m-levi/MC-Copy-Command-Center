'use client';

import { memo, useState, useCallback } from 'react';
import { parseFlowContent, ParsedFlowContent, FlowPlan, FlowConfirm, FlowSuggestion } from '@/lib/flow-ui-parser';
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion';
import { 
  Plan, 
  PlanHeader, 
  PlanTitle, 
  PlanDescription, 
  PlanContent, 
  PlanTrigger 
} from '@/components/ai-elements/plan';
import { 
  Task, 
  TaskTrigger, 
  TaskContent, 
  TaskItem 
} from '@/components/ai-elements/task';
import { 
  Confirmation, 
  ConfirmationTitle, 
  ConfirmationActions, 
  ConfirmationAction,
  ConfirmationAccepted,
} from '@/components/ai-elements/confirmation';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface FlowUIRendererProps {
  content: string;
  onSuggestionClick?: (suggestion: string) => void;
  onApprove?: (plan: FlowPlan) => void;
  onModify?: (plan: FlowPlan) => void;
  isGenerating?: boolean;
  approvalState?: 'pending' | 'approved' | 'rejected';
}

/**
 * Renders suggestions as clickable buttons
 */
const SuggestionsRenderer = memo(function SuggestionsRenderer({
  suggestions,
  onSuggestionClick,
}: {
  suggestions: FlowSuggestion[];
  onSuggestionClick?: (suggestion: string) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="my-4">
      <Suggestions className="flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <Suggestion
            key={index}
            suggestion={suggestion.text}
            onClick={() => onSuggestionClick?.(suggestion.text)}
            className="transition-all hover:scale-105"
          />
        ))}
      </Suggestions>
    </div>
  );
});

/**
 * Renders a flow plan with tasks using AI Elements
 */
const PlanRenderer = memo(function PlanRenderer({
  plan,
  isGenerating,
}: {
  plan: FlowPlan;
  isGenerating?: boolean;
}) {
  return (
    <div className="my-6">
      <Plan defaultOpen={true} isStreaming={isGenerating} className="border-2 border-blue-100 dark:border-blue-900/30">
        <PlanHeader>
          <div className="space-y-1">
            <PlanTitle>{plan.title || 'Email Flow'}</PlanTitle>
            <PlanDescription>
              {`${plan.tasks.length} emails • ${plan.goal || 'Custom flow'}`}
            </PlanDescription>
          </div>
          <PlanTrigger />
        </PlanHeader>
        
        <PlanContent className="space-y-3 pt-2">
          {/* Target Audience Badge */}
          {plan.audience && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">Target:</span>
              <span className="bg-secondary px-2 py-1 rounded">{plan.audience}</span>
            </div>
          )}

          {/* Email Tasks */}
          <div className="space-y-2">
            {plan.tasks.map((task, index) => (
              <Task key={index} defaultOpen={false} className="border rounded-md bg-card">
                <TaskTrigger title={`${task.seq}. ${task.title}`}>
                  <div className="flex flex-1 items-center justify-between pr-4">
                    <span className="text-sm font-medium">
                      {task.seq}. {task.title}
                    </span>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                      {task.timing}
                    </span>
                  </div>
                </TaskTrigger>
                <TaskContent>
                  <div className="space-y-3 p-2">
                    {/* Purpose */}
                    <div>
                      <p className="text-sm text-muted-foreground">{task.content}</p>
                    </div>

                    {/* Key Points */}
                    {task.keyPoints.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Key Points
                        </h5>
                        <ul className="space-y-1">
                          {task.keyPoints.map((point, idx) => (
                            <TaskItem key={idx}>
                              <span className="text-muted-foreground">•</span> {point}
                            </TaskItem>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* CTA */}
                    {task.cta && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          CTA:
                        </span>
                        <span className="text-sm text-primary font-medium">{task.cta}</span>
                      </div>
                    )}

                    {/* Email Type Badge */}
                    <div className="flex justify-end">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full uppercase tracking-wider font-medium",
                        task.emailType === 'design' 
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                      )}>
                        {task.emailType}
                      </span>
                    </div>
                  </div>
                </TaskContent>
              </Task>
            ))}
          </div>
        </PlanContent>
      </Plan>
    </div>
  );
});

/**
 * Renders the confirmation/approval UI
 */
const ConfirmRenderer = memo(function ConfirmRenderer({
  confirm,
  plan,
  onApprove,
  onModify,
  isGenerating,
  approvalState,
}: {
  confirm: FlowConfirm;
  plan: FlowPlan | null;
  onApprove?: (plan: FlowPlan) => void;
  onModify?: (plan: FlowPlan) => void;
  isGenerating?: boolean;
  approvalState?: 'pending' | 'approved' | 'rejected';
}) {
  const handleApprove = useCallback(() => {
    if (plan && onApprove) {
      onApprove(plan);
    }
  }, [plan, onApprove]);

  const handleModify = useCallback(() => {
    if (plan && onModify) {
      onModify(plan);
    }
  }, [plan, onModify]);

  // Map our state to Confirmation component state
  const getConfirmationState = () => {
    if (approvalState === 'approved') return 'output-available';
    if (approvalState === 'rejected') return 'output-denied';
    return 'approval-requested';
  };

  return (
    <div className="my-4">
      <Confirmation
        state={getConfirmationState()}
        approval={{ 
          id: 'flow-approval', 
          approved: approvalState === 'approved' ? true : approvalState === 'rejected' ? false : undefined 
        }}
        className="border-2 border-primary/20"
      >
        <ConfirmationTitle className="text-base font-medium">
          {confirm.content || `Ready to generate ${plan?.tasks.length || 0} emails?`}
        </ConfirmationTitle>
        
        <ConfirmationActions>
          <ConfirmationAction 
            variant="outline"
            onClick={handleModify}
            disabled={isGenerating}
          >
            Let me modify
          </ConfirmationAction>
          <ConfirmationAction 
            onClick={handleApprove}
            disabled={isGenerating}
            className="bg-primary hover:bg-primary/90"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              'Approve & Generate'
            )}
          </ConfirmationAction>
        </ConfirmationActions>

        <ConfirmationAccepted>
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Flow approved! Generating emails...
          </div>
        </ConfirmationAccepted>
      </Confirmation>
    </div>
  );
});

/**
 * Main component that parses content and renders appropriate UI
 */
export const FlowUIRenderer = memo(function FlowUIRenderer({
  content,
  onSuggestionClick,
  onApprove,
  onModify,
  isGenerating = false,
  approvalState = 'pending',
}: FlowUIRendererProps) {
  const parsed = parseFlowContent(content);

  // If no flow elements, just render as markdown
  if (!parsed.hasFlowElements) {
    return (
      <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="flow-ui-content space-y-2">
      {parsed.segments.map((segment, index) => {
        switch (segment.type) {
          case 'text':
            return (
              <div key={index} className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>{segment.content}</ReactMarkdown>
              </div>
            );
          
          case 'suggestions':
            return (
              <SuggestionsRenderer
                key={index}
                suggestions={segment.data as FlowSuggestion[]}
                onSuggestionClick={onSuggestionClick}
              />
            );
          
          case 'plan':
            return (
              <PlanRenderer
                key={index}
                plan={segment.data as FlowPlan}
                isGenerating={isGenerating}
              />
            );
          
          case 'confirm':
            return (
              <ConfirmRenderer
                key={index}
                confirm={segment.data as FlowConfirm}
                plan={parsed.plan}
                onApprove={onApprove}
                onModify={onModify}
                isGenerating={isGenerating}
                approvalState={approvalState}
              />
            );
          
          default:
            return null;
        }
      })}
    </div>
  );
});

export default FlowUIRenderer;


