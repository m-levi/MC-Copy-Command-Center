// Marketing Agent Edge Function
// Generates daily and weekly marketing insights using AI SDK 6 workflow
// Analyzes documents, conversations, memories, and web trends

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { runDailyWorkflow, runWeeklyWorkflow } from './workflow.ts'

// Use built-in Supabase environment variables (automatically available in Edge Functions)
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://swmijewkwwsbbccfzexe.supabase.co'
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!

const supabase = createClient(supabaseUrl, supabaseKey)

interface RequestBody {
  type: 'daily' | 'weekly' | 'manual'
  brand_id?: string
  manual?: boolean
  user_id?: string
}

Deno.serve(async (req: Request) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body: RequestBody = await req.json()
    const { type, brand_id, manual = false, user_id } = body

    console.log(`[Marketing Agent] Starting ${type} analysis`, { brand_id, manual })

    // If specific brand_id provided, process just that brand
    if (brand_id) {
      const result = await processBrand(brand_id, type, manual ? 'manual' : 'cron', user_id)
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Otherwise, process all brands with enabled agents
    const results = await processAllBrands(type, manual ? 'manual' : 'cron')

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[Marketing Agent] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Process a single brand
 */
async function processBrand(
  brandId: string,
  type: 'daily' | 'weekly' | 'manual',
  triggerSource: 'cron' | 'manual' | 'api',
  userId?: string
): Promise<any> {
  // Fetch brand data
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single()

  if (brandError || !brand) {
    throw new Error(`Brand ${brandId} not found`)
  }

  // Check if agent is enabled for this brand
  const { data: settings } = await supabase
    .from('brand_agent_settings')
    .select('*')
    .eq('brand_id', brandId)
    .eq('user_id', userId || brand.user_id)
    .single()

  // Skip if disabled (unless manual trigger)
  if (triggerSource !== 'manual') {
    if (type === 'daily' && !settings?.daily_enabled) {
      console.log(`[Marketing Agent] Daily insights disabled for brand ${brandId}`)
      return { skipped: true, reason: 'disabled' }
    }
    if (type === 'weekly' && !settings?.weekly_enabled) {
      console.log(`[Marketing Agent] Weekly insights disabled for brand ${brandId}`)
      return { skipped: true, reason: 'disabled' }
    }
  }

  // Create insight record
  const { data: insight, error: insightError } = await supabase
    .from('agent_insights')
    .insert({
      brand_id: brandId,
      insight_type: type,
      trigger_source: triggerSource,
      status: 'running',
    })
    .select()
    .single()

  if (insightError) {
    console.error('[Marketing Agent] Failed to create insight record:', insightError)
    throw insightError
  }

  try {
    // Run the appropriate workflow
    const workflowResult = type === 'weekly'
      ? await runWeeklyWorkflow(brand, settings, supabase)
      : await runDailyWorkflow(brand, settings, supabase)

    // Update insight with success
    await supabase
      .from('agent_insights')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        conversation_id: workflowResult.conversationId,
        data_analyzed: workflowResult.dataAnalyzed,
      })
      .eq('id', insight.id)

    console.log(`[Marketing Agent] Completed ${type} analysis for brand ${brandId}`)

    return {
      success: true,
      insightId: insight.id,
      conversationId: workflowResult.conversationId,
      dataAnalyzed: workflowResult.dataAnalyzed,
    }
  } catch (error) {
    // Update insight with failure
    await supabase
      .from('agent_insights')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', insight.id)

    throw error
  }
}

/**
 * Process all brands with enabled agents
 */
async function processAllBrands(
  type: 'daily' | 'weekly',
  triggerSource: 'cron' | 'manual'
): Promise<any> {
  // Get all brands with enabled agents
  const { data: settings, error: settingsError } = await supabase
    .from('brand_agent_settings')
    .select('brand_id, user_id, daily_enabled, weekly_enabled')
    .eq(type === 'daily' ? 'daily_enabled' : 'weekly_enabled', true)

  if (settingsError) {
    throw settingsError
  }

  if (!settings || settings.length === 0) {
    console.log('[Marketing Agent] No brands with enabled agents')
    return { processed: 0, errors: [] }
  }

  console.log(`[Marketing Agent] Processing ${settings.length} brands`)

  const results = {
    processed: 0,
    errors: [] as string[],
    insights: [] as any[],
  }

  // Process each brand
  for (const setting of settings) {
    try {
      const result = await processBrand(
        setting.brand_id,
        type,
        triggerSource,
        setting.user_id
      )
      results.processed++
      results.insights.push(result)
    } catch (error) {
      console.error(`[Marketing Agent] Error processing brand ${setting.brand_id}:`, error)
      results.errors.push(
        `Brand ${setting.brand_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  console.log(`[Marketing Agent] Completed processing. Success: ${results.processed}, Errors: ${results.errors.length}`)

  return results
}

