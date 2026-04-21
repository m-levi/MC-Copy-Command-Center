"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Streamdown } from "streamdown";
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Loader2,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

/**
 * Minimal tool-call chip. Replaces AI Elements' full-width Tool card for
 * the common case where we just want to note "the agent used `web_search`"
 * without a card, border, or 48px header. Click to expand input/output.
 */
export function CompactTool({
  name,
  state,
  input,
  output,
  errorText,
}: {
  name: string;
  state: ToolState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}) {
  const [open, setOpen] = useState(false);

  const statusIcon =
    state === "output-error" ? (
      <CircleAlert className="size-3 text-destructive" />
    ) : state === "output-available" ? (
      <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-500" />
    ) : (
      <Loader2 className="size-3 animate-spin text-muted-foreground" />
    );

  const statusLabel =
    state === "output-error"
      ? "Error"
      : state === "output-available"
        ? "Done"
        : state === "input-streaming"
          ? "Calling"
          : "Running";

  const hasDetails =
    input !== undefined || output !== undefined || Boolean(errorText);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn("not-prose my-1.5 w-fit max-w-full")}
    >
      <CollapsibleTrigger
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors",
          "hover:border-muted-foreground/30 hover:bg-muted hover:text-foreground",
          hasDetails ? "cursor-pointer" : "cursor-default",
        )}
        disabled={!hasDetails}
      >
        <Wrench className="size-3 opacity-60" />
        <span className="font-mono">{name}</span>
        <span className="border-border inline-block h-3 w-px border-l" aria-hidden />
        {statusIcon}
        <span>{statusLabel}</span>
        {hasDetails ? (
          <ChevronDown
            className={cn(
              "size-3 opacity-50 transition-transform",
              open && "rotate-180",
            )}
          />
        ) : null}
      </CollapsibleTrigger>
      {hasDetails ? (
        <CollapsibleContent
          className={cn(
            "overflow-hidden",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1",
          )}
        >
          <div className="mt-1.5 flex flex-col gap-1 rounded-md border bg-muted/30 p-2 text-[11px]">
            {input !== undefined ? (
              <details className="group/i">
                <summary className="cursor-pointer select-none text-muted-foreground">
                  Input
                </summary>
                <pre className="text-foreground mt-1 overflow-x-auto font-mono text-[10px]">
                  {safeStringify(input)}
                </pre>
              </details>
            ) : null}
            {errorText ? (
              <div className="text-destructive">{errorText}</div>
            ) : null}
            {output !== undefined ? (
              <details className="group/o">
                <summary className="cursor-pointer select-none text-muted-foreground">
                  Output
                </summary>
                <div className="text-foreground prose prose-sm dark:prose-invert mt-1 max-w-none text-xs">
                  {typeof output === "string" ? (
                    <Streamdown>{output}</Streamdown>
                  ) : (
                    <pre className="overflow-x-auto font-mono text-[10px]">
                      {safeStringify(output)}
                    </pre>
                  )}
                </div>
              </details>
            ) : null}
          </div>
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  );
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
