'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ChatListItem {
  id: string;
  title: string;
  brandId: string;
  pinned?: boolean;
  updatedAt: string;
}

/**
 * Flat chat list: pinned first, then recents. No filters, no bulk
 * selection, no tags — if you need more, open the conversation. Matches
 * the "sharp v1" scope.
 */
export function ChatList({ items }: { items: ChatListItem[] }) {
  const pathname = usePathname();
  const pinned = items.filter((i) => i.pinned);
  const recent = items.filter((i) => !i.pinned);

  if (items.length === 0) {
    return (
      <div className="px-3 py-6 text-sm text-muted-foreground">
        No chats yet. Start one from the message box →
      </div>
    );
  }

  return (
    <ScrollArea className="h-full px-1">
      {pinned.length > 0 ? (
        <Section label="Pinned" icon={<Pin className="size-3" />}>
          {pinned.map((i) => (
            <Row key={i.id} item={i} active={pathname.includes(i.id)} />
          ))}
        </Section>
      ) : null}
      {recent.length > 0 ? (
        <Section label="Recent" icon={<MessageSquare className="size-3" />}>
          {recent.map((i) => (
            <Row key={i.id} item={i} active={pathname.includes(i.id)} />
          ))}
        </Section>
      ) : null}
    </ScrollArea>
  );
}

function Section({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center gap-1.5 px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function Row({ item, active }: { item: ChatListItem; active: boolean }) {
  return (
    <Link
      href={`/brands/${item.brandId}/chat/${item.id}`}
      className={cn(
        'mx-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        active ? 'bg-accent text-accent-foreground' : 'text-foreground/80',
      )}
    >
      <span className="truncate">{item.title || 'Untitled'}</span>
    </Link>
  );
}
