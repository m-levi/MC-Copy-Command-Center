'use client';

import { ClientSwitcher, type BrandOption } from './ClientSwitcher';
import { NewClientButton } from './NewClientButton';
import { ChatList, type ChatListItem } from './ChatList';
import { Separator } from '@/components/ui/separator';

/**
 * Left rail. Three sections top-to-bottom:
 *   1. Client switcher (current brand + search/switch)
 *   2. New client button (prominent — the plan called this out)
 *   3. Chat list (pinned / recent)
 */
export function ChatSidebar({
  currentBrand,
  brands,
  chats,
}: {
  currentBrand: BrandOption | null;
  brands: BrandOption[];
  chats: ChatListItem[];
}) {
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r bg-muted/20">
      <div className="space-y-2 p-3">
        <ClientSwitcher current={currentBrand} brands={brands} />
        <NewClientButton variant="ghost" />
      </div>
      <Separator />
      <div className="min-h-0 flex-1 py-2">
        <ChatList items={chats} />
      </div>
    </aside>
  );
}
