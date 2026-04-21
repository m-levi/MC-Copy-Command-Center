"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Building2, Search } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface BrandOption {
  id: string;
  name: string;
}

/**
 * Compact brand (client) switcher that sits at the top of the sidebar.
 * Shows the current brand as a full-width button; clicking opens a
 * Command palette with search and all available clients.
 */
export function BrandSwitcher({
  current,
  brands,
}: {
  current: BrandOption | null;
  brands: BrandOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const label = useMemo(
    () => (current ? current.name : brands.length ? "Select a client" : "No clients yet"),
    [current, brands.length],
  );
  const initials = useMemo(
    () =>
      current?.name
        ?.split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") ?? "?",
    [current],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "focus-ring bg-sidebar-accent/50 hover:bg-sidebar-accent flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm transition-colors",
          )}
          aria-label="Switch client"
        >
          <Avatar className="size-7 rounded-md">
            <AvatarFallback className="bg-primary/10 text-primary rounded-md text-[11px] font-semibold">
              {current ? initials : <Building2 className="size-3.5" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
              Client
            </span>
            <span className="truncate font-medium leading-tight">{label}</span>
          </div>
          <ChevronsUpDown className="size-4 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="text-muted-foreground size-4 shrink-0" />
            <CommandInput placeholder="Search clients…" className="h-9 border-0 focus:ring-0" />
          </div>
          <CommandList className="max-h-[280px]">
            <CommandEmpty>No clients match that search.</CommandEmpty>
            <CommandGroup>
              {brands.map((b) => (
                <CommandItem
                  key={b.id}
                  value={b.name}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/brands/${b.id}/chat`);
                  }}
                  className="gap-2"
                >
                  <Avatar className="size-6 rounded-sm">
                    <AvatarFallback className="bg-muted rounded-sm text-[10px] font-semibold">
                      {b.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase())
                        .join("") || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{b.name}</span>
                  {current?.id === b.id ? (
                    <Check className="text-primary ml-auto size-4" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
