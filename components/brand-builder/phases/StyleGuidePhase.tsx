'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PhaseComponentProps, BuilderMessage, CopySample } from '@/types/brand-builder';
import { BuilderChat } from '../shared/BuilderChat';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function StyleGuidePhase({
  brandId,
  brandName,
  state,
  onStateChange,
  onPhaseComplete,
  onBack,
}: PhaseComponentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentDraft, setCurrentDraft] = useState(state.draftOutputs.copywritingStyleGuide || '');

  // Initialize phase with AI if no messages for this phase
  useEffect(() => {
    const phaseMessages = state.conversationHistory.filter((m) => m.phase === 'style_guide');
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
          phase: 'style_guide',
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
        phase: 'style_guide',
        metadata: data.metadata,
        createdAt: new Date().toISOString(),
      };

      onStateChange({
        ...state,
        conversationHistory: [...state.conversationHistory, assistantMessage],
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
      phase: 'style_guide',
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
          phase: 'style_guide',
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
        phase: 'style_guide',
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
          copywritingStyleGuide: data.metadata?.suggestedOutput || state.draftOutputs.copywritingStyleGuide,
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle copy sample feedback
  const handleCopySampleFeedback = useCallback(async (sampleId: string, feedback: 'approve' | 'tweak' | 'reject') => {
    // Find the sample in messages
    let foundSample: CopySample | null = null;
    for (const msg of state.conversationHistory) {
      if (msg.metadata?.copySamples) {
        const sample = msg.metadata.copySamples.find((s) => s.id === sampleId);
        if (sample) {
          foundSample = sample;
          break;
        }
      }
    }

    if (!foundSample) return;

    let feedbackMessage = '';
    switch (feedback) {
      case 'approve':
        feedbackMessage = `I love this ${foundSample.type.replace('_', ' ')}: "${foundSample.content}" - this captures our voice perfectly!`;
        break;
      case 'tweak':
        feedbackMessage = `The ${foundSample.type.replace('_', ' ')} "${foundSample.content}" is close, but can you adjust it? What would you change?`;
        break;
      case 'reject':
        feedbackMessage = `The ${foundSample.type.replace('_', ' ')} "${foundSample.content}" doesn't feel right for our brand. Let's try a different direction.`;
        break;
    }

    await handleSendMessage(feedbackMessage);
  }, [state.conversationHistory, handleSendMessage]);

  // Approve and continue
  const handleApprove = () => {
    if (!currentDraft.trim()) {
      toast.error('Please wait for a style guide draft to be generated');
      return;
    }
    onPhaseComplete('style_guide', currentDraft);
  };

  const phaseMessages = state.conversationHistory.filter((m) => m.phase === 'style_guide');

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
                Copywriting Style Guide
              </h2>
              <p className="text-sm text-gray-500">
                Develop your brand voice through copy samples
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
        placeholder="Give feedback on the copy samples..."
        currentDraft={currentDraft}
        showApproveButton={!!currentDraft}
        approveLabel="Approve & Continue to Do's & Don'ts"
        onApproveOutput={handleApprove}
        onCopySampleFeedback={handleCopySampleFeedback}
        quickActions={[
          { label: 'Show more samples', action: 'Can you show me more copy samples in different styles?' },
          { label: 'More casual', action: 'These feel too formal. Can we try a more casual, conversational tone?' },
          { label: 'More confident', action: 'I want our copy to sound more confident and bold. Less hedging.' },
          { label: 'Create style guide', action: 'Based on what I\'ve liked, please synthesize this into a concise 1-2 paragraph style guide.' },
        ]}
      />
    </div>
  );
}
