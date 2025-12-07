import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gateway, getProviderOptions } from '@/lib/ai-providers';
import { MODELS } from '@/lib/ai-constants';
import { generateText } from 'ai';
import { BrandVoiceData } from '@/types';
import { STANDARD_EMAIL_SYSTEM_PROMPT, buildStandardEmailPrompt } from '@/lib/prompts/standard-email.prompt';

export const maxDuration = 60;

// Use Opus for highest quality voice extraction
const VOICE_MODEL = MODELS.CLAUDE_OPUS;

// Thinking budget for deep analysis
const THINKING_BUDGET = 10000;

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const ANALYZE_SYSTEM = `You are a Brand Voice Architect. Your job is to analyze brand materials and create a condensed, AI-optimized brand voice document.

## YOUR TASK

The user will give you brand materials (website copy, emails, style guides, product descriptions, etc.). You will:

1. **ANALYZE** — Extract the voice patterns: tone, vocabulary, rhythm, personality, what makes this brand sound like THIS brand
2. **DRAFT** — Create a condensed brand voice doc in the exact JSON format below
3. **DEMONSTRATE** — Write 2 sample email snippets showing this brand's voice

## CRITICAL RULES

- Extract ACTUAL phrases and patterns from their materials — DON'T invent a voice, DISCOVER it
- Keep the voice doc between 300-400 words total. Lean is better than comprehensive.
- The "bad_copy_example" should be a clear contrast — show what they'd NEVER say
- Proof points must be REAL facts from their materials. If you don't see specific stats, note "[Add specific stat]"
- The sample emails should feel UNMISTAKABLY like this brand, not generic marketing

## OUTPUT FORMAT

You MUST respond with this exact JSON structure wrapped in a code block:

\`\`\`json
{
  "brand_summary": "BrandName — what they sell for who they serve",
  "voice_description": "2-3 word description. Think: like a [analogy — 'like a trusted friend who happens to be an expert']",
  "we_sound": [
    {"trait": "Confident", "explanation": "We state things directly without hedging"},
    {"trait": "Warm", "explanation": "We talk like a friend, not a corporation"}
  ],
  "we_never_sound": ["Corporate/stiff", "Salesy/pushy", "Generic/bland"],
  "vocabulary": {
    "use": ["words and phrases they actually use"],
    "avoid": ["words that would feel off-brand"]
  },
  "proof_points": ["Real facts, stats, trust markers from their materials"],
  "audience": "Who they are, what they care about, how they talk — 2-3 sentences",
  "good_copy_example": "An actual line from their materials that captures their voice perfectly",
  "bad_copy_example": "What this brand would NEVER say — clear contrast",
  "patterns": "Signature phrases, structural rhythms, formatting quirks — what makes their copy feel distinctly THEM"
}
\`\`\`

Then provide 2 sample emails demonstrating this voice using the STANDARD EMAIL FORMAT:

\`\`\`email_product
**HERO SECTION:**
- **Headline:** [6-8 words, benefit-focused, brand voice]
- **Sub-headline:** [One sentence, 15 words max]
- **Call to Action Button:** [2-4 words]

**Section Title:** [Descriptive name]
- **Headline:** [6-8 words max]
- **Content:** [Bullets or short paragraph, 30 words max]

**FINAL CTA SECTION:**
- **Headline:** [Creates urgency in brand voice]
- **Sub-headline:** [One sentence removing friction]
- **Call to Action Button:** [Action button text]
\`\`\`

\`\`\`email_content
**HERO SECTION:**
- **Headline:** [Educational/value-focused headline, 6-8 words]
- **Sub-headline:** [Sets up the value, 15 words max]
- **Call to Action Button:** [2-4 words]

**Section Title:** [What You'll Learn/Get]
- **Headline:** [Section headline]
- **Content:**
  • [Key point 1 - start with power word]
  • [Key point 2 - start with power word]
  • [Key point 3 - start with power word]

**Section Title:** [Supporting Section]
- **Headline:** [6-8 words]
- **Content:** [Brief paragraph, 30 words max]

**FINAL CTA SECTION:**
- **Headline:** [Ties back to value]
- **Sub-headline:** [One sentence]
- **Call to Action Button:** [Action button text]
\`\`\`

After the samples, add a brief note:
"Here's my first read on [Brand]'s voice. Tell me what feels right and what's off — we can tweak anything."`;

