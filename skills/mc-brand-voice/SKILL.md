---
name: mc-brand-voice
description: Router and schema for MoonCommerce client brand voices. Loads the correct per-brand voice profile for FatSwag, Adina Las Vegas, Scherber USA, Really Good Whisky, Kosher Casual, Melissa Lovy, and Daniella Faye. Use before writing any marketing copy, subject lines, CTAs, SMS, popups, or promotional content for a MoonCommerce client, and as input to downstream copywriting and pre-send review skills. Also handles new-brand onboarding when no brand file exists yet.
---

# MoonCommerce Brand Voice

Single entry point for brand voice across all MoonCommerce clients. Routes to the correct brand file, emits a standardized VOICE PROFILE handoff, and keeps schema consistency so downstream copywriting and QA skills consume the same contract.

## When to Activate

- Any copywriting task for a MoonCommerce client (email, SMS, headlines, CTAs, product copy, popup questions)
- Pre-send QA where voice compliance needs to be checked
- A downstream skill (`email-copywriter`, `email-copy-engine`, `mc-brief-generator`, `adina-lv-pre-send-review`, `popup-question-generator`, `email-subject-lines`) needs voice context
- Onboarding a new brand — falls through to New Brand Mode

## Supported Brands

Every brand lives in `brands/<slug>/` with a canonical `brand.md` and a `references/` folder holding copy samples, checklists, and any brand-specific reference material.

| Brand | File | One-line signature |
|---|---|---|
| FatSwag | `brands/fatswag/brand.md` | Unapologetic, minimal, drop-culture streetwear. |
| Really Good Whisky | `brands/really-good-whisky/brand.md` | Premium British wit, Apple-level polish. |
| Adina Las Vegas | `brands/adina-las-vegas/brand.md` | High-end modest fashion — "the Aritzia of modest." Michal-first-person vs. brand voice, Shabbos (not Shabbat), modesty as frame not pitch. |
| Scherber USA | `brands/scherber-usa/brand.md` | Authoritative emergency-equipment voice softened by approachability — the first responder training new recruits. Dual-audience (EMT + concerned parent), trust markers over hype, preparedness over fear, no emoji ever. |
| Kosher Casual | `brands/kosher-casual/brand.md` | Old Navy of modest — reliable basics, solution-focused, full-sentence voice (never fragments), no emojis, no luxury drift. |
| Melissa Lovy | `brands/melissa-lovy/brand.md` | Affordable-luxury jewelry in Melissa's first-person influencer voice — Lovy Ladies community, family-named pieces, story-first launches. Explicit overrides to universal bans: *obsessed, must-have, treat yourself,* emojis sparingly (1/email), and real time-bound urgency are all approved. |
| Daniella Faye | `brands/daniella-faye/brand.md` | Premium boutique modest fashion — confident, understated, Apple-style headlines, period over exclamation point. "We don't make basic." No emojis, no hype superlatives, no modesty-as-pitch. |

## Workflow

1. **Detect the brand.** Look for explicit mention, then recent conversation context, then project context. If genuinely unclear, ask — don't guess between similar brands.
2. **Load the brand file.** Read `brands/<brand>/brand.md` in full. Do not summarize at load time. Reach into `brands/<brand>/references/` (copy samples, SMS vocabulary, pre-send checklist, signature phrases, etc.) on demand — copy-samples is the single fastest calibration tool and should be loaded before drafting new copy.
3. **Check universals.** Load `references/universal-banned-moves.md`. These apply to every brand regardless of their own rules.
4. **Emit the VOICE PROFILE.** Use the schema in `references/voice-profile-schema.md`. Preserve brand-specific content verbatim — do not re-derive, soften, or generify.
5. **Hand off.** Downstream skills consume the VOICE PROFILE as their voice input and keep the brand file path as their pointer for deep reference (copy samples, vocab lists, checklists live in each brand's own references folder and load on demand).

## New Brand Mode

If no file exists for the requested brand:

1. State this explicitly — don't fabricate a voice.
2. Delegate to `brand-style-guide-builder` for research and intake.
3. Draft a new `brands/<brand>/brand.md` using `references/new-brand-template.md` — create the `brands/<brand>/references/` folder at the same time and scaffold `copy-samples.md` from `references/copy-samples-template.md` (real sends required before the brand file ships canonical).
4. Flag as DRAFT until Mordi confirms.

## Output Contract

Every downstream consumer should receive:

- A VOICE PROFILE block that matches the schema
- The path to the source brand file (`brands/<brand>/brand.md`) and its `references/` folder
- Brand-specific hard bans surfaced up top
- A reference to universal banned moves (not duplicated into the profile)

## What Not to Do

- Do not blend two brand voices in one output unless the user explicitly asks for a comparison.
- Do not invent schema sections to make a brand look more complete than the source file says.
- Do not strip brand-specific quirks to fit the schema. Put them in `Extras` in the brand file.
- Do not let the router generate copy itself. Its job ends when the VOICE PROFILE is handed off.
