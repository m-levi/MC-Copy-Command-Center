import { buildDesignEmailV2Prompt } from '@/lib/prompts/design-email-v2.prompt';

describe('buildDesignEmailV2Prompt', () => {
  it('injects brand voice guide once to avoid duplicated prompt payload', () => {
    const styleGuide = 'Voice guide: concise, direct, confident.';
    const prompt = buildDesignEmailV2Prompt({
      brandInfo: 'Brand info block',
      brandVoiceGuidelines: styleGuide,
      websiteUrl: 'https://acme.test',
      brandName: 'Acme',
      copyBrief: 'Launch email for new product.',
    });

    const occurrences = prompt.systemPrompt.split(styleGuide).length - 1;
    expect(occurrences).toBe(1);
    expect(prompt.systemPrompt).toContain('brand voice guide above');
  });
});
