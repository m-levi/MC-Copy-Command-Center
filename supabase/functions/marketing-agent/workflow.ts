/**
 * Marketing Agent Workflow using AI SDK 6
 * Orchestrates data gathering, analysis, and insight generation
 */

import { generateText } from 'npm:ai@4'
import { createOpenAI } from 'npm:@ai-sdk/openai@1'
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { buildDailyPrompt } from './prompts/daily.ts'
import { buildWeeklyPrompt } from './prompts/weekly.ts'
import { createDocumentsTool } from './tools/documents.ts'
import { createConversationsTool } from './tools/conversations.ts'
import { createMemoriesTool } from './tools/memories.ts'
import { createWebSearchTool } from './tools/web-search.ts'
import { createConversationTool, createNotificationTool } from './tools/output.ts'

// Initialize Vercel AI Gateway using OpenAI SDK wrapper
// This is how analyze-emails does it
const aiGateway = createOpenAI({
  apiKey: Deno.env.get('AI_GATEWAY_API_KEY')!,
  baseURL: 'https://api.vercel.ai/v1',
})

// Use GPT-4o via Vercel AI Gateway (without provider prefix)
const MODEL_ID = 'gpt-4o'

interface WorkflowResult {
  conversationId: string
  dataAnalyzed: {
    documents: number
    conversations: number
    memories: number
    webSearches?: number
  }
}

interface BrandSettings {
  daily_enabled?: boolean
  weekly_enabled?: boolean
  topics?: string[]
  email_digest?: boolean
  timezone?: string
}

/**
 * Run daily insights workflow
 */
export async function runDailyWorkflow(
  brand: any,
  settings: BrandSettings | null,
  supabase: SupabaseClient
): Promise<WorkflowResult> {
  console.log(`[Workflow] Starting daily workflow for brand: ${brand.name}`)

  // Prepare date context
  const now = new Date()
  const dateInfo = {
    date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
    month: now.toLocaleDateString('en-US', { month: 'long' }),
    quarter: `Q${Math.ceil((now.getMonth() + 1) / 3)}`,
  }

  // Create tools
  const tools = {
    fetch_documents: createDocumentsTool(supabase),
    fetch_conversations: createConversationsTool(supabase),
    search_memories: createMemoriesTool(),
    create_conversation: createConversationTool(supabase),
    send_notification: createNotificationTool(supabase),
  }

  // Build the workflow prompt
  const workflowPrompt = `You are the Marketing Agent conducting daily analysis for ${brand.name}.

**Your workflow:**

1. **Gather Context** - Use the tools to fetch:
   - Recent documents (last 24 hours): call fetch_documents with brandId="${brand.id}", hoursBack=24
   - Recent conversations (last 5): call fetch_conversations with brandId="${brand.id}", limit=5, hoursBack=48
   - Brand memories: call search_memories with brandId="${brand.id}", userId="${brand.user_id}", query="marketing preferences and guidelines"

2. **Analyze & Generate** - Based on the data, generate daily marketing insights following this structure:
${buildDailyPrompt({
  brandName: brand.name,
  brandDetails: brand.brand_details,
  styleGuide: brand.copywriting_style_guide,
  recentDocuments: ['<will be populated from tool calls>'],
  recentConversations: ['<will be populated from tool calls>'],
  memories: ['<will be populated from tool calls>'],
  dateInfo,
})}

3. **Create Output** - Once insights are generated:
   - Call create_conversation with the full insights content, title="📧 Daily Campaign Ideas - ${dateInfo.month} ${now.getDate()}"
   - Call send_notification to alert the user

**Important:** Actually use the tools to gather data first, then generate insights based on what you find. The insights should reference specific findings from the data.`

  try {
    // Run the workflow with AI SDK 4 via AI Gateway
    const result = await generateText({
      model: aiGateway(MODEL_ID),
      tools,
      maxSteps: 10,
      system: 'You are a strategic marketing agent that helps brands identify opportunities and create campaigns. You are methodical, data-driven, and creative.',
      prompt: workflowPrompt,
    })

    console.log('[Workflow] Daily workflow completed')
    console.log('[Workflow] Steps taken:', result.steps?.length || 0)
    console.log('[Workflow] Tool calls:', result.steps?.filter(s => s.toolCalls?.length).length || 0)

    // Extract conversation ID from tool calls
    const createConvStep = result.steps?.find(step => 
      step.toolCalls?.some(tc => tc.toolName === 'create_conversation')
    )
    
    const createConvCall = createConvStep?.toolCalls?.find(tc => tc.toolName === 'create_conversation')
    const conversationId = createConvCall?.result?.conversationId || ''

    // Count data analyzed
    const docCalls = result.steps?.filter(s => 
      s.toolCalls?.some(tc => tc.toolName === 'fetch_documents')
    ).length || 0
    
    const convCalls = result.steps?.filter(s => 
      s.toolCalls?.some(tc => tc.toolName === 'fetch_conversations')
    ).length || 0
    
    const memCalls = result.steps?.filter(s => 
      s.toolCalls?.some(tc => tc.toolName === 'search_memories')
    ).length || 0

    return {
      conversationId,
      dataAnalyzed: {
        documents: docCalls,
        conversations: convCalls,
        memories: memCalls,
      },
    }
  } catch (error) {
    console.error('[Workflow] Daily workflow error:', error)
    throw error
  }
}

