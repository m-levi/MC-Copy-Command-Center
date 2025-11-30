import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { gateway, MODELS, FLOW_EMAIL_OPTIONS } from '@/lib/ai-providers';
import { createClient } from '@/lib/supabase/server';
import { FlowOutlineData, AIModel, FlowOutlineEmail } from '@/types';
import { buildFlowEmailPrompt } from '@/lib/flow-prompts';
import { getActiveDebugPrompt } from '@/lib/debug-prompts';
import { generateMermaidChart } from '@/lib/mermaid-generator';
import { logger } from '@/lib/logger';

export const runtime = 'edge';
export const maxDuration = 300; // 5 minutes for generating multiple emails

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
      logger.error('Error creating flow outline:', outlineError);
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

    // Generate each email with progress updates
    const results = [];
    const startTime = Date.now();
    
    logger.log(`[Flow Generator] Starting generation of ${outline.emails.length} emails`);
    
    const generateEmail = async (emailOutline: FlowOutlineEmail) => {
      const emailStartTime = Date.now();

      try {
        logger.log(`[Flow Generator] Email ${emailOutline.sequence}/${outline.emails.length}: ${emailOutline.title}`);

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
          throw new Error(`Failed to create child conversation: ${childError?.message}`);
        }

        let prompt = buildFlowEmailPrompt(
          emailOutline,
          outline,
          brandInfo,
          '',
          emailOutline.emailType
        );

        // DEBUG MODE: Check for custom prompt overrides
        const customPrompt = await getActiveDebugPrompt(supabase, user.id, 'flow_email');

        if (customPrompt?.user_prompt) {
          logger.log(`[Flow Generator] Using custom prompt: ${customPrompt.name}`);
          prompt = customPrompt.user_prompt
            .replace(/{{EMAIL_SEQUENCE}}/g, emailOutline.sequence.toString())
            .replace(/{{TOTAL_EMAILS}}/g, outline.emails.length.toString())
            .replace(/{{FLOW_NAME}}/g, outline.flowName)
            .replace(/{{BRAND_INFO}}/g, brandInfo)
            .replace(/{{RAG_CONTEXT}}/g, '')
            .replace(/{{FLOW_GOAL}}/g, outline.goal)
            .replace(/{{TARGET_AUDIENCE}}/g, outline.targetAudience)
            .replace(/{{EMAIL_TITLE}}/g, emailOutline.title)
            .replace(/{{EMAIL_TIMING}}/g, emailOutline.timing)
            .replace(/{{EMAIL_PURPOSE}}/g, emailOutline.purpose)
            .replace(/{{KEY_POINTS}}/g, emailOutline.keyPoints.map(p => `- ${p}`).join('\n'))
            .replace(/{{PRIMARY_CTA}}/g, emailOutline.cta)
            .replace(/{{SUBJECT_LINE_GUIDANCE}}/g, emailOutline.emailType === 'design' ? 'Compelling subject line' : 'Personal subject line')
            .replace(/{{POSITION_GUIDANCE}}/g, `This is email ${emailOutline.sequence} of ${outline.emails.length}`);
        }

        // Use Vercel AI SDK generateText via AI Gateway
        const { text: emailContent } = await generateText({
          model: gateway.languageModel(MODELS.CLAUDE_SONNET),
          prompt,
          ...FLOW_EMAIL_OPTIONS,
          maxRetries: 2,
        });

        if (!emailContent || emailContent.length === 0) {
          throw new Error(`No content generated for email ${emailOutline.sequence}`);
        }

        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: childConversation.id,
            role: 'assistant',
            content: emailContent
          });

        if (messageError) {
          throw new Error(`Failed to save message: ${messageError.message}`);
        }

        const emailDuration = Date.now() - emailStartTime;
        logger.log(`[Flow Generator] Email ${emailOutline.sequence} completed in ${emailDuration}ms`);

        return {
          success: true as const,
          conversationId: childConversation.id,
          sequence: emailOutline.sequence
        };
      } catch (error) {
        const emailDuration = Date.now() - emailStartTime;
        logger.error(`[Flow Generator] Email ${emailOutline.sequence} FAILED after ${emailDuration}ms:`, error);

        return {
          success: false as const,
          sequence: emailOutline.sequence,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    };

    // Process emails with concurrency limit
    const concurrencyLimit = 2;
    for (let i = 0; i < outline.emails.length; i += concurrencyLimit) {
      const batch = outline.emails.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(batch.map(generateEmail));
      results.push(...batchResults);
    }
    
    const totalDuration = Date.now() - startTime;
    const failures = results.filter(r => !r.success);
    const successes = results.filter(r => r.success);

    logger.log(`[Flow Generator] Complete: ${successes.length}/${outline.emails.length} in ${totalDuration}ms`);

    return NextResponse.json({
      success: successes.length > 0,
      outlineId: flowOutline.id,
      children: successes.map(r => r.conversationId),
      generated: successes.length,
      failed: failures.length,
      failures: failures.length > 0 ? failures : undefined
    });

  } catch (error) {
    logger.error('Error in generate-emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
