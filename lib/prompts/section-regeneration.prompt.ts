/**
 * SECTION REGENERATION PROMPTS
 * 
 * For regenerating specific sections of an email
 * (subject line, hero, body sections, CTA)
 */

export const SECTION_REGENERATION_PROMPTS = {
  subject: `Regenerate ONLY the email subject line and preview text. Keep everything else the same. Focus on:
- Creating urgency or curiosity
- Using power words
- Keeping it concise (6-10 words for subject)
- Making it mobile-friendly

<brand_info>
{{BRAND_INFO}}
</brand_info>

{{RAG_CONTEXT}}

{{CONTEXT_INFO}}`,

  hero: `Regenerate ONLY the hero section. Keep everything else the same. Focus on:
- Compelling, benefit-driven headline (4-8 words)
- Clear value proposition
- Strong, unique CTA
- NO body copy in the hero

<brand_info>
{{BRAND_INFO}}
</brand_info>

{{RAG_CONTEXT}}

{{CONTEXT_INFO}}`,

  body: `Regenerate ONLY the body section "{{SECTION_TITLE}}". Keep everything else the same. Focus on:
- Clear, scannable content
- Maximum 1-2 sentences or 3-5 bullets
- Supporting the main conversion goal
- Maintaining brand voice

<brand_info>
{{BRAND_INFO}}
</brand_info>

{{RAG_CONTEXT}}

{{CONTEXT_INFO}}`,

  cta: `Regenerate ONLY the call-to-action section. Keep everything else the same. Focus on:
- Summarizing the key benefit
- Creating urgency
- Using a unique, action-oriented CTA button text
- Making it compelling and clear

<brand_info>
{{BRAND_INFO}}
</brand_info>

{{RAG_CONTEXT}}

{{CONTEXT_INFO}}`,
};




