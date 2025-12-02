import { createEdgeClient } from '@/lib/supabase/edge';
import { generateText } from 'ai';
import { gateway, MODELS } from '@/lib/ai-providers';

export const runtime = 'edge';

/**
 * Auto-generate conversation title using a low-cost AI model
 * Uses GPT-5 mini (OpenAI) or Claude Haiku (Anthropic) for cost efficiency
 * 
 * This runs asynchronously in the background after the first message is sent.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userMessage } = await req.json();

    if (!userMessage || typeof userMessage !== 'string') {
      return new Response(
        JSON.stringify({ error: 'User message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Use Edge-compatible Supabase client
    const supabase = createEdgeClient();
    
    // Verify conversation exists
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', id)
      .single();

    if (convError || !conversation) {
      console.error('[Title Generation] Conversation not found:', { id, error: convError?.message });
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate title using low-cost model via AI Gateway
    let title: string;

    // Try GPT-5 mini first (very cheap and fast)
    try {
      const { text } = await generateText({
        model: gateway.languageModel(MODELS.GPT_5_MINI),
        system: `You are a title generator. Output ONLY a short title, nothing else.
Rules:
- Exactly 4-5 words maximum
- No sentences, no explanations
- No quotes or punctuation
- Just the title words`,
        prompt: `Create a 4-5 word title for: ${userMessage.substring(0, 300)}`,
      });

      title = sanitizeTitle(text);
      console.log('[Title Generation] Generated with GPT-5 mini:', { id, title });
    } catch (error) {
      console.error('[Title Generation] GPT-5 mini failed, trying Claude Haiku:', error);
      // Fallback to Claude Haiku
      title = await generateWithAnthropic(userMessage);
    }

    // Update conversation title in database
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', id);

    if (updateError) {
      console.error('[Title Generation] Database update failed:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update title' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Title Generation] Success:', { id, title });
    return new Response(
      JSON.stringify({ title }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Title Generation] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate title',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Manually update conversation title (for user renaming)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title } = await req.json();

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Valid title is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const trimmedTitle = title.trim().substring(0, 100); // Max 100 chars

    // Use Edge-compatible Supabase client
    const supabase = createEdgeClient();
    
    const { data, error } = await supabase
      .from('conversations')
      .update({ title: trimmedTitle })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Title Update] Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update title' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ title: data.title }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Title Update] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update title',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function generateWithAnthropic(userMessage: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: gateway.languageModel(MODELS.CLAUDE_HAIKU),
      system: `Output ONLY a 4-5 word title. No explanations, no quotes, no punctuation.`,
      prompt: `Title for: ${userMessage.substring(0, 300)}`,
    });

    return sanitizeTitle(text);
  } catch (error) {
    console.error('Claude Haiku title generation failed:', error);
    return generateFallbackTitle(userMessage);
  }
}

/**
 * Sanitize and truncate the AI-generated title to ensure it's short
 */
function sanitizeTitle(text: string | undefined): string {
  if (!text) return 'New Conversation';
  
  // Clean up the text
  let title = text
    .trim()
    .replace(/^["']|["']$/g, '') // Remove surrounding quotes
    .replace(/[.!?:;,]+$/g, '')  // Remove trailing punctuation
    .replace(/^(Title:|Here's|The title is|I suggest)/i, '') // Remove common prefixes
    .trim();
  
  // Split into words and take only first 5
  const words = title.split(/\s+/).filter(w => w.length > 0);
  if (words.length > 5) {
    title = words.slice(0, 5).join(' ');
  }
  
  // Final length check (max 50 chars)
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }
  
  return title || 'New Conversation';
}

function generateFallbackTitle(userMessage: string): string {
  // Extract first 4-5 words as title
  const words = userMessage
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0)
    .slice(0, 5);
  
  return words.length > 0 
    ? words.join(' ').substring(0, 50)
    : 'New Conversation';
}
