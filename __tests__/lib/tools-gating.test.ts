/**
 * @jest-environment node
 */

import { TransformStream } from 'node:stream/web';
import { getToolsForMode } from '@/lib/tools';

Object.defineProperty(global, 'TransformStream', {
  value: TransformStream,
  writable: true,
});

describe('strict mode tool gating', () => {
  it('only exposes explicitly enabled tools', () => {
    const tools = getToolsForMode('email_copy', {
      create_artifact: { enabled: true },
      create_conversation: { enabled: false },
      create_bulk_conversations: { enabled: false },
      suggest_action: { enabled: false },
      suggest_conversation_plan: { enabled: false },
      invoke_agent: { enabled: false },
    });

    expect(Object.keys(tools)).toContain('create_artifact');
    expect(Object.keys(tools)).not.toContain('create_conversation');
    expect(Object.keys(tools)).not.toContain('invoke_agent');
  });

  it('does not expose invoke_agent by default config', () => {
    const tools = getToolsForMode('planning');
    expect(Object.keys(tools)).not.toContain('invoke_agent');
  });

  it('exposes invoke_agent only when enabled', () => {
    const tools = getToolsForMode('planning', {
      create_artifact: { enabled: true },
      create_conversation: { enabled: true },
      create_bulk_conversations: { enabled: false },
      suggest_action: { enabled: true },
      suggest_conversation_plan: { enabled: false },
      invoke_agent: { enabled: true },
    });

    expect(Object.keys(tools)).toContain('invoke_agent');
  });
});
