import { buildCustomModePrompt } from '@/lib/chat-prompts';

const brandContext = {
  name: 'Acme',
  brand_details: 'High-quality outdoor gear',
  brand_guidelines: 'Be direct and friendly',
  copywriting_style_guide: 'Warm and concise',
  website_url: 'https://acme.test',
};

describe('buildCustomModePrompt', () => {
  it('avoids duplicate brand context when template already references brand placeholders', () => {
    const prompt = buildCustomModePrompt(
      'Use this context: {{BRAND_INFO}}',
      brandContext
    );

    expect(prompt).toContain('Use this context:');
    expect(prompt).not.toContain('## BRAND CONTEXT');
  });

  it('injects brand context section when template does not reference brand placeholders', () => {
    const prompt = buildCustomModePrompt(
      'You are a strategic assistant.',
      brandContext
    );

    expect(prompt).toContain('## BRAND CONTEXT');
    expect(prompt).toContain('Brand Name: Acme');
  });
});
