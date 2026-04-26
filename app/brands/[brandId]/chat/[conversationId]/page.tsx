import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadBuiltinSkills } from "@/lib/skills/registry";
import { MODELS } from "@/lib/ai-constants";
import { ChatShell } from "@/components/chat/ChatShell";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import type { SkillOption } from "@/components/chat/SkillPicker";
import type { ChatListItem } from "@/components/chat/ChatList";
import type { BrandOption } from "@/components/chat/BrandSwitcher";
import type { UIMessage } from "ai";
import {
  loadSidebarData,
  loadScopedSkills,
  fallbackBrandFromId,
} from "@/lib/chat-sidebar-data";

export const dynamic = "force-dynamic";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Deep-link to a specific conversation. Robust to partial schema: if
 * the row doesn't exist yet (race with the first-message upsert) we
 * render an empty chat scoped to that id instead of 404-ing. If the
 * row exists but on a different brand, we redirect to that brand's
 * page so the URL can't silently lie about which client you're in.
 */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ brandId: string; conversationId: string }>;
}) {
  const { brandId, conversationId } = await params;
  if (!isUuid(conversationId)) {
    redirect(`/brands/${brandId}/chat`);
  }

  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) redirect("/login");

  // `select('*')` is intentional — skill_slug/model/mode may or may not
  // exist depending on how far migrations are applied.
  const convRes = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  const conversation = convRes.data as
    | (Record<string, unknown> & { brand_id?: string; title?: string })
    | null;

  if (conversation?.brand_id && conversation.brand_id !== brandId) {
    redirect(`/brands/${conversation.brand_id}/chat/${conversationId}`);
  }

  // Rehydrate prior turns so deep-linking to a conversation actually
  // shows its history. RLS gates the select, so an empty array here
  // means either the conversation is new or the user can't read it.
  const { data: messageRows } = await supabase
    .from("messages")
    .select("id, role, content, thinking, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const initialMessages: UIMessage[] = (messageRows ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const parts: UIMessage["parts"] = [];
      if (m.thinking) {
        parts.push({ type: "reasoning", text: String(m.thinking) });
      }
      parts.push({ type: "text", text: String(m.content ?? "") });
      return {
        id: String(m.id),
        role: m.role as "user" | "assistant",
        parts,
      };
    });

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

  const skillSlug = (conversation?.skill_slug as string | null | undefined) ?? null;
  const modelId =
    (conversation?.model as string | null | undefined) ?? MODELS.CLAUDE_OPUS_46;
  const title = (conversation?.title as string | null | undefined) ?? undefined;

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
        conversationTitle={title}
        initialSkillSlug={skillSlug}
        initialModelId={modelId}
        initialMessages={initialMessages}
        skills={allSkills}
      />
    </ChatShell>
  );
}
