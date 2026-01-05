// Supabase Edge Function: analyze-emails
// Runs daily via pg_cron to analyze emails, generate campaign ideas as conversations,
// and notify users via email
// Uses Vercel AI Gateway with Claude Opus 4.5

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { generateText } from 'npm:ai@4'
import { createOpenAI } from 'npm:@ai-sdk/openai@1'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4'

// Initialize Vercel AI Gateway client
const gateway = createOpenAI({
  apiKey: Deno.env.get('AI_GATEWAY_API_KEY')!,
  baseURL: 'https://api.vercel.ai/v1',
})

// Claude Opus 4.5 - the most capable model
const MODEL_ID = 'anthropic/claude-opus-4-20250514'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Initialize Resend for emails
const resend = Deno.env.get('RESEND_API_KEY') 
  ? new Resend(Deno.env.get('RESEND_API_KEY')!)
  : null

const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'onboarding@resend.dev'
const APP_URL = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://app.example.com'

// Types
interface Brand {
  id: string
  name: string
  user_id: string
  brand_details: string | null
  brand_guidelines: string | null
  copywriting_style_guide: string | null
  brand_voice: Record<string, unknown> | null
  website_url: string | null
}

interface UserProfile {
  user_id: string
  email: string
  full_name: string | null
}

interface AnalysisRequest {
  brand_ids: string[]
  analysis_types: ('campaign_ideas' | 'performance' | 'voice_audit')[]
}

// Helper to call AI via Vercel Gateway
async function callAI(prompt: string, maxTokens: number = 4000): Promise<string> {
  const result = await generateText({
    model: gateway(MODEL_ID),
    prompt,
    maxTokens,
  })
  return result.text
}