const REFINE_SYSTEM = `You are a Brand Voice Architect refining a brand voice based on user feedback.

## CURRENT VOICE PROFILE
{{CURRENT_VOICE}}

## ORIGINAL MATERIALS
{{MATERIALS}}

## YOUR TASK

The user has given feedback on the voice profile. Your job:
1. Acknowledge their specific feedback
2. Explain what you're changing and why
3. Output the UPDATED voice profile in the same JSON format
4. Generate NEW sample emails demonstrating the changes (use the STANDARD EMAIL FORMAT with HERO SECTION, Section Title sections, and FINAL CTA SECTION)
5. Ask if it feels better or needs more tweaking

Be collaborative. Make them feel heard. Show the contrast between old and new where relevant.

Use the same output format:
- JSON code block with the updated voice profile
- Two email samples (email_product and email_content) using standard format
- Brief closing note asking for more feedback`;

// ============================================================================
// HELPERS
// ============================================================================

function extractJSON(text: string): BrandVoiceData | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    
    const cleaned = text.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function extractEmails(text: string): { product?: string; content?: string } {
  const productMatch = text.match(/```email_product\s*([\s\S]*?)```/);
  const contentMatch = text.match(/```email_content\s*([\s\S]*?)```/);
  
  return {
    product: productMatch ? productMatch[1].trim() : undefined,
    content: contentMatch ? contentMatch[1].trim() : undefined,
  };
}

/**
 * Build brand voice guidelines from BrandVoiceData for use in email prompts
 */
function buildBrandVoiceGuidelines(voiceData: BrandVoiceData): string {
  return `
BRAND: ${voiceData.brand_summary || 'Unknown'}

VOICE: ${voiceData.voice_description || ''}

WE SOUND:
${voiceData.we_sound?.map(t => `- ${t.trait}: ${t.explanation}`).join('\n') || '- No specific traits defined'}

WE NEVER SOUND:
${voiceData.we_never_sound?.map(s => `- ${s}`).join('\n') || '- No anti-patterns defined'}

VOCABULARY:
Use: ${voiceData.vocabulary?.use?.join(', ') || 'No specific words'}
Avoid: ${voiceData.vocabulary?.avoid?.join(', ') || 'No words to avoid'}

AUDIENCE: ${voiceData.audience || 'General audience'}

GOOD COPY EXAMPLE:
"${voiceData.good_copy_example || 'No example provided'}"

PATTERNS: ${voiceData.patterns || 'No specific patterns'}
`.trim();
}

// ============================================================================
// HANDLERS
// ============================================================================

async function handleAnalyze(brandName: string, materials: string) {
  const model = gateway.languageModel(VOICE_MODEL);
  
  const prompt = `## BRAND: ${brandName}

## MATERIALS TO ANALYZE:

${materials}

---

Analyze these materials and create the brand voice document with sample emails.`;
  
  const result = await generateText({
    model,
    system: ANALYZE_SYSTEM,
    prompt,
    temperature: 1, // Higher temperature for creative, varied output
    maxOutputTokens: 8000,
    // Enable extended thinking for deep brand analysis
    providerOptions: getProviderOptions(VOICE_MODEL, THINKING_BUDGET),
  });

  const voiceData = extractJSON(result.text);
  const emails = extractEmails(result.text);
  
  if (!voiceData) {
    throw new Error('Failed to parse voice profile from AI response');
  }

  return {
    message: result.text,
    voiceData,
    sampleEmails: emails,
  };
}

