import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'edge';

/**
 * Auto-generate conversation title using a low-cost AI model
 * Uses GPT-4o-mini (OpenAI) or Claude Haiku (Anthropic) for cost efficiency
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

    // Verify conversation exists
    const supabase = await createClient();
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', id)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate title using low-cost model
    let title: string;

    // Try OpenAI first (GPT-4o-mini is very cheap)
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini', // Very low cost model
          messages: [
            {
              role: 'system',
              content: 'Generate a concise, descriptive 3-6 word title for this conversation. Be specific about the topic. Do not use quotes or punctuation at the end.',
            },
            {
              role: 'user',
              content: userMessage.substring(0, 500), // Limit input for cost
            },
          ],
          max_tokens: 20,
          temperature: 0.7,
        });

        title = response.choices[0]?.message?.content?.trim() || 'New Conversation';
      } catch (error) {
        console.error('OpenAI title generation failed:', error);
        // Fallback to Anthropic
        title = await generateWithAnthropic(userMessage);
      }
    } else if (process.env.ANTHROPIC_API_KEY) {
      title = await generateWithAnthropic(userMessage);
    } else {
      // Fallback: Extract first few words
      title = generateFallbackTitle(userMessage);
    }

    // Update conversation title
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating conversation title:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update title' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ title }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating conversation title:', error);
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
 * Manually update conversation title
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

    // Update conversation title
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('conversations')
      .update({ title: trimmedTitle })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating conversation title:', error);
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
    console.error('Error updating conversation title:', error);
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
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Very low cost model
      max_tokens: 30,
      messages: [
        {
          role: 'user',
          content: `Generate a concise, descriptive 3-6 word title for this conversation. Be specific about the topic. Do not use quotes or punctuation at the end.\n\nMessage: ${userMessage.substring(0, 500)}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text.trim() || 'New Conversation';
    }
    return 'New Conversation';
  } catch (error) {
    console.error('Anthropic title generation failed:', error);
    return generateFallbackTitle(userMessage);
  }
}

function generateFallbackTitle(userMessage: string): string {
  // Extract first 5-6 words as title
  const words = userMessage
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0)
    .slice(0, 6);
  
  return words.length > 0 
    ? words.join(' ').substring(0, 50) + (words.length >= 6 ? '...' : '')
    : 'New Conversation';
}

