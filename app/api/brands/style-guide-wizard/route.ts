import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { gateway, MODELS } from '@/lib/ai-providers';
import { WizardAnswers } from '@/lib/style-guide-wizard';

export const runtime = 'edge';

interface WizardRequest {
  brandId: string;
  brandName: string;
  step: 'examples' | 'generate-guide' | 'refine';
  currentAnswers: WizardAnswers;
  userFeedback?: {
    exampleId: string;
    rating: 'like' | 'dislike';
    comment?: string;
  };
  requestedRefinement?: string;
  existingStyleGuide?: string;
}

// Generate examples based on current answers
async function generateExamples(
  brandName: string,
  answers: WizardAnswers
): Promise<Array<{ id: string; type: string; content: string }>> {
  const answersText = Object.entries(answers)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: ${value.join(', ')}`;
      }
      return `${key}: ${value}`;
    })
    .join('\n');

  const prompt = `Based on these brand voice characteristics for ${brandName}, generate 3 diverse email copy examples:

${answersText}

Generate:
1. A subject line
2. An opening paragraph (hero/hook)
3. A call-to-action

Format your response as JSON:
{
  "subject": "...",
  "hero": "...",
  "cta": "..."
}

Make each example distinctive and showcase the brand voice based on the characteristics provided.`;

  const { text } = await generateText({
    model: gateway.languageModel(MODELS.CLAUDE_SONNET),
    prompt,
    maxRetries: 2,
  });

  const jsonMatch = text?.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    return [
      { id: 'subject-1', type: 'Subject Line', content: parsed.subject },
      { id: 'hero-1', type: 'Opening Paragraph', content: parsed.hero },
      { id: 'cta-1', type: 'Call-to-Action', content: parsed.cta },
    ];
  }

  throw new Error('Failed to parse examples response');
}

// Generate comprehensive style guide
async function generateStyleGuide(
  brandName: string,
  answers: WizardAnswers,
  feedback?: any
): Promise<string> {
  const answersText = Object.entries(answers)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: ${value.join(', ')}`;
      }
      return `${key}: ${value}`;
    })
    .join('\n');

  const feedbackText = feedback
    ? `\n\nUser Feedback:\n${JSON.stringify(feedback, null, 2)}`
    : '';

  const prompt = `Create a comprehensive copywriting style guide for ${brandName} based on these characteristics:

${answersText}${feedbackText}

Generate a well-structured style guide with these sections:

1. **Brand Voice Overview** - A concise summary of the brand voice
2. **Tone & Personality** - Detailed description of tone and personality traits
3. **Target Audience** - Who we're writing for and their characteristics
4. **Writing Style** - Sentence structure, language level, formatting preferences
5. **Do's** - Specific things to do (with examples)
6. **Don'ts** - Things to avoid (with examples)
7. **Example Phrases** - Preferred phrases and expressions
8. **Call-to-Action Guidelines** - How to write CTAs
9. **Email Structure** - Preferred email format and flow

Make it practical, specific, and actionable. Include concrete examples throughout.

Format as clean markdown with clear headers and bullet points.`;

  const { text } = await generateText({
    model: gateway.languageModel(MODELS.CLAUDE_SONNET),
    prompt,
    maxRetries: 2,
  });

  return text || '';
}

// Refine style guide based on user feedback
async function refineStyleGuide(
  brandName: string,
  currentStyleGuide: string,
  refinementRequest: string
): Promise<string> {
  const prompt = `Here is the current copywriting style guide for ${brandName}:

${currentStyleGuide}

The user requests this refinement: "${refinementRequest}"

Please update the style guide to incorporate this feedback. Maintain the overall structure but make the requested improvements.

Return the complete updated style guide in markdown format.`;

  const { text } = await generateText({
    model: gateway.languageModel(MODELS.CLAUDE_SONNET),
    prompt,
    maxRetries: 2,
  });

  return text || currentStyleGuide;
}

export async function POST(req: NextRequest) {
  try {
    const body: WizardRequest = await req.json();
    const { brandName, step, currentAnswers, userFeedback, requestedRefinement, existingStyleGuide } = body;

    if (!brandName) {
      return NextResponse.json(
        { error: 'Brand name is required' },
        { status: 400 }
      );
    }

    switch (step) {
      case 'examples': {
        const examples = await generateExamples(brandName, currentAnswers);
        return NextResponse.json({ examples });
      }

      case 'generate-guide': {
        const styleGuide = await generateStyleGuide(brandName, currentAnswers, userFeedback);
        return NextResponse.json({ styleGuide });
      }

      case 'refine': {
        if (!existingStyleGuide || !requestedRefinement) {
          return NextResponse.json(
            { error: 'Existing style guide and refinement request required' },
            { status: 400 }
          );
        }
        const refined = await refineStyleGuide(brandName, existingStyleGuide, requestedRefinement);
        return NextResponse.json({ styleGuide: refined });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid step' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Style guide wizard error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process wizard request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
