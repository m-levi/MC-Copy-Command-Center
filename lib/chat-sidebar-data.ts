import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandOption } from "@/components/chat/BrandSwitcher";
import type { ChatListItem } from "@/components/chat/ChatList";
import type { SkillOption } from "@/components/chat/SkillPicker";

/**
 * Shared data loader for every page that mounts the chat sidebar. Keeps
 * the page.tsx files thin and avoids query drift between /chat and
 * /chat/[conversationId]. Also absorbs the (minor) schema variance
 * around conversations.is_pinned so a missing column doesn't blank out
 * the list.
 */
export async function loadSidebarData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  brandId: string,
): Promise<{
  currentBrand: BrandOption | null;
  brands: BrandOption[];
  chats: ChatListItem[];
}> {
  const [brandsRes, currentRes, conversationsRes] = await Promise.all([
    supabase.from("brands").select("id, name").order("name", { ascending: true }),
    supabase.from("brands").select("id, name").eq("id", brandId).maybeSingle(),
    supabase
      .from("conversations")
      .select("*")
      .eq("brand_id", brandId)
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  const brands: BrandOption[] = (brandsRes.data ?? []).map((b) => ({
    id: b.id as string,
    name: b.name as string,
  }));
  const currentBrand: BrandOption | null = currentRes.data
    ? { id: currentRes.data.id as string, name: currentRes.data.name as string }
    : null;
  const chats: ChatListItem[] = (conversationsRes.data ?? []).map((row) => ({
    id: String(row.id),
    title: (row.title as string | null) ?? "Untitled",
    brandId: String(row.brand_id),
    pinned: Boolean(row.is_pinned),
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  }));

  return { currentBrand, brands, chats };
}

export async function loadScopedSkills(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  userId: string,
  brandId: string,
): Promise<SkillOption[]> {
  const { data } = await supabase
    .from("skills")
    .select("slug, description, scope, frontmatter")
    .or(`user_id.eq.${userId},brand_id.eq.${brandId},scope.eq.global`);

  return (data ?? []).map((r) => ({
    slug: String(r.slug),
    display_name:
      (r.frontmatter as { display_name?: string } | null)?.display_name ?? String(r.slug),
    description: String(r.description ?? ""),
    scope: (r.scope as SkillOption["scope"]) ?? "user",
    icon: (r.frontmatter as { icon?: string } | null)?.icon,
  }));
}

/** Fallback so the sidebar doesn't crash before the brand row is readable. */
export function fallbackBrandFromId(brandId: string): BrandOption {
  return { id: brandId, name: "Client" };
}
