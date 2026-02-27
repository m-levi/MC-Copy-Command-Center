import { DEFAULT_MODE_TOOL_CONFIG, type AgentBehavior, type AgentType } from '@/types';

export const MODE_SELECT_FIELDS = [
  'id',
  'user_id',
  'name',
  'description',
  'icon',
  'color',
  'system_prompt',
  'enabled_tools',
  'primary_artifact_types',
  'is_agent_enabled',
  'agent_type',
  'can_invoke_agents',
  'default_agent',
  'agent_behavior',
  'is_active',
  'is_default',
  'sort_order',
  'created_at',
  'updated_at',
].join(', ');

const ALLOWED_AGENT_TYPES: AgentType[] = ['orchestrator', 'specialist', 'hybrid'];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function normalizeAgentBehavior(value: unknown): AgentBehavior | undefined {
  if (!isObject(value)) return undefined;

  const behavior: AgentBehavior = {};

  if (typeof value.show_thinking === 'boolean') {
    behavior.show_thinking = value.show_thinking;
  }

  if (typeof value.auto_invoke === 'boolean') {
    behavior.auto_invoke = value.auto_invoke;
  }

  if (typeof value.announce_agent_switch === 'boolean') {
    behavior.announce_agent_switch = value.announce_agent_switch;
  }

  if (typeof value.chain_limit === 'number' && Number.isFinite(value.chain_limit)) {
    behavior.chain_limit = Math.min(10, Math.max(1, Math.floor(value.chain_limit)));
  }

  return Object.keys(behavior).length > 0 ? behavior : {};
}

export function normalizeModePayload(
  payload: Record<string, unknown>,
  options: { includeDefaults?: boolean } = {}
): Record<string, unknown> {
  const { includeDefaults = false } = options;
  const normalized: Record<string, unknown> = {};

  if ('name' in payload && typeof payload.name === 'string') {
    normalized.name = payload.name.trim();
  }

  if ('description' in payload) {
    normalized.description =
      typeof payload.description === 'string' && payload.description.trim().length > 0
        ? payload.description.trim()
        : null;
  }

  if ('icon' in payload && typeof payload.icon === 'string' && payload.icon.trim()) {
    normalized.icon = payload.icon.trim();
  } else if (includeDefaults) {
    normalized.icon = '💬';
  }

  if ('color' in payload && typeof payload.color === 'string' && payload.color.trim()) {
    normalized.color = payload.color.trim();
  } else if (includeDefaults) {
    normalized.color = 'blue';
  }

  if ('system_prompt' in payload && typeof payload.system_prompt === 'string') {
    normalized.system_prompt = payload.system_prompt.trim();
  }

  if ('is_active' in payload && typeof payload.is_active === 'boolean') {
    normalized.is_active = payload.is_active;
  } else if (includeDefaults) {
    normalized.is_active = true;
  }

  if ('sort_order' in payload && typeof payload.sort_order === 'number' && Number.isFinite(payload.sort_order)) {
    normalized.sort_order = Math.floor(payload.sort_order);
  }

  if ('enabled_tools' in payload) {
    normalized.enabled_tools = isObject(payload.enabled_tools)
      ? payload.enabled_tools
      : DEFAULT_MODE_TOOL_CONFIG;
  } else if (includeDefaults) {
    normalized.enabled_tools = DEFAULT_MODE_TOOL_CONFIG;
  }

  if ('primary_artifact_types' in payload) {
    const artifactKinds = sanitizeStringArray(payload.primary_artifact_types);
    normalized.primary_artifact_types = artifactKinds.length > 0 ? artifactKinds : ['email'];
  } else if (includeDefaults) {
    normalized.primary_artifact_types = ['email'];
  }

  if ('is_agent_enabled' in payload && typeof payload.is_agent_enabled === 'boolean') {
    normalized.is_agent_enabled = payload.is_agent_enabled;
  } else if (includeDefaults) {
    normalized.is_agent_enabled = true;
  }

  if ('agent_type' in payload && typeof payload.agent_type === 'string') {
    normalized.agent_type = ALLOWED_AGENT_TYPES.includes(payload.agent_type as AgentType)
      ? payload.agent_type
      : 'specialist';
  } else if (includeDefaults) {
    normalized.agent_type = 'specialist';
  }

  if ('can_invoke_agents' in payload) {
    normalized.can_invoke_agents = sanitizeStringArray(payload.can_invoke_agents);
  } else if (includeDefaults) {
    normalized.can_invoke_agents = [];
  }

  if ('default_agent' in payload) {
    normalized.default_agent =
      typeof payload.default_agent === 'string' && payload.default_agent.trim().length > 0
        ? payload.default_agent.trim()
        : null;
  } else if (includeDefaults) {
    normalized.default_agent = null;
  }

  if ('agent_behavior' in payload) {
    normalized.agent_behavior = normalizeAgentBehavior(payload.agent_behavior) ?? {};
  } else if (includeDefaults) {
    normalized.agent_behavior = {};
  }

  return normalized;
}
