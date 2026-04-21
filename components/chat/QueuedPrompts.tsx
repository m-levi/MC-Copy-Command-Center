"use client";

import {
  Queue,
  QueueList,
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
  QueueItemActions,
  QueueItemAction,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionLabel,
  QueueSectionContent,
} from "@/components/ai-elements/queue";
import { ClockIcon, XIcon } from "lucide-react";
import type { QueuedPrompt } from "@/hooks/usePromptQueue";

/**
 * Compact pending-prompt panel. Sits between the message list and the
 * input while the model is still answering the current turn. Clicking
 * the X on an item removes it from the queue before it sends.
 */
export function QueuedPrompts({
  items,
  onRemove,
  onClear,
}: {
  items: QueuedPrompt[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      <Queue>
        <QueueSection defaultOpen>
          <QueueSectionTrigger>
            <QueueSectionLabel
              label={`queued prompt${items.length === 1 ? "" : "s"}`}
              count={items.length}
              icon={<ClockIcon className="size-4" />}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-muted-foreground hover:text-foreground text-xs font-medium"
            >
              Clear all
            </button>
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              {items.map((item) => (
                <QueueItem key={item.id} className="items-start">
                  <div className="flex items-start gap-2">
                    <QueueItemIndicator className="mt-1" />
                    <QueueItemContent className="text-foreground">
                      {item.text}
                    </QueueItemContent>
                    <QueueItemActions>
                      <QueueItemAction
                        aria-label="Remove from queue"
                        onClick={() => onRemove(item.id)}
                      >
                        <XIcon className="size-3.5" />
                      </QueueItemAction>
                    </QueueItemActions>
                  </div>
                </QueueItem>
              ))}
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      </Queue>
    </div>
  );
}
