import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadBuiltinSkills } from "@/lib/skills/registry";
import { MODELS } from "@/lib/ai-constants";
import { ChatShell } from "@/components/chat/ChatShell";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import type { SkillOption } from "@/components/chat/SkillPicker";
import type { ChatListItem } from "@/components/chat/ChatList";
import type { BrandOption } from "@/components/chat/BrandSwitcher";
import {
  loadSidebarData,
  loadScopedSkills,
  fallbackBrandFromId,
} from "@/lib/chat-sidebar-data";

export const dynamic = "force-dynamic";

/**
 * Deep-link a specific conversation. Loads the conversation row + its
 * skill lock (if any) + sidebar + skill list. Previous messages are not
 * yet hydrated into the chat (v1 persistence is stream-only); the UI
 * opens a blank thread with the skill and model remembered.
 */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ brandId: string; conversationId: string }>;
}) {
  const { brandId, conversationId } = await params;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) redirect("/login");

  const convRes = await supabase
    .from("conversations")
    .select("id, title, brand_id, skill_slug, model")
    .eq("id", conversationId)
    .maybeSingle();
  if (!convRes.data || convRes.data.brand_id !== brandId) notFound();
  const conversation = convRes.data;

  const sidebar = await loadSidebarData(supabase, brandId);
  const skills = await loadScopedSkills(supabase, user.id, brandId);
  const currentBrand: BrandOption | null =
    sidebar.currentBrand ?? fallbackBrandFromId(brandId);
  const brands: BrandOption[] = sidebar.brands;
  const chats: ChatListItem[] = sidebar.chats;

  const builtinSkills: SkillOption[] = loadBuiltinSkills().map((s) => ({
    slug: s.slug,
    display_name: s.frontmatter.display_name ?? s.slug,
    description: s.frontmatter.description,
    scope: "builtin" as const,
    icon: s.frontmatter.icon,
  }));
  const allSkills: SkillOption[] = [...builtinSkills, ...skills];

  return (
    <ChatShell
      sidebar={
        <ChatSidebar
          currentBrand={currentBrand}
          brands={brands}
          chats={chats}
          userEmail={user.email ?? undefined}
        />
      }
    >
      <ChatArea
        brandId={brandId}
        brandName={currentBrand?.name ?? "Client"}
        conversationId={conversationId}
        conversationTitle={conversation.title ?? undefined}
        initialSkillSlug={conversation.skill_slug ?? null}
        initialModelId={conversation.model ?? MODELS.CLAUDE_SONNET}
        skills={allSkills}
      />
    </ChatShell>
  );
}
