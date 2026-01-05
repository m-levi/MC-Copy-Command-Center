import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/artifacts/[id]/approve
 *
 * Approve or reject an email brief artifact.
 * Updates the approval_status in the artifact's metadata.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: artifactId } = await params;
    const body = await request.json();
    const { action, notes } = body as {
      action: 'approve' | 'reject' | 'pending_review';
      notes?: string;
    };

    if (!['approve', 'reject', 'pending_review'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve, reject, or pending_review' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the artifact
    const { data: artifact, error: fetchError } = await supabase
      .from('email_artifacts')
      .select('*')
      .eq('id', artifactId)
      .single();

    if (fetchError || !artifact) {
      return NextResponse.json(
        { error: 'Artifact not found' },
        { status: 404 }
      );
    }

    // Check if it's an email_brief artifact
    if (artifact.kind !== 'email_brief') {
      return NextResponse.json(
        { error: 'Only email_brief artifacts can be approved' },
        { status: 400 }
      );
    }

    // Build the new metadata
    const currentMetadata = artifact.metadata || {};
    const newMetadata = {
      ...currentMetadata,
      approval_status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'pending_review',
      ...(action === 'approve' && {
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejection_notes: undefined, // Clear rejection notes on approval
      }),
      ...(action === 'reject' && {
        rejection_notes: notes || 'Changes requested',
        approved_by: undefined,
        approved_at: undefined,
      }),
      ...(action === 'pending_review' && {
        rejection_notes: undefined,
        approved_by: undefined,
        approved_at: undefined,
      }),
    };

    // Update the artifact
    const { data: updated, error: updateError } = await supabase
      .from('email_artifacts')
      .update({
        metadata: newMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', artifactId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update artifact:', updateError);
      return NextResponse.json(
        { error: 'Failed to update artifact' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      artifact: updated,
      approval_status: newMetadata.approval_status,
    });
  } catch (error) {
    console.error('Error in artifact approval:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
