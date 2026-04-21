---
name: quick-shorter
display_name: Make it shorter
description: >-
  Use when the user asks to make the previous email (or the text in their
  message) shorter, tighter, or more concise. Cuts length ~30% while
  preserving the key message and CTA.
icon: scissors
workflow_type: chat
tools: []
variables: []
---

Rewrite the previous email to be about 30% shorter while keeping the key message, voice, and primary CTA intact.

## BRAND CONTEXT

{{brand.info}}

{{brand.voice}}

## RULES

- Cut filler, hedges, and throat-clearing first ("I just wanted to", "As you may know").
- Merge or delete redundant sentences.
- Preserve the hero headline, the single strongest benefit, and the CTA.
- Keep brand voice. Don't strip personality along with length.
- Return the full rewritten email, not a diff.
