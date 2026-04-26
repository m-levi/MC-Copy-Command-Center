import { convertToModelMessages, type UIMessage } from 'ai';
import { gateway } from '@/lib/ai-providers';
import { normalizeModelId } from '@/lib/ai-models';
import { createClient } from '@/lib/supabase/server';
import { loadBuiltinSkills, mergeSkills } from '@/lib/skills/registry';
import type { Skill } from '@/lib/skills/types';
import { runSkill } from '@/lib/workflows/run-skill';
import { emptyStandardScope, interpolate } from '@/lib/workflows/template-engine';
import { COPY_ARTIFACT_INSTRUCTION } from '@/lib/workflows/copy-artifact';
import type { ToolContext } from '@/lib/tools/types';
import { searchRelevantDocuments, buildRAGContext } from '@/lib/rag-service';
import { searchMemories, isSupermemoryConfigured } from '@/lib/supermemory';
import { formatBrandVoiceForPrompt } from '@/lib/chat-prompts';
import { loadBrandVoiceMarkdown, inferSlug } from '@/lib/brand-voice';
import { localMemorySearch } from '@/lib/memory-local';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface Body {
  messages: UIMessage[];
  modelId?: string;
  brandId: string;
  conversationId?: string;
  skillSlug?: string | null;
  skillVariables?: Record<string, unknown>;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Derive a short human-readable title from the first user message.
 * Trims and clamps to ~60 characters so the sidebar stays tidy.
 */
function deriveTitle(messages: UIMessage[]): string | null {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return null;
  const text = (firstUser.parts ?? [])
    .filter((p) => p.type === 'text')
    .map((p) => (p as { text?: string }).text ?? '')
    .join(' ')
    .trim();
  if (!text) return null;
  const firstLine = text.split(/\r?\n/)[0].trim();
  return firstLine.length > 60 ? firstLine.slice(0, 58).trimEnd() + '…' : firstLine;
}

/**
 * Persist (or refresh) the conversation row. Idempotent upsert keyed on
 * the client-generated conversation id. Newer schemas have extra metadata
 * columns that keep threads visible and editable, so write them when they
 * exist and retry without any optional column that is missing.
 */
async function upsertConversation(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  conversationId: string;
  brandId: string;
  userId: string;
  createdByName: string | null;
  title: string | null;
  skillSlug: string | null;
  modelId: string | null;
}) {
  // `title` and `model` are NOT NULL with no DB default on the deployed
  // schema — skipping them on INSERT fails the row and the conversation
  // never lands in history. Fall back to stable sentinels.
  const now = new Date().toISOString();
  const base: Record<string, unknown> = {
    id: params.conversationId,
    brand_id: params.brandId,
    user_id: params.userId,
    created_by: params.userId,
    created_by_name: params.createdByName,
    title: params.title ?? 'New chat',
    model: params.modelId ?? 'anthropic/claude-opus-4.6',
    conversation_type: 'email',
    mode: 'email_copy',
    skill_slug: params.skillSlug,
    last_message_preview: params.title ?? null,
    last_message_at: now,
    updated_at: now,
  };

  const optionalColumns = new Set([
    'created_by',
    'created_by_name',
    'conversation_type',
    'mode',
    'skill_slug',
    'last_message_preview',
    'last_message_at',
  ]);
  const payload = { ...base };

  for (let attempt = 0; attempt <= optionalColumns.size; attempt += 1) {
    const { error } = await params.supabase
      .from('conversations')
      .upsert({ ...payload }, { onConflict: 'id' });
    if (!error) return;

    const missingColumn = getMissingColumnName(error);
    if (missingColumn && optionalColumns.has(missingColumn) && missingColumn in payload) {
      delete payload[missingColumn];
      logger.warn(`[chat] retrying conversation upsert without missing column: ${missingColumn}`);
      continue;
    }

    if (await conversationExists(params.supabase, params.conversationId)) {
      logger.warn('[chat] conversation upsert failed, but existing row is readable:', error);
      return;
    }

    throw error;
  }

  throw new Error('Conversation upsert failed after schema compatibility retries');
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const { messages, modelId, brandId, skillSlug, skillVariables = {}, conversationId } = body;

  if (!messages?.length) return new Response('Missing messages', { status: 400 });
  if (!brandId) return new Response('Missing brandId', { status: 400 });
  if (conversationId && !isUuid(conversationId)) {
    return new Response('Invalid conversationId', { status: 400 });
  }

  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const [brandRes, customSkillsRes] = await Promise.all([
    supabase.from('brands').select('*').eq('id', brandId).single(),
    supabase
      .from('skills')
      .select('*')
      .or(`user_id.eq.${user.id},brand_id.eq.${brandId},scope.eq.global`),
  ]);

  if (brandRes.error || !brandRes.data) {
    return new Response('Brand not found', { status: 404 });
  }
  const brand = brandRes.data;

  const customRows: Skill[] = (customSkillsRes.data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    scope: row.scope,
    orgId: row.org_id,
    brandId: row.brand_id,
    userId: row.user_id,
    frontmatter: { name: row.slug, description: row.description, ...row.frontmatter },
    body: row.body,
    sourcePath: null,
    isBuiltin: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const skills = mergeSkills(loadBuiltinSkills(), customRows);

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const userText = lastUser ? uiMessageText(lastUser) : '';

  const [ragContext, memoryContext] = await Promise.all([
    buildRagContextFor(brand.id, userText),
    buildMemoryContextFor(brand.id, user.id, userText),
  ]);

  const brandInfo = buildBrandInfoBlock(brand);
  // Prefer the new brand.md source of truth. Falls back to the legacy
  // brand_voice JSON (via formatBrandVoiceForPrompt) if no brand.md is
  // set yet, so nothing breaks for accounts still on the old schema.
  const brandMd = loadBrandVoiceMarkdown({
    brand_md: brand.brand_md ?? null,
    brand_slug: brand.brand_slug ?? inferSlug(brand.name ?? ''),
    name: brand.name,
  });
  const brandVoice =
    brandMd.trim().length > 0
      ? brandMd
      : brand.brand_voice
        ? formatBrandVoiceForPrompt(brand.brand_voice)
        : '';
  const websiteUrl = brand.website_url ?? '';

  logger.log('[chat] request scope', {
    brandId,
    brandName: brand.name,
    brandVoiceLength: brandVoice.length,
    hasVoiceJson: Boolean(brand.brand_voice),
    hasStyleGuide: Boolean(brand.copywriting_style_guide),
    skillSlug: skillSlug ?? '(auto)',
    modelId: modelId ?? '(default)',
    conversationId: conversationId ?? '(none)',
  });

  // Persist the conversation row so the sidebar can list it immediately.
  // Keep the promise around so message inserts don't race the conversation FK.
  let conversationUpsertPromise: Promise<void> | null = null;
  if (conversationId) {
    const title = deriveTitle(messages);
    conversationUpsertPromise = upsertConversation({
      supabase,
      conversationId,
      brandId: brand.id,
      userId: user.id,
      createdByName:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        user.email ??
        null,
      title,
      skillSlug: skillSlug ?? null,
      modelId: modelId ?? null,
    });
    try {
      await conversationUpsertPromise;
    } catch (err) {
      logger.error('[chat] conversation upsert failed:', err);
      return new Response('Failed to save conversation', { status: 500 });
    }
  }

  const standardScope = {
    ...emptyStandardScope(),
    brand: {
      name: brand.name ?? '',
      info: brandInfo,
      voice: brandVoice,
      websiteUrl: websiteUrl ? `Website: ${websiteUrl}` : '',
    },
    rag: ragContext,
    memory: memoryContext,
  };

  // Brand voice is the most important slot in the system prompt — every
  // line of copy you write must sound like the brand. Put it first, frame
  // it as binding, and call it out explicitly so the model can't drift.
  const voiceBlock = brandVoice
    ? [
        '## BRAND VOICE — BINDING',
        '',
        'Every word of marketing copy you produce must read as if it came from this brand. Match cadence, vocabulary, hard bans, and structural conventions exactly. If the brand voice contradicts a generic best practice, the brand voice wins. If you are about to write something that does not sound like the voice below, stop and rewrite it.',
        '',
        '<brand_voice>',
        brandVoice,
        '</brand_voice>',
      ].join('\n')
    : '';
  const systemBase = [
    'You are a marketing expert writing for a specific brand. Follow the brand voice below exactly — it overrides every default.',
    voiceBlock,
    brandInfo ? `<brand_info>\n${brandInfo}\n</brand_info>` : '',
    ragContext,
    memoryContext,
    COPY_ARTIFACT_INSTRUCTION,
  ]
    .filter(Boolean)
    .join('\n\n');

  const ctx: ToolContext = {
    userId: user.id,
    brandId: brand.id,
    orgId: brand.organization_id ?? null,
    brandName: brand.name,
    brandWebsiteUrl: websiteUrl,
    standardScope,
    skills,
    dynamic: {
      enabledSkillTools: new Set<string>(),
      activatedSkillSlug: skillSlug ?? null,
    },
  };

  const modelIdResolved = normalizeModelId(modelId);
  const model = gateway(modelIdResolved);

  const skillVariablesWithBrief =
    userText && !('copyBrief' in skillVariables) && !('emailBrief' in skillVariables)
      ? { copyBrief: userText, emailBrief: userText, userInput: userText, ...skillVariables }
      : skillVariables;

  // Persist the incoming user turn right away so it's durable even if
  // the stream fails partway through. Only the LAST user message is
  // new — earlier ones are already in the DB from prior turns.
  if (conversationId && lastUser && userText) {
    try {
      await conversationUpsertPromise;
      const { error: messageInsertError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: userText,
        user_id: user.id,
      });
      if (messageInsertError) throw messageInsertError;
    } catch (err) {
      logger.error('[chat] user message insert failed:', err);
      return new Response('Failed to save message', { status: 500 });
    }
  }

  try {
    const result = runSkill({
      model,
      modelId: modelIdResolved,
      systemBase,
      messages: await convertToModelMessages(messages),
      skills,
      lockedSkillSlug: skillSlug ?? null,
      lockedSkillVariables: skillVariablesWithBrief,
      ctx,
      standardScope,
      onFinish: async ({ text, reasoningText }) => {
        if (!conversationId) return;
        const finalText = (text ?? '').trim();
        if (!finalText) return;
        try {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: finalText,
            thinking: reasoningText ?? null,
          });
        } catch (err) {
          logger.warn('[chat] assistant message insert failed:', err);
        }
      },
    });
    return result.toUIMessageStreamResponse();
  } catch (err) {
    logger.error('[chat] runSkill failed:', err);
    return new Response((err as Error).message ?? 'Internal error', { status: 500 });
  }
}

