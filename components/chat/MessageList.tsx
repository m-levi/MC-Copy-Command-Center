"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
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
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
        {messages.map((m) => (
          <Row key={m.id} message={m} />
        ))}
        {status === "submitted" || status === "streaming" ? <TypingIndicator /> : null}
      </div>
    </div>
  );
}

/**
 * User messages: right-aligned violet pill, no avatar.
 * Assistant messages: left-aligned plain prose, no border, no background,
 * no avatar — the content itself is the message.
 */
function Row({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const parts = (message.parts ?? []) as PartLike[];

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed">
          {parts.map((part, idx) => {
            if (part.type === "text") {
              return (
                <span key={idx} className="whitespace-pre-wrap">
                  {String((part as { text?: string }).text ?? "")}
                </span>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="prose prose-sm text-foreground max-w-none">
        {parts.map((part, idx) => {
          if (part.type === "text") {
            return (
              <TextPart
                key={idx}
                text={String((part as { text?: string }).text ?? "")}
              />
            );
          }
          if (part.type === "reasoning") {
            const text = String((part as { text?: string }).text ?? "");
            return (
              <details
                key={idx}
                className="text-muted-foreground my-3 rounded-lg border border-dashed px-3 py-1.5 text-xs open:pb-3"
              >
                <summary className="cursor-pointer select-none py-1 font-medium">
                  Thinking
                </summary>
                <div className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">
                  {text}
                </div>
              </details>
            );
          }
          if (part.type?.startsWith("tool-")) {
            const name = part.type.replace(/^tool-/, "");
            return <ToolChip key={idx} name={name} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

/**
 * Renders a single text part. We split on blank lines so the prose CSS
 * applies between paragraphs instead of every chunk collapsing into one
 * giant <span>.
 */
function TextPart({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/);
  return (
    <>
      {paragraphs.map((para, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {para}
        </p>
      ))}
    </>
  );
}

function ToolChip({ name }: { name: string }) {
  return (
    <div
      className={cn(
        "text-muted-foreground my-2 inline-flex items-center gap-1.5 rounded-md bg-muted/70 px-2 py-0.5 text-[11px]",
      )}
    >
      <span className="size-1.5 rounded-full bg-primary/70" />
      <span className="font-mono">{name}</span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <Dot delay="0ms" />
      <Dot delay="150ms" />
      <Dot delay="300ms" />
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full"
      style={{ animationDelay: delay }}
    />
  );
}
