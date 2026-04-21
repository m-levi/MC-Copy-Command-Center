import { convertToModelMessages, type UIMessage } from 'ai';
import { gateway } from '@/lib/ai-providers';
import { normalizeModelId } from '@/lib/ai-models';
import { createClient } from '@/lib/supabase/server';
import { loadBuiltinSkills, mergeSkills } from '@/lib/skills/registry';
import type { Skill } from '@/lib/skills/types';
import { runSkill } from '@/lib/workflows/run-skill';
import { emptyStandardScope, interpolate } from '@/lib/workflows/template-engine';
import type { ToolContext } from '@/lib/tools/types';
import { searchRelevantDocuments, buildRAGContext } from '@/lib/rag-service';
import { searchMemories, isSupermemoryConfigured } from '@/lib/supermemory';
import { formatBrandVoiceForPrompt } from '@/lib/chat-prompts';
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
 * the client-generated conversation id. We only touch columns that are
 * guaranteed to exist on any deployed schema; optional columns are
 * written on a best-effort basis and errors are swallowed so a partial
 * schema never breaks a chat.
 */
async function upsertConversation(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  conversationId: string;
  brandId: string;
  userId: string;
  title: string | null;
  skillSlug: string | null;
  modelId: string | null;
}) {
  const base: Record<string, unknown> = {
    id: params.conversationId,
    brand_id: params.brandId,
    user_id: params.userId,
    updated_at: new Date().toISOString(),
  };
  if (params.title) base.title = params.title;

  try {
    await params.supabase.from('conversations').upsert(base, { onConflict: 'id' });
  } catch (err) {
    logger.warn('[chat] conversation base upsert failed:', err);
  }

  // Optional columns — try once; if the column doesn't exist, ignore.
  try {
    const extra: Record<string, unknown> = {};
    if (params.skillSlug !== undefined) extra.skill_slug = params.skillSlug;
    if (params.modelId) extra.model = params.modelId;
    if (Object.keys(extra).length > 0) {
      await params.supabase.from('conversations').update(extra).eq('id', params.conversationId);
    }
  } catch (err) {
    logger.warn('[chat] conversation optional-column update skipped:', err);
  }
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
  const brandVoice = brand.brand_voice ? formatBrandVoiceForPrompt(brand.brand_voice) : '';
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
  // Fire-and-forget — a DB hiccup shouldn't block the stream.
  if (conversationId) {
    const title = deriveTitle(messages);
    upsertConversation({
      supabase,
      conversationId,
      brandId: brand.id,
      userId: user.id,
      title,
      skillSlug: skillSlug ?? null,
      modelId: modelId ?? null,
    }).catch((err) => logger.warn('[chat] conversation upsert async error:', err));
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

  const systemBase = [
    'You are a marketing expert assistant. Follow brand voice precisely.',
    brandInfo ? `<brand_info>\n${brandInfo}\n</brand_info>` : '',
    brandVoice ? `<brand_voice>\n${brandVoice}\n</brand_voice>` : '',
    ragContext,
    memoryContext,
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

  const modelIdResolved = normalizeModelId(modelId ?? 'anthropic/claude-sonnet-4.5');
  const model = gateway(modelIdResolved);

  const skillVariablesWithBrief =
    userText && !('copyBrief' in skillVariables) && !('emailBrief' in skillVariables)
      ? { copyBrief: userText, emailBrief: userText, userInput: userText, ...skillVariables }
      : skillVariables;

  try {
    const result = runSkill({
      model,
      systemBase,
      messages: await convertToModelMessages(messages),
      skills,
      lockedSkillSlug: skillSlug ?? null,
      lockedSkillVariables: skillVariablesWithBrief,
      ctx,
      standardScope,
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
  if (!query || !isSupermemoryConfigured()) return '';
  try {
    const results = await searchMemories(brandId, userId, query, 5);
    if (!results.length) return '';
    const lines = results
      .slice(0, 5)
      .map((r) => `- ${r.content.slice(0, 300)}${r.content.length > 300 ? '…' : ''}`);
    return `<memory_context>\nPreviously saved notes relevant to this brand/user:\n${lines.join(
      '\n',
    )}\n</memory_context>`;
  } catch (err) {
    logger.warn('[chat] memory failed:', err);
    return '';
  }
}

// Suppress unused import warning while interpolate is available for future use
void interpolate;
