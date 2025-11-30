"use client";

import { useState } from 'react';
import { 
  Plan, 
  PlanHeader, 
  PlanTitle, 
  PlanDescription, 
  PlanContent, 
  PlanTrigger 
} from '@/components/ai-elements/plan';
import { 
  Task, 
  TaskTrigger, 
  TaskContent, 
  TaskItem 
} from '@/components/ai-elements/task';
import { 
  Reasoning, 
  ReasoningTrigger, 
  ReasoningContent 
} from '@/components/ai-elements/reasoning';
import { 
  Confirmation, 
  ConfirmationTitle, 
  ConfirmationActions, 
  ConfirmationAction 
} from '@/components/ai-elements/confirmation';
import { Panel } from '@/components/ai-elements/panel';
import FlowchartViewer from '@/components/FlowchartViewer';
import { FlowOutlineData, FlowOutlineEmail } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { generateMermaidChart } from '@/lib/mermaid-generator';

interface FlowOutlinePlanProps {
  initialOutline: FlowOutlineData;
  onApprove: (outline: FlowOutlineData) => Promise<void>;
  isGenerating?: boolean;
  aiReasoning?: string; // Optional reasoning from AI about the plan
}

export function FlowOutlinePlan({
  initialOutline,
  onApprove,
  isGenerating = false,
  aiReasoning
}: FlowOutlinePlanProps) {
  const [outline, setOutline] = useState<FlowOutlineData>(initialOutline);
  const [editingEmailIndex, setEditingEmailIndex] = useState<number | null>(null);
  const [showFlowchart, setShowFlowchart] = useState(false);

  // Re-generate chart when outline changes
  const mermaidChart = generateMermaidChart(outline);

  const handleEmailChange = (index: number, field: keyof FlowOutlineEmail, value: string) => {
    const newEmails = [...outline.emails];
    newEmails[index] = {
      ...newEmails[index],
      [field]: value
    };
    setOutline({
      ...outline,
      emails: newEmails
    });
  };

  const handleRemoveEmail = (index: number) => {
    const newEmails = outline.emails.filter((_, i) => i !== index);
    // Re-assign sequences
    const reindexedEmails = newEmails.map((email, i) => ({
      ...email,
      sequence: i + 1
    }));
    setOutline({
      ...outline,
      emails: reindexedEmails
    });
  };

  const handleAddEmail = () => {
    const newSequence = outline.emails.length + 1;
    const newEmail: FlowOutlineEmail = {
      sequence: newSequence,
      title: `Email ${newSequence}`,
      purpose: 'New email purpose',
      timing: '1 day after previous',
      keyPoints: [],
      cta: 'Learn More',
      emailType: 'design'
    };
    setOutline({
      ...outline,
      emails: [...outline.emails, newEmail]
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {aiReasoning && (
        <Reasoning defaultOpen={true}>
          <ReasoningTrigger>AI Analysis & Strategy</ReasoningTrigger>
          <ReasoningContent>{aiReasoning}</ReasoningContent>
        </Reasoning>
      )}

      <Plan defaultOpen={true} className="border-2 border-blue-100 dark:border-blue-900/30">
        <PlanHeader>
          <div className="space-y-1">
            <PlanTitle>{outline.flowName}</PlanTitle>
            <PlanDescription>
              {`${outline.emails.length} emails • ${outline.goal}`}
            </PlanDescription>
          </div>
          <PlanTrigger />
        </PlanHeader>
        
        <PlanContent className="space-y-4">
          {/* Visualization Toggle */}
          <div className="flex justify-end">
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => setShowFlowchart(!showFlowchart)}
               className="text-xs"
             >
               {showFlowchart ? 'Hide Chart' : 'Show Flowchart'}
             </Button>
          </div>

          {showFlowchart && (
            <Panel className="h-[300px] relative">
              <FlowchartViewer 
                mermaidChart={mermaidChart}
                flowName={outline.flowName}
                isVisible={true}
                onToggle={() => {}}
              />
            </Panel>
          )}

          {/* Tasks / Emails */}
          <div className="space-y-2">
            {outline.emails.map((email, index) => (
              <Task key={index} defaultOpen={false} className="border rounded-md bg-card">
                <TaskTrigger title={`${index + 1}. ${email.title}`}>
                  <div className="flex flex-1 items-center justify-between pr-4">
                    <span className="text-sm font-medium">
                      {index + 1}. {email.title}
                    </span>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                      {email.timing}
                    </span>
                  </div>
                </TaskTrigger>
                <TaskContent>
                  <div className="grid gap-4 p-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Title</label>
                        <Input 
                          value={email.title} 
                          onChange={(e) => handleEmailChange(index, 'title', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Timing</label>
                        <Input 
                          value={email.timing} 
                          onChange={(e) => handleEmailChange(index, 'timing', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Purpose</label>
                      <Textarea 
                        value={email.purpose} 
                        onChange={(e) => handleEmailChange(index, 'purpose', e.target.value)}
                        className="h-20 resize-none"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        {email.emailType}
                      </span>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleRemoveEmail(index)}
                        className="h-8 text-xs"
                      >
                        Remove Email
                      </Button>
                    </div>
                  </div>
                </TaskContent>
              </Task>
            ))}
          </div>

          <Button 
            variant="ghost" 
            className="w-full border-dashed border-2 py-6 text-muted-foreground hover:text-foreground"
            onClick={handleAddEmail}
          >
            + Add Email Step
          </Button>

          {/* Approval Confirmation */}
          <Confirmation
            state="output-available"
            approval={{ id: 'flow-approval', approved: false }}
            className="mt-6 border-t pt-4"
          >
            <ConfirmationTitle>
              Ready to generate {outline.emails.length} emails?
            </ConfirmationTitle>
            <ConfirmationActions>
               <ConfirmationAction 
                 onClick={() => onApprove(outline)} 
                 disabled={isGenerating}
                 className="bg-blue-600 hover:bg-blue-700 text-white"
               >
                 {isGenerating ? 'Generating...' : 'Approve & Generate Flow'}
               </ConfirmationAction>
            </ConfirmationActions>
          </Confirmation>
        </PlanContent>
      </Plan>
    </div>
  );
}

