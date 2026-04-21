"use client";

import type { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

/**
 * App shell for every page that has a chat-style sidebar. Wraps in the
 * shadcn Sidebar context so SidebarTrigger in the header works.
 */
export function ChatShell({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen>
      {sidebar}
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
