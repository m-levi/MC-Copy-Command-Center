/**
 * @jest-environment node
 */

import { TransformStream } from 'node:stream/web';
import { getProviderOptionsWithWebSearch, getProviderOptions } from '@/lib/ai-providers';

Object.defineProperty(global, 'TransformStream', {
  value: TransformStream,
  writable: true,
});

describe('getProviderOptionsWithWebSearch', () => {
  it('returns base provider options when web search disabled', () => {
    const modelId = 'openai/gpt-5.1-mini';
    const baseOptions = getProviderOptions(modelId, 5000);
    const options = getProviderOptionsWithWebSearch(modelId, 5000, 'https://acme.test', {
      enabled: false,
    });

    expect(options).toEqual(baseOptions);
  });

  it('enables openai web search only when flag enabled', () => {
    const options = getProviderOptionsWithWebSearch(
      'openai/gpt-5.1-mini',
      5000,
      'https://acme.test',
      { enabled: true }
    ) as { openai?: Record<string, unknown> };

    expect(options.openai?.webSearch).toBe(true);
    expect(String(options.openai?.webSearchContext || '')).toContain('acme.test');
  });

  it('enables google grounding only when flag enabled', () => {
    const disabled = getProviderOptionsWithWebSearch(
      'google/gemini-2.5-flash',
      5000,
      undefined,
      false
    ) as { google?: Record<string, unknown> };
    expect(disabled.google?.groundingMetadata).toBeUndefined();

    const enabled = getProviderOptionsWithWebSearch(
      'google/gemini-2.5-flash',
      5000,
      'https://acme.test',
      true
    ) as { google?: { groundingMetadata?: { groundingSource?: string } } };

    expect(enabled.google?.groundingMetadata?.groundingSource).toBe('GOOGLE_SEARCH');
  });
});