function uiMessageText(m: UIMessage): string {
  const parts: string[] = [];
  for (const p of m.parts ?? []) {
    if (p.type === 'text') parts.push(p.text);
  }
  return parts.join('\n');
}

function getMissingColumnName(error: unknown): string | null {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message)
      : String(error ?? '');
  const match =
    /Could not find the '([^']+)' column/.exec(message) ??
    /column ['"]([^'"]+)['"]/.exec(message);
  return match?.[1] ?? null;
}

async function conversationExists(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  conversationId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .maybeSingle();
    return !error && Boolean(data?.id);
  } catch {
    return false;
  }
}

function buildBrandInfoBlock(brand: Record<string, unknown>): string {
  const lines: string[] = [];
  if (brand.name) lines.push(`Brand Name: ${brand.name}`);
  if (brand.brand_details) lines.push(`Brand Details: ${brand.brand_details}`);
  if (brand.brand_guidelines) lines.push(`Brand Guidelines: ${brand.brand_guidelines}`);
  if (brand.copywriting_style_guide)
    lines.push(`Style Guide: ${brand.copywriting_style_guide}`);
  return lines.join('\n');
}

async function buildRagContextFor(brandId: string, query: string): Promise<string> {
  if (!query) return '';
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return '';
  try {
    const docs = await searchRelevantDocuments(brandId, query, apiKey, 3);
    return docs.length ? buildRAGContext(docs) : '';
  } catch (err) {
    logger.warn('[chat] rag failed:', err);
    return '';
  }
}

async function buildMemoryContextFor(brandId: string, userId: string, query: string): Promise<string> {
  if (!query) return '';
  let hits: Array<{ content: string }> = [];
  if (isSupermemoryConfigured()) {
    try {
      hits = await searchMemories(brandId, userId, query, 5);
    } catch (err) {
      logger.warn('[chat] supermemory search failed, using local:', err);
    }
  }
  if (hits.length === 0) {
    try {
      const rows = await localMemorySearch(userId, brandId, query, 5);
      hits = rows.map((r) => ({ content: r.content }));
    } catch (err) {
      logger.warn('[chat] local memory search failed:', err);
    }
  }
  if (hits.length === 0) return '';
  const lines = hits
    .slice(0, 5)
    .map((r) => `- ${r.content.slice(0, 300)}${r.content.length > 300 ? '…' : ''}`);
  return `<memory_context>\nPreviously saved notes relevant to this brand/user:\n${lines.join(
    '\n',
  )}\n</memory_context>`;
}

// Suppress unused import warning while interpolate is available for future use
void interpolate;
