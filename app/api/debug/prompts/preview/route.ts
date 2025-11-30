import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { buildBrandInfo, buildContextInfo } from '@/lib/chat-prompts';
import { listMemories, isSupermemoryConfigured } from '@/lib/supermemory';

/**
 * POST /api/debug/prompts/preview
 * 
 * Preview a prompt with actual brand data substituted for variables.
 * This helps users see exactly what the AI will receive.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { brand_id, prompt_type, system_prompt, user_prompt } = body;

    if (!brand_id) {
      return NextResponse.json({ error: 'brand_id is required' }, { status: 400 });
    }

    // Fetch brand data
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brand_id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Build brand info string
    const brandInfo = buildBrandInfo(brand);

    // Build context info (empty for preview since we don't have a conversation)
    const contextInfo = buildContextInfo(null);

    // Fetch brand memories from Supermemory if available
    let memoryContext = '';
    try {
      if (isSupermemoryConfigured()) {
        const memories = await listMemories(brand_id, user.id, 10);
        if (memories && memories.length > 0) {
          memoryContext = memories.map(m => {
            const title = (m.metadata?.title as string) || 'Memory';
            return `- ${title}: ${m.content.substring(0, 100)}`;
          }).join('\n');
        }
      }
    } catch (e) {
      // Memories are optional
    }

    // Sample RAG context (truncated for preview)
    let ragContext = 'No documents retrieved for this preview.';
    try {
      const { data: docs } = await supabase
        .from('brand_documents')
        .select('content')
        .eq('brand_id', brand_id)
        .limit(2);

      if (docs && docs.length > 0) {
        ragContext = docs.map(d => d.content?.substring(0, 200) + '...').join('\n\n---\n\n');
      }
    } catch (e) {
      // Documents are optional
    }

    // Variables that will be substituted
    const variables: Record<string, string> = {
      '{{COPY_BRIEF}}': '[User\'s message will appear here]',
      '{{EMAIL_BRIEF}}': '[User\'s email brief will appear here]',
      '{{BRAND_INFO}}': brandInfo.substring(0, 300) + (brandInfo.length > 300 ? '...' : ''),
      '{{BRAND_VOICE_GUIDELINES}}': (brand.copywriting_style_guide || 'No style guide defined').substring(0, 200),
      '{{RAG_CONTEXT}}': ragContext.substring(0, 300) + (ragContext.length > 300 ? '...' : ''),
      '{{MEMORY_CONTEXT}}': memoryContext || 'No active memories',
      '{{WEBSITE_URL}}': brand.website_url || 'No website URL',
      '{{CONTEXT_INFO}}': contextInfo || 'No conversation history',
    };

    // Flow-specific variables
    if (prompt_type === 'flow_email') {
      variables['{{EMAIL_SEQUENCE}}'] = '1';
      variables['{{TOTAL_EMAILS}}'] = '5';
      variables['{{FLOW_NAME}}'] = 'Welcome Series';
      variables['{{FLOW_GOAL}}'] = 'Convert new subscribers to first purchase';
      variables['{{TARGET_AUDIENCE}}'] = 'New email subscribers';
      variables['{{EMAIL_TITLE}}'] = 'Welcome Email';
      variables['{{EMAIL_PURPOSE}}'] = 'Introduce brand and set expectations';
      variables['{{KEY_POINTS}}'] = '- Brand story\\n- Key products\\n- Welcome offer';
      variables['{{PRIMARY_CTA}}'] = 'Shop Now';
    }

    // Process the prompts by substituting variables
    let processedSystemPrompt = system_prompt || '';
    let processedUserPrompt = user_prompt || '';

    for (const [variable, value] of Object.entries(variables)) {
      // Escape special regex characters in variable name
      const escapedVar = variable.replace(/[{}]/g, '\\$&');
      const regex = new RegExp(escapedVar, 'g');
      processedSystemPrompt = processedSystemPrompt.replace(regex, value);
      processedUserPrompt = processedUserPrompt.replace(regex, value);
    }

    return NextResponse.json({
      system_prompt: processedSystemPrompt,
      user_prompt: processedUserPrompt,
      variables_used: variables,
    });
  } catch (error: any) {
    console.error('Error generating prompt preview:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate preview' }, { status: 500 });
  }
}

