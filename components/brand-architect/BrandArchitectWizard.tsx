'use client';

import React from 'react';
import { BrandArchitectProvider, useBrandArchitect } from './BrandArchitectContext';
import IngestionStep from './IngestionStep';
import ChatInterviewStep from './ChatInterviewStep';
import CalibrationStep from './CalibrationStep';
import ReviewStep from './ReviewStep';
import { WizardStep } from '@/types/brand-architect';

interface BrandArchitectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (profile: any) => void;
  isPage?: boolean;
}

const StepIndicator = () => {
  const { state } = useBrandArchitect();
  const steps: WizardStep[] = ['ingestion', 'interview', 'calibration', 'review'];
  
  const currentIndex = steps.indexOf(state.currentStep);

  return (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              index <= currentIndex
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {index + 1}
          </div>
          <span
            className={`ml-2 text-sm font-medium capitalize ${
              index <= currentIndex
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {step}
          </span>
          {index < steps.length - 1 && (
            <div
              className={`w-12 h-0.5 mx-2 ${
                index < currentIndex ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

const WizardContent = ({ onComplete }: { onComplete: (profile: any) => void }) => {
  const { state } = useBrandArchitect();

  switch (state.currentStep) {
    case 'ingestion':
      return <IngestionStep />;
    case 'interview':
      return <ChatInterviewStep />;
    case 'calibration':
      return <CalibrationStep />;
    case 'review':
      return <ReviewStep onComplete={onComplete} />;
    default:
      return null;
  }
};

const BrandArchitectWizardInner = ({ isOpen, onClose, onComplete, isPage = false }: BrandArchitectWizardProps) => {
  if (!isOpen) return null;

  const containerClasses = isPage
    ? "min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col"
    : "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4";

  const cardClasses = isPage
    ? "flex-1 max-w-6xl mx-auto w-full bg-white dark:bg-gray-900 shadow-xl my-8 rounded-xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800"
    : "bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden";

  return (
    <div className={containerClasses}>
      {isPage && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
           <div className="max-w-6xl mx-auto flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-2xl">🏗️</span> Brand Voice Architect
              </h1>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Exit to Brand
              </button>
           </div>
        </div>
      )}

      <div className={cardClasses}>
        {/* Header (only for modal mode) */}
        {!isPage && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-2xl">🏗️</span> Brand Voice Architect
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Progress Bar */}
        <div className="px-6 pt-6 pb-2 bg-gray-50 dark:bg-gray-900/50">
          <StepIndicator />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950">
          <div className="max-w-4xl mx-auto h-full">
             <WizardContent onComplete={onComplete} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function BrandArchitectWizard(props: BrandArchitectWizardProps) {
  return (
    <BrandArchitectProvider>
      <BrandArchitectWizardInner {...props} />
    </BrandArchitectProvider>
  );
}
