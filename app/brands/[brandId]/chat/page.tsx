import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadBuiltinSkills } from "@/lib/skills/registry";
import { MODELS } from "@/lib/ai-constants";
import { ChatShell } from "@/components/chat/ChatShell";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import type { SkillOption } from "@/components/chat/SkillPicker";
import type { BrandOption } from "@/components/chat/BrandSwitcher";
import type { ChatListItem } from "@/components/chat/ChatList";
import {
  loadSidebarData,
  loadScopedSkills,
  fallbackBrandFromId,
} from "@/lib/chat-sidebar-data";

export const dynamic = "force-dynamic";

/**
 * Empty chat — Auto skill, default model, fresh thread. Server component:
 * loads sidebar data + skill registry + brand in one pass and hands it
 * off to the client components.
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
  if (!user) redirect("/login");

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
        initialSkillSlug={null}
        initialModelId={MODELS.CLAUDE_OPUS_46}
        skills={allSkills}
      />
    </ChatShell>
  );
}
