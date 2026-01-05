import { streamText, ModelMessage } from 'ai';
import { gateway, getToolsForModel, getProviderOptionsWithWebSearch } from '@/lib/ai-providers';
import { getModelById, normalizeModelId } from '@/lib/ai-models';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { buildBrandInfo } from '@/lib/chat-prompts';

export const runtime = 'edge';

/**
 * POST /api/modes/test
 * Stateless endpoint to test a mode prompt
 * Returns streamed AI response without saving to a conversation
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      system_prompt, 
      test_input, 
      model_id: rawModelId = 'anthropic/claude-sonnet-4.5',
      brand_id,
      save_result = false,
      mode_id,
      mode_name,
    } = await req.json();

    if (!system_prompt) {
      return NextResponse.json({ error: 'System prompt is required' }, { status: 400 });
    }

    if (!test_input) {
      return NextResponse.json({ error: 'Test input is required' }, { status: 400 });
    }

    const modelId = normalizeModelId(rawModelId);
    const model = getModelById(modelId);
    
    if (!model) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
    }

    // Optionally fetch brand context
    let brandInfo = '';
    let brandName = '';
    let websiteUrl = '';
    
    if (brand_id) {
      const { data: brand } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brand_id)
        .single();

      if (brand) {
        brandInfo = buildBrandInfo(brand);
        brandName = brand.name;
        websiteUrl = brand.website_url || '';
      }
    }

    // Replace template variables in system prompt
    let processedPrompt = system_prompt
      .replace(/\{\{BRAND_INFO\}\}/g, brandInfo)
      .replace(/\{\{BRAND_NAME\}\}/g, brandName)
      .replace(/\{\{WEBSITE_URL\}\}/g, websiteUrl)
      .replace(/\{\{COPY_BRIEF\}\}/g, test_input)
      .replace(/\{\{USER_MESSAGE\}\}/g, test_input)
      // Clear unused variables
      .replace(/\{\{RAG_CONTEXT\}\}/g, '')
      .replace(/\{\{MEMORY_CONTEXT\}\}/g, '')
      .replace(/\{\{CONTEXT_INFO\}\}/g, '');

    // Build messages
    const messages: ModelMessage[] = [
      { role: 'user', content: test_input }
    ];

    // Get AI model
    const aiModel = gateway.languageModel(modelId);
    const tools = getToolsForModel(modelId, websiteUrl);

    const startTime = Date.now();

    // Stream the response
    const result = await streamText({
      model: aiModel,
      system: processedPrompt,
      messages,
      tools,
      maxRetries: 2,
      providerOptions: getProviderOptionsWithWebSearch(modelId, 5000, websiteUrl),
    });

    // Create streaming response
    const encoder = new TextEncoder();
    let fullText = '';
    let fullReasoning = '';

    const readable = new ReadableStream({
      async start(controller) {
        const sendMessage = (type: string, data: Record<string, unknown>) => {
          const message = JSON.stringify({ type, ...data }) + '\n';
          controller.enqueue(encoder.encode(message));
        };

        sendMessage('status', { status: 'starting' });

        try {
          for await (const part of result.fullStream) {
            switch (part.type) {
              case 'text-delta':
                fullText += part.text;
                sendMessage('text', { content: part.text });
                break;
                
              case 'reasoning-delta':
                const reasoningText = 'text' in part ? (part as { text: string }).text : '';
                fullReasoning += reasoningText;
                sendMessage('thinking', { content: reasoningText });
                break;
                
              case 'tool-call':
                sendMessage('tool_use', { tool: part.toolName, status: 'start' });
                break;
                
              case 'tool-result':
                sendMessage('tool_use', { tool: part.toolName, status: 'end' });
                break;
                
              case 'reasoning-start':
                sendMessage('thinking_start', {});
                break;
                
              case 'reasoning-end':
                sendMessage('thinking_end', {});
                break;
                
              case 'finish':
                break;
                
              case 'error':
                sendMessage('error', { error: String(part.error) });
                break;
            }
          }

          const endTime = Date.now();
          const responseTimeMs = endTime - startTime;

          // Optionally save the test result
          if (save_result) {
            await supabase
              .from('mode_test_results')
              .insert({
                user_id: user.id,
                mode_id: mode_id || null,
                mode_name: mode_name || 'Unnamed Mode',
                system_prompt_snapshot: processedPrompt,
                test_input,
                test_output: fullText,
                model_used: modelId,
                brand_id: brand_id || null,
                brand_name: brandName || null,
                response_time_ms: responseTimeMs,
                is_comparison: false,
              });
          }

          // Send completion with metadata
          sendMessage('complete', { 
            response_time_ms: responseTimeMs,
            text_length: fullText.length,
            reasoning_length: fullReasoning.length,
          });

          controller.close();
        } catch (error) {
          sendMessage('error', { error: error instanceof Error ? error.message : 'Unknown error' });
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[Mode Test API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to test mode',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}









