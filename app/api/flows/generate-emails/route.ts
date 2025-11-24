import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FlowOutlineData, AIModel, FlowOutlineEmail } from '@/types';
import { buildFlowEmailPrompt } from '@/lib/flow-prompts';
import { getActiveDebugPrompt, determinePromptType } from '@/lib/debug-prompts';
import { generateMermaidChart } from '@/lib/mermaid-generator';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'edge';
export const maxDuration = 300; // 5 minutes for generating multiple emails

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // Add beta headers for web search and memory tools
  defaultHeaders: {
    'anthropic-beta': 'web-search-2025-03-05,context-management-2025-06-27'
  }
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
    const { conversationId, flowType, outline, model } = body as {
      conversationId: string;
      flowType: string;
      outline: FlowOutlineData;
      model: AIModel;
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

    // Generate Mermaid chart
    const mermaidChart = generateMermaidChart(outline);

    // Create flow outline record
    const { data: flowOutline, error: outlineError } = await supabase
      .from('flow_outlines')
      .insert({
        conversation_id: conversationId,
        flow_type: flowType,
        outline_data: outline,
        mermaid_chart: mermaidChart,
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
    const startTime = Date.now();
    
    console.log(`[Flow Generator] Starting generation of ${outline.emails.length} emails for flow: ${outline.flowName}`);
    
    const generateEmail = async (emailOutline: FlowOutlineEmail) => {
      const emailStartTime = Date.now();

      try {
        console.log(`[Flow Generator] ===== EMAIL ${emailOutline.sequence}/${outline.emails.length} START =====`);
        console.log(`[Flow Generator] Title: ${emailOutline.title}`);
        console.log(`[Flow Generator] Purpose: ${emailOutline.purpose}`);

        console.log(`[Flow Generator] Creating child conversation...`);
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

        if (childError) {
          console.error(`[Flow Generator] Database error creating conversation:`, childError);
          throw new Error(`Failed to create child conversation: ${childError.message}`);
        }

        if (!childConversation) {
          throw new Error(`Failed to create child conversation: No data returned`);
        }

        console.log(`[Flow Generator] Child conversation created: ${childConversation.id}`);
        console.log(`[Flow Generator] Generating email content using ${emailOutline.emailType} format...`);

        let prompt = buildFlowEmailPrompt(
          emailOutline,
          outline,
          brandInfo,
          '', // RAG context - can be added later
          emailOutline.emailType
        );

        // DEBUG MODE: Check for custom prompt overrides
        // For flows, we use single 'flow_email' type
        const customPrompt = await getActiveDebugPrompt(supabase, user.id, 'flow_email');

        if (customPrompt && customPrompt.user_prompt) {
           console.log(`[Flow Generator] 🐛 DEBUG MODE: Overriding flow prompt with custom prompt: ${customPrompt.name}`);
           // Replace variables manually since we are bypassing the builder
           prompt = customPrompt.user_prompt
              .replace(/{{EMAIL_SEQUENCE}}/g, emailOutline.sequence.toString())
              .replace(/{{TOTAL_EMAILS}}/g, outline.emails.length.toString())
              .replace(/{{FLOW_NAME}}/g, outline.flowName)
              .replace(/{{BRAND_INFO}}/g, brandInfo)
              .replace(/{{RAG_CONTEXT}}/g, '') // RAG context empty for now
              .replace(/{{FLOW_GOAL}}/g, outline.goal)
              .replace(/{{TARGET_AUDIENCE}}/g, outline.targetAudience)
              .replace(/{{EMAIL_TITLE}}/g, emailOutline.title)
              .replace(/{{EMAIL_TIMING}}/g, emailOutline.timing)
              .replace(/{{EMAIL_PURPOSE}}/g, emailOutline.purpose)
              .replace(/{{KEY_POINTS}}/g, emailOutline.keyPoints.map(p => `- ${p}`).join('\n'))
              .replace(/{{PRIMARY_CTA}}/g, emailOutline.cta)
              // Specific variables
              .replace(/{{SUBJECT_LINE_GUIDANCE}}/g, emailOutline.emailType === 'design' ? 'Compelling subject line' : 'Personal subject line')
              .replace(/{{POSITION_GUIDANCE}}/g, `This is email ${emailOutline.sequence} of ${outline.emails.length}`);
        }

        console.log(
          `[Flow Generator] Using ${
            (customPrompt && customPrompt.user_prompt) ? `CUSTOM_DEBUG_PROMPT (${customPrompt.name})` : (emailOutline.emailType === 'design' ? 'STANDARD_EMAIL_PROMPT' : 'LETTER_EMAIL_PROMPT')
          } for Email ${emailOutline.sequence}`
        );

        console.log(`[Flow Generator] Calling Claude API...`);
        let emailContent = '';

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

        console.log(`[Flow Generator] Claude API response received`);
        console.log(`[Flow Generator] Response contains ${response.content.length} blocks`);

        for (const block of response.content) {
          if (block.type === 'text') {
            emailContent += block.text;
          }
        }

        console.log(`[Flow Generator] Extracted ${emailContent.length} characters of content`);

        if (!emailContent || emailContent.length === 0) {
          throw new Error(`No content generated for email ${emailOutline.sequence}`);
        }

        console.log(`[Flow Generator] Saving message to database...`);
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: childConversation.id,
            role: 'assistant',
            content: emailContent
          });

        if (messageError) {
          console.error(`[Flow Generator] Database error saving message:`, messageError);
          throw new Error(`Failed to save message: ${messageError.message}`);
        }

        const emailDuration = Date.now() - emailStartTime;
        console.log(`[Flow Generator] ✅ Email ${emailOutline.sequence} completed in ${emailDuration}ms`);
        console.log(`[Flow Generator] ===== EMAIL ${emailOutline.sequence}/${outline.emails.length} END =====\n`);

        return {
          success: true as const,
          conversationId: childConversation.id,
          sequence: emailOutline.sequence
        };
      } catch (error) {
        const emailDuration = Date.now() - emailStartTime;
        console.error(`[Flow Generator] ❌ Email ${emailOutline.sequence} FAILED after ${emailDuration}ms`);
        console.error(`[Flow Generator] Error details:`, error);
        console.error(`[Flow Generator] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');

        return {
          success: false as const,
          sequence: emailOutline.sequence,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    };

    const concurrencyLimit = 2;
    for (let i = 0; i < outline.emails.length; i += concurrencyLimit) {
      const batch = outline.emails.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(batch.map(generateEmail));
      results.push(...batchResults);
    }
    
    const totalDuration = Date.now() - startTime;
    console.log(`[Flow Generator] ===== FLOW GENERATION COMPLETE =====`);
    console.log(`[Flow Generator] Total time: ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}s)`);
    console.log(`[Flow Generator] Successful: ${results.filter(r => r.success).length}/${outline.emails.length}`);
    console.log(`[Flow Generator] Failed: ${results.filter(r => !r.success).length}/${outline.emails.length}`);
    
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

