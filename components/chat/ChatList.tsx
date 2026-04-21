"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/date";

export interface ChatListItem {
  id: string;
  title: string;
  brandId: string;
  pinned?: boolean;
  updatedAt: string;
}

export function ChatList({ items }: { items: ChatListItem[] }) {
  const pathname = usePathname();
  const pinned = items.filter((i) => i.pinned);
  const recent = items.filter((i) => !i.pinned);

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground px-3 py-6 text-center text-xs">
        No chats yet.
        <br />
        Start one from the message box →
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2">
      {pinned.length > 0 ? (
        <Section label="Pinned" icon={<Pin className="size-3" />}>
          {pinned.map((i) => (
            <Row key={i.id} item={i} active={pathname?.includes(i.id) ?? false} />
          ))}
        </Section>
      ) : null}
      {recent.length > 0 ? (
        <Section label="Recent">
          {recent.map((i) => (
            <Row key={i.id} item={i} active={pathname?.includes(i.id) ?? false} />
          ))}
        </Section>
      ) : null}
    </div>
  );
}

function Section({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-muted-foreground mb-1 flex items-center gap-1.5 px-3 text-[10px] font-medium uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function Row({ item, active }: { item: ChatListItem; active: boolean }) {
  return (
    <Link
      href={`/brands/${item.brandId}/chat/${item.id}`}
      className={cn(
        "group mx-1 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/80",
      )}
    >
      <span className="truncate">{item.title || "Untitled"}</span>
      <span
        className={cn(
          "text-muted-foreground shrink-0 text-[10px] opacity-0 transition-opacity",
          "group-hover:opacity-100",
          active && "opacity-60",
        )}
      >
        {formatDistanceToNow(item.updatedAt)}
      </span>
    </Link>
  );
}
