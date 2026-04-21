"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { Sparkles, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type PartLike = { type: string } & Record<string, unknown>;

export function MessageList({
  messages,
  status,
}: {
  messages: UIMessage[];
  status: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  return (
    <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {status === "submitted" || status === "streaming" ? <TypingIndicator /> : null}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? (
        <Avatar className="mt-0.5 size-8 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </AvatarFallback>
        </Avatar>
      ) : null}
      <div
        className={cn(
          "min-w-0 max-w-[calc(100%-3rem)] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-card text-card-foreground rounded-bl-md border",
        )}
      >
        <div className="prose prose-sm">
          {(message.parts ?? []).map((part: PartLike, idx: number) => {
            if (part.type === "text") {
              return (
                <span key={idx} className="whitespace-pre-wrap">
                  {String((part as { text?: string }).text ?? "")}
                </span>
              );
            }
            if (part.type === "reasoning") {
              const text = String((part as { text?: string }).text ?? "");
              return (
                <details key={idx} className="text-muted-foreground my-2 text-xs">
                  <summary className="cursor-pointer select-none font-medium">
                    Reasoning
                  </summary>
                  <div className="mt-1 whitespace-pre-wrap">{text}</div>
                </details>
              );
            }
            if (part.type?.startsWith("tool-")) {
              const name = part.type.replace(/^tool-/, "");
              return (
                <div
                  key={idx}
                  className="bg-muted text-muted-foreground my-2 rounded-md border px-2 py-1 text-xs"
                >
                  <span className="font-mono">{name}</span>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
      {isUser ? (
        <Avatar className="mt-0.5 size-8 shrink-0">
          <AvatarFallback className="bg-muted">
            <User className="size-4" />
          </AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <Avatar className="mt-0.5 size-8 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary">
          <Sparkles className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div className="bg-card flex items-center gap-1.5 rounded-2xl rounded-bl-md border px-4 py-3">
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="bg-muted-foreground/70 size-1.5 animate-bounce rounded-full"
      style={{ animationDelay: delay }}
    />
  );
}
