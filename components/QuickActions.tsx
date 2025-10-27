'use client';

import { QuickAction } from '@/types';
import { QUICK_ACTION_PROMPTS } from '@/lib/prompt-templates';

interface QuickActionsProps {
  onActionSelect: (action: QuickAction) => void;
  disabled?: boolean;
}

export default function QuickActions({ onActionSelect, disabled }: QuickActionsProps) {
  const actions: { id: QuickAction; label: string; icon: string; color: string }[] = [
    {
      id: 'make_shorter',
      label: 'Make Shorter',
      icon: '📏',
      color: 'blue',
    },
    {
      id: 'add_urgency',
      label: 'Add Urgency',
      icon: '⚡',
      color: 'orange',
    },
    {
      id: 'change_tone_casual',
      label: 'More Casual',
      icon: '😊',
      color: 'purple',
    },
    {
      id: 'change_tone_professional',
      label: 'More Professional',
      icon: '💼',
      color: 'gray',
    },
    {
      id: 'add_social_proof',
      label: 'Add Social Proof',
      icon: '⭐',
      color: 'yellow',
    },
    {
      id: 'improve_cta',
      label: 'Improve CTAs',
      icon: '🎯',
      color: 'green',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40',
      orange: 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40',
      purple: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40',
      gray: 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700',
      yellow: 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/40',
      green: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40',
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Quick Actions:
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {actions.map(action => (
            <button
              key={action.id}
              onClick={() => onActionSelect(action.id)}
              disabled={disabled}
              className={`
                px-3 py-1.5 rounded-md text-xs font-medium border transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                ${getColorClasses(action.color)}
              `}
              title={QUICK_ACTION_PROMPTS[action.id]}
            >
              <span className="mr-1">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


