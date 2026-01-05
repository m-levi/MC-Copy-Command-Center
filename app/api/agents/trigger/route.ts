/**
 * Manual trigger endpoint for Marketing Agent
 * Allows users to manually trigger daily or weekly insights generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  authenticationError,
  validationError,
  withErrorHandling,
} from '@/lib/api-error'

export const runtime = 'nodejs'

// POST: Manually trigger marketing agent insights
export const POST = withErrorHandling(async (req: NextRequest) => {
  const supabase = await createClient()
  
  // Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return authenticationError('Please log in')
  }

  // Parse request body
  const body = await req.json()
  const { brandId, type = 'daily' } = body

  // Validate request
  if (!brandId) {
    return validationError('brandId is required')
  }

  if (!['daily', 'weekly'].includes(type)) {
    return validationError('type must be "daily" or "weekly"')
  }

  // Verify user has access to this brand
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, name, user_id, organization_id')
    .eq('id', brandId)
    .single()

  if (brandError || !brand) {
    return validationError('Brand not found')
  }

  // Check if user owns brand or is part of org
  const hasAccess = brand.user_id === user.id || (
    brand.organization_id && await checkOrgAccess(supabase, user.id, brand.organization_id)
  )

  if (!hasAccess) {
    return NextResponse.json(
      { error: 'You do not have access to this brand' },
      { status: 403 }
    )
  }

  // Call the Edge Function
  const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/marketing-agent`
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'Service role key not configured' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        brand_id: brandId,
        user_id: user.id,
        manual: true,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Edge function failed')
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      message: `${type === 'daily' ? 'Daily' : 'Weekly'} insights are being generated`,
      insightId: result.insightId,
      conversationId: result.conversationId,
    })
  } catch (error) {
    console.error('[Agent Trigger] Error calling Edge Function:', error)
    return NextResponse.json(
      { 
        error: 'Failed to trigger insights generation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})

/**
 * Check if user has access to organization
 */
async function checkOrgAccess(
  supabase: any,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single()

  return !!data
}















