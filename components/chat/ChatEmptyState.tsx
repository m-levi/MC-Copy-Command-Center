"use client";

import { Sparkles, Mail, PenLine, Lightbulb, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

interface Suggestion {
  label: string;
  prompt: string;
  icon: React.ReactNode;
  accent?: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    label: "Welcome email",
    prompt: "Write a warm welcome email for new subscribers with a 10% off code.",
    icon: <Mail className="size-4" />,
    accent: "text-amber-600 dark:text-amber-400",
  },
  {
    label: "Abandoned cart",
    prompt: "Write an abandoned cart email that's playful but not pushy.",
    icon: <Scissors className="size-4" />,
    accent: "text-rose-600 dark:text-rose-400",
  },
  {
    label: "Founder note",
    prompt: "Draft a short letter-style email from the founder announcing a limited restock.",
    icon: <PenLine className="size-4" />,
    accent: "text-sky-600 dark:text-sky-400",
  },
  {
    label: "Campaign idea",
    prompt: "Give me three creative angles for a spring-cleaning campaign.",
    icon: <Lightbulb className="size-4" />,
    accent: "text-emerald-600 dark:text-emerald-400",
  },
];

export function ChatEmptyState({
  brandName,
  onPick,
}: {
  brandName: string | null;
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="hero-glow relative flex flex-1 items-center justify-center overflow-hidden">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-12 text-center">
        <div className="bg-primary/10 text-primary inline-flex size-12 items-center justify-center rounded-xl">
          <Sparkles className="size-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {brandName ? (
              <>
                What should we write for{" "}
                <span className="from-primary to-foreground bg-gradient-to-r bg-clip-text text-transparent">
                  {brandName}
                </span>
                {" "}today?
              </>
            ) : (
              "Start a new chat"
            )}
          </h1>
          <p className="text-muted-foreground text-balance text-sm sm:text-base">
            Ask anything about the brand, or pick a starting point below. The model picks the
            right skill automatically — or lock one yourself.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => onPick(s.prompt)}
              className={cn(
                "group text-left",
                "bg-card hover:border-primary/40 hover:bg-accent relative flex items-start gap-3 rounded-xl border p-3 transition-all",
                "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              )}
            >
              <span
                className={cn(
                  "bg-muted group-hover:bg-background/80 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  s.accent,
                )}
              >
                {s.icon}
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-medium">{s.label}</span>
                <span className="text-muted-foreground line-clamp-2 text-xs">
                  {s.prompt}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