// Main handler
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body: AnalysisRequest = await req.json()
    const { brand_ids, analysis_types } = body

    if (!brand_ids || brand_ids.length === 0) {
      return new Response('No brand_ids provided', { status: 400 })
    }

    console.log(`Starting analysis for ${brand_ids.length} brands via Claude Opus 4.5`)

    const results = {
      processed: 0,
      errors: [] as string[],
      conversations_created: 0,
      emails_sent: 0,
      performance_reports: 0,
      voice_audits: 0,
    }

    // Process each brand
    for (const brandId of brand_ids) {
      try {
        // Fetch brand data with user info
        const { data: brand, error: brandError } = await supabase
          .from('brands')
          .select('*')
          .eq('id', brandId)
          .single()

        if (brandError || !brand) {
          results.errors.push(`Brand ${brandId}: not found`)
          continue
        }

        // Get user profile for email
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, email, full_name')
          .eq('user_id', brand.user_id)
          .single()

        // Run requested analyses
        for (const analysisType of analysis_types) {
          switch (analysisType) {
            case 'campaign_ideas':
              const conversationCreated = await generateCampaignConversation(brand, profile)
              if (conversationCreated) {
                results.conversations_created++
                if (profile?.email) {
                  const emailSent = await sendCampaignEmail(brand, profile, conversationCreated)
                  if (emailSent) results.emails_sent++
                }
              }
              break
            case 'performance':
              await analyzePerformance(brand)
              results.performance_reports++
              break
            case 'voice_audit':
              await auditBrandVoice(brand)
              results.voice_audits++
              break
          }
        }

        results.processed++
      } catch (err) {
        results.errors.push(`Brand ${brandId}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    console.log('Analysis complete:', results)

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Analysis failed:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================================================
// Campaign Ideas as Conversation
// ============================================================================
async function generateCampaignConversation(
  brand: Brand, 
  profile: UserProfile | null
): Promise<{ id: string; title: string } | null> {
  console.log(`Generating campaign conversation for brand: ${brand.name}`)

  // Get recent conversations for context
  const { data: recentConversations } = await supabase
    .from('conversations')
    .select('title, mode, conversation_type, created_at')
    .eq('brand_id', brand.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Get existing campaign ideas to avoid duplicates
  const { data: existingIdeas } = await supabase
    .from('campaign_ideas')
    .select('title')
    .eq('brand_id', brand.id)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const existingTitles = existingIdeas?.map(i => i.title.toLowerCase()) || []

  // Get current date for seasonality
  const now = new Date()
  const month = now.toLocaleString('en-US', { month: 'long' })
  const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const prompt = `You are an expert email marketing strategist providing your daily campaign recommendations for ${brand.name}.

BRAND: ${brand.name}
${brand.brand_details ? `ABOUT: ${brand.brand_details}` : ''}
${brand.copywriting_style_guide ? `BRAND VOICE: ${brand.copywriting_style_guide.substring(0, 1500)}` : ''}
${brand.website_url ? `WEBSITE: ${brand.website_url}` : ''}

CONTEXT:
- Today: ${dateStr}
- Quarter: ${quarter}
- Recent emails created: ${recentConversations?.map(c => c.title).slice(0, 10).join(', ') || 'None yet'}
- Avoid repeating: ${existingTitles.slice(0, 5).join(', ') || 'N/A'}

Write a friendly, conversational message presenting 5 fresh email campaign ideas for this brand. For each idea:

1. Give it a catchy name
2. Explain what makes it timely and relevant
3. Describe the target audience
4. Suggest a creative angle or hook
5. Provide a ready-to-use prompt they can paste to start writing

Make it feel like a helpful daily briefing from a trusted marketing partner. End by asking which idea they'd like to explore first or if they have questions about any of them.

Be warm, professional, and actionable. Use markdown formatting for readability.`

  try {
    const responseText = await callAI(prompt, 3000)

    // Create conversation title
    const conversationTitle = `📧 Daily Campaign Ideas - ${month} ${now.getDate()}`

    // Create the conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        brand_id: brand.id,
        user_id: brand.user_id,
        title: conversationTitle,
        model: MODEL_ID,
        conversation_type: 'email',
        mode: 'planning',
        created_by_name: 'AI Assistant',
        is_pinned: true, // Pin so it's visible
        last_message_preview: responseText.substring(0, 100) + '...',
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (convError || !conversation) {
      console.error('Failed to create conversation:', convError)
      return null
    }

    // Create the system context message (hidden from user)
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'system',
      content: `This is a daily campaign ideas conversation automatically generated for ${brand.name}. The user can reply to discuss any of the ideas, ask for more details, or request the AI to write one of the suggested emails.`,
      user_id: brand.user_id,
      status: 'completed',
    })

    // Create the AI response with campaign ideas
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: responseText,
      user_id: brand.user_id,
      status: 'completed',
      metadata: {
        generated_by: 'daily_cron',
        model: MODEL_ID,
        month,
        quarter,
      },
    })

    // Also store in campaign_ideas table for reference/analytics
    await supabase.from('campaign_ideas').insert({
      brand_id: brand.id,
      title: conversationTitle,
      description: 'Daily AI-generated campaign suggestions',
      prompt_suggestion: 'See conversation for details',
      reasoning: `Generated on ${dateStr}`,
      priority: 1,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: { 
        conversation_id: conversation.id,
        generated_by: 'cron', 
        month, 
        quarter 
      },
    })

    console.log(`Created campaign conversation ${conversation.id} for ${brand.name}`)
    return { id: conversation.id, title: conversationTitle }

  } catch (err) {
    console.error('Failed to generate campaign conversation:', err)
    return null
  }
}

// ============================================================================
// Email Notification
// ============================================================================
async function sendCampaignEmail(
  brand: Brand,
  profile: UserProfile,
  conversation: { id: string; title: string }
): Promise<boolean> {
  if (!resend) {
    console.log('Resend not configured, skipping email')
    return false
  }

  const conversationUrl = `${APP_URL}/brands/${brand.id}/chat?conversation=${conversation.id}`
  const userName = profile.full_name?.split(' ')[0] || 'there'

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #1a1a2e; 
            background-color: #f5f5f7;
            margin: 0;
            padding: 0;
          }
          .wrapper { background-color: #f5f5f7; padding: 40px 20px; }
          .container { 
            max-width: 560px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            padding: 24px 32px;
            text-align: center;
          }
          .header h1 { margin: 0; color: white; font-size: 20px; font-weight: 600; }
          .content { padding: 32px; }
          .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white !important; 
            padding: 14px 28px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600; 
            margin: 20px 0;
          }
          .footer { 
            padding: 24px 32px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            font-size: 12px; 
            color: #64748b;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>📧 Fresh Campaign Ideas for ${brand.name}</h1>
            </div>
            <div class="content">
              <p>Hey ${userName}!</p>
              <p>Your daily email campaign ideas are ready. I've analyzed ${brand.name}'s recent activity and put together <strong>5 fresh campaign suggestions</strong> tailored to what's happening right now.</p>
              <p>You can chat with me about any of these ideas - ask questions, get more details, or jump straight into writing!</p>
              <div style="text-align: center;">
                <a href="${conversationUrl}" class="button">View Campaign Ideas →</a>
              </div>
              <p style="color: #64748b; font-size: 14px;">This conversation is pinned in your ${brand.name} workspace so you can easily find it.</p>
            </div>
            <div class="footer">
              <p>You're receiving this because you have daily campaign suggestions enabled.</p>
              <p><a href="${APP_URL}/settings/notifications" style="color: #6366f1;">Manage notification settings</a></p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: profile.email,
      subject: `📧 Fresh campaign ideas for ${brand.name}`,
      html: emailHtml,
    })
    console.log(`Email sent to ${profile.email} for ${brand.name}`)
    return true
  } catch (err) {
    console.error('Failed to send email:', err)
    return false
  }
}

// ============================================================================
// Performance Analysis
// ============================================================================
async function analyzePerformance(brand: Brand): Promise<void> {
  console.log(`Analyzing performance for brand: ${brand.name}`)

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, mode, conversation_type, review_status, created_at')
    .eq('brand_id', brand.id)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  if (!conversations || conversations.length === 0) {
    console.log(`No recent conversations for ${brand.name}`)
    return
  }

  const metrics = {
    total_conversations: conversations.length,
    by_mode: {} as Record<string, number>,
    by_type: {} as Record<string, number>,
    approval_rate: 0,
    pending_reviews: 0,
  }

  let approved = 0
  let reviewed = 0

  for (const conv of conversations) {
    metrics.by_mode[conv.mode || 'unknown'] = (metrics.by_mode[conv.mode || 'unknown'] || 0) + 1
    metrics.by_type[conv.conversation_type || 'email'] = (metrics.by_type[conv.conversation_type || 'email'] || 0) + 1
    if (conv.review_status === 'approved') { approved++; reviewed++ }
    else if (conv.review_status === 'changes_requested') { reviewed++ }
    else if (conv.review_status === 'pending_review') { metrics.pending_reviews++ }
  }

  metrics.approval_rate = reviewed > 0 ? Math.round((approved / reviewed) * 100) : 0

  await supabase.from('email_analysis_results').insert({
    brand_id: brand.id,
    analysis_type: 'performance',
    analysis_data: {
      period: '30_days',
      summary: `${metrics.total_conversations} emails created, ${metrics.approval_rate}% approval rate`,
    },
    metrics,
  })

  console.log(`Performance analysis complete for ${brand.name}:`, metrics)
}

// ============================================================================
// Brand Voice Audit
// ============================================================================
async function auditBrandVoice(brand: Brand): Promise<void> {
  console.log(`Auditing brand voice for: ${brand.name}`)

  if (!brand.copywriting_style_guide && !brand.brand_voice) {
    console.log(`No brand voice defined for ${brand.name}, skipping audit`)
    return
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('content, conversation_id')
    .eq('role', 'assistant')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(10)

  if (!messages || messages.length === 0) {
    console.log(`No recent messages to audit for ${brand.name}`)
    return
  }

  const { data: brandConversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('brand_id', brand.id)

  const brandConvIds = new Set(brandConversations?.map(c => c.id) || [])
  const brandMessages = messages.filter(m => brandConvIds.has(m.conversation_id))

  if (brandMessages.length === 0) {
    console.log(`No brand-specific messages to audit for ${brand.name}`)
    return
  }

  const sampleMessages = brandMessages.slice(0, 5).map(m => m.content.substring(0, 500))

  const prompt = `You are a brand voice consistency auditor. Analyze these email samples against the brand voice guidelines.

BRAND VOICE GUIDELINES:
${brand.copywriting_style_guide || JSON.stringify(brand.brand_voice)}

EMAIL SAMPLES:
${sampleMessages.map((m, i) => `[Sample ${i + 1}]: ${m}`).join('\n\n')}

Score the voice consistency from 1-100 and provide:
1. overall_score: Number 1-100
2. strengths: Array of what's working well
3. issues: Array of voice inconsistencies found
4. recommendations: Array of specific improvements

Respond ONLY with a JSON object. No markdown.`

  try {
    const responseText = await callAI(prompt, 1000)
    const audit = JSON.parse(responseText)

    await supabase.from('email_analysis_results').insert({
      brand_id: brand.id,
      analysis_type: 'voice_audit',
      analysis_data: audit,
      metrics: {
        overall_score: audit.overall_score,
        samples_analyzed: sampleMessages.length,
        issues_found: audit.issues?.length || 0,
      },
    })

    console.log(`Voice audit complete for ${brand.name}: Score ${audit.overall_score}/100`)
  } catch (parseErr) {
    console.error('Failed to parse voice audit:', parseErr)
  }
}
