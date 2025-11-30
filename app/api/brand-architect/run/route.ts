import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { gateway, MODELS } from '@/lib/ai-providers';

export const runtime = 'edge';

interface ArchitectRequest {
  phase: 'ingestion' | 'interview' | 'calibration' | 'synthesis';
  data: any;
}

export async function POST(req: NextRequest) {
  try {
    const body: ArchitectRequest = await req.json();
    const { phase, data } = body;

    switch (phase) {
      case 'ingestion':
        return await handleIngestion(data);
      case 'interview':
        return await handleInterview(data);
      case 'calibration':
        return await handleCalibration(data);
      case 'synthesis':
        return await handleSynthesis(data);
      default:
        return NextResponse.json({ error: 'Invalid phase' }, { status: 400 });
    }
  } catch (error) {
    console.error('Brand Architect Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Phase 1: Ingestion & Analysis
async function handleIngestion(data: { text?: string; url?: string }) {
  // In a real implementation, we would:
  // 1. Scrape the URL if provided
  // 2. Parse files if provided
  // 3. Combine with raw text
  // 4. Send to LLM for initial analysis
  
  // Mock response for now as per plan scaffold
  return NextResponse.json({
    success: true,
    analysis: "Initial analysis complete. Detected professional but approachable tone.",
    next_action: "start_interview"
  });
}

// Phase 2: Interview Question Generation
async function handleInterview(data: { chatHistory: Array<{ role: string; content: string }> }) {
  const systemPrompt = `
    You are the Brand Voice Architect. Your goal is to extract a distinct persona from the user.
    Analyze the conversation history and ask a high-leverage question to identify tonal nuance.
    Focus on: Humor, Formality, Empathy, and specific vocabulary preferences.
    Keep questions short and conversational.
  `;

  // Convert chat history to a formatted prompt string
  // The Vercel AI SDK's generateText expects either `prompt` or properly formatted `messages`
  const conversationContext = data.chatHistory
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const { text } = await generateText({
    model: gateway.languageModel(MODELS.GPT_5),
    system: systemPrompt,
    prompt: `Based on this conversation history, generate the next interview question:\n\n${conversationContext}`,
  });

  return NextResponse.json({
    message: text
  });
}

// Phase 3: Calibration (A/B Testing) Generation
async function handleCalibration(data: { 
  round: number; 
  previousFeedback?: string; 
  context: any;
}) {
  const systemPrompt = `
    You are a Copywriting Expert. Generate two distinct versions of a "Welcome Email" based on the user's context.
    
    Round ${data.round}:
    - Option A should be: Safe, Benefit-focused.
    - Option B should be: Bold, Narrative-focused.
    
    ${data.previousFeedback ? `Take into account this feedback: "${data.previousFeedback}"` : ''}
    
    Return JSON: { "options": [{ "id": "A", "content": "...", "label": "Option A", "style_notes": "..." }, { "id": "B", "content": "...", "label": "Option B", "style_notes": "..." }] }
  `;

  const { text } = await generateText({
    model: gateway.languageModel(MODELS.GPT_5),
    system: systemPrompt,
    prompt: "Generate calibration options.",
  });

  const content = JSON.parse(text || "{}");

  return NextResponse.json(content);
}

// Phase 4: Synthesis (Final JSON Profile)
async function handleSynthesis(data: { 
  chatHistory: any[]; 
  calibrationResults: any[]; 
}) {
  const systemPrompt = `
    You are the Brand Voice Architect. Synthesize the entire session into a structured BrandVoiceProfile JSON.
    
    Schema:
    {
      identity: { archetype, core_vibe, mission_statement },
      tonal_settings: { formality (1-10), enthusiasm (1-10), empathy (1-10), humor (1-10) },
      linguistics: { do_list[], dont_list[], vocabulary_allow[], vocabulary_ban[], syntax_rules },
      examples: { generic_rewrite, on_brand_rewrite }
    }
    
    Ensure "Do's and Don'ts" are specific (e.g., "Never use the word 'delighted'"), not generic.
  `;

  const { text } = await generateText({
    model: gateway.languageModel(MODELS.GPT_5),
    system: systemPrompt,
    prompt: JSON.stringify(data),
  });

  const profile = JSON.parse(text || "{}");

  return NextResponse.json({ profile });
}
