/**
 * Invoke Specialist Tool
 *
 * Allows the orchestrator to invoke specialist agents for specific tasks.
 * This is the core tool that enables multi-agent orchestration.
 */

import { z } from 'zod';
import { tool } from 'ai';
import type { SpecialistType, SpecialistOutputType } from '@/types/orchestrator';

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Context schema for passing information to specialists
 */
const SpecialistContextSchema = z.object({
  // Relevant artifacts to reference
  artifacts: z.array(z.object({
    id: z.string().describe('Artifact ID'),
    kind: z.string().describe('Artifact kind (email, spreadsheet, etc.)'),
    title: z.string().describe('Artifact title'),
    summary: z.string().optional().describe('Brief summary of the artifact content'),
  })).optional().describe('Artifacts the specialist should reference'),

  // Relevant products
  products: z.array(z.object({
    id: z.string().describe('Product ID'),
    name: z.string().describe('Product name'),
    description: z.string().optional().describe('Product description'),
    price: z.number().optional().describe('Product price'),
  })).optional().describe('Products relevant to the task'),

  // Output from a previous specialist
  previousOutput: z.object({
    specialist: z.string().describe('Previous specialist type'),
    output: z.string().describe('Summary of previous output'),
    artifactIds: z.array(z.string()).optional().describe('Artifact IDs created'),
  }).optional().describe('Output from a previous specialist in the workflow'),

  // User preferences for this task
  preferences: z.record(z.string(), z.string()).optional().describe('User preferences (tone, length, style, etc.)'),

  // Additional context
  additionalContext: z.string().optional().describe('Any additional context for the specialist'),
});

/**
 * Main tool input schema
 */
const InvokeSpecialistInputSchema = z.object({
  specialist: z.enum([
    'email_writer',
    'calendar_planner',
    'subject_line_expert',
    'competitor_analyst',
    'brand_voice_coach',
    'creative_director',
    'data_interpreter',
    'flow_architect',
  ] as const).describe('Which specialist agent to invoke'),

  task: z.string().describe('Clear description of what you want the specialist to do'),

  context: SpecialistContextSchema.optional().describe('Context to pass to the specialist'),

  expectedOutput: z.enum([
    'artifact',        // Specialist should create an artifact
    'analysis',        // Specialist should provide analysis/insights
    'recommendations', // Specialist should give recommendations
    'draft',           // Specialist should create a draft for review
    'plan',            // Specialist should create a plan/outline
  ] as const).optional().describe('What type of output you expect from the specialist'),
});

export type InvokeSpecialistInput = z.infer<typeof InvokeSpecialistInputSchema>;

// ============================================================================
// TOOL DEFINITION
// ============================================================================

const invokeSpecialistDescription = `Invoke a specialist agent to handle a specific task.

Specialists are expert agents optimized for specific types of work. Use this when a task requires deep expertise in a particular area.

## AVAILABLE SPECIALISTS

**calendar_planner**: Plans email calendars and creates briefs
- Best for: Planning monthly emails, creating campaign calendars, generating email briefs
- Output: Calendar spreadsheet + email brief artifacts

**email_writer**: Writes email copy with A/B/C versions
- Best for: Writing promotional emails, creating welcome emails, drafting newsletters
- Output: Email artifacts with multiple versions

**subject_line_expert**: Creates subject line options
- Best for: Generating subject lines, improving open rates, A/B testing
- Output: Subject line artifacts

**flow_architect**: Designs email automations
- Best for: Welcome sequences, abandoned cart flows, post-purchase journeys
- Output: Flow artifacts with timing and triggers

**competitor_analyst**: Analyzes competitor strategies
- Best for: Competitor research, market analysis, identifying opportunities
- Output: Analysis documents

**brand_voice_coach**: Develops brand voice guidelines
- Best for: Defining voice, creating style guides, reviewing for consistency
- Output: Voice guidelines

**creative_director**: Creates campaign concepts
- Best for: Brainstorming ideas, developing themes, creative direction
- Output: Concept documents

**data_interpreter**: Analyzes performance data
- Best for: Analyzing metrics, identifying trends, optimization recommendations
- Output: Analysis with insights

## WHEN TO USE

Use invoke_specialist when:
- Task requires deep expertise in a specific area
- Task has established best practices (flows, calendars, copy)
- Task benefits from specialized output format
- You need high-quality, structured output

Handle yourself when:
- Simple questions or clarifications
- Quick edits or feedback
- General conversation
- Synthesizing outputs from specialists

## EXAMPLE USAGE

**Planning a month of emails:**
{
  "specialist": "calendar_planner",
  "task": "Create a comprehensive January email calendar for the brand. Include a Winter Sale (starting Jan 5), new arrivals announcement, and regular content emails. Plan for 8-10 total sends.",
  "context": {
    "preferences": {
      "emailFrequency": "2-3 per week",
      "balancePreference": "60% promotional, 40% content"
    }
  },
  "expectedOutput": "plan"
}

**Writing an email from a brief:**
{
  "specialist": "email_writer",
  "task": "Write the Winter Sale Launch email based on the approved brief. Focus on creating urgency while maintaining brand voice.",
  "context": {
    "artifacts": [
      {
        "id": "brief_abc123",
        "kind": "email_brief",
        "title": "Jan 5 - Winter Sale Launch",
        "summary": "30% off sitewide, emphasize limited time, target all subscribers"
      }
    ]
  },
  "expectedOutput": "artifact"
}`;

