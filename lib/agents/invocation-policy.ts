import type { CustomMode } from '@/types';
import { isSpecialistType, type SpecialistType } from '@/types/orchestrator';

const DEFAULT_CHAIN_LIMIT = 3;
const MAX_CHAIN_LIMIT = 10;

export interface InvocationPolicyResult {
  allowed: boolean;
  reason?: string;
  targetAgentId?: SpecialistType;
  chainLimit: number;
}

export function getAgentChainLimit(mode: Pick<CustomMode, 'agent_behavior'> | null | undefined): number {
  const configuredLimit = mode?.agent_behavior?.chain_limit;
  if (typeof configuredLimit === 'number' && Number.isFinite(configuredLimit)) {
    return Math.min(MAX_CHAIN_LIMIT, Math.max(1, Math.floor(configuredLimit)));
  }
  return DEFAULT_CHAIN_LIMIT;
}

export function evaluateAgentInvocationPolicy(options: {
  mode: Pick<CustomMode, 'is_agent_enabled' | 'agent_type' | 'enabled_tools' | 'can_invoke_agents' | 'agent_behavior'> | null | undefined;
  requestedAgentId: string;
  currentInvocationCount: number;
}): InvocationPolicyResult {
  const { mode, requestedAgentId, currentInvocationCount } = options;
  const chainLimit = getAgentChainLimit(mode);

  if (!mode) {
    return {
      allowed: false,
      reason: 'Agent invocation is only available in custom agent modes.',
      chainLimit,
    };
  }

  if (mode.is_agent_enabled === false) {
    return {
      allowed: false,
      reason: 'This mode has agent capabilities disabled.',
      chainLimit,
    };
  }

  if (mode.agent_type && !['orchestrator', 'hybrid'].includes(mode.agent_type)) {
    return {
      allowed: false,
      reason: `Agent type "${mode.agent_type}" cannot invoke other agents.`,
      chainLimit,
    };
  }

  if (mode.enabled_tools?.invoke_agent?.enabled !== true) {
    return {
      allowed: false,
      reason: 'invoke_agent tool is disabled for this mode.',
      chainLimit,
    };
  }

  if (currentInvocationCount >= chainLimit) {
    return {
      allowed: false,
      reason: `Agent chain limit reached (${chainLimit}).`,
      chainLimit,
    };
  }

  if (!isSpecialistType(requestedAgentId)) {
    return {
      allowed: false,
      reason: `Unknown or unsupported agent "${requestedAgentId}".`,
      chainLimit,
    };
  }

  const targetAgentId = requestedAgentId as SpecialistType;

  const toolAllowedAgents = mode.enabled_tools?.invoke_agent?.allowed_agents || [];
  if (toolAllowedAgents.length > 0 && !toolAllowedAgents.includes(targetAgentId)) {
    return {
      allowed: false,
      reason: `Agent "${targetAgentId}" is not in invoke_agent.allowed_agents.`,
      chainLimit,
    };
  }

  const modeAllowedAgents = mode.can_invoke_agents || [];
  if (modeAllowedAgents.length > 0 && !modeAllowedAgents.includes(targetAgentId)) {
    return {
      allowed: false,
      reason: `Agent "${targetAgentId}" is not in can_invoke_agents.`,
      chainLimit,
    };
  }

  return {
    allowed: true,
    targetAgentId,
    chainLimit,
  };
}
