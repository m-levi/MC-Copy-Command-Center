/**
 * Invoke Agent Tool
 *
 * Allows agents (modes) to invoke other specialist agents.
 * This enables powerful agent chaining where one agent can
 * delegate tasks to another.
 *
 * Example: Calendar Planner agent invokes Email Writer agent
 * to create the actual email copy after the calendar is approved.
 */

import { z } from 'zod';
import { tool } from 'ai';
import { SPECIALIST_REGISTRY } from '@/lib/agents/specialist-registry';
import type { SpecialistType } from '@/types/orchestrator';

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Agent invocation schema
 */
export const InvokeAgentSchema = z.object({
  agent_id: z.enum([
    'calendar_planner',
    'email_writer',
    'subject_line_expert',
    'flow_architect',
    'competitor_analyst',
    'brand_voice_coach',
    'creative_director',
    'data_interpreter',
  ] as const).describe('ID of the specialist agent to invoke'),

  task: z.string().describe(
    'Clear description of the task for the agent. Be specific about what you need.'
  ),

  context: z.record(z.string(), z.unknown()).optional().describe(
    'Additional context to pass to the agent (e.g., brief details, product info, tone requirements)'
  ),

  expected_output: z.enum([
    'email_artifact',
    'subject_lines',
    'spreadsheet',
    'flow_artifact',
    'analysis',
    'recommendations',
    'plan',
    'text',
  ]).optional().describe('Type of output expected from the agent'),

  priority: z.enum(['high', 'normal', 'low']).optional().default('normal').describe(
    'Priority level for this agent invocation'
  ),
});

export type InvokeAgentInput = z.infer<typeof InvokeAgentSchema>;

// ============================================================================
// TOOL DEFINITION
// ============================================================================

/**
 * The invoke_agent tool
 *
 * This tool allows one agent to invoke another specialist agent.
 * The actual execution happens in the chat route - this just returns
 * the invocation request.
 */
export const invokeAgentTool = tool({
  description: `Invoke another specialist agent to help with a specific task.

Use this when you need specialized expertise that another agent provides.
The invoked agent will execute the task and return their output.

## AVAILABLE AGENTS

**Content Creation:**
- \`email_writer\` - Creates email copy with A/B/C versions
- \`subject_line_expert\` - Generates high-converting subject lines

**Planning & Strategy:**
- \`calendar_planner\` - Plans email calendars and creates briefs
- \`flow_architect\` - Designs email automation sequences

**Analysis:**
- \`competitor_analyst\` - Analyzes competitor strategies
- \`data_interpreter\` - Interprets marketing metrics

**Brand:**
- \`brand_voice_coach\` - Ensures brand voice consistency
- \`creative_director\` - Develops creative concepts

## EXAMPLE INVOCATIONS

**Invoke email writer:**
\`\`\`json
{
  "agent_id": "email_writer",
  "task": "Write a promotional email for our 30% off winter sale",
  "context": {
    "products": ["Winter Jacket", "Cozy Sweater"],
    "urgency": "Sale ends Sunday",
    "tone": "Exciting but not pushy"
  },
  "expected_output": "email_artifact"
}
\`\`\`

**Invoke subject line expert:**
\`\`\`json
{
  "agent_id": "subject_line_expert",
  "task": "Generate 10 subject line options for our winter sale email",
  "context": {
    "email_topic": "30% off winter sale",
    "target_emotion": "urgency and excitement"
  },
  "expected_output": "subject_lines"
}
\`\`\`

## IMPORTANT

1. Always explain to the user WHY you're invoking another agent
2. Provide clear, specific tasks to the agent
3. Include relevant context for best results
4. Wait for the agent's output before proceeding`,

  inputSchema: InvokeAgentSchema,

  execute: async (input: InvokeAgentInput) => {
    // Validate agent exists
    const agent = SPECIALIST_REGISTRY[input.agent_id as SpecialistType];
    if (!agent) {
      return {
        status: 'error' as const,
        error: `Unknown agent: ${input.agent_id}`,
        message: 'Agent not found in registry',
      };
    }

    // Return invocation request - actual execution happens in chat route
    return {
      status: 'pending_execution' as const,
      action: 'invoke_agent',
      agent_id: input.agent_id,
      agent_name: agent.name,
      agent_icon: agent.icon,
      task: input.task,
      context: input.context,
      expected_output: input.expected_output,
      priority: input.priority || 'normal',
      message: `Invoking ${agent.name} to: ${input.task}`,
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if an agent can invoke another agent
 */
export function canAgentInvoke(
  sourceAgentId: string,
  targetAgentId: string,
  allowedAgents?: string[]
): boolean {
  // If no restrictions, allow all
  if (!allowedAgents || allowedAgents.length === 0) {
    return true;
  }

  // Check if target is in allowed list
  return allowedAgents.includes(targetAgentId);
}

/**
 * Get agent info for display
 */
export function getAgentDisplayInfo(agentId: string): {
  name: string;
  icon: string;
  description: string;
} | null {
  const agent = SPECIALIST_REGISTRY[agentId as SpecialistType];
  if (!agent) return null;

  return {
    name: agent.name,
    icon: agent.icon,
    description: agent.shortDescription,
  };
}

/**
 * Build a summary of available agents for prompts
 */
export function buildAvailableAgentsSummary(allowedAgents?: string[]): string {
  const agents = allowedAgents && allowedAgents.length > 0
    ? allowedAgents
    : Object.keys(SPECIALIST_REGISTRY);

  return agents
    .map((id) => {
      const agent = SPECIALIST_REGISTRY[id as SpecialistType];
      if (!agent) return null;
      return `- **${agent.name}** (\`${id}\`): ${agent.shortDescription}`;
    })
    .filter(Boolean)
    .join('\n');
}
