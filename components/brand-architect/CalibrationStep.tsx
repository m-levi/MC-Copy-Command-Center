'use client';

import React, { useState } from 'react';
import { useBrandArchitect } from './BrandArchitectContext';
import { CalibrationOption } from '@/types/brand-architect';

export default function CalibrationStep() {
  const { state, dispatch } = useBrandArchitect();
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const currentRound = state.calibrationRounds[state.currentCalibrationRound];

  if (!currentRound) {
    return (
       <div className="flex items-center justify-center h-full text-gray-500">
          Loading calibration...
       </div>
    );
  }

  const handleSelect = (optionId: string) => {
    dispatch({
      type: 'SELECT_CALIBRATION_OPTION',
      payload: { roundIndex: state.currentCalibrationRound, optionId },
    });
  };

  const handleNextRound = () => {
    if (!currentRound.selectedOptionId) return;
    
    dispatch({
        type: 'SET_CALIBRATION_FEEDBACK',
        payload: { roundIndex: state.currentCalibrationRound, feedback }
    });

    setLoading(true);

    // Simulate generating next round or finishing
    setTimeout(() => {
      setLoading(false);
      if (state.currentCalibrationRound < 1) { // Do 2 rounds for demo
         dispatch({
            type: 'NEXT_CALIBRATION_ROUND',
            payload: {
                roundNumber: state.currentCalibrationRound + 2,
                options: [
                    {
                        id: 'C',
                        label: 'Option A',
                        content: "Subject: Quick question for you, [Name]\n\nAre you tired of the same old thing? We were too. That's why we built [Product]. It's not just a tool, it's a revolution. Join the movement.",
                        style_notes: "Bold, challenging, revolutionary."
                    },
                    {
                        id: 'D',
                        label: 'Option B',
                        content: "Subject: Can we help you with something?\n\nHi [Name],\n\nWe noticed you might be looking for a better way to handle [Problem]. We've been there. Our team created [Product] to solve exactly that. Here's how it works...",
                        style_notes: "Helpful, empathetic, problem-aware."
                    }
                ]
            }
         });
         setFeedback('');
      } else {
         // Finish calibration, generate draft profile
         dispatch({ type: 'SET_PROCESSING', payload: true });
         setTimeout(() => {
             dispatch({ type: 'SET_PROCESSING', payload: false });
             dispatch({
                 type: 'SET_DRAFT_PROFILE',
                 payload: {
                     identity: {
                         archetype: "The Sage",
                         core_vibe: "Helpful Authority",
                         mission_statement: "To empower our customers with knowledge and tools."
                     },
                     tonal_settings: {
                         formality: 7,
                         enthusiasm: 5,
                         empathy: 8,
                         humor: 3
                     },
                     linguistics: {
                         do_list: ["Use clear, concise language", "Focus on benefits", "Use 'we' and 'you'"],
                         dont_list: ["No slang", "Avoid excessive exclamation points", "Don't be aggressive"],
                         vocabulary_allow: ["Empower", "Guide", "Solution", "Together"],
                         vocabulary_ban: ["Cheap", "Hack", "Explode", "Crush"],
                         syntax_rules: "Medium sentence length. Professional but accessible grammar."
                     },
                     examples: {
                         generic_rewrite: "Buy our product now. It is good.",
                         on_brand_rewrite: "Discover how our solution can empower you to achieve your goals."
                     }
                 }
             });
             dispatch({ type: 'SET_STEP', payload: 'review' });
         }, 2000);
      }
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Calibration: Round {state.currentCalibrationRound + 1}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Which version sounds more like you?
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 overflow-y-auto px-2">
        {currentRound.options.map((option: CalibrationOption) => {
          const isSelected = currentRound.selectedOptionId === option.id;
          return (
            <div
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={`cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 relative flex flex-col ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg scale-[1.02]'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
              }`}
            >
               {isSelected && (
                <div className="absolute top-4 right-4 bg-blue-500 text-white rounded-full p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              <div className="mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {option.label}
                </span>
              </div>
              <div className="flex-1 prose dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                  {option.content}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 italic">
                  Notes: {option.style_notes}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Make adjustments (Optional)
            </label>
            <input
              type="text"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder='e.g., "Too cheesy, make it darker" or "I like A but less emojis"'
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <div className="flex justify-center">
             <button
                onClick={handleNextRound}
                disabled={!currentRound.selectedOptionId || loading}
                className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
             >
                {loading ? 'Processing...' : 'Confirm Selection'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

