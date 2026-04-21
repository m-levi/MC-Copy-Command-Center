"use client";

import { useState } from "react";
import { Check, ChevronDown, Cpu } from "lucide-react";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import { AI_MODELS } from "@/lib/ai-models";
import { cn } from "@/lib/utils";

const PROVIDER_DOT: Record<string, string> = {
  anthropic: "bg-amber-500",
  openai: "bg-emerald-500",
  google: "bg-sky-500",
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
};

export function ModelSelectorButton({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = AI_MODELS.find((m) => m.id === value) ?? AI_MODELS[0];

  return (
    <ModelSelector open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 rounded-lg px-2.5 font-medium"
          aria-label={`Model: ${current.name}`}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              PROVIDER_DOT[current.provider] ?? "bg-muted-foreground",
            )}
          />
          <Cpu className="text-muted-foreground size-3.5" />
          <span className="truncate">{current.name}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent className="sm:max-w-lg" title="Select a model">
        <ModelSelectorInput placeholder="Search models by name or provider…" />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models match that search.</ModelSelectorEmpty>
          {(["anthropic", "openai", "google"] as const).map((provider) => {
            const models = AI_MODELS.filter((m) => m.provider === provider);
            if (!models.length) return null;
            return (
              <ModelSelectorGroup key={provider} heading={PROVIDER_LABELS[provider]}>
                {models.map((m) => (
                  <ModelSelectorItem
                    key={m.id}
                    value={`${m.name} ${m.id} ${m.provider}`}
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
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {m.id.replace(/^anthropic\/|^openai\/|^google\//, "")}
                    </span>
                    {m.id === value ? <Check className="text-primary ml-1 size-4" /> : null}
                  </ModelSelectorItem>
                ))}
              </ModelSelectorGroup>
            );
          })}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
