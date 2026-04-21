"use client";

import { useState } from "react";
import { Sparkles, Lock, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

export interface SkillOption {
  slug: string;
  display_name: string;
  description: string;
  scope: "builtin" | "global" | "org" | "brand" | "user";
  icon?: string;
}

export function SkillPicker({
  locked,
  skills,
  onChange,
}: {
  locked: string | null;
  skills: SkillOption[];
  onChange: (slug: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const lockedSkill = skills.find((s) => s.slug === locked) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant={lockedSkill ? "default" : "outline"}
          className={cn(
            "h-8 gap-2 rounded-lg px-2.5 font-medium",
            !lockedSkill && "border-dashed",
          )}
          aria-label={lockedSkill ? `Locked to ${lockedSkill.display_name}` : "Auto skill routing"}
        >
          {lockedSkill ? (
            <>
              <Lock className="size-3.5" />
              <span className="max-w-[140px] truncate">{lockedSkill.display_name}</span>
              <span
                role="button"
                aria-label="Clear skill lock"
                tabIndex={0}
                className="ml-0.5 inline-flex size-4 cursor-pointer items-center justify-center rounded-sm hover:bg-primary-foreground/15"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onChange(null);
                  }
                }}
              >
                <X className="size-3" />
              </span>
            </>
          ) : (
            <>
              <Sparkles className="size-3.5 text-primary" />
              <span>Auto</span>
              <ChevronDown className="size-3.5 opacity-60" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Find a skill…" className="h-9" />
          <CommandList className="max-h-[360px]">
            <CommandEmpty>No skills match.</CommandEmpty>
            <CommandGroup heading="Mode">
              <CommandItem
                value="auto"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="gap-2"
              >
                <div className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md">
                  <Sparkles className="size-3.5" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">Auto</span>
                  <span className="text-muted-foreground line-clamp-1 text-xs">
                    Let the model pick the right skill each turn.
                  </span>
                </div>
                {locked === null ? (
                  <span className="text-primary ml-auto text-xs">active</span>
                ) : null}
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Lock to skill">
              {skills.map((s) => (
                <CommandItem
                  key={s.slug}
                  value={`${s.slug} ${s.display_name} ${s.description}`}
                  onSelect={() => {
                    onChange(s.slug);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <div className="bg-muted text-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
                    <Lock className="size-3.5" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{s.display_name}</span>
                    <span className="text-muted-foreground line-clamp-1 text-xs">
                      {s.description}
                    </span>
                  </div>
                  {locked === s.slug ? (
                    <span className="text-primary ml-auto text-xs">active</span>
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
