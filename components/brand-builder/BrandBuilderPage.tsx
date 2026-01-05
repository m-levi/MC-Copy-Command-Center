'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Brand } from '@/types';
import {
  BrandBuilderState,
  BuilderPhase,
  BUILDER_PHASES,
  createEmptyBuilderState,
  getNextPhase,
  getBuilderProgress,
  DoOrDont,
} from '@/types/brand-builder';
import { PhaseProgress } from './shared/PhaseProgress';
import { DraftPreview } from './shared/DraftPreview';
import { ResearchPhase } from './phases/ResearchPhase';
import { BrandOverviewPhase } from './phases/BrandOverviewPhase';
import { TargetCustomerPhase } from './phases/TargetCustomerPhase';
import { StyleGuidePhase } from './phases/StyleGuidePhase';
import { DosDontsPhase } from './phases/DosDontsPhase';
import { CompletedView } from './phases/CompletedView';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface BrandBuilderPageProps {
  brandId: string;
}

export function BrandBuilderPage({ brandId }: BrandBuilderPageProps) {
  const router = useRouter();
  const supabase = createClient();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<BrandBuilderState>(createEmptyBuilderState());
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // Load brand and existing state
  useEffect(() => {
    loadBrand();
  }, [brandId]);

  const loadBrand = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (error) throw error;

      setBrand(data);

      // Check for existing builder state
      if (data.brand_builder_state) {
        const existingState = data.brand_builder_state as BrandBuilderState;
        if (existingState.currentPhase !== 'complete' && existingState.conversationHistory.length > 0) {
          setShowResumePrompt(true);
          setState(existingState);
        } else if (existingState.currentPhase === 'complete') {
          setState(existingState);
        }
      }
    } catch (error) {
      logger.error('Error loading brand:', error);
      toast.error('Failed to load brand');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  // Save state to database
  const saveState = useCallback(async (newState: BrandBuilderState) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('brands')
        .update({
          brand_builder_state: {
            ...newState,
            lastUpdatedAt: new Date().toISOString(),
          },
        })
        .eq('id', brandId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error saving builder state:', error);
      toast.error('Failed to save progress');
    } finally {
      setSaving(false);
    }
  }, [brandId, supabase]);

  // Handle state changes with auto-save
  const handleStateChange = useCallback((newState: BrandBuilderState) => {
    setState(newState);
    saveState(newState);
  }, [saveState]);

  // Handle phase completion
  const handlePhaseComplete = useCallback(async (phase: BuilderPhase, output: string | DoOrDont[]) => {
    const nextPhase = getNextPhase(phase);

    // Update drafts based on phase
    const updatedDrafts = { ...state.draftOutputs };
    switch (phase) {
      case 'overview':
        updatedDrafts.brandOverview = output as string;
        break;
      case 'customer':
        updatedDrafts.targetCustomer = output as string;
        break;
      case 'style_guide':
        updatedDrafts.copywritingStyleGuide = output as string;
        break;
      case 'dos_donts':
        updatedDrafts.dosDonts = output as DoOrDont[];
        break;
    }

    const newState: BrandBuilderState = {
      ...state,
      currentPhase: nextPhase || 'complete',
      draftOutputs: updatedDrafts,
      lastUpdatedAt: new Date().toISOString(),
    };

    // If completing, save final outputs to brand
    if (nextPhase === 'complete' || !nextPhase) {
      try {
        const { error } = await supabase
          .from('brands')
          .update({
            brand_overview: updatedDrafts.brandOverview,
            target_customer: updatedDrafts.targetCustomer,
            copywriting_style_guide: updatedDrafts.copywritingStyleGuide,
            brand_builder_state: {
              ...newState,
              currentPhase: 'complete',
            },
          })
          .eq('id', brandId);

        if (error) throw error;
        toast.success('Brand profile saved successfully!');
      } catch (error) {
        logger.error('Error saving final brand data:', error);
        toast.error('Failed to save brand profile');
        return;
      }
    }

    handleStateChange(newState);
  }, [state, brandId, supabase, handleStateChange]);

  // Start fresh
  const handleStartFresh = useCallback(() => {
    const freshState = createEmptyBuilderState();
    setState(freshState);
    setShowResumePrompt(false);
    saveState(freshState);
  }, [saveState]);

  // Resume from saved state
  const handleResume = useCallback(() => {
    setShowResumePrompt(false);
  }, []);

  // Go back to previous phase
  const handleBack = useCallback(() => {
    const phases: BuilderPhase[] = ['research', 'overview', 'customer', 'style_guide', 'dos_donts'];
    const currentIndex = phases.indexOf(state.currentPhase);
    if (currentIndex > 0) {
      const newState = {
        ...state,
        currentPhase: phases[currentIndex - 1],
      };
      handleStateChange(newState);
    }
  }, [state, handleStateChange]);

  // Jump to specific phase for refinement
  const handleJumpToPhase = useCallback((phase: BuilderPhase) => {
    const newState = {
      ...state,
      currentPhase: phase,
    };
    handleStateChange(newState);
  }, [state, handleStateChange]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading Brand Builder...</p>
        </div>
      </div>
    );
  }

  // Brand not found
  if (!brand) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Brand not found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The brand you're looking for doesn't exist or you don't have access.
          </p>
          <Button onClick={() => router.push('/')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Resume prompt
  if (showResumePrompt) {
    const progress = getBuilderProgress(state);
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 max-w-lg w-full p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/30">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome Back!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              You have an unfinished Brand Builder session for <strong>{brand.name}</strong>.
            </p>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>Progress</span>
              <span>{progress}% complete</span>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Currently on: <span className="font-medium text-gray-700 dark:text-gray-300">
                {BUILDER_PHASES.find(p => p.id === state.currentPhase)?.label}
              </span>
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleResume}
              className="w-full py-4 text-base bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30"
            >
              Continue Where You Left Off
            </Button>
            <Button
              variant="outline"
              onClick={handleStartFresh}
              className="w-full py-4 text-base"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Start Fresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render current phase
  const renderPhase = () => {
    const commonProps = {
      brandId,
      brandName: brand.name,
      state,
      onStateChange: handleStateChange,
      onPhaseComplete: handlePhaseComplete,
      onBack: handleBack,
    };

    switch (state.currentPhase) {
      case 'research':
        return <ResearchPhase {...commonProps} />;
      case 'overview':
        return <BrandOverviewPhase {...commonProps} />;
      case 'customer':
        return <TargetCustomerPhase {...commonProps} />;
      case 'style_guide':
        return <StyleGuidePhase {...commonProps} />;
      case 'dos_donts':
        return <DosDontsPhase {...commonProps} />;
      case 'complete':
        return (
          <CompletedView
            brand={brand}
            state={state}
            onRefinePhase={handleJumpToPhase}
            onStartFresh={handleStartFresh}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/brands/${brandId}`)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Brand Builder</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{brand.name}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {saving && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
            <PhaseProgress
              currentPhase={state.currentPhase}
              draftOutputs={state.draftOutputs}
              compact
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Phase Content */}
        <div className="flex-1 overflow-hidden">
          {renderPhase()}
        </div>

        {/* Draft Preview Sidebar - only show if not in research or complete */}
        {state.currentPhase !== 'research' && state.currentPhase !== 'complete' && (
          <DraftPreview
            currentPhase={state.currentPhase}
            draftOutputs={state.draftOutputs}
          />
        )}
      </main>
    </div>
  );
}
