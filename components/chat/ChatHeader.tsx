"use client";

import Link from "next/link";
import { ChevronRight, Share2, MoreHorizontal } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "./ModelPicker";
import { SkillPicker, type SkillOption } from "./SkillPicker";

export function ChatHeader({
  brandId,
  brandName,
  conversationTitle,
  model,
  onModelChange,
  lockedSkill,
  skills,
  onSkillChange,
}: {
  brandId: string;
  brandName: string;
  conversationTitle?: string;
  model: string;
  onModelChange: (m: string) => void;
  lockedSkill: string | null;
  skills: SkillOption[];
  onSkillChange: (slug: string | null) => void;
}) {
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-3 backdrop-blur">
      <SidebarTrigger className="shrink-0" />

      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-sm"
      >
        <Link
          href={`/brands/${brandId}`}
          className="text-muted-foreground hover:text-foreground shrink truncate font-medium transition-colors"
        >
          {brandName}
        </Link>
        <ChevronRight className="text-muted-foreground size-3.5 shrink-0 opacity-60" />
        <span className="text-foreground min-w-0 shrink truncate font-medium">
          {conversationTitle ?? "New chat"}
        </span>
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <SkillPicker locked={lockedSkill} skills={skills} onChange={onSkillChange} />
        <ModelPicker value={model} onChange={onModelChange} />
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Share conversation"
        >
          <Share2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8" aria-label="More">
          <MoreHorizontal className="size-4" />
        </Button>
      </div>
    </header>
  );
}
