'use client';

import { useState, useEffect } from 'react';
import {
  WIZARD_QUESTIONS,
  WizardAnswers,
  QuestionCategory,
  CATEGORY_INFO,
  getNextQuestion,
  calculateProgress,
  getCategoryProgress,
} from '@/lib/style-guide-wizard';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

interface StyleGuideWizardProps {
  brandId: string;
  brandName: string;
  onComplete: (styleGuide: string) => void;
  onClose: () => void;
  initialStyleGuide?: string;
}

type WizardStep = 'welcome' | 'questions' | 'examples' | 'preview' | 'refine' | 'complete';

export default function StyleGuideWizard({
  brandId,
  brandName,
  onComplete,
  onClose,
  initialStyleGuide,
}: StyleGuideWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [answers, setAnswers] = useState<WizardAnswers>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [examples, setExamples] = useState<Array<{ id: string; type: string; content: string }>>([]);
  const [generatedStyleGuide, setGeneratedStyleGuide] = useState(initialStyleGuide || '');
  const [loading, setLoading] = useState(false);
  const [exampleRatings, setExampleRatings] = useState<Record<string, 'like' | 'dislike'>>({});
  const [refinementRequest, setRefinementRequest] = useState('');

  // Get current question
  const currentQuestion = WIZARD_QUESTIONS[currentQuestionIndex];
  const progress = calculateProgress(answers);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (confirm('Are you sure you want to close the wizard? Your progress will be lost.')) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < WIZARD_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // All questions answered, move to examples
      setCurrentStep('examples');
      generateExamples();
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentStep === 'questions') {
      setCurrentStep('welcome');
    } else if (currentStep === 'examples') {
      setCurrentStep('questions');
      setCurrentQuestionIndex(WIZARD_QUESTIONS.length - 1);
    } else if (currentStep === 'preview') {
      setCurrentStep('examples');
    }
  };

  const generateExamples = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/brands/style-guide-wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          brandName,
          step: 'examples',
          currentAnswers: answers,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setExamples(data.examples || []);
    } catch (error) {
      logger.error('Error generating examples:', error);
      toast.error('Failed to generate examples');
    } finally {
      setLoading(false);
    }
  };

  const generateStyleGuide = async () => {
    setLoading(true);
    setCurrentStep('preview');
    
    try {
      const response = await fetch('/api/brands/style-guide-wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          brandName,
          step: 'generate-guide',
          currentAnswers: answers,
          userFeedback: exampleRatings,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setGeneratedStyleGuide(data.styleGuide || '');
    } catch (error) {
      logger.error('Error generating style guide:', error);
      toast.error('Failed to generate style guide');
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!refinementRequest.trim()) {
      toast.error('Please describe what you\'d like to refine');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/brands/style-guide-wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          brandName,
          step: 'refine',
          currentAnswers: answers,
          existingStyleGuide: generatedStyleGuide,
          requestedRefinement: refinementRequest,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setGeneratedStyleGuide(data.styleGuide || '');
      setRefinementRequest('');
      toast.success('Style guide refined!');
    } catch (error) {
      logger.error('Error refining style guide:', error);
      toast.error('Failed to refine style guide');
    } finally {
      setLoading(false);
    }
  };

  const handleRateExample = (exampleId: string, rating: 'like' | 'dislike') => {
    setExampleRatings(prev => ({
      ...prev,
      [exampleId]: rating,
    }));
  };

  const handleComplete = () => {
    onComplete(generatedStyleGuide);
    toast.success('Style guide created successfully!');
  };

  // Render different steps
  const renderContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center py-12 px-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Build Your Style Guide with AI
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              I'll ask you a series of questions about your brand voice and preferences. Based on your answers, 
              I'll generate example copy and a comprehensive style guide. We'll iterate together until you're 
              completely happy with the results.
            </p>
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-6 mb-8 border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                What to Expect
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 text-left max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>12-15 questions across 5 categories</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>AI-generated examples to preview your voice</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>Iterative refinement until you're satisfied</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>Takes about 5-10 minutes to complete</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setCurrentStep('questions')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              Let's Get Started
            </button>
          </div>
        );

      case 'questions':
        return (
          <div className="py-8 px-8">
            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Question {currentQuestionIndex + 1} of {WIZARD_QUESTIONS.length}
                </span>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {progress}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Category badge */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                <span>{CATEGORY_INFO[currentQuestion.category].icon}</span>
                <span>{CATEGORY_INFO[currentQuestion.category].title}</span>
              </div>
            </div>

            {/* Question */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                {currentQuestion.question}
              </h3>
              {currentQuestion.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {currentQuestion.description}
                </p>
              )}

              {/* Answer input based on type */}
              {currentQuestion.type === 'multiple-choice' && (
                <div className="space-y-3">
                  {currentQuestion.options?.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleAnswer(currentQuestion.id, option)}
                      className={`w-full text-left px-5 py-4 rounded-lg border-2 transition-all ${
                        answers[currentQuestion.id] === option
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{option}</span>
                        {answers[currentQuestion.id] === option && (
                          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'multi-select' && (
                <div className="space-y-3">
                  {currentQuestion.options?.map((option) => {
                    const selected = Array.isArray(answers[currentQuestion.id]) && answers[currentQuestion.id].includes(option);
                    return (
                      <button
                        key={option}
                        onClick={() => {
                          const current = answers[currentQuestion.id] || [];
                          const newValue = selected
                            ? current.filter((v: string) => v !== option)
                            : [...current, option];
                          handleAnswer(currentQuestion.id, newValue);
                        }}
                        className={`w-full text-left px-5 py-4 rounded-lg border-2 transition-all ${
                          selected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{option}</span>
                          {selected && (
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === 'scale' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{currentQuestion.minLabel}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{currentQuestion.maxLabel}</span>
                  </div>
                  <input
                    type="range"
                    min={currentQuestion.min}
                    max={currentQuestion.max}
                    value={answers[currentQuestion.id] || 3}
                    onChange={(e) => handleAnswer(currentQuestion.id, parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-center">
                    <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 rounded-lg font-bold text-lg">
                      {answers[currentQuestion.id] || 3}
                    </div>
                  </div>
                </div>
              )}

              {currentQuestion.type === 'text' && (
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                  placeholder={currentQuestion.placeholder}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                />
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={currentQuestion.required && !answers[currentQuestion.id]}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentQuestionIndex === WIZARD_QUESTIONS.length - 1 ? 'Generate Examples' : 'Next'}
              </button>
            </div>
          </div>
        );

      case 'examples':
        return (
          <div className="py-8 px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Here's Your Voice in Action
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Based on your answers, here are some examples. Rate them to help refine your style guide.
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Generating examples...</p>
              </div>
            ) : (
              <>
                <div className="space-y-6 mb-8">
                  {examples.map((example) => (
                    <div
                      key={example.id}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {example.type}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRateExample(example.id, 'like')}
                            className={`p-2 rounded-lg transition-all ${
                              exampleRatings[example.id] === 'like'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            title="I like this"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRateExample(example.id, 'dislike')}
                            className={`p-2 rounded-lg transition-all ${
                              exampleRatings[example.id] === 'dislike'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            title="Not quite right"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="prose dark:prose-invert max-w-none">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {example.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleBack}
                    className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
                  >
                    Back
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={generateExamples}
                      className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
                    >
                      Generate New Examples
                    </button>
                    <button
                      onClick={generateStyleGuide}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                    >
                      Generate Style Guide
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 'preview':
        return (
          <div className="py-8 px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Your Style Guide is Ready!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Review your generated style guide below. You can edit it directly or request refinements.
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Generating your style guide...</p>
              </div>
            ) : (
              <>
                {/* Style guide preview */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6 max-h-[500px] overflow-y-auto">
                  <textarea
                    value={generatedStyleGuide}
                    onChange={(e) => setGeneratedStyleGuide(e.target.value)}
                    className="w-full min-h-[400px] px-4 py-3 border-0 dark:bg-gray-800 dark:text-gray-100 focus:ring-0 resize-y font-mono text-sm"
                    placeholder="Your style guide will appear here..."
                  />
                </div>

                {/* Refinement section */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Want to refine it?
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                    Tell me what you'd like to change, add, or improve.
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={refinementRequest}
                      onChange={(e) => setRefinementRequest(e.target.value)}
                      placeholder="e.g., Make it more playful, add more examples for CTAs..."
                      className="flex-1 px-4 py-2 border border-blue-300 dark:border-blue-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleRefine}
                      disabled={loading || !refinementRequest.trim()}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Refine
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleBack}
                    className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
                  >
                    Back to Examples
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={!generatedStyleGuide}
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    I'm Happy with This!
                  </button>
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Style Guide Wizard</h2>
              <p className="text-blue-100 text-sm">{brandName}</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to close? Your progress will be lost.')) {
                onClose();
              }
            }}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

