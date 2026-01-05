/**
 * Orchestrator Service
 *
 * This service coordinates the orchestrator and specialist agents.
 * It handles:
 * - Building the orchestrator prompt with brand context
 * - Managing specialist invocations
 * - Multi-model routing
 * - State management
 */

import { generateText, streamText, ModelMessage, tool } from 'ai';
import { z } from 'zod';
import type { SpecialistType, OrchestratorState, SpecialistResult, ModelRoutingConfig } from '@/types/orchestrator';
import { getSpecialist, SPECIALIST_REGISTRY, buildSpecialistSummary } from './specialist-registry';
import { buildOrchestratorPrompt } from '@/lib/prompts/orchestrator.prompt';
import { invokeSpecialistTool, buildSpecialistTaskPrompt } from '@/lib/tools/invoke-specialist-tool';
import { createArtifactTool } from '@/lib/tools/artifact-tool';
import { gateway, getModel } from '@/lib/ai-providers';

// ============================================================================
// TYPES
// ============================================================================

export interface OrchestratorConfig {
  brandId: string;
  brandInfo: string;
  brandName?: string;
  userId: string;
  conversationId: string;
  memoryContext?: string;
  modelRouting?: Partial<ModelRoutingConfig>;
}

export interface SpecialistInvocation {
  specialist: SpecialistType;
  task: string;
  context?: Record<string, unknown>;
  expectedOutput?: string;
}

// ============================================================================
// ORCHESTRATOR SERVICE
// ============================================================================

/**
 * Build the tools available to the orchestrator
 */
export function buildOrchestratorTools(config: OrchestratorConfig) {
  return {
    invoke_specialist: invokeSpecialistTool,
    create_artifact: createArtifactTool,
    // Add other tools as needed:
    // product_search, web_search, save_memory, etc.
  };
}

/**
 * Build the orchestrator system prompt
 */
export function buildOrchestratorSystemPrompt(config: OrchestratorConfig): string {
  return buildOrchestratorPrompt({
    brandInfo: config.brandInfo,
    brandName: config.brandName,
    memoryContext: config.memoryContext,
  });
}

/**
 * Get the appropriate model for a specialist based on routing config
 */
export function getModelForSpecialist(
  specialist: SpecialistType,
  routing?: Partial<ModelRoutingConfig>
): string {
  const specialistConfig = getSpecialist(specialist);
  const category = specialistConfig.modelCategory;

  // Use custom routing if provided, otherwise use defaults
  const defaultRouting: ModelRoutingConfig = {
    reasoning: 'anthropic/claude-sonnet-4-5-20250514',
    generation: 'anthropic/claude-sonnet-4-5-20250514',
    analysis: 'anthropic/claude-sonnet-4-5-20250514',
    quick: 'anthropic/claude-sonnet-4-5-20250514',
    vision: 'openai/gpt-4o',
  };

  const effectiveRouting = { ...defaultRouting, ...routing };
  return effectiveRouting[category];
}

/**
 * Specialists that MUST create an artifact as their primary output.
 * For these specialists, tool use is forced to ensure artifact creation.
 */
const ARTIFACT_REQUIRED_SPECIALISTS: Set<SpecialistType> = new Set([
  'calendar_planner',
]);

/**
 * Execute a specialist agent
 *
 * This is called when the orchestrator invokes a specialist.
 * It runs the specialist with its own prompt and tools.
 */
