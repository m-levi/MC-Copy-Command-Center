/**
 * API Route: /api/artifact-types
 *
 * Manage user-defined artifact types
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getArtifactTypes,
  createArtifactType,
  CreateArtifactTypeSchema,
  type CreateArtifactTypeInput,
} from '@/lib/services/artifact-type.service';

/**
 * GET /api/artifact-types
 * Get all artifact types visible to the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === 'true';
    const category = searchParams.get('category') || undefined;
    const isPublic = searchParams.get('is_public') === 'true' ? true : undefined;

    // Fetch artifact types
    const { data, error } = await getArtifactTypes(supabase, {
      includeInactive,
      category,
      isPublic,
    });

    if (error) {
      console.error('Error fetching artifact types:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ artifact_types: data });
  } catch (error) {
    console.error('Unexpected error in GET /api/artifact-types:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/artifact-types
 * Create a new artifact type
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = CreateArtifactTypeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const input: CreateArtifactTypeInput = validationResult.data;

    // Create artifact type
    const { data, error } = await createArtifactType(supabase, input);

    if (error) {
      console.error('Error creating artifact type:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ artifact_type: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/artifact-types:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
