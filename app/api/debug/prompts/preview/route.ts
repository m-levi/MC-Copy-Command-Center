import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { buildBrandInfo, buildContextInfo, formatBrandVoiceForPrompt } from '@/lib/chat-prompts';
import { BrandVoiceData } from '@/types';

/**
 * POST /api/debug/prompts/preview
 * 
 * Preview a system prompt with template variables substituted.
 * This matches what the chat API does, so users see exactly what the AI will receive.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { system_prompt, brand_id } = body;

    if (!system_prompt) {
      return NextResponse.json({
        system_prompt: '',
        variables_used: {},
      });
    }

    // If no brand_id provided, return prompt with placeholder indicators
    // Includes deprecated variables for backward compatibility
    if (!brand_id) {
      const variables: Record<string, string> = {
        // Current variables - show placeholders since no brand is selected
        '{{BRAND_NAME}}': '[Select a brand to preview]',
        '{{BRAND_INFO}}': '[Brand info will appear here]',
        '{{BRAND_VOICE_GUIDELINES}}': '[Brand voice guidelines will appear here]',
        '{{WEBSITE_URL}}': '[Website URL will appear here]',
        '{{COPY_BRIEF}}': '[User\'s message will appear here at runtime]',
        '{{CONTEXT_INFO}}': '[Conversation context will appear here at runtime]',
        // Deprecated variables - use empty strings to match chat API exactly
        '{{RAG_CONTEXT}}': '', // Matches chat API: empty string
        '{{MEMORY_CONTEXT}}': '', // Matches chat API: empty string
        '{{EMAIL_BRIEF}}': '[User\'s message will appear here at runtime]', // Alias for COPY_BRIEF
        '{{USER_MESSAGE}}': '[User\'s message will appear here at runtime]', // Alias for COPY_BRIEF
        '{{BRAND_DETAILS}}': '', // Matches chat API: empty string
        '{{BRAND_GUIDELINES}}': '', // Matches chat API: empty string
        '{{COPYWRITING_STYLE_GUIDE}}': '[Brand voice guidelines will appear here]', // Alias for BRAND_VOICE_GUIDELINES
      };

      let processedPrompt = system_prompt;
      for (const [variable, value] of Object.entries(variables)) {
        const escapedVar = variable.replace(/[{}]/g, '\\$&');
        processedPrompt = processedPrompt.replace(new RegExp(escapedVar, 'g'), value);
      }

      return NextResponse.json({
        system_prompt: processedPrompt,
        variables_used: variables,
      });
    }

    // Fetch brand data to substitute variables
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brand_id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Build the same variable values that chat API uses
    const brandInfo = buildBrandInfo(brand);
    // Use same logic as chat API: prioritize brand_voice over copywriting_style_guide
    const brandVoiceGuidelines = brand.brand_voice
      ? formatBrandVoiceForPrompt(brand.brand_voice as BrandVoiceData)
      : brand.copywriting_style_guide || '';
    const brandName = brand.name || 'Unknown Brand';
    const websiteUrl = brand.website_url || '';
    const contextInfo = buildContextInfo(null); // No conversation context in preview

    // Variables that will be substituted - matching chat API exactly
    // Includes deprecated variables for backward compatibility with existing prompts
    const variables: Record<string, string> = {
      // Current variables
      '{{BRAND_NAME}}': brandName,
      '{{BRAND_INFO}}': brandInfo,
      '{{BRAND_VOICE_GUIDELINES}}': brandVoiceGuidelines,
      '{{WEBSITE_URL}}': websiteUrl,
      '{{COPY_BRIEF}}': '[User\'s message will appear here at runtime]',
      '{{CONTEXT_INFO}}': contextInfo || '[No conversation context]',
      // Deprecated variables - use empty strings to match chat API exactly
      '{{RAG_CONTEXT}}': '', // Matches chat API: empty string
      '{{MEMORY_CONTEXT}}': '', // Matches chat API: empty string
      '{{EMAIL_BRIEF}}': '[User\'s message will appear here at runtime]', // Alias for COPY_BRIEF
      '{{USER_MESSAGE}}': '[User\'s message will appear here at runtime]', // Alias for COPY_BRIEF
      '{{BRAND_DETAILS}}': '', // Matches chat API: empty string
      '{{BRAND_GUIDELINES}}': '', // Matches chat API: empty string
      '{{COPYWRITING_STYLE_GUIDE}}': brandVoiceGuidelines, // Alias for BRAND_VOICE_GUIDELINES
    };

    // Process the prompt by substituting variables
    let processedPrompt = system_prompt;
    for (const [variable, value] of Object.entries(variables)) {
      const escapedVar = variable.replace(/[{}]/g, '\\$&');
      processedPrompt = processedPrompt.replace(new RegExp(escapedVar, 'g'), value);
    }

    return NextResponse.json({
      system_prompt: processedPrompt,
      variables_used: variables,
    });
  } catch (error: any) {
    console.error('Error generating prompt preview:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate preview' }, { status: 500 });
  }
}
