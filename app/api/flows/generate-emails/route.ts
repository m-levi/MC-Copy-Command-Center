import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FlowOutlineData, EmailType, AIModel } from '@/types';
import { buildFlowEmailPrompt } from '@/lib/flow-prompts';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'edge';
export const maxDuration = 300; // 5 minutes for generating multiple emails

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, flowType, outline, model, emailType } = body as {
      conversationId: string;
      flowType: string;
      outline: FlowOutlineData;
      model: AIModel;
      emailType: EmailType;
    };

    // Validate conversation exists and user has access
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*, brands(*)')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Create flow outline record
    const { data: flowOutline, error: outlineError } = await supabase
      .from('flow_outlines')
      .insert({
        conversation_id: conversationId,
        flow_type: flowType,
        outline_data: outline,
        approved: true,
        approved_at: new Date().toISOString(),
        email_count: outline.emails.length
      })
      .select()
      .single();

    if (outlineError) {
      console.error('Error creating flow outline:', outlineError);
      return NextResponse.json({ error: 'Failed to save outline' }, { status: 500 });
    }

    // Build brand context
    const brandInfo = `
Brand Name: ${conversation.brands.name}
Brand Details: ${conversation.brands.brand_details || 'N/A'}
Brand Guidelines: ${conversation.brands.brand_guidelines || 'N/A'}
Copywriting Style Guide: ${conversation.brands.copywriting_style_guide || 'N/A'}
${conversation.brands.website_url ? `Website: ${conversation.brands.website_url}` : ''}
`.trim();

    // Generate each email sequentially with progress updates
    const results = [];
    
    for (let i = 0; i < outline.emails.length; i++) {
      const emailOutline = outline.emails[i];
      
      try {
        console.log(`[Flow Generator] Creating email ${emailOutline.sequence} of ${outline.emails.length}`);
        
        // Create child conversation
        const { data: childConversation, error: childError } = await supabase
          .from('conversations')
          .insert({
            brand_id: conversation.brand_id,
            user_id: user.id,
            title: `${outline.flowName} - Email ${emailOutline.sequence}`,
            model,
            conversation_type: 'email',
            mode: 'email_copy',
            parent_conversation_id: conversationId,
            is_flow: false,
            flow_sequence_order: emailOutline.sequence,
            flow_email_title: emailOutline.title
          })
          .select()
          .single();

        if (childError || !childConversation) {
          throw new Error(`Failed to create child conversation for email ${emailOutline.sequence}`);
        }

        console.log(`[Flow Generator] Generating content for email ${emailOutline.sequence}`);
        
        // Generate email content using STANDARD email format
        const prompt = buildFlowEmailPrompt(
          emailOutline,
          outline,
          brandInfo,
          '', // RAG context - can be added later
          emailType
        );

        let emailContent = '';

        if (model === 'claude-4.5-sonnet') {
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            thinking: {
              type: 'enabled',
              budget_tokens: 2000
            },
            messages: [{
              role: 'user',
              content: prompt
            }]
          });

          // Extract content from response
          for (const block of response.content) {
            if (block.type === 'text') {
              emailContent += block.text;
            }
          }
        } else {
          // GPT-5 or other OpenAI models
          const response = await openai.chat.completions.create({
            model: model === 'gpt-5' ? 'gpt-5-preview' : 'gpt-4o',
            messages: [{
              role: 'user',
              content: prompt
            }],
            max_completion_tokens: 4000,
            reasoning_effort: 'high'
          });

          emailContent = response.choices[0]?.message?.content || '';
        }

        // Save email as first message in child conversation
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: childConversation.id,
            role: 'assistant',
            content: emailContent
          });

        if (messageError) {
          throw new Error(`Failed to save message for email ${emailOutline.sequence}`);
        }

        console.log(`[Flow Generator] Successfully created email ${emailOutline.sequence}`);
        
        results.push({
          success: true,
          conversationId: childConversation.id,
          sequence: emailOutline.sequence
        });
      } catch (error) {
        console.error(`Error generating email ${emailOutline.sequence}:`, error);
        results.push({
          success: false,
          sequence: emailOutline.sequence,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Check for failures
    const failures = results.filter(r => !r.success);
    const successes = results.filter(r => r.success);

    return NextResponse.json({
      success: successes.length > 0,
      outlineId: flowOutline.id,
      children: successes.map(r => r.conversationId),
      generated: successes.length,
      failed: failures.length,
      failures: failures.length > 0 ? failures : undefined
    });

  } catch (error) {
    console.error('Error in generate-emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

