'use client';

import { Message } from '@/types';

interface PlanningStageIndicatorProps {
  messages: Message[];
}

type PlanningStage = 'discovery' | 'strategy' | 'ready';

export default function PlanningStageIndicator({ messages }: PlanningStageIndicatorProps) {
  // Detect if this is actually email planning or just general questions
  const isEmailPlanning = (): boolean => {
    if (messages.length === 0) return false;
    
    // Keywords that suggest email planning
    const planningKeywords = [
      'email', 'campaign', 'promote', 'announce', 'launch', 'sale',
      'newsletter', 'send', 'subject', 'cta', 'conversion', 'outline',
      'structure', 'plan', 'strategy', 'messaging', 'approach'
    ];
    
    // Check user messages for planning intent
    const userMessages = messages.filter(m => m.role === 'user');
    const conversationText = userMessages.map(m => m.content.toLowerCase()).join(' ');
    
    // If multiple planning keywords appear, it's likely email planning
    const keywordMatches = planningKeywords.filter(keyword => 
      conversationText.includes(keyword)
    ).length;
    
    return keywordMatches >= 2 || messages.length >= 6; // Either clear intent or longer conversation
  };

  // Determine current stage based on message count and content
  const determineStage = (): PlanningStage => {
    const messageCount = messages.length;
    
    if (messageCount === 0) return 'discovery';
    if (messageCount <= 4) return 'discovery';
    if (messageCount <= 8) return 'strategy';
    return 'ready';
  };

  // Don't show indicator for simple Q&A - only for actual planning
  if (!isEmailPlanning()) {
    return null;
  }

  const currentStage = determineStage();
  const messageCount = messages.length;

  const stages = [
    {
      id: 'discovery',
      name: 'Discovery',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: 'Understanding goals & audience',
      active: currentStage === 'discovery',
      completed: ['strategy', 'ready'].includes(currentStage),
    },
    {
      id: 'strategy',
      name: 'Strategy',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      description: 'Building structure & approach',
      active: currentStage === 'strategy',
      completed: currentStage === 'ready',
    },
    {
      id: 'ready',
      name: 'Ready',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: 'Ready to create email',
      active: currentStage === 'ready',
      completed: false,
    },
  ];

  if (messageCount === 0) return null;

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Planning Session</span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
          {messageCount} {messageCount === 1 ? 'exchange' : 'exchanges'}
        </span>
      </div>

      {/* Stage Progress */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 mx-6"></div>
        <div 
          className="absolute top-5 left-0 h-0.5 bg-blue-500 dark:bg-blue-400 mx-6 transition-all duration-500"
          style={{ 
            width: currentStage === 'discovery' ? '0%' : currentStage === 'strategy' ? '50%' : '100%'
          }}
        ></div>

        {/* Stage Items */}
        <div className="relative flex items-center justify-between">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex flex-col items-center" style={{ flex: 1 }}>
              {/* Stage Circle */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10
                  ${stage.completed
                    ? 'bg-blue-500 dark:bg-blue-400 border-blue-500 dark:border-blue-400 text-white'
                    : stage.active
                    ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                  }
                `}
              >
                {stage.completed ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stage.icon
                )}
              </div>

              {/* Stage Label */}
              <div className="mt-2 text-center">
                <p
                  className={`
                    text-xs font-medium transition-colors
                    ${stage.active
                      ? 'text-blue-600 dark:text-blue-400'
                      : stage.completed
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  {stage.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 max-w-[100px] mx-auto">
                  {stage.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage Hint */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-900 dark:text-blue-100">
          {currentStage === 'discovery' && (
            <>
              <strong>💡 Discovery Phase:</strong> Share your ideas and answer questions about your email's purpose, audience, and goals.
            </>
          )}
          {currentStage === 'strategy' && (
            <>
              <strong>📋 Strategy Phase:</strong> Work together to outline the structure, messaging approach, and key points for your email.
            </>
          )}
          {currentStage === 'ready' && (
            <>
              <strong>✅ Ready to Generate:</strong> You've created a solid plan! Use the "Transfer Plan" button below to move to Email Copy mode and generate your email.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

