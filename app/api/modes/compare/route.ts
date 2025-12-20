import { generateText } from 'ai';
import { gateway, getToolsForModel, getProviderOptionsWithWebSearch } from '@/lib/ai-providers';
import { getModelById, normalizeModelId } from '@/lib/ai-models';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { buildBrandInfo } from '@/lib/chat-prompts';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'edge';

interface ModeToCompare {
  id?: string;
  name: string;
  system_prompt: string;
}

interface ComparisonResult {
  mode_id?: string;
  mode_name: string;
  output: string;
  reasoning?: string;
  response_time_ms: number;
  error?: string;
}

/**
 * POST /api/modes/compare
 * Run multiple mode prompts in parallel for A/B comparison
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      modes,
      test_input, 
      model_id: rawModelId = 'anthropic/claude-sonnet-4.5',
      brand_id,
      save_results = false,
    } = await req.json();

    if (!modes || !Array.isArray(modes) || modes.length < 2) {
      return NextResponse.json({ error: 'At least 2 modes are required for comparison' }, { status: 400 });
    }

    if (modes.length > 4) {
      return NextResponse.json({ error: 'Maximum 4 modes can be compared at once' }, { status: 400 });
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

    // Generate comparison group ID for linking results
    const comparisonGroupId = uuidv4();

    // Process each mode prompt
    const processPrompt = (systemPrompt: string): string => {
      return systemPrompt
        .replace(/\{\{BRAND_INFO\}\}/g, brandInfo)
        .replace(/\{\{BRAND_NAME\}\}/g, brandName)
        .replace(/\{\{WEBSITE_URL\}\}/g, websiteUrl)
        .replace(/\{\{COPY_BRIEF\}\}/g, test_input)
        .replace(/\{\{USER_MESSAGE\}\}/g, test_input)
        .replace(/\{\{RAG_CONTEXT\}\}/g, '')
        .replace(/\{\{MEMORY_CONTEXT\}\}/g, '')
        .replace(/\{\{CONTEXT_INFO\}\}/g, '');
    };

    // Get AI model
    const aiModel = gateway.languageModel(modelId);
    const tools = getToolsForModel(modelId, websiteUrl);

    // Run all modes in parallel
    const runMode = async (modeData: ModeToCompare): Promise<ComparisonResult> => {
      const startTime = Date.now();
      
      try {
        const processedPrompt = processPrompt(modeData.system_prompt);

        const result = await generateText({
          model: aiModel,
          system: processedPrompt,
          messages: [{ role: 'user', content: test_input }],
          tools,
          maxRetries: 2,
          providerOptions: getProviderOptionsWithWebSearch(modelId, 5000, websiteUrl),
        });

        const endTime = Date.now();
        const responseTimeMs = endTime - startTime;

        // Extract reasoning if available (reasoning is an array)
        const reasoning = Array.isArray(result.reasoning) 
          ? result.reasoning.map((r: { text?: string }) => r.text).filter(Boolean).join('\n')
          : '';

        return {
          mode_id: modeData.id,
          mode_name: modeData.name,
          output: result.text,
          reasoning,
          response_time_ms: responseTimeMs,
        };
      } catch (error) {
        const endTime = Date.now();
        return {
          mode_id: modeData.id,
          mode_name: modeData.name,
          output: '',
          response_time_ms: endTime - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };

    // Execute all modes in parallel
    const results = await Promise.all(
      (modes as ModeToCompare[]).map(runMode)
    );

    // Save results if requested
    if (save_results) {
      const insertData = results.map((result) => ({
        user_id: user.id,
        mode_id: result.mode_id || null,
        mode_name: result.mode_name,
        system_prompt_snapshot: modes.find((m: ModeToCompare) => m.name === result.mode_name)?.system_prompt,
        test_input,
        test_output: result.output,
        model_used: modelId,
        brand_id: brand_id || null,
        brand_name: brandName || null,
        response_time_ms: result.response_time_ms,
        is_comparison: true,
        comparison_group_id: comparisonGroupId,
      }));

      await supabase
        .from('mode_test_results')
        .insert(insertData);
    }

    return NextResponse.json({
      comparison_group_id: comparisonGroupId,
      test_input,
      model_used: modelId,
      brand_name: brandName || null,
      results,
    });

  } catch (error) {
    console.error('[Mode Compare API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to compare modes',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}


