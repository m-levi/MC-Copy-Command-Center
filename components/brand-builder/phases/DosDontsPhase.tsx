'use client';

import React, { useState, useEffect } from 'react';
import { PhaseComponentProps, BuilderMessage, DoOrDont } from '@/types/brand-builder';
import { BuilderChat } from '../shared/BuilderChat';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, XCircle, Plus, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DosDontsPhase({
  brandId,
  brandName,
  state,
  onStateChange,
  onPhaseComplete,
  onBack,
}: PhaseComponentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<DoOrDont[]>(state.draftOutputs.dosDonts || []);
  const [newItemType, setNewItemType] = useState<'do' | 'dont'>('do');
  const [newItemContent, setNewItemContent] = useState('');

  // Initialize phase with AI if no messages for this phase
  useEffect(() => {
    const phaseMessages = state.conversationHistory.filter((m) => m.phase === 'dos_donts');
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
          phase: 'dos_donts',
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
        phase: 'dos_donts',
        metadata: data.metadata,
        createdAt: new Date().toISOString(),
      };

      if (data.metadata?.suggestedDosDonts) {
        setItems(data.metadata.suggestedDosDonts);
      }

      onStateChange({
        ...state,
        conversationHistory: [...state.conversationHistory, assistantMessage],
        draftOutputs: {
          ...state.draftOutputs,
          dosDonts: data.metadata?.suggestedDosDonts || state.draftOutputs.dosDonts,
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
      phase: 'dos_donts',
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
          phase: 'dos_donts',
          userMessage: message,
          conversationHistory: newHistory,
          currentDrafts: { ...state.draftOutputs, dosDonts: items },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get response');

      const assistantMessage: BuilderMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        phase: 'dos_donts',
        metadata: data.metadata,
        createdAt: new Date().toISOString(),
      };

      if (data.metadata?.suggestedDosDonts) {
        setItems(data.metadata.suggestedDosDonts);
      }

      onStateChange({
        ...state,
        conversationHistory: [...newHistory, assistantMessage],
        draftOutputs: {
          ...state.draftOutputs,
          dosDonts: data.metadata?.suggestedDosDonts || items,
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  // Add new item manually
  const handleAddItem = () => {
    if (!newItemContent.trim()) return;

    const newItem: DoOrDont = {
      id: crypto.randomUUID(),
      type: newItemType,
      content: newItemContent.trim(),
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setNewItemContent('');

    onStateChange({
      ...state,
      draftOutputs: {
        ...state.draftOutputs,
        dosDonts: updatedItems,
      },
    });
  };

  // Remove item
  const handleRemoveItem = (id: string) => {
    const updatedItems = items.filter((item) => item.id !== id);
    setItems(updatedItems);

    onStateChange({
      ...state,
      draftOutputs: {
        ...state.draftOutputs,
        dosDonts: updatedItems,
      },
    });
  };

  // Complete phase
  const handleComplete = async () => {
    if (items.length === 0) {
      toast.error('Please add at least one do or don\'t');
      return;
    }

    // Save dos/donts to Supermemory
    setIsLoading(true);

    try {
      for (const item of items) {
        await fetch(`/api/brands/${brandId}/memories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.type === 'do' ? 'DO' : "DON'T",
            content: item.content,
            category: 'dos_donts',
          }),
        });
      }

      onPhaseComplete('dos_donts', items);
    } catch (error) {
      toast.error('Failed to save dos and don\'ts');
    } finally {
      setIsLoading(false);
    }
  };

  const phaseMessages = state.conversationHistory.filter((m) => m.phase === 'dos_donts');
  const dos = items.filter((item) => item.type === 'do');
  const donts = items.filter((item) => item.type === 'dont');

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
                Do's & Don'ts
              </h2>
              <p className="text-sm text-gray-500">
                Set clear guidelines for your brand communication
              </p>
            </div>
          </div>
          {items.length > 0 && (
            <Button
              onClick={handleComplete}
              disabled={isLoading}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Complete Brand Profile
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Items Panel */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto p-4">
          {/* Add New Item */}
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Add New
            </h3>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setNewItemType('do')}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                  newItemType === 'do'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                )}
              >
                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                Do
              </button>
              <button
                onClick={() => setNewItemType('dont')}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                  newItemType === 'dont'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                )}
              >
                <XCircle className="w-4 h-4 inline mr-1" />
                Don't
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newItemContent}
                onChange={(e) => setNewItemContent(e.target.value)}
                placeholder={newItemType === 'do' ? 'Use conversational language' : 'Never mention competitors'}
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              />
              <Button onClick={handleAddItem} size="sm" disabled={!newItemContent.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Do's */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Do's ({dos.length})
            </h3>
            <div className="space-y-2">
              {dos.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg group"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-emerald-800 dark:text-emerald-300 flex-1">
                    {item.content}
                  </span>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {dos.length === 0 && (
                <p className="text-sm text-gray-400 italic">No do's added yet</p>
              )}
            </div>
          </div>

          {/* Don'ts */}
          <div>
            <h3 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Don'ts ({donts.length})
            </h3>
            <div className="space-y-2">
              {donts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg group"
                >
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-red-800 dark:text-red-300 flex-1">
                    {item.content}
                  </span>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {donts.length === 0 && (
                <p className="text-sm text-gray-400 italic">No don'ts added yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1">
          <BuilderChat
            messages={phaseMessages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder="Ask for suggestions or add context..."
            quickActions={[
              { label: 'Suggest more do\'s', action: 'Can you suggest more things we should do in our brand communications?' },
              { label: 'Suggest more don\'ts', action: 'What are some common mistakes we should avoid in our copywriting?' },
              { label: 'Words to avoid', action: 'What specific words or phrases should we never use?' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
