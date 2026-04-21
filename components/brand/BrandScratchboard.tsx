"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, NotebookPen } from "lucide-react";
import { Streamdown } from "streamdown";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Eye, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Free-form Markdown scratchboard per brand. Saves to brands.scratchboard
 * via PATCH /api/brands/[brandId]. Not visible to the AI — operator
 * notes only (briefs in flight, links to investigate, ideas to circle
 * back to). Use Memory tab for facts the AI should know.
 */
export function BrandScratchboard({
  brandId,
  initial,
}: {
  brandId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === initial) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setState("saving");
      try {
        const res = await fetch(`/api/brands/${brandId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scratchboard: value }),
        });
        if (!res.ok) throw new Error(await res.text());
        setState("saved");
        setTimeout(() => setState("idle"), 1500);
      } catch {
        setState("error");
      }
    }, 600);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value, initial, brandId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <NotebookPen className="size-4" />
            Scratchboard
          </div>
          <p className="text-muted-foreground text-xs">
            Your private workspace for this brand. The AI does not see this —
            for facts the model should know, use Memory.
          </p>
        </div>
        <SaveBadge state={state} />
      </div>

      <Tabs defaultValue="edit" className="gap-2">
        <TabsList>
          <TabsTrigger value="edit" className="gap-1.5">
            <PencilLine className="size-3.5" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5">
            <Eye className="size-3.5" />
            Preview
          </TabsTrigger>
        </TabsList>
        <TabsContent value="edit" className="m-0">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              "Drop links, briefs, half-thoughts, anything you want to come back to.\n\nMarkdown works."
            }
            className={cn(
              "focus-visible:border-primary/50 focus-visible:ring-ring/50 bg-card min-h-[440px] w-full resize-y rounded-lg border p-4 text-sm leading-relaxed",
              "focus-visible:outline-none focus-visible:ring-[3px]",
            )}
            spellCheck={true}
          />
        </TabsContent>
        <TabsContent value="preview" className="m-0">
          <div className="bg-card min-h-[440px] rounded-lg border p-6">
            {value.trim().length > 0 ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <Streamdown>{value}</Streamdown>
              </div>
            ) : (
              <div className="text-muted-foreground flex h-full min-h-[380px] items-center justify-center text-sm">
                Nothing to preview yet. Start writing in the Edit tab.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Loader2 className="size-3 animate-spin" />
        Saving…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="text-primary flex items-center gap-1.5 text-xs">
        <Check className="size-3" />
        Saved
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="text-destructive flex items-center gap-1.5 text-xs">
        Could not save
      </span>
    );
  }
  return null;
}
