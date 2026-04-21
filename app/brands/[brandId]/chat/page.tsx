import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadBuiltinSkills } from '@/lib/skills/registry';
import { ChatShell } from '@/components/chat/ChatShell';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import type { SkillOption } from '@/components/chat/SkillPicker';
import type { BrandOption } from '@/components/chat/ClientSwitcher';
import type { ChatListItem } from '@/components/chat/ChatList';

export const dynamic = 'force-dynamic';

/**
 * Thin chat page. Loads brand + sidebar data server-side, hands it all to
 * `<ChatShell>`. No conversation fetching here — Auto chat starts fresh.
 * For persisted threads see /brands/[brandId]/chat/[conversationId].
 */
export default async function ChatPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) redirect('/auth');

  const [brandsRes, currentRes, conversationsRes] = await Promise.all([
    supabase.from('brands').select('id, name').order('name', { ascending: true }),
    supabase.from('brands').select('*').eq('id', brandId).maybeSingle(),
    supabase
      .from('conversations')
      .select('id, title, brand_id, updated_at, is_pinned, skill_slug')
      .eq('brand_id', brandId)
      .order('updated_at', { ascending: false })
      .limit(50),
  ]);

  const currentBrand: BrandOption | null = currentRes.data
    ? { id: currentRes.data.id, name: currentRes.data.name }
    : null;
  const brands: BrandOption[] = (brandsRes.data ?? []).map((b) => ({ id: b.id, name: b.name }));
  const chats: ChatListItem[] = (conversationsRes.data ?? []).map((c) => ({
    id: c.id,
    title: c.title ?? 'Untitled',
    brandId: c.brand_id,
    pinned: c.is_pinned ?? false,
    updatedAt: c.updated_at,
  }));

  const builtins = loadBuiltinSkills().map((s) => ({
    slug: s.slug,
    display_name: s.frontmatter.display_name ?? s.slug,
    description: s.frontmatter.description,
    scope: 'builtin' as const,
    icon: s.frontmatter.icon,
  }));
  const { data: customSkillRows } = await supabase
    .from('skills')
    .select('*')
    .or(`user_id.eq.${user.id},brand_id.eq.${brandId},scope.eq.global`);
  const custom: SkillOption[] = (customSkillRows ?? []).map((r) => ({
    slug: r.slug,
    display_name: r.frontmatter?.display_name ?? r.slug,
    description: r.description,
    scope: r.scope,
    icon: r.frontmatter?.icon,
  }));
  const skills = [...builtins, ...custom];

  return (
    <ChatShell
      sidebar={<ChatSidebar currentBrand={currentBrand} brands={brands} chats={chats} />}
    >
      <ChatArea brandId={brandId} initialSkillSlug={null} skills={skills} />
    </ChatShell>
  );
}
