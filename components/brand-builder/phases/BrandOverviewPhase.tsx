'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { PhaseComponentProps, BuilderMessage } from '@/types/brand-builder';
import { BuilderChat } from '../shared/BuilderChat';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BrandOverviewPhase({
  brandId,
  brandName,
  state,
  onStateChange,
  onPhaseComplete,
  onBack,
}: PhaseComponentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentDraft, setCurrentDraft] = useState(state.draftOutputs.brandOverview || '');

  // Initialize phase with AI if no messages for this phase
  useEffect(() => {
    const phaseMessages = state.conversationHistory.filter((m) => m.phase === 'overview');
    if (phaseMessages.length === 0) {
      initializePhase();
    }
  }, []);

  const initializePhase = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/brand-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          action: 'start_phase',
          phase: 'overview',
          conversationHistory: state.conversationHistory,
          currentDrafts: state.draftOutputs,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start phase');

      const assistantMessage: BuilderMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        phase: 'overview',
        metadata: data.metadata,
        createdAt: new Date().toISOString(),
      };

      if (data.metadata?.suggestedOutput) {
        setCurrentDraft(data.metadata.suggestedOutput);
      }

      onStateChange({
        ...state,
        conversationHistory: [...state.conversationHistory, assistantMessage],
        draftOutputs: {
          ...state.draftOutputs,
          brandOverview: data.metadata?.suggestedOutput || state.draftOutputs.brandOverview,
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start phase');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user message
  const handleSendMessage = async (message: string) => {
    const userMessage: BuilderMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      phase: 'overview',
      createdAt: new Date().toISOString(),
    };

    const newHistory = [...state.conversationHistory, userMessage];
    onStateChange({
      ...state,
      conversationHistory: newHistory,
    });

    setIsLoading(true);

    try {
      const response = await fetch('/api/brand-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          action: 'continue',
          phase: 'overview',
          userMessage: message,
          conversationHistory: newHistory,
          currentDrafts: state.draftOutputs,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get response');

      const assistantMessage: BuilderMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        phase: 'overview',
        metadata: data.metadata,
        createdAt: new Date().toISOString(),
      };

      if (data.metadata?.suggestedOutput) {
        setCurrentDraft(data.metadata.suggestedOutput);
      }

      onStateChange({
        ...state,
        conversationHistory: [...newHistory, assistantMessage],
        draftOutputs: {
          ...state.draftOutputs,
          brandOverview: data.metadata?.suggestedOutput || state.draftOutputs.brandOverview,
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  // Approve and continue
  const handleApprove = () => {
    if (!currentDraft.trim()) {
      toast.error('Please wait for a draft to be generated');
      return;
    }
    onPhaseComplete('overview', currentDraft);
  };

  const phaseMessages = state.conversationHistory.filter((m) => m.phase === 'overview');

  return (
    <div className="flex flex-col h-full">
      {/* Phase Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Brand Overview
              </h2>
              <p className="text-sm text-gray-500">
                Create a concise 1-2 paragraph description of your brand
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat */}
      <BuilderChat
        messages={phaseMessages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        placeholder="Tell me what to adjust in the overview..."
        currentDraft={currentDraft}
        showApproveButton={!!currentDraft}
        approveLabel="Approve & Continue to Target Customer"
        onApproveOutput={handleApprove}
        quickActions={[
          { label: 'Make it shorter', action: 'Please make the overview more concise - aim for 2-3 sentences max.' },
          { label: 'More specific', action: 'Can you make it more specific about what makes us unique?' },
          { label: 'Sounds good!', action: 'This overview captures our brand well. Let\'s move on.' },
        ]}
      />
    </div>
  );
}
