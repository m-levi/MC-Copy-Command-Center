"use client";

import { useEffect, useState, useTransition } from "react";
import { Brain, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/date";

interface BrandMemory {
  id: string;
  content: string;
  category: string;
  title: string | null;
  created_at: string;
}

const CATEGORIES = [
  "brand_context",
  "campaign_info",
  "product_details",
  "decision",
  "user_preference",
  "fact",
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  brand_context: "Brand context",
  campaign_info: "Campaign",
  product_details: "Product",
  decision: "Decision",
  user_preference: "Preference",
  fact: "Fact",
};

const CATEGORY_TONE: Record<string, string> = {
  brand_context: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  campaign_info: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  product_details: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  decision: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  user_preference: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  fact: "bg-muted text-muted-foreground",
};

/**
 * Read/write memory list for a single brand. Backed by /api/brands/<id>/memories.
 * The AI uses the same memory_notes rows via memory_recall, so anything
 * added here is visible to the model on the next chat turn.
 */
export function BrandMemoryList({ brandId }: { brandId: string }) {
  const [memories, setMemories] = useState<BrandMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("brand_context");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/brands/${brandId}/memories`);
        const data = await res.json();
        if (!cancelled) setMemories(data.memories ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId]);

  function add() {
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Memory content is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/brands/${brandId}/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          category,
          title: title.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "Save failed" }));
        setError(msg ?? "Save failed");
        return;
      }
      const { memory } = await res.json();
      setMemories((m) => [memory, ...m]);
      setContent("");
      setTitle("");
      setAdding(false);
    });
  }

  async function remove(id: string) {
    setMemories((m) => m.filter((x) => x.id !== id));
    await fetch(`/api/brands/${brandId}/memories/${id}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Brain className="size-4" />
            Brand memories
          </div>
          <p className="text-muted-foreground text-xs">
            Durable facts the AI uses when chatting about this brand.
          </p>
        </div>
        {!adding ? (
          <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5">
            <Plus className="size-3.5" />
            Add memory
          </Button>
        ) : null}
      </div>

      {adding ? (
        <div className="bg-card flex flex-col gap-3 rounded-lg border p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div className="space-y-1.5">
              <Label htmlFor="memory-title" className="text-xs">
                Title (optional)
              </Label>
              <Input
                id="memory-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short label"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="memory-category" className="text-xs">
                Category
              </Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as (typeof CATEGORIES)[number])}
              >
                <SelectTrigger id="memory-category" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="memory-content" className="text-xs">
              Content
            </Label>
            <Textarea
              id="memory-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="The brand prefers periods over exclamation points."
              className="min-h-[100px]"
              autoFocus
            />
          </div>
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setContent("");
                setTitle("");
                setError(null);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={add} disabled={isPending}>
              {isPending ? "Saving…" : "Save memory"}
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 px-2 py-6 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading memories…
        </div>
      ) : memories.length === 0 ? (
        <div className="bg-muted/30 text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No memories yet. Add facts about the brand that the AI should remember
          across conversations.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {memories.map((m) => (
            <li
              key={m.id}
              className="group bg-card flex items-start gap-3 rounded-lg border p-3 transition-colors"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn("rounded-sm border-0 px-1.5 py-0 text-[10px]", CATEGORY_TONE[m.category])}
                  >
                    {CATEGORY_LABEL[m.category] ?? m.category}
                  </Badge>
                  {m.title ? (
                    <span className="text-sm font-medium">{m.title}</span>
                  ) : null}
                  <span className="text-muted-foreground text-[10px]">
                    {formatDistanceToNow(m.created_at)} ago
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{m.content}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive size-8 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => remove(m.id)}
                aria-label="Delete memory"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