/**
 * Run weekly insights workflow
 */
export async function runWeeklyWorkflow(
  brand: any,
  settings: BrandSettings | null,
  supabase: SupabaseClient
): Promise<WorkflowResult> {
  console.log(`[Workflow] Starting weekly workflow for brand: ${brand.name}`)

  // Prepare date context
  const now = new Date()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const dateInfo = {
    weekStart: weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    weekEnd: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    month: now.toLocaleDateString('en-US', { month: 'long' }),
    quarter: `Q${Math.ceil((now.getMonth() + 1) / 3)}`,
  }

  // Create tools (including web search for weekly)
  const tools = {
    fetch_documents: createDocumentsTool(supabase),
    fetch_conversations: createConversationsTool(supabase),
    search_memories: createMemoriesTool(),
    web_search: createWebSearchTool(),
    create_conversation: createConversationTool(supabase),
    send_notification: createNotificationTool(supabase),
  }

  // Build the workflow prompt
  const workflowPrompt = `You are the Marketing Agent conducting weekly strategic review for ${brand.name}.

**Your workflow:**

1. **Comprehensive Data Gathering** - Use tools to fetch:
   - Documents from past week: call fetch_documents with brandId="${brand.id}", hoursBack=168, limit=30
   - All conversations this week: call fetch_conversations with brandId="${brand.id}", hoursBack=168, limit=20
   - Brand memories: call search_memories with brandId="${brand.id}", userId="${brand.user_id}", query="brand strategy and preferences"
   - Market trends: call web_search with queries about the brand's industry trends

2. **Deep Analysis & Strategic Insights** - Generate a comprehensive weekly review:
${buildWeeklyPrompt({
  brandName: brand.name,
  brandDetails: brand.brand_details,
  styleGuide: brand.copywriting_style_guide,
  weekDocuments: ['<will be populated from tool calls>'],
  weekConversations: ['<will be populated from tool calls>'],
  memories: ['<will be populated from tool calls>'],
  webTrends: ['<will be populated from tool calls>'],
  dateInfo,
})}

3. **Create Output** - Once comprehensive analysis is complete:
   - Call create_conversation with the full strategic review, title="📊 Weekly Marketing Review - Week of ${dateInfo.weekStart}"
   - Call send_notification to alert the user

**Important:** This is a strategic review. Spend time analyzing patterns, identifying opportunities, and providing actionable recommendations based on real data.`

  try {
    // Run the workflow with more steps for deeper analysis
    const result = await generateText({
      model: aiGateway(MODEL_ID),
      tools,
      maxSteps: 15, // More steps for comprehensive weekly analysis
      system: 'You are a senior marketing strategist that provides deep, actionable insights. You analyze data thoroughly, identify patterns, and create strategic recommendations that drive results.',
      prompt: workflowPrompt,
    })

    console.log('[Workflow] Weekly workflow completed')
    console.log('[Workflow] Steps taken:', result.steps?.length || 0)
    console.log('[Workflow] Tool calls:', result.steps?.filter(s => s.toolCalls?.length).length || 0)

    // Extract conversation ID from tool calls
    const createConvStep = result.steps?.find(step => 
      step.toolCalls?.some(tc => tc.toolName === 'create_conversation')
    )
    
    const createConvCall = createConvStep?.toolCalls?.find(tc => tc.toolName === 'create_conversation')
    const conversationId = createConvCall?.result?.conversationId || ''

    // Count data analyzed
    const docCalls = result.steps?.filter(s => 
      s.toolCalls?.some(tc => tc.toolName === 'fetch_documents')
    ).length || 0
    
    const convCalls = result.steps?.filter(s => 
      s.toolCalls?.some(tc => tc.toolName === 'fetch_conversations')
    ).length || 0
    
    const memCalls = result.steps?.filter(s => 
      s.toolCalls?.some(tc => tc.toolName === 'search_memories')
    ).length || 0

    const webCalls = result.steps?.filter(s => 
      s.toolCalls?.some(tc => tc.toolName === 'web_search')
    ).length || 0

    return {
      conversationId,
      dataAnalyzed: {
        documents: docCalls,
        conversations: convCalls,
        memories: memCalls,
        webSearches: webCalls,
      },
    }
  } catch (error) {
    console.error('[Workflow] Weekly workflow error:', error)
    throw error
  }
}

