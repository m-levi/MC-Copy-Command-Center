/**
 * FLOW EMAIL PROMPT
 * 
 * @deprecated These prompts are no longer used. Design V2 is now the single source of truth.
 * 
 * IMPORTANT: As of the prompt unification update, all design emails (including flow emails)
 * now use `design-email-v2.prompt.ts` as the single source of truth. Letter-style emails
 * use `letter-email.prompt.ts`.
 * 
 * These prompts are kept for backwards compatibility but should not be used in new code.
 * If you need to customize prompts, do so via the Debug Prompt Lab which now uses the V2 prompts.
 */

/**
 * @deprecated Use DESIGN_EMAIL_V2_SYSTEM_PROMPT and DESIGN_EMAIL_V2_USER_PROMPT instead
 * This prompt is no longer used in production code.
 */
export const FLOW_EMAIL_PROMPT_DESIGN = `⚠️ CRITICAL INSTRUCTION - READ FIRST ⚠️

Your response has TWO COMPLETELY SEPARATE parts:

1. **THINKING BLOCK (Extended Thinking)**: Do ALL strategic analysis, planning, research, and reasoning here
   - Use your thinking block for complete strategic analysis
   - This content is HIDDEN from the user

2. **MAIN RESPONSE**: ONLY the final formatted email copy that the user will see. Start immediately with the HERO SECTION (or the appropriate first section) and do not add extra wrappers or commentary.

**CRITICAL RULES:**
- The thinking block is hidden; everything after it is shown to the user exactly as written.
- NEVER put strategy, analysis, or explanations in the visible portion.
- In follow-up messages, return the complete email structure again—do not send only a diff.

---

You are writing Email {{EMAIL_SEQUENCE}} of {{TOTAL_EMAILS}} in a {{FLOW_NAME}} automation.

<brand_info>
{{BRAND_INFO}}
</brand_info>

{{RAG_CONTEXT}}

## FLOW CONTEXT

**Flow Goal:** {{FLOW_GOAL}}
**Target Audience:** {{TARGET_AUDIENCE}}
**This Email's Position:** Email {{EMAIL_SEQUENCE}} of {{TOTAL_EMAILS}}

## THIS EMAIL'S DETAILS

**Title:** {{EMAIL_TITLE}}
**Timing:** {{EMAIL_TIMING}}
**Purpose:** {{EMAIL_PURPOSE}}
**Key Points to Cover:**
{{KEY_POINTS}}
**Primary CTA:** {{PRIMARY_CTA}}

## YOUR TASK

Write a complete structured design email that fulfills this email's purpose within the larger flow.

YOU MUST follow this EXACT structure for design emails:

EMAIL SUBJECT LINE:
[Compelling subject line - {{SUBJECT_LINE_GUIDANCE}}]

PREVIEW TEXT:
[Preview text that appears after subject line in inbox - 40-60 characters]

---

HERO SECTION:
[Accent text - optional, 5 words max]

**[Headline - benefit-driven, compelling, 4-8 words]**

[Subhead - optional, 10 words max]

CTA: [Action-oriented button text]

---

SECTION 1: [Section Headline]
[1-2 sentences OR 3-5 bullet points covering first key point]

CTA: [Optional CTA button text]

---

SECTION 2: [Section Headline]
[1-2 sentences OR 3-5 bullet points covering second key point]

CTA: [Optional CTA button text]

---

[Continue with additional sections for remaining key points...]

---

CALL-TO-ACTION SECTION:
**[Final compelling headline summarizing the offer/value]**

[1 sentence reinforcing the main message]

CTA: [Strong final CTA button text]

---

DESIGN NOTES:
- [Visual or layout suggestions]
- [Image placement ideas]
- [Color/styling recommendations]

CRITICAL: Follow this structure EXACTLY. Do not deviate from this format.

## IMPORTANT FLOW CONSIDERATIONS

- This is email {{EMAIL_SEQUENCE}} - reference the flow's progression appropriately
{{POSITION_GUIDANCE}}
- Timing: {{EMAIL_TIMING}}
- Maintain consistency with brand voice throughout
- Ensure this email works as part of the larger sequence

Write the email now.`;

/**
 * @deprecated Use LETTER_EMAIL_PROMPT from letter-email.prompt.ts instead
 * This prompt is no longer used in production code.
 */
export const FLOW_EMAIL_PROMPT_LETTER = `⚠️ CRITICAL INSTRUCTION - READ FIRST ⚠️

Your response has TWO COMPLETELY SEPARATE parts:

1. **THINKING BLOCK (Extended Thinking)**: Do ALL strategic analysis, planning, research, and reasoning here
   - Use your thinking block for complete strategic analysis
   - This content is HIDDEN from the user

2. **MAIN RESPONSE**: ONLY the final formatted email copy that the user will see. Start directly with the subject line and letter content—no additional wrappers or commentary.

**CRITICAL RULES:**
- The thinking block is hidden; everything after it is visible to the user.
- NEVER put strategy, analysis, or explanations in the visible portion.
- In follow-up messages, return the complete email again—do not send only a diff.

---

You are writing Email {{EMAIL_SEQUENCE}} of {{TOTAL_EMAILS}} in a {{FLOW_NAME}} automation.

<brand_info>
{{BRAND_INFO}}
</brand_info>

{{RAG_CONTEXT}}

## FLOW CONTEXT

**Flow Goal:** {{FLOW_GOAL}}
**Target Audience:** {{TARGET_AUDIENCE}}
**This Email's Position:** Email {{EMAIL_SEQUENCE}} of {{TOTAL_EMAILS}}

## THIS EMAIL'S DETAILS

**Title:** {{EMAIL_TITLE}}
**Timing:** {{EMAIL_TIMING}}
**Purpose:** {{EMAIL_PURPOSE}}
**Key Points to Cover:**
{{KEY_POINTS}}
**Primary CTA:** {{PRIMARY_CTA}}

## YOUR TASK

Write a complete letter-style email that fulfills this email's purpose within the larger flow.

Generate a letter-style email with:

SUBJECT LINE:
[Personal, conversational subject line]

---

[Greeting - "Hi [Name]," or "Hey there," or "Hi,"]

[Opening paragraph - warm, personal, set context - 2-3 sentences max]

[Body paragraph(s) - key message, offer, or update - 2-4 sentences each, 1-2 paragraphs max]

[Call to action paragraph - what you want them to do - 1-2 sentences]

[Sign off - "Thanks," "Best," "Cheers," etc.]
[Sender name/role]
[Brand name - optional if already in sender]

P.S. [Optional - reinforcement or bonus detail]

## IMPORTANT FLOW CONSIDERATIONS

- This is email {{EMAIL_SEQUENCE}} - reference the flow's progression appropriately
{{POSITION_GUIDANCE}}
- Timing: {{EMAIL_TIMING}}
- Maintain consistency with brand voice throughout
- Ensure this email works as part of the larger sequence

Write the email now.`;




