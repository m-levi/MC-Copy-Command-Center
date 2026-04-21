"use client";

import { useState } from "react";
import { Check, ChevronDown, Cpu } from "lucide-react";
import { AI_MODELS } from "@/lib/ai-models";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const PROVIDER_DOT: Record<string, string> = {
  anthropic: "bg-amber-500",
  openai: "bg-emerald-500",
  google: "bg-sky-500",
};

export function ModelPicker({
  value,
  onChange,
  compact = false,
}: {
  value: string;
  onChange: (id: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = AI_MODELS.find((m) => m.id === value) ?? AI_MODELS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-2 rounded-lg px-2.5 font-medium",
            compact && "max-w-[180px]",
          )}
          aria-label={`Model: ${current.name}`}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              PROVIDER_DOT[current.provider] ?? "bg-muted-foreground",
            )}
          />
          <Cpu className="size-3.5 text-muted-foreground" />
          <span className="truncate">{current.name}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search models…" className="h-9" />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>No models match.</CommandEmpty>
            {(["anthropic", "openai", "google"] as const).map((provider) => {
              const models = AI_MODELS.filter((m) => m.provider === provider);
              if (!models.length) return null;
              return (
                <CommandGroup key={provider} heading={labelForProvider(provider)}>
                  {models.map((m) => (
                    <CommandItem
                      key={m.id}
                      value={`${m.name} ${m.id}`}
                      onSelect={() => {
                        onChange(m.id);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          PROVIDER_DOT[m.provider] ?? "bg-muted-foreground",
                        )}
                      />
                      <span className="flex-1 truncate">{m.name}</span>
                      {m.id === value ? <Check className="size-4 opacity-100" /> : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function labelForProvider(p: string): string {
  switch (p) {
    case "anthropic":
      return "Anthropic";
    case "openai":
      return "OpenAI";
    case "google":
      return "Google";
    default:
      return p;
  }
}
