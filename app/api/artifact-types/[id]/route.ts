/**
 * API Route: /api/artifact-types/[id]
 *
 * Manage individual artifact types
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getArtifactTypeById,
  updateArtifactType,
  deleteArtifactType,
  UpdateArtifactTypeSchema,
  type UpdateArtifactTypeInput,
} from '@/lib/services/artifact-type.service';

/**
 * GET /api/artifact-types/[id]
 * Get a specific artifact type
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch artifact type
    const { data, error } = await getArtifactTypeById(supabase, id);

    if (error) {
      console.error('Error fetching artifact type:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Artifact type not found' }, { status: 404 });
    }

    return NextResponse.json({ artifact_type: data });
  } catch (error) {
    console.error('Unexpected error in GET /api/artifact-types/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/artifact-types/[id]
 * Update an artifact type
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = UpdateArtifactTypeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const input: UpdateArtifactTypeInput = validationResult.data;

    // Update artifact type
    const { data, error } = await updateArtifactType(supabase, id, input);

    if (error) {
      console.error('Error updating artifact type:', error);
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ artifact_type: data });
  } catch (error) {
    console.error('Unexpected error in PUT /api/artifact-types/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/artifact-types/[id]
 * Update an artifact type (alias for PUT)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context);
}

/**
 * DELETE /api/artifact-types/[id]
 * Delete (soft delete) an artifact type
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Delete artifact type
    const { error } = await deleteArtifactType(supabase, id);

    if (error) {
      console.error('Error deleting artifact type:', error);
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Artifact type deleted successfully' });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/artifact-types/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
