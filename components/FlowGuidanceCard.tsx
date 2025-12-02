'use client';

import { FLOW_TEMPLATES } from '@/lib/flow-templates';
import { FlowTemplate, FlowType } from '@/types';

interface FlowGuidanceCardProps {
  flowType: FlowType | null;
  onPromptSelect?: (prompt: string) => void;
  isLoading?: boolean;
}

const DEFAULT_PROMPTS = [
  'Here is the goal, target audience, and offer for this flow.',
  'Ask me the questions you need to build a strong outline.',
  'Suggest the ideal timing for each email in this flow.'
];

function getFlowTemplate(flowType: FlowType | null): FlowTemplate | null {
  if (!flowType) return null;
  const template = FLOW_TEMPLATES.find((item) => item.id === flowType);
  return template || null;
}

function getFlowPrompts(flowType: FlowType | null, flowName: string): string[] {
  switch (flowType) {
    case 'welcome_series':
      return [
        `Help me welcome new subscribers and introduce the brand across this ${flowName}.`,
        'What should we highlight in email 1 versus email 2?'
      ];
    case 'abandoned_cart':
      return [
        'Emphasize urgency and reassurance to recover abandoned carts.',
        'Recommend incentives we can offer in follow-up emails.'
      ];
    case 'post_purchase':
      return [
        'Suggest ways to build loyalty and drive repeat purchases post-purchase.',
        'How can we incorporate product education after checkout?'
      ];
    case 'winback':
      return [
        'Outline messaging to re-engage inactive customers.',
        'Recommend offers that work best in a win-back series.'
      ];
    case 'product_launch':
      return [
        'Map out hype-building angles for this product launch.',
        'What social proof should we include across the sequence?'
      ];
    case 'educational_series':
      return [
        'Break down a teaching sequence that builds trust week by week.',
        'Suggest content themes that educate while moving toward a purchase.'
      ];
    default:
      return [];
  }
}

export default function FlowGuidanceCard({
  flowType,
  onPromptSelect,
  isLoading = false
}: FlowGuidanceCardProps) {
  const template = getFlowTemplate(flowType);
  const flowName = template?.name ?? 'Automation';
  const flowPrompts = getFlowPrompts(flowType, flowName);
  const allPrompts = [...DEFAULT_PROMPTS, ...flowPrompts];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="px-5 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center text-white text-lg">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              template?.icon ?? '🧠'
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  Preparing your {flowName}
                  <span className="inline-flex">
                    <span className="animate-pulse">.</span>
                    <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
                    <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
                  </span>
                </span>
              ) : (
                `Let's build your ${flowName}`
              )}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {isLoading 
                ? 'Generating questions to understand your flow requirements...'
                : 'Tell me about your goals, target audience, and what you want to achieve with this flow.'
              }
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {/* Loading skeleton for prompts */}
            <div className="grid gap-2 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40"
                >
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {allPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => onPromptSelect?.(prompt)}
                className="group relative text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer bg-gray-50 dark:bg-gray-900/40"
                type="button"
              >
                <span className="block text-xs font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 leading-relaxed">
                  {prompt}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


