import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Search, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { NewClientButton } from "@/components/chat/NewClientButton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/date";

export const dynamic = "force-dynamic";

/**
 * Landing: brands grid. No legacy dashboard widgets — just the one thing
 * you came here to do: pick (or create) a client and start a chat.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) redirect("/login");

  const { data: brandsData } = await supabase
    .from("brands")
    .select("id, name, brand_details, updated_at")
    .order("updated_at", { ascending: false });
  const brands = brandsData ?? [];

  if (brands.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg">
              <Sparkles className="size-4" />
            </span>
            <div>
              <div className="text-lg font-semibold tracking-tight">Command Center</div>
              <div className="text-muted-foreground text-xs">
                Pick a client to jump into their chat.
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NewClientButton label="New client" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search clients…"
              className="h-10 rounded-lg pl-9"
              // Server component: search is client-side filtering on the grid if wired.
              // Kept as decoration for v1 — 20+ clients is when this matters.
              aria-label="Search clients"
            />
          </div>
          <div className="text-muted-foreground text-sm">
            {brands.length} client{brands.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <BrandCard
              key={b.id}
              id={b.id}
              name={b.name}
              details={b.brand_details}
              updatedAt={b.updated_at}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function BrandCard({
  id,
  name,
  details,
  updatedAt,
}: {
  id: string;
  name: string;
  details?: string | null;
  updatedAt?: string | null;
}) {
  const initials =
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";

  return (
    <Link
      href={`/brands/${id}/chat`}
      className={cn(
        "group bg-card hover:border-primary/40 hover:shadow-primary/5 flex flex-col gap-3 rounded-xl border p-4 transition-all hover:shadow-md",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar className="bg-primary/10 size-10 rounded-lg">
          <AvatarFallback className="bg-primary/10 text-primary rounded-lg text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="truncate text-sm font-semibold">{name}</div>
          {updatedAt ? (
            <div className="text-muted-foreground text-xs">
              Updated {formatDistanceToNow(updatedAt)} ago
            </div>
          ) : null}
        </div>
      </div>
      {details ? (
        <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
          {details}
        </p>
      ) : (
        <p className="text-muted-foreground/60 text-sm italic">No description yet</p>
      )}
      <div className="mt-auto flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Open chat</span>
        <span className="text-primary/0 group-hover:text-primary font-medium transition-colors">
          →
        </span>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="hero-glow relative grid min-h-dvh place-items-center overflow-hidden">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-6 text-center">
        <div className="bg-primary/10 text-primary inline-flex size-14 items-center justify-center rounded-2xl">
          <Sparkles className="size-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome to Command Center
          </h1>
          <p className="text-muted-foreground text-balance">
            Start by adding your first client. You&rsquo;ll land in an Auto-routed chat where
            the model picks the right skill for whatever you need.
          </p>
        </div>
        <NewClientButton label="Add your first client" size="lg" />
      </div>
    </div>
  );
}
