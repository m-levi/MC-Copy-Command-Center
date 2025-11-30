"use client";

import { useState } from 'react';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion';
import { FLOW_TEMPLATES } from '@/lib/flow-templates';
import { FlowType } from '@/types';
import { cn } from '@/lib/utils';

export type FlowBuilderStep = 'template' | 'goal' | 'audience' | 'completed';

interface FlowBuilderMessageProps {
  step: FlowBuilderStep;
  onTemplateSelect: (template: FlowType) => void;
  onGoalSubmit: (goal: string) => void;
  onAudienceSubmit: (audience: string) => void;
}

export function FlowBuilderMessage({
  step,
  onTemplateSelect,
  onGoalSubmit,
  onAudienceSubmit
}: FlowBuilderMessageProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'transactional' | 'promotional' | 'nurture'>('all');
  const [inputValue, setInputValue] = useState('');

  const filteredTemplates = selectedCategory === 'all' 
    ? FLOW_TEMPLATES 
    : FLOW_TEMPLATES.filter(t => t.category === selectedCategory);

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (step === 'goal') {
      onGoalSubmit(inputValue);
    } else if (step === 'audience') {
      onAudienceSubmit(inputValue);
    }
    setInputValue('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (step === 'goal') {
      onGoalSubmit(suggestion);
    } else if (step === 'audience') {
      onAudienceSubmit(suggestion);
    }
  };

  if (step === 'template') {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Message from="assistant">
          <MessageContent>
            <p className="font-medium mb-2">Let's create a new email flow. What type of automation do you need?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onTemplateSelect(template.id as FlowType)}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 hover:border-primary/30 transition-all text-left"
                >
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-muted-foreground">{template.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </MessageContent>
        </Message>
        
        <Suggestions>
          <Suggestion 
            suggestion="All" 
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('all')} 
          />
          <Suggestion 
            suggestion="Transactional" 
            variant={selectedCategory === 'transactional' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('transactional')} 
          />
          <Suggestion 
            suggestion="Nurture" 
            variant={selectedCategory === 'nurture' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('nurture')} 
          />
          <Suggestion 
            suggestion="Promotional" 
            variant={selectedCategory === 'promotional' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('promotional')} 
          />
        </Suggestions>
      </div>
    );
  }

  if (step === 'goal') {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Message from="assistant">
          <MessageContent>
            <p>Great choice. What is the primary goal of this flow?</p>
          </MessageContent>
        </Message>
        
        <form onSubmit={handleInputSubmit} className="flex gap-2 max-w-[80%]">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="e.g., Increase repeat purchases..."
            className="flex-1 bg-background border border-input px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <button 
            type="submit"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            disabled={!inputValue.trim()}
          >
            Next
          </button>
        </form>

        <Suggestions>
          <Suggestion suggestion="Increase conversions" onClick={handleSuggestionClick} />
          <Suggestion suggestion="Educate new users" onClick={handleSuggestionClick} />
          <Suggestion suggestion="Build brand loyalty" onClick={handleSuggestionClick} />
          <Suggestion suggestion="Recover lost revenue" onClick={handleSuggestionClick} />
        </Suggestions>
      </div>
    );
  }

  if (step === 'audience') {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Message from="assistant">
          <MessageContent>
            <p>Understood. Who is the target audience for these emails?</p>
          </MessageContent>
        </Message>

        <form onSubmit={handleInputSubmit} className="flex gap-2 max-w-[80%]">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="e.g., New subscribers who haven't purchased..."
            className="flex-1 bg-background border border-input px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <button 
            type="submit"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            disabled={!inputValue.trim()}
          >
            Finish
          </button>
        </form>

        <Suggestions>
          <Suggestion suggestion="New subscribers" onClick={handleSuggestionClick} />
          <Suggestion suggestion="Repeat customers" onClick={handleSuggestionClick} />
          <Suggestion suggestion="Inactive users" onClick={handleSuggestionClick} />
          <Suggestion suggestion="High-value segments" onClick={handleSuggestionClick} />
        </Suggestions>
      </div>
    );
  }

  return null;
}

