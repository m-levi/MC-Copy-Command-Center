import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatShell } from "@/components/chat/ChatShell";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import {
  loadSidebarData,
  fallbackBrandFromId,
} from "@/lib/chat-sidebar-data";
import type { BrandOption } from "@/components/chat/BrandSwitcher";
import type { ChatListItem } from "@/components/chat/ChatList";
import { BrandVoiceEditor } from "@/components/brand/BrandVoiceEditor";
import { loadBrandVoiceMarkdown, inferSlug } from "@/lib/brand-voice";

export const dynamic = "force-dynamic";

/**
 * Brand overview + voice editor. Drops the legacy four-field voice UI
 * in favor of a single `brand.md` editor plus delete.
 */
export default async function BrandDetailsPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) redirect("/login");

  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("id", brandId)
    .maybeSingle();
  if (!brand) notFound();

  const sidebar = await loadSidebarData(supabase, brandId);
  const currentBrand: BrandOption | null =
    sidebar.currentBrand ?? fallbackBrandFromId(brandId);
  const brands: BrandOption[] = sidebar.brands;
  const chats: ChatListItem[] = sidebar.chats;

  const initialMd = loadBrandVoiceMarkdown({
    brand_md: brand.brand_md ?? null,
    brand_slug: brand.brand_slug ?? inferSlug(brand.name ?? ""),
    name: brand.name,
  });

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
      <BrandVoiceEditor
        brandId={brandId}
        brandName={brand.name ?? "Untitled"}
        websiteUrl={brand.website_url ?? ""}
        brandSlug={brand.brand_slug ?? inferSlug(brand.name ?? "")}
        initialMarkdown={initialMd}
      />
    </ChatShell>
  );
}
