"use client";

import Link from "next/link";
import { Settings2, BookOpen, Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { BrandSwitcher, type BrandOption } from "./BrandSwitcher";
import { NewClientButton } from "./NewClientButton";
import { ChatList, type ChatListItem } from "./ChatList";
import { UserMenu } from "./UserMenu";

/**
 * Left sidebar:
 *   [Logo] --------------
 *   [ Client switcher ]
 *   [ + New chat  CTA ]
 *   ---
 *   Pinned / Recent chats
 *   ---
 *   [ User menu ]
 */
export function ChatSidebar({
  currentBrand,
  brands,
  chats,
  userEmail,
}: {
  currentBrand: BrandOption | null;
  brands: BrandOption[];
  chats: ChatListItem[];
  userEmail?: string;
}) {
  return (
    <Sidebar>
      <SidebarHeader className="flex-col items-stretch gap-2 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 px-2 pb-1 text-sm font-semibold"
          aria-label="Go to home"
        >
          <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-md">
            <Sparkles className="size-4" />
          </span>
          <span>Scribe</span>
        </Link>
        <BrandSwitcher current={currentBrand} brands={brands} />
        <NewClientButton
          variant="outline"
          className="w-full justify-start gap-2 rounded-lg"
          label="New client"
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between px-1">
            <SidebarGroupLabel>Chats</SidebarGroupLabel>
            {currentBrand ? (
              <Link
                href={`/brands/${currentBrand.id}/chat`}
                className="text-muted-foreground hover:text-foreground mr-1 rounded px-1 text-[10px] font-medium uppercase tracking-wider"
              >
                New
              </Link>
            ) : null}
          </div>
          <ChatList items={chats} />
        </SidebarGroup>

        {currentBrand ? (
          <SidebarGroup className="mt-2">
            <SidebarGroupLabel>Brand</SidebarGroupLabel>
            <div className="flex flex-col gap-0.5">
              <Link
                href={`/brands/${currentBrand.id}`}
                className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors"
              >
                <BookOpen className="size-4" />
                <span>Voice &amp; documents</span>
              </Link>
              <Link
                href={`/brands/${currentBrand.id}/memories`}
                className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors"
              >
                <Settings2 className="size-4" />
                <span>Memories</span>
              </Link>
            </div>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu email={userEmail} />
      </SidebarFooter>
    </Sidebar>
  );
}
