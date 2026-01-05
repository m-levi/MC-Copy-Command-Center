import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/brands/[brandId]/duplicate
 * Duplicates a brand with all its settings
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const supabase = await createClient();
  const { brandId } = await params;

  // Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the original brand
    const { data: originalBrand, error: fetchError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single();

    if (fetchError || !originalBrand) {
      console.error('[Duplicate Brand] Error fetching brand:', fetchError);
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Verify user has access (same org)
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json({ error: 'Not part of an organization' }, { status: 403 });
    }

    if (originalBrand.organization_id !== memberData.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create the duplicate brand
    const { data: newBrand, error: createError } = await supabase
      .from('brands')
      .insert({
        user_id: user.id,
        created_by: user.id,
        organization_id: originalBrand.organization_id,
        name: `${originalBrand.name} (Copy)`,
        brand_details: originalBrand.brand_details,
        brand_guidelines: originalBrand.brand_guidelines,
        copywriting_style_guide: originalBrand.copywriting_style_guide,
        website_url: originalBrand.website_url,
        shopify_domain: originalBrand.shopify_domain,
        brand_voice: originalBrand.brand_voice,
        brand_overview: originalBrand.brand_overview,
        target_customer: originalBrand.target_customer,
        // Don't copy brand_builder_state as it's session-specific
      })
      .select()
      .single();

    if (createError) {
      console.error('[Duplicate Brand] Error creating duplicate:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      brand: newBrand,
      message: 'Brand duplicated successfully'
    });
  } catch (error: any) {
    console.error('[Duplicate Brand] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