/**
 * The invoke_specialist tool for the orchestrator
 *
 * This tool allows the orchestrator to call specialist agents.
 * The actual specialist execution happens in the chat route handler.
 */
export const invokeSpecialistTool = tool({
  description: invokeSpecialistDescription,
  inputSchema: InvokeSpecialistInputSchema,
  execute: async (input: InvokeSpecialistInput) => {
    // The actual execution is handled by the chat route
    // This returns a pending status that triggers specialist invocation
    return {
      status: 'pending' as const,
      specialist: input.specialist,
      task: input.task,
      expectedOutput: input.expectedOutput,
      message: `Invoking ${input.specialist} specialist...`,
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build a task prompt for a specialist based on the invoke input
 */
export function buildSpecialistTaskPrompt(input: InvokeSpecialistInput): string {
  const parts: string[] = [];

  // Main task
  parts.push(`## TASK\n\n${input.task}`);

  // Context
  if (input.context) {
    // Previous output
    if (input.context.previousOutput) {
      parts.push(`## PREVIOUS WORK\n\nThe ${input.context.previousOutput.specialist} specialist completed work that you should build on:\n\n${input.context.previousOutput.output}`);
    }

    // Artifacts to reference
    if (input.context.artifacts?.length) {
      const artifactList = input.context.artifacts
        .map(a => `- **${a.title}** (${a.kind}): ${a.summary || 'No summary'}`)
        .join('\n');
      parts.push(`## REFERENCE ARTIFACTS\n\n${artifactList}`);
    }

    // Products
    if (input.context.products?.length) {
      const productList = input.context.products
        .map(p => `- **${p.name}**: ${p.description || 'No description'}${p.price ? ` - $${p.price}` : ''}`)
        .join('\n');
      parts.push(`## RELEVANT PRODUCTS\n\n${productList}`);
    }

    // Preferences
    if (input.context.preferences && Object.keys(input.context.preferences).length > 0) {
      const prefList = Object.entries(input.context.preferences)
        .map(([k, v]) => `- **${k}**: ${v}`)
        .join('\n');
      parts.push(`## USER PREFERENCES\n\n${prefList}`);
    }

    // Additional context
    if (input.context.additionalContext) {
      parts.push(`## ADDITIONAL CONTEXT\n\n${input.context.additionalContext}`);
    }
  }

  // Expected output
  if (input.expectedOutput) {
    const outputInstructions: Record<SpecialistOutputType, string> = {
      artifact: 'Create an artifact with your output.',
      analysis: 'Provide a detailed analysis with insights and observations.',
      recommendations: 'Give specific, actionable recommendations.',
      draft: 'Create a draft for the user to review and refine.',
      plan: 'Create a structured plan or outline.',
    };
    parts.push(`## EXPECTED OUTPUT\n\n${outputInstructions[input.expectedOutput]}`);
  }

  return parts.join('\n\n');
}

/**
 * Parse the specialist type from a string
 */
export function parseSpecialistType(value: string): SpecialistType | null {
  const validTypes: SpecialistType[] = [
    'email_writer',
    'calendar_planner',
    'subject_line_expert',
    'competitor_analyst',
    'brand_voice_coach',
    'creative_director',
    'data_interpreter',
    'flow_architect',
  ];

  if (validTypes.includes(value as SpecialistType)) {
    return value as SpecialistType;
  }
  return null;
}
