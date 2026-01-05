'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '@/types';
import { ConversationMode } from '@/types';
import { PERSONAL_AI_INFO } from '@/lib/personal-ai';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  prompt: string;
  mode: ConversationMode;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'strategy',
    title: 'Build a strategy',
    description: 'Plan campaigns',
    icon: '📊',
    prompt: 'Help me build a marketing strategy for {brand}. I want to plan out campaigns and content for the upcoming period.',
    mode: 'planning',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'ideas',
    title: 'Generate ideas',
    description: 'Get creative',
    icon: '💡',
    prompt: 'Generate 10 creative email campaign ideas for {brand}. Focus on engagement and conversions.',
    mode: 'planning',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'flow',
    title: 'Create a flow',
    description: 'Automation',
    icon: '⚡',
    prompt: 'Help me create an email automation flow for {brand}. Let\'s map out the sequence and triggers.',
    mode: 'planning',
    color: 'from-violet-500 to-purple-500',
  },
  {
    id: 'email',
    title: 'Write an email',
    description: 'Single email',
    icon: '✉️',
    prompt: 'Help me write a promotional email for {brand}. I want it to be engaging and drive action.',
    mode: 'email_copy',
    color: 'from-emerald-500 to-teal-500',
  },
];

interface QuickActionPresetsProps {
  brands: Brand[];
  selectedBrandId: string;
}

export default function QuickActionPresets({ brands, selectedBrandId }: QuickActionPresetsProps) {
  const router = useRouter();

  const selectedBrand = useMemo(() => {
    if (selectedBrandId === PERSONAL_AI_INFO.id) {
      return { name: 'my business' };
    }
    return brands.find(b => b.id === selectedBrandId) || { name: 'my business' };
  }, [brands, selectedBrandId]);

  const handleActionClick = (action: QuickAction) => {
    const prompt = action.prompt.replace('{brand}', selectedBrand.name);
    const params = new URLSearchParams();
    params.set('initialPrompt', prompt);
    params.set('mode', action.mode);

    router.push(`/brands/${selectedBrandId}/chat?${params.toString()}`);
  };

  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            className={cn(
              "group relative flex flex-col items-start p-4 text-left rounded-xl cursor-pointer",
              "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800",
              "hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
            )}
          >
            {/* Icon with gradient background on hover */}
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3",
              "bg-gray-100 dark:bg-gray-800",
              "group-hover:bg-gradient-to-br",
              `group-hover:${action.color}`,
              "transition-all duration-200"
            )}>
              <span className="group-hover:scale-110 transition-transform">{action.icon}</span>
            </div>

            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {action.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {action.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
