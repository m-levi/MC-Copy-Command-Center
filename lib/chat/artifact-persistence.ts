import type { SupabaseClient } from '@supabase/supabase-js';
import { checkArtifactWorthiness, isConversationalContent, validateArtifactToolInput } from '@/lib/artifact-worthiness';
import type { ArtifactKind } from '@/types/artifacts';

type PersistableArtifactKind =
  | 'email'
  | 'flow'
  | 'campaign'
  | 'template'
  | 'subject_lines'
  | 'content_brief'
  | 'email_brief'
  | 'calendar'
  | 'markdown'
  | 'spreadsheet'
  | 'code'
  | 'checklist';

export type ArtifactToolInputPayload = {
  kind: PersistableArtifactKind;
  title: string;
  description?: string;
  content: string;
  metadata?: Record<string, unknown>;
  versions?: Array<{
    id: 'a' | 'b' | 'c';
    content: string;
    approach?: string;
    subject_line?: string;
    preview_text?: string;
  }>;
  selected_variant?: 'a' | 'b' | 'c';
  email_type?: string;
  steps?: Array<{ id: string; type: string; title: string }>;
  flow_type?: string;
  subject_line_variants?: Array<{ text: string; approach?: string }>;
  calendar_slots?: Array<{
    id: string;
    date: string;
    title: string;
    description?: string;
    email_type?: string;
    status?: string;
    timing?: string;
  }>;
  calendar_month?: string;
  calendar_view_mode?: string;
  campaign_name?: string;
  brief_campaign_type?: string;
  send_date?: string;
  target_segment?: string;
  objective?: string;
  key_message?: string;
  value_proposition?: string;
  call_to_action?: string;
  subject_line_direction?: string;
  tone_notes?: string;
  approval_status?: string;
  calendar_artifact_id?: string;
};

export type ArtifactPersistenceResult =
  | { ok: true; artifact: { id: string; kind: PersistableArtifactKind; title: string } }
  | { ok: false; error: string; details?: string };

function buildArtifactMetadata(toolInput: ArtifactToolInputPayload): Record<string, unknown> {
  const baseMetadata: Record<string, unknown> = {
    status: 'draft',
  };

  if (toolInput.kind === 'email' && toolInput.versions) {
    for (const version of toolInput.versions) {
      baseMetadata[`version_${version.id}_content`] = version.content;
      baseMetadata[`version_${version.id}_approach`] = version.approach;
      baseMetadata[`version_${version.id}_subject_line`] = version.subject_line;
      baseMetadata[`version_${version.id}_preview_text`] = version.preview_text;
    }
    baseMetadata.selected_variant = toolInput.selected_variant || 'a';
    baseMetadata.email_type = toolInput.email_type;
  }

  if (toolInput.kind === 'subject_lines' && toolInput.subject_line_variants) {
    baseMetadata.variants = toolInput.subject_line_variants;
    baseMetadata.selected_index = 0;
  }

  if (toolInput.kind === 'flow' && toolInput.steps) {
    baseMetadata.steps = toolInput.steps;
    baseMetadata.flow_type = toolInput.flow_type;
  }

  if (toolInput.kind === 'calendar' && toolInput.calendar_slots) {
    baseMetadata.slots = toolInput.calendar_slots;
    baseMetadata.month = toolInput.calendar_month;
    baseMetadata.view_mode = toolInput.calendar_view_mode || 'month';
    baseMetadata.campaign_name = toolInput.campaign_name;
  }

  if (toolInput.kind === 'email_brief') {
    baseMetadata.campaign_type = toolInput.brief_campaign_type;
    baseMetadata.send_date = toolInput.send_date;
    baseMetadata.target_segment = toolInput.target_segment;
    baseMetadata.objective = toolInput.objective;
    baseMetadata.key_message = toolInput.key_message;
    baseMetadata.value_proposition = toolInput.value_proposition;
    baseMetadata.call_to_action = toolInput.call_to_action;
    baseMetadata.subject_line_direction = toolInput.subject_line_direction;
    baseMetadata.tone_notes = toolInput.tone_notes;
    baseMetadata.approval_status = toolInput.approval_status || 'draft';
    baseMetadata.calendar_artifact_id = toolInput.calendar_artifact_id;
  }

  return baseMetadata;
}

export async function persistArtifactFromToolInput(params: {
  supabase: SupabaseClient;
  conversationId: string | undefined;
  userId: string | undefined;
  brandId: string | undefined;
  toolInput: ArtifactToolInputPayload;
  allowedKinds?: string[];
  conversationMode?: string;
  userMessage?: string;
}): Promise<ArtifactPersistenceResult> {
  const {
    supabase,
    conversationId,
    userId,
    brandId,
    toolInput,
    allowedKinds,
    conversationMode,
    userMessage,
  } = params;

  if (!conversationId) {
    return { ok: false, error: 'Missing conversation ID for artifact persistence.' };
  }

  if (!userId) {
    return { ok: false, error: 'User authentication required to save artifacts.' };
  }

  if (allowedKinds && allowedKinds.length > 0 && !allowedKinds.includes(toolInput.kind)) {
    return {
      ok: false,
      error: `Artifact kind "${toolInput.kind}" is not allowed for this mode.`,
      details: `Allowed kinds: ${allowedKinds.join(', ')}`,
    };
  }

  const worthinessCheck = checkArtifactWorthiness(toolInput.content || '', {
    userMessage,
    conversationMode,
    kind: toolInput.kind as ArtifactKind,
  });

  if (!worthinessCheck.isWorthy) {
    return {
      ok: false,
      error: 'Content not suitable for artifact',
      details: worthinessCheck.reason,
    };
  }

  const validationResult = validateArtifactToolInput(
    toolInput.kind,
    toolInput as unknown as Record<string, unknown>
  );
  if (!validationResult.isValid) {
    return {
      ok: false,
      error: 'Artifact validation failed',
      details: validationResult.errors.join('; '),
    };
  }

  if (
    toolInput.content &&
    isConversationalContent(toolInput.content) &&
    toolInput.kind !== 'calendar' &&
    toolInput.kind !== 'email_brief'
  ) {
    return {
      ok: false,
      error: 'Cannot save conversational content as artifact',
      details: 'Artifacts should contain deliverable content, not clarifying questions.',
    };
  }

  const { data: artifact, error } = await supabase
    .from('artifacts')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      brand_id: brandId,
      kind: toolInput.kind,
      title: toolInput.title,
      content: toolInput.content,
      metadata: buildArtifactMetadata(toolInput),
    })
    .select('id, kind, title')
    .single();

  if (error || !artifact) {
    return {
      ok: false,
      error: 'Failed to save artifact',
      details: error?.message || 'Database error',
    };
  }

  return {
    ok: true,
    artifact: {
      id: artifact.id,
      kind: artifact.kind as PersistableArtifactKind,
      title: artifact.title,
    },
  };
}
