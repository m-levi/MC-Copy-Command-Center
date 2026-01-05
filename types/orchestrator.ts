/**
 * Orchestrator & Specialist Agent Types
 *
 * The orchestrator is a master agent that routes tasks to specialist agents.
 * Each specialist excels at a specific type of work (email writing, calendar planning, etc.)
 */

import { ModeColor, ModeToolConfig } from './index';
import { ArtifactKind } from './artifacts';

// ============================================================================
// SPECIALIST DEFINITIONS
// ============================================================================

/**
 * Available specialist agent types
 */
export type SpecialistType =
  | 'email_writer'
  | 'calendar_planner'
  | 'subject_line_expert'
  | 'competitor_analyst'
  | 'brand_voice_coach'
  | 'creative_director'
  | 'data_interpreter'
  | 'flow_architect';

/**
 * Expected output types from specialists
 */
export type SpecialistOutputType =
  | 'artifact'        // Specialist creates an artifact
  | 'analysis'        // Specialist provides analysis/insights
  | 'recommendations' // Specialist gives recommendations
  | 'draft'           // Specialist creates a draft for review
  | 'plan';           // Specialist creates a plan/outline

/**
 * Model task categories for routing
 */
export type ModelTaskCategory =
  | 'reasoning'    // Complex planning, multi-step thinking (Claude Opus, o1)
  | 'generation'   // Content creation, copywriting (Claude Sonnet, GPT-4o)
  | 'analysis'     // Data analysis, pattern recognition (GPT-4o, Gemini Pro)
  | 'quick'        // Simple tasks, fast responses (Claude Haiku, GPT-4o-mini)
  | 'vision';      // Image analysis (GPT-4o, Gemini)

/**
 * Configuration for a specialist agent
 */
export interface SpecialistConfig {
  id: SpecialistType;
  name: string;
  description: string;
  shortDescription: string;  // One-liner for orchestrator context
  icon: string;
  color: ModeColor;

  // What this specialist is good at
  capabilities: string[];

  // What kind of output to expect
  primaryOutputType: SpecialistOutputType;
  primaryArtifactKinds?: ArtifactKind[];

  // Which model category to use
  modelCategory: ModelTaskCategory;

  // Tool configuration for this specialist
  tools: ModeToolConfig;

  // The specialist's system prompt
  systemPrompt: string;

  // Example use cases (helps orchestrator decide)
  useCases: string[];

  // Keywords that suggest this specialist (helps orchestrator route)
  triggerKeywords: string[];
}

// ============================================================================
// ORCHESTRATOR STATE
// ============================================================================

/**
 * Current task being worked on
 */
export interface OrchestratorTask {
  id: string;
  description: string;
  status: 'planning' | 'executing' | 'reviewing' | 'complete' | 'blocked';

  // Specialists involved
  specialists: {
    type: SpecialistType;
    status: 'pending' | 'running' | 'complete' | 'failed';
    taskDescription: string;
    output?: string;
    artifactIds?: string[];
  }[];

  // Artifacts created during this task
  artifactIds: string[];

  // Conversations created during this task
  conversationIds: string[];

  createdAt: string;
  updatedAt: string;
}

/**
 * Short-term memory for the current session
 */
export interface ShortTermMemory {
  // Recent artifacts worked on
  recentArtifacts: {
    id: string;
    kind: ArtifactKind;
    title: string;
    timestamp: string;
  }[];

  // Recent decisions made
  recentDecisions: {
    decision: string;
    rationale: string;
    timestamp: string;
  }[];

  // User feedback received
  userFeedback: {
    feedback: string;
    context: string;
    timestamp: string;
  }[];

  // Products mentioned or used
  recentProducts: {
    id: string;
    name: string;
    timestamp: string;
  }[];
}

/**
 * Long-term memory (from Supermemory)
 */
export interface LongTermMemory {
  // Brand-specific preferences
  brandPreferences: Record<string, unknown>;

  // Past campaign summaries
  pastCampaigns: {
    name: string;
    date: string;
    type: string;
    outcome?: string;
  }[];

  // Performance insights
  performanceInsights: {
    insight: string;
    source: string;
    date: string;
  }[];

  // User preferences
  userPreferences: {
    preferredTone?: string;
    preferredLength?: string;
    avoidTopics?: string[];
    favoriteApproaches?: string[];
  };
}

