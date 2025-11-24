import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SUBJECT_LINE_GENERATION_SYSTEM_PROMPT, SUBJECT_LINE_GENERATION_USER_PROMPT } from '@/lib/prompts/subject-line-generation.prompt';

export const runtime = 'edge';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { emailContent } = await request.json();

    if (!emailContent) {
      return NextResponse.json({ error: 'Email content is required' }, { status: 400 });
    }

    const prompt = SUBJECT_LINE_GENERATION_USER_PROMPT.replace('{{EMAIL_CONTENT}}', emailContent);

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      temperature: 0.7,
      system: SUBJECT_LINE_GENERATION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Parse the JSON response
    let content = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Extract JSON if it's wrapped in something
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }

    let data;
    try {
      data = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse JSON response:', content);
      return NextResponse.json({ error: 'Failed to generate valid JSON' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating subject lines:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

