import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SUBJECT_LINE_GENERATION_SYSTEM_PROMPT, SUBJECT_LINE_GENERATION_USER_PROMPT } from '@/lib/prompts/subject-line-generation.prompt';
import { logger } from '@/lib/logger';

export const runtime = 'edge';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      logger.error('ANTHROPIC_API_KEY is missing');
      return NextResponse.json({ 
        code: 'INTERNAL_ERROR',
        message: 'Server configuration error: Missing API Key',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    const { emailContent } = await request.json();

    if (!emailContent) {
      return NextResponse.json({ 
        code: 'VALIDATION_ERROR',
        message: 'Email content is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Safe replacement
    const prompt = SUBJECT_LINE_GENERATION_USER_PROMPT.replace('{{EMAIL_CONTENT}}', emailContent || '');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929', // Using the 4.5 model as per project configuration
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
      
      // Validate/Normalize structure
      if (data.options && Array.isArray(data.options)) {
        data.options = data.options.map((opt: any) => ({
          subject: opt.subject || '',
          preview_text: opt.preview_text || '',
          type: opt.type || opt.tone || 'General', // Fallback for legacy/hallucinated keys
          score: typeof opt.score === 'number' ? opt.score : 0,
          explanation: opt.explanation || ''
        }));
      }
    } catch (e) {
      logger.error('Failed to parse JSON response:', content);
      return NextResponse.json({ 
        code: 'EXTERNAL_API_ERROR',
        message: 'Failed to generate valid JSON from AI',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    logger.error('Error generating subject lines:', error);
    const errorMessage = error.message || 'Internal Server Error';
    return NextResponse.json({ 
      code: 'INTERNAL_ERROR',
      message: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
