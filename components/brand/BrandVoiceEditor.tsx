"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Check,
  Loader2,
  ExternalLink,
  Trash2,
  Eye,
  PencilLine,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Brand overview page: header with breadcrumb + delete, inline-editable
 * brand name / website, Markdown editor for brand.md (tabs: Edit /
 * Preview). Autosaves ~600ms after typing stops.
 */
export function BrandVoiceEditor({
  brandId,
  brandName,
  websiteUrl,
  brandSlug,
  initialMarkdown,
}: {
  brandId: string;
  brandName: string;
  websiteUrl: string;
  brandSlug: string;
  initialMarkdown: string;
}) {
  const [name, setName] = useState(brandName);
  const [website, setWebsite] = useState(websiteUrl);
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const debounceRef = useRef<number | null>(null);

  // Autosave on any field change
  useEffect(() => {
    if (
      name === brandName &&
      website === websiteUrl &&
      markdown === initialMarkdown
    ) {
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/brands/${brandId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            website_url: website,
            brand_md: markdown,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      } catch {
        setSaveState("error");
      }
    }, 600);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [name, website, markdown, brandName, websiteUrl, initialMarkdown, brandId]);

  return (
    <div className="flex h-full min-h-dvh flex-col">
      <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-3 backdrop-blur">
        <SidebarTrigger className="shrink-0" />
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-sm"
        >
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground shrink truncate font-medium transition-colors"
          >
            Clients
          </Link>
          <ChevronRight className="text-muted-foreground size-3.5 shrink-0 opacity-60" />
          <span className="text-foreground min-w-0 shrink truncate font-medium">
            {name || "Untitled"}
          </span>
        </nav>
        <SaveIndicator state={saveState} />
        <div className="ml-2 flex shrink-0 items-center gap-2">
          <Link
            href={`/brands/${brandId}/chat`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors"
          >
            Open chat
          </Link>
          <DeleteBrandButton brandId={brandId} brandName={brandName} />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="brand-name" className="text-muted-foreground text-xs">
                Client name
              </Label>
              <Input
                id="brand-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 text-base font-medium"
                placeholder="e.g. Acme Supply Co."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand-website" className="text-muted-foreground text-xs">
                Website
              </Label>
              <Input
                id="brand-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="h-10 font-mono text-sm"
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className="text-sm font-medium">Brand voice</div>
                <p className="text-muted-foreground text-xs">
                  The <code className="bg-muted rounded px-1 py-0.5 font-mono text-[11px]">brand.md</code> file
                  that the chat loads as this client&rsquo;s voice profile. Full
                  Markdown supported — headings, lists, quotes, bold.
                </p>
              </div>
              <span className="text-muted-foreground font-mono text-[10px]">
                brands/{brandSlug || "–"}/brand.md
              </span>
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
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  className={cn(
                    "focus-visible:border-primary/50 focus-visible:ring-ring/50 min-h-[520px] w-full resize-y rounded-lg border bg-card p-4 font-mono text-[13px] leading-relaxed",
                    "focus-visible:outline-none focus-visible:ring-[3px]",
                  )}
                  placeholder="# Your Brand Name&#10;&#10;## Essence&#10;&#10;Write the brand's core identity here…&#10;&#10;## Voice&#10;&#10;- **Is:** confident, warm, specific&#10;- **Is not:** stuffy, corporate, hype-y"
                  spellCheck={false}
                />
              </TabsContent>
              <TabsContent value="preview" className="m-0">
                <div className="bg-card min-h-[520px] rounded-lg border p-6">
                  {markdown.trim().length > 0 ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <Streamdown>{markdown}</Streamdown>
                    </div>
                  ) : (
                    <div className="text-muted-foreground flex h-full min-h-[460px] items-center justify-center text-sm">
                      Nothing to preview yet. Start writing in the Edit tab.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <ExternalLink className="size-3" />
            <span>
              Per-brand references (copy samples, lexicon, pre-send checklists) will
              live here in a future update.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving")
    return (
      <span className="text-muted-foreground ml-auto flex items-center gap-1.5 text-xs">
        <Loader2 className="size-3 animate-spin" />
        Saving…
      </span>
    );
  if (state === "saved")
    return (
      <span className="text-primary ml-auto flex items-center gap-1.5 text-xs">
        <Check className="size-3" />
        Saved
      </span>
    );
  if (state === "error")
    return (
      <span className="text-destructive ml-auto flex items-center gap-1.5 text-xs">
        Could not save
      </span>
    );
  return <span className="ml-auto" />;
}

function DeleteBrandButton({
  brandId,
  brandName,
}: {
  brandId: string;
  brandName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (confirm !== brandName) {
      setError("Type the client name exactly to confirm.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/brands/${brandId}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        setError(msg || "Delete failed");
        return;
      }
      setOpen(false);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive size-8"
          aria-label="Delete client"
        >
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {brandName}?</DialogTitle>
          <DialogDescription>
            This permanently removes the client, every chat in it, every saved
            memory, and all uploaded documents. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-name" className="text-xs">
            Type <span className="font-mono font-semibold">{brandName}</span> to confirm
          </Label>
          <Input
            id="confirm-name"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoFocus
            disabled={isPending}
          />
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={isPending || confirm !== brandName}
          >
            {isPending ? "Deleting…" : "Delete permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
