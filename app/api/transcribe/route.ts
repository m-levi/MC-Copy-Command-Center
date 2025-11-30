import OpenAI from 'openai';

export const runtime = 'edge';

// OpenAI client for Whisper transcription
// Note: Whisper is not part of the Vercel AI SDK, so we use the direct OpenAI client
function getOpenAIClient() {
  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('No API key configured');
  }
  
  return new OpenAI({
    apiKey,
    // Use AI Gateway if available
    ...(process.env.AI_GATEWAY_API_KEY && {
      baseURL: 'https://api.vercel.ai/v1',
    }),
  });
}

/**
 * Transcribe audio to text using OpenAI's Whisper API
 * Supports WAV, MP3, M4A, and other audio formats
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'en';

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'Audio file is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const openai = getOpenAIClient();

    // Transcribe using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: language,
      response_format: 'json',
    });

    return new Response(
      JSON.stringify({ 
        text: transcription.text,
        language: language,
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Transcription error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to transcribe audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