export async function executeSpecialist(
  invocation: SpecialistInvocation,
  config: OrchestratorConfig,
  conversationHistory: ModelMessage[]
): Promise<SpecialistResult> {
  const startTime = Date.now();

  try {
    const specialistConfig = getSpecialist(invocation.specialist);
    const modelId = getModelForSpecialist(invocation.specialist, config.modelRouting);

    // Build the specialist's system prompt with brand context
    const systemPrompt = `${specialistConfig.systemPrompt}

<brand_context>
${config.brandInfo}
</brand_context>

${config.memoryContext ? `<memory_context>\n${config.memoryContext}\n</memory_context>` : ''}`;

    // Build the task prompt from the invocation
    const taskPrompt = buildSpecialistTaskPrompt({
      specialist: invocation.specialist,
      task: invocation.task,
      context: invocation.context as any,
      expectedOutput: invocation.expectedOutput as any,
    });

    // Get the model using the gateway
    const model = gateway.languageModel(modelId);

    // Build specialist tools based on config
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const specialistTools: Record<string, any> = {};

    if (specialistConfig.tools.create_artifact?.enabled) {
      specialistTools.create_artifact = createArtifactTool;
    }

    // Determine if this specialist requires artifact creation (force tool use)
    const requiresArtifact = ARTIFACT_REQUIRED_SPECIALISTS.has(invocation.specialist);
    const hasArtifactTool = Object.keys(specialistTools).length > 0;
    const shouldForceToolUse = requiresArtifact && hasArtifactTool;

    console.log(`[Orchestrator] Executing specialist: ${invocation.specialist}`, {
      requiresArtifact,
      hasArtifactTool,
      shouldForceToolUse,
      availableTools: Object.keys(specialistTools),
    });

    // Run the specialist
    const result = await generateText({
      model,
      system: systemPrompt,
      messages: [
        ...conversationHistory.slice(-5), // Include recent context
        { role: 'user' as const, content: taskPrompt },
      ],
      tools: specialistTools,
      // Force tool use for specialists that must create artifacts (e.g., calendar_planner)
      ...(shouldForceToolUse && {
        toolChoice: 'required' as const,
      }),
      maxRetries: 2,
    });

    // Extract artifacts from tool calls
    const artifacts: SpecialistResult['artifacts'] = [];
    for (const step of result.steps || []) {
      for (const toolCall of step.toolCalls || []) {
        if (toolCall.toolName === 'create_artifact') {
          // The actual artifact creation happens in the chat route
          // Here we just note that an artifact was requested
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const args = (toolCall as any).args || {};
          artifacts.push({
            id: 'pending', // Will be assigned by chat route
            kind: args.kind,
            title: args.title,
          });
        }
      }
    }

    return {
      specialist: invocation.specialist,
      status: 'success',
      response: result.text,
      artifacts: artifacts.length > 0 ? artifacts : undefined,
      modelUsed: modelId,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error(`Specialist ${invocation.specialist} failed:`, error);
    return {
      specialist: invocation.specialist,
      status: 'failed',
      response: `Error executing ${invocation.specialist}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      modelUsed: 'none',
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Check if a tool call is a specialist invocation
 */
export function isSpecialistInvocation(toolCall: { toolName: string }): boolean {
  return toolCall.toolName === 'invoke_specialist';
}

/**
 * Parse a specialist invocation from a tool call
 */
export function parseSpecialistInvocation(
  toolCall: { toolName: string; args: unknown }
): SpecialistInvocation | null {
  if (!isSpecialistInvocation(toolCall)) {
    return null;
  }

  const args = toolCall.args as {
    specialist: SpecialistType;
    task: string;
    context?: Record<string, unknown>;
    expectedOutput?: string;
  };

  return {
    specialist: args.specialist,
    task: args.task,
    context: args.context,
    expectedOutput: args.expectedOutput,
  };
}

/**
 * Check if the orchestrator mode should be used
 */
export function shouldUseOrchestrator(mode: string | undefined): boolean {
  // Use orchestrator for:
  // - No specific mode selected (default)
  // - Explicit 'orchestrator' mode
  // - 'assistant' mode
  return !mode || mode === 'orchestrator' || mode === 'assistant';
}

/**
 * Get available specialists as a formatted list
 */
export function getAvailableSpecialistsInfo(): string {
  return buildSpecialistSummary();
}

// ============================================================================
// CONVERSATION PLAN TOOL
// ============================================================================

/**
 * Tool for suggesting a conversation plan (multi-step workflow)
 */
export const suggestConversationPlanTool = tool({
  description: `Suggest a multi-step plan for completing a complex task.

Use this when a task requires multiple steps or specialists working together.
The plan helps the user understand the workflow and approve it before execution.

Example:
{
  "title": "January Email Calendar",
  "steps": [
    { "description": "Create calendar with send dates and campaign types", "specialist": "calendar_planner" },
    { "description": "Generate detailed briefs for each email", "specialist": "calendar_planner" },
    { "description": "Review and approve briefs", "action": "user_review" },
    { "description": "Write email copy for approved briefs", "specialist": "email_writer" }
  ]
}`,
  inputSchema: z.object({
    title: z.string().describe('Plan title'),
    description: z.string().optional().describe('Brief description of the plan'),
    steps: z.array(z.object({
      description: z.string().describe('What this step accomplishes'),
      specialist: z.string().optional().describe('Which specialist handles this step'),
      action: z.enum(['user_review', 'user_input', 'approval']).optional().describe('Type of user action if not a specialist step'),
      estimatedOutput: z.string().optional().describe('What this step produces'),
    })).describe('Steps in the plan'),
  }),
  execute: async (input) => {
    return {
      status: 'pending' as const,
      plan: input,
      message: 'Plan suggested for user approval',
    };
  },
});
