# VOICE PROFILE Schema

The standardized structure every brand file follows, and every downstream skill consumes. Keep sections in this order. Every brand file must include these sections, even if the entry is "not applicable."

---

## Essence

One sentence. The brand's positioning, not the product. What makes this voice different from a competitor's.

## Audience

Who the brand is writing to. Include segmentation splits if relevant (e.g., "Beanie buyers want speed; clothing buyers want identity.").

## Voice

- **Is:** 4–6 adjectives that define the voice.
- **Is not:** 4–6 anti-adjectives — what the voice rejects.
- **Core tension:** The signature contradiction or balance the voice holds. This is often what makes the voice recognizable (e.g., "serious but fun," "luxurious but accessible," "blunt but warm").

## Writing Principles

Numbered rules for HOW this brand writes. Short, memorable, enforceable. Typically 3–7. Each principle should be something a writer can apply or a reviewer can check against.

## Form & Format

How this brand puts sentences together. Bullet list is the default. When a brand has a distinctive signature in one dimension (rhythm, capitalization, punctuation, parentheticals), promote that dimension to its own sub-heading with as much room as it needs — don't cram a defining syntactic move into a single bullet just to fit the template.

Default fields (every brand fills all of these explicitly — silence causes interpretation drift):

- **Rhythm:** sentence length norms, fragmentation, pacing.
- **Capitalization:** conventions for headlines, subject lines, body, CTAs.
- **Length:** word count ceilings for campaign emails, flow emails, SMS.
- **Emojis:** allowed, banned, or conditional. Name the contexts.
- **First person:** when "I/we" is allowed vs. when the voice stays brand-level. Name who "I" is if applicable.
- **Punctuation quirks:** em dashes, ellipses, exclamation marks, parentheticals, question use — anything specific to this brand.

If a dimension is part of the brand's identity (e.g., FatSwag's all-caps fragments, RGW's parentheticals-as-wit, Adina's no-exclamation discipline), expand it into a sub-section.

## Subject Lines

- **Length range:** word count or character guidance.
- **Tone:** insider, formal, playful, urgent, etc.
- **Good examples:** 5–8 real or representative examples.
- **Bad examples:** 3–5 with the specific reason each fails.

## CTAs

- **Approved vocabulary:** the phrases that fit the voice.
- **Banned generics:** "Shop Now," "Buy Now," etc. if they don't fit.
- **Examples:** both directions.

## Email Types

Brand-specific playbook per email type the brand actually runs. Each entry should be tight (3-6 lines), not an essay.

**Voice stays constant. Tone shifts with context.** Win-back can't read like welcome. A post-purchase email isn't a campaign. The voice is the same across all of them — what varies is the tone the voice takes on for the moment. Call out tone shifts when they matter; if an email type uses default brand voice, don't pad the entry.

Each entry covers:
- **Structure** — sections/modules that appear
- **Copy approach** — what the copy does here specifically
- **Tone shift** (when applicable) — how the voice adjusts for this context (e.g., "warmer than campaigns; the customer just bought, this is gratitude not a pitch")
- **Overrides** (when applicable) — rules from the general voice that this type breaks

Common types to cover if the brand runs them: weekly/seasonal campaign, product launch or drop, sale / promo, VIP / exclusive access, abandoned cart, welcome, post-purchase, browse abandonment, win-back. Only include what the brand actually sends.

## Banned Moves (Brand-Specific)

Things _this brand in particular_ never does. Do not duplicate universal banned moves here — those live in `references/universal-banned-moves.md` and apply globally.

Examples of what belongs here:
- Brand-specific forbidden words ("Never use 'real' as a qualifier" for FatSwag)
- Narrative choices the brand avoids (e.g., Adina never pitches modesty as a talking point)
- Tone shifts that break identity (e.g., Scherber never gets cute about tactical gear)

## Brand Facts

Reference data a writer or reviewer might need to get right:

- Brand name conventions (spelling, capitalization)
- Founder or spokesperson name usage
- Free shipping threshold
- Discount range ceilings for campaigns vs. flows
- Sizing, product lines, or SKU conventions
- Key numbers (list size, drop cadence, etc.)
- Primary URL / handle

## Audience Segmentation

If the brand has meaningfully different voice rules per segment, list them here. Otherwise say "unified audience."

## Design References

- Voice reference brands (who the written tone resembles)
- Visual reference brands (who the design resembles)

## Extras

Anything that doesn't fit the schema but matters. Quirks, inside-the-brand context, history. Better to put it here than to mangle it into a schema slot.

## References

The brand file is the handoff profile. Deeper content lives in `brands/<slug>/references/` and loads on demand from downstream skills.

**Required:**

- `references/copy-samples.md` — annotated real sends. The single fastest way to calibrate a copywriter to the voice. A brand file without copy samples is a draft, not a profile. Use `mc-brand-voice/references/copy-samples-template.md` as the starting scaffold.

**Recommended (include when the brand has the content):**

- `references/pre-send-checklist.md` — brand-specific QA checklist consumed by the pre-send review skill
- `references/sms-vocabulary.md` — approved phrasing/slang (especially for brands with distinctive vocabulary)
- `references/subject-line-bank.md` — historical high-performers
- `references/client-feedback-log.md` — running notes from reviewer sessions (e.g., Michal/Noach for Adina)
- `references/seasonal-calendar.md` — brand-specific holiday/cadence beats

---

## Consumption Pattern

Downstream skills should:

1. Read the whole brand file once at activation.
2. Treat `Writing Principles`, `Banned Moves (Brand-Specific)`, and universal banned moves as hard constraints.
3. Treat `Email Types` as the playbook for structure.
4. Reach into brand-file `references/` only when the task needs depth (e.g., SMS writing pulls vocabulary; pre-send review pulls the checklist).
5. Never summarize or paraphrase the brand file into a shorter profile for internal use — the brand file IS the profile.