/**
 * Full orchestrator state
 */
export interface OrchestratorState {
  // Context
  conversationId: string;
  brandId: string;
  userId: string;

  // Current work
  currentTask?: OrchestratorTask;
  pendingTasks: OrchestratorTask[];
  completedTasks: OrchestratorTask[];

  // Memory
  shortTermMemory: ShortTermMemory;
  longTermMemory?: LongTermMemory;

  // Session info
  sessionStarted: string;
  lastActivity: string;
}

// ============================================================================
// INVOKE SPECIALIST TYPES
// ============================================================================

/**
 * Context passed when invoking a specialist
 */
export interface SpecialistContext {
  // Relevant artifacts to reference
  artifacts?: {
    id: string;
    kind: ArtifactKind;
    title: string;
    summary?: string;
  }[];

  // Relevant products
  products?: {
    id: string;
    name: string;
    description?: string;
    price?: number;
  }[];

  // Output from a previous specialist
  previousOutput?: {
    specialist: SpecialistType;
    output: string;
    artifactIds?: string[];
  };

  // User preferences for this task
  preferences?: Record<string, string>;

  // Additional context
  additionalContext?: string;
}

/**
 * Input for invoking a specialist
 */
export interface InvokeSpecialistInput {
  specialist: SpecialistType;
  task: string;
  context?: SpecialistContext;
  expectedOutput?: SpecialistOutputType;
}

/**
 * Result from invoking a specialist
 */
export interface SpecialistResult {
  specialist: SpecialistType;
  status: 'success' | 'failed' | 'needs_input';

  // The specialist's response
  response: string;

  // Artifacts created
  artifacts?: {
    id: string;
    kind: ArtifactKind;
    title: string;
  }[];

  // Conversations created
  conversations?: {
    id: string;
    title: string;
  }[];

  // If the specialist needs more input
  needsInput?: {
    question: string;
    options?: string[];
  };

  // Metadata
  modelUsed: string;
  tokensUsed?: number;
  durationMs?: number;
}

// ============================================================================
// MODEL ROUTING
// ============================================================================

/**
 * Model configuration for different task types
 */
export interface ModelRoutingConfig {
  reasoning: string;    // Complex planning (e.g., 'anthropic/claude-opus-4.5')
  generation: string;   // Content creation (e.g., 'anthropic/claude-sonnet-4.5')
  analysis: string;     // Data analysis (e.g., 'openai/gpt-4o')
  quick: string;        // Simple tasks (e.g., 'anthropic/claude-haiku-4.5')
  vision: string;       // Image analysis (e.g., 'openai/gpt-4o')
}

/**
 * Default model routing configuration
 */
export const DEFAULT_MODEL_ROUTING: ModelRoutingConfig = {
  reasoning: 'anthropic/claude-sonnet-4-5-20250514',
  generation: 'anthropic/claude-sonnet-4-5-20250514',
  analysis: 'anthropic/claude-sonnet-4-5-20250514',
  quick: 'anthropic/claude-sonnet-4-5-20250514',
  vision: 'openai/gpt-4o',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a string is a valid specialist type
 */
export function isSpecialistType(value: string): value is SpecialistType {
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
  return validTypes.includes(value as SpecialistType);
}

/**
 * Get human-readable name for a specialist
 */
export function getSpecialistDisplayName(type: SpecialistType): string {
  const names: Record<SpecialistType, string> = {
    email_writer: 'Email Writer',
    calendar_planner: 'Calendar Planner',
    subject_line_expert: 'Subject Line Expert',
    competitor_analyst: 'Competitor Analyst',
    brand_voice_coach: 'Brand Voice Coach',
    creative_director: 'Creative Director',
    data_interpreter: 'Data Interpreter',
    flow_architect: 'Flow Architect',
  };
  return names[type];
}

/**
 * Create an empty orchestrator state
 */
export function createEmptyOrchestratorState(
  conversationId: string,
  brandId: string,
  userId: string
): OrchestratorState {
  return {
    conversationId,
    brandId,
    userId,
    currentTask: undefined,
    pendingTasks: [],
    completedTasks: [],
    shortTermMemory: {
      recentArtifacts: [],
      recentDecisions: [],
      userFeedback: [],
      recentProducts: [],
    },
    sessionStarted: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  };
}
