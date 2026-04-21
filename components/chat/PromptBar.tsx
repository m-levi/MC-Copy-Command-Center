"use client";

import { useRef, useEffect } from "react";
import { Send, Paperclip, Mic, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PromptBar({
  value,
  onChange,
  onSubmit,
  onStop,
  isBusy,
  placeholder,
  footer,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  isBusy: boolean;
  placeholder?: string;
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [value]);

  return (
    <div className="bg-background/90 supports-[backdrop-filter]:bg-background/70 border-t backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isBusy) {
              onStop?.();
            } else {
              onSubmit();
            }
          }}
          className={cn(
            "bg-card relative flex flex-col gap-2 rounded-2xl border p-2.5 shadow-sm transition-colors",
            "focus-within:border-primary/40 focus-within:ring-ring focus-within:ring-[3px]",
          )}
        >
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? "Ask anything…"}
            rows={1}
            className="max-h-60 min-h-[28px] w-full resize-none bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!isBusy && value.trim()) onSubmit();
              }
            }}
          />
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg"
              aria-label="Attach file"
            >
              <Paperclip className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg"
              aria-label="Voice input"
            >
              <Mic className="size-4" />
            </Button>

            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-muted-foreground hidden text-[11px] sm:inline">
                <kbd className="border-border bg-muted rounded border px-1 py-px font-mono text-[10px]">
                  ↵
                </kbd>{" "}
                to send ·{" "}
                <kbd className="border-border bg-muted rounded border px-1 py-px font-mono text-[10px]">
                  ⇧↵
                </kbd>{" "}
                newline
              </span>
              <Button
                type="submit"
                size="icon"
                className="size-8 rounded-lg"
                disabled={!isBusy && !value.trim()}
                aria-label={isBusy ? "Stop" : "Send"}
              >
                {isBusy ? <StopCircle className="size-4" /> : <Send className="size-4" />}
              </Button>
            </div>
          </div>
        </form>
        {footer ? <div className="pt-2">{footer}</div> : null}
      </div>
    </div>
  );
}
