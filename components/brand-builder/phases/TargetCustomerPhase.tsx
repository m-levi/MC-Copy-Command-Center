'use client';

import React, { useState, useEffect } from 'react';
import { PhaseComponentProps, BuilderMessage } from '@/types/brand-builder';
import { BuilderChat } from '../shared/BuilderChat';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TargetCustomerPhase({
  brandId,
  brandName,
  state,
  onStateChange,
  onPhaseComplete,
  onBack,
}: PhaseComponentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentDraft, setCurrentDraft] = useState(state.draftOutputs.targetCustomer || '');

  // Initialize phase with AI if no messages for this phase
  useEffect(() => {
    const phaseMessages = state.conversationHistory.filter((m) => m.phase === 'customer');
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
          phase: 'customer',
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
        phase: 'customer',
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
          targetCustomer: data.metadata?.suggestedOutput || state.draftOutputs.targetCustomer,
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
      phase: 'customer',
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
          phase: 'customer',
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
        phase: 'customer',
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
          targetCustomer: data.metadata?.suggestedOutput || state.draftOutputs.targetCustomer,
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
    onPhaseComplete('customer', currentDraft);
  };

  const phaseMessages = state.conversationHistory.filter((m) => m.phase === 'customer');

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
                Target Customer
              </h2>
              <p className="text-sm text-gray-500">
                Define who your ideal customer is
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
        placeholder="Tell me more about your customers..."
        currentDraft={currentDraft}
        showApproveButton={!!currentDraft}
        approveLabel="Approve & Continue to Style Guide"
        onApproveOutput={handleApprove}
        quickActions={[
          { label: 'Add demographics', action: 'Can you add more specific demographics like age range and location?' },
          { label: 'Focus on pain points', action: 'Let\'s emphasize their pain points and what problems we solve for them.' },
          { label: 'Looks good!', action: 'This target customer description is accurate. Let\'s continue.' },
        ]}
      />
    </div>
  );
}