async function handleRefine(
  brandName: string,
  currentVoice: BrandVoiceData,
  materials: string,
  feedback: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
) {
  const model = gateway.languageModel(VOICE_MODEL);
  
  const systemPrompt = REFINE_SYSTEM
    .replace('{{CURRENT_VOICE}}', JSON.stringify(currentVoice, null, 2))
    .replace('{{MATERIALS}}', materials.substring(0, 2000));
  
  const conversationContext = conversationHistory
    .slice(-6)
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
  
  const prompt = `${conversationContext ? `## PREVIOUS CONVERSATION:\n${conversationContext}\n\n` : ''}## NEW FEEDBACK:
${feedback}

---

Update the voice profile based on this feedback.`;
  
  const result = await generateText({
    model,
    system: systemPrompt,
    prompt,
    temperature: 1,
    maxOutputTokens: 8000,
    // Enable extended thinking for thoughtful refinement
    providerOptions: getProviderOptions(VOICE_MODEL, THINKING_BUDGET),
  });

  const voiceData = extractJSON(result.text);
  const emails = extractEmails(result.text);

  return {
    message: result.text,
    voiceData: voiceData || currentVoice,
    sampleEmails: emails,
  };
}

/**
 * Generate a sample email using the EXACT STANDARD EMAIL PROMPT
 * This ensures the sample emails match the quality of actual email generation
 */
async function handleGenerateSample(voiceData: BrandVoiceData, scenario: string) {
  const model = gateway.languageModel(VOICE_MODEL);
  
  // Build brand voice guidelines from the voice data
  const brandVoiceGuidelines = buildBrandVoiceGuidelines(voiceData);
  
  // Build a copy brief for the scenario
  const copyBrief = `
Email Type: ${scenario}
Brand: ${voiceData.brand_summary || 'Unknown brand'}

Goal: Create a high-converting ${scenario} email that demonstrates this brand's authentic voice.

This is a sample email to showcase the brand voice profile. Make it feel authentic, conversion-ready, and unmistakably like this brand.

Requirements:
- Use the brand voice profile exactly as specified
- Follow F-pattern optimization for scanning
- Vary content formats (bullets, short paragraphs, stats)
- Create urgency without being pushy
- Every word should sound distinctly like THIS brand
`;

  // Use the EXACT buildStandardEmailPrompt function
  const userPrompt = buildStandardEmailPrompt({
    copyBrief,
    brandVoiceGuidelines,
    additionalContext: `This is a sample email for demonstrating the brand voice. Focus on making every word sound authentically like ${voiceData.brand_summary || 'the brand'}.`,
  });

  const result = await generateText({
    model,
    system: STANDARD_EMAIL_SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 1, // Match main chat temperature
    maxOutputTokens: 20000, // Match main chat max tokens
    // Enable extended thinking for quality email generation
    providerOptions: getProviderOptions(VOICE_MODEL, THINKING_BUDGET),
  });

  // Extract email from code block - look for the structured email content
  const emailMatch = result.text.match(/```[\s\S]*?((?:\*\*HERO|\*\*Hero)[\s\S]*?)```/i);
  const email = emailMatch ? emailMatch[1].trim() : result.text;
  
  return { email, message: result.text };
}

async function handleSave(brandId: string, voiceData: BrandVoiceData) {
  const supabase = await createClient();
  
  const textVersion = buildBrandVoiceGuidelines(voiceData);

  const { error } = await supabase
    .from('brands')
    .update({
      brand_voice: voiceData,
      copywriting_style_guide: textVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', brandId);

  if (error) throw error;
  
  return { success: true };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: Request) {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'analyze': {
        const { brandName, materials } = body;
        if (!materials || materials.trim().length < 100) {
          return NextResponse.json({ 
            error: 'Please provide more brand materials (at least 100 characters of website copy, emails, etc.)' 
          }, { status: 400 });
        }
        const result = await handleAnalyze(brandName, materials);
        return NextResponse.json(result);
      }

      case 'refine': {
        const { brandName, currentVoice, materials, feedback, conversationHistory } = body;
        if (!currentVoice) {
          return NextResponse.json({ error: 'No voice profile to refine' }, { status: 400 });
        }
        const result = await handleRefine(brandName, currentVoice, materials || '', feedback, conversationHistory || []);
        return NextResponse.json(result);
      }

      case 'generate_sample': {
        const { voiceData, scenario } = body;
        if (!voiceData) {
          return NextResponse.json({ error: 'No voice profile provided' }, { status: 400 });
        }
        const result = await handleGenerateSample(voiceData, scenario);
        return NextResponse.json(result);
      }

      case 'save': {
        const { brandId, voiceData } = body;
        if (!voiceData) {
          return NextResponse.json({ error: 'No voice profile to save' }, { status: 400 });
        }
        const result = await handleSave(brandId, voiceData);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[Voice Builder] Error:', error);
    return NextResponse.json(
      { 
        error: 'Voice builder failed', 
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
