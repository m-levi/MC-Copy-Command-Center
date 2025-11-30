"use client";

import { Message, MessageContent } from '@/components/ai-elements/message';
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning';

interface FlowCritiqueProps {
  critique: string;
  isAnalyzing?: boolean;
}

export function FlowCritique({ critique, isAnalyzing = false }: FlowCritiqueProps) {
  if (isAnalyzing) {
    return (
      <Reasoning defaultOpen={true} isStreaming={true}>
        <ReasoningTrigger>Analyzing flow structure...</ReasoningTrigger>
        <ReasoningContent>
          Evaluating timing gaps and content progression against best practices...
        </ReasoningContent>
      </Reasoning>
    );
  }

  if (!critique) return null;

  return (
    <Message from="assistant">
      <MessageContent>
         <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">💡 Suggestion</p>
         <div className="text-sm text-gray-700 dark:text-gray-300">
           {critique}
         </div>
      </MessageContent>
    </Message>
  );
}

