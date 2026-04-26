"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { CompactTool } from "./CompactTool";
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources";
import { Loader } from "@/components/ai-elements/loader";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import {
  OpenIn,
  OpenInContent,
  OpenInTrigger,
  OpenInChatGPT,
  OpenInClaude,
  OpenInLabel,
  OpenInSeparator,
} from "@/components/ai-elements/open-in-chat";
import { Streamdown } from "streamdown";
import { AlertCircle, MoreHorizontal, Sparkles, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatHeader } from "./ChatHeader";
import { PromptBar } from "./PromptBar";
import { QueuedPrompts } from "./QueuedPrompts";
import { EmailVariants, type EmailVariantData } from "./EmailVariants";
import { CopyArtifact } from "./CopyArtifact";
import { usePromptQueue } from "@/hooks/usePromptQueue";
import { parseCopySegments } from "@/lib/workflows/copy-artifact";
import type { SkillOption } from "./SkillPicker";

interface PartLike {
  type: string;
  text?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

const SUGGESTION_PROMPTS = [
  "Write a warm welcome email with a 10% off code",
  "Draft an abandoned cart email that's playful but not pushy",
  "Short founder note announcing a limited restock",
  "Three creative angles for a spring campaign",
];

export function ChatArea({
  brandId,
  brandName,
  conversationId: initialConversationId,
  conversationTitle,
  initialSkillSlug,
  initialModelId,
  initialMessages,
  skills,
}: {
  brandId: string;
  brandName: string;
  conversationId?: string;
  conversationTitle?: string;
  initialSkillSlug: string | null;
  initialModelId: string;
  initialMessages?: UIMessage[];
  skills: SkillOption[];
}) {
  const [conversationId] = useState<string>(() => initialConversationId ?? nanoid());
  const router = useRouter();
  const urlHasIdRef = useRef<boolean>(Boolean(initialConversationId));
  const urlReplacedRef = useRef<boolean>(false);
  const sidebarRefreshRef = useRef<boolean>(false);
  const [lockedSkill, setLockedSkill] = useState<string | null>(initialSkillSlug);
  const [modelId, setModelId] = useState<string>(initialModelId);
  const [input, setInput] = useState("");
  const [showThinking, setShowThinking] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem("chat.showThinking");
    return saved === null ? true : saved === "true";
  });
  const queueApi = usePromptQueue();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chat.showThinking", String(showThinking));
    }
  }, [showThinking]);

  const transport = useMemo(() => {
    // `@supermemory/tools` bundles its own copy of `ai`, so the branded
    // ChatTransport type is not assignable across duplicates. Cast once.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (DefaultChatTransport as unknown as any)({
      api: "/api/chat",
      body: () => ({
        brandId,
        conversationId,
        skillSlug: lockedSkill,
        modelId,
      }),
    });
  }, [brandId, conversationId, lockedSkill, modelId]);

  const chat = useChat({
    id: conversationId,
    // `@supermemory/tools` (and thus `@ai-sdk/react`) bundles its own
    // copy of `ai`, so UIMessage types aren't nominally compatible
    // across the duplicate. Same cast pattern as transport below.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: initialMessages as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transport: transport as any,
  });

  // Once the first user message has hit the server, swap the URL in
  // place so a reload keeps the thread.
  useEffect(() => {
    if (urlHasIdRef.current || urlReplacedRef.current) return;
    if (chat.messages.length === 0) return;
    window.history.replaceState(null, "", `/brands/${brandId}/chat/${conversationId}`);
    urlReplacedRef.current = true;
  }, [chat.messages.length, conversationId, brandId]);

  useEffect(() => {
    if (urlHasIdRef.current || sidebarRefreshRef.current) return;
    if (!urlReplacedRef.current) return;
    if (chat.status === "submitted" || chat.status === "streaming") return;
    if (chat.error) return;
    sidebarRefreshRef.current = true;
    router.refresh();
  }, [chat.status, chat.error, router]);

  useEffect(() => {
    setLockedSkill(initialSkillSlug);
  }, [initialSkillSlug]);

  const isBusy = chat.status === "streaming" || chat.status === "submitted";

  // When the current turn wraps up, drain one prompt from the queue.
  useEffect(() => {
    queueApi.drain(isBusy, (text) => {
      chat.sendMessage({ text });
    });
  }, [isBusy, chat, queueApi]);

  function onSend(text?: string) {
    const next = (text ?? input).trim();
    if (!next) return;
    if (isBusy) {
      queueApi.enqueue(next);
      setInput("");
      return;
    }
    chat.sendMessage({ text: next });
    setInput("");
  }

  const showEmpty = chat.messages.length === 0;

  return (
    <div className="flex h-full min-h-dvh min-w-0 flex-1 flex-col">
      <ChatHeader
        brandId={brandId}
        brandName={brandName}
        conversationTitle={conversationTitle}
        model={modelId}
        onModelChange={setModelId}
        lockedSkill={lockedSkill}
        skills={skills}
        onSkillChange={setLockedSkill}
        showThinking={showThinking}
        onShowThinkingChange={setShowThinking}
      />

      <Conversation className="relative flex-1">
        <ConversationContent className="mx-auto max-w-3xl">
          {showEmpty ? (
            <div className="hero-glow mx-auto flex min-h-[60vh] w-full flex-col items-center justify-center gap-7 py-14">
              <ConversationEmptyState
                icon={
                  <span className="bg-primary/10 text-primary inline-flex size-12 items-center justify-center rounded-xl">
                    <Sparkles className="size-6" />
                  </span>
                }
                title={
                  brandName
                    ? `What should we write for ${brandName} today?`
                    : "Start a new chat"
                }
                description="Ask anything about the brand — the model picks the right skill automatically, or lock one yourself."
              />
              <Suggestions>
                {SUGGESTION_PROMPTS.map((p) => (
                  <Suggestion
                    key={p}
                    suggestion={p}
                    onClick={(s) => {
                      setInput(s);
                      setTimeout(() => onSend(s), 0);
                    }}
                  />
                ))}
              </Suggestions>
            </div>
          ) : (
            chat.messages.map((m) => (
              <MessageRow
                key={m.id}
                message={m}
                isStreaming={chat.status === "streaming"}
                showThinking={showThinking}
              />
            ))
          )}
          {chat.status === "submitted" ? (
            <div className="mt-2 flex items-center gap-2 px-1 text-muted-foreground">
              <Loader />
              <span className="text-xs">Thinking…</span>
            </div>
          ) : null}
          {chat.error ? (
            <div className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-2 rounded-md border px-3 py-2 text-xs">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <div className="flex-1">
                <div className="font-medium">Something went wrong</div>
                <div className="opacity-80">{chat.error.message}</div>
              </div>
              <button
                onClick={() => chat.regenerate()}
                className="border-destructive/40 hover:bg-destructive/10 rounded border px-2 py-0.5 text-[11px] font-medium"
              >
                Retry
              </button>
            </div>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <QueuedPrompts
        items={queueApi.queue}
        onRemove={queueApi.dequeue}
        onClear={queueApi.clear}
      />

      <PromptBar
        value={input}
        onChange={setInput}
        onSubmit={() => onSend()}
        onStop={() => chat.stop()}
        isBusy={isBusy}
        placeholder={
          isBusy
            ? "Type to queue another prompt…"
            : lockedSkill
              ? `Describe what you need for ${skills.find((s) => s.slug === lockedSkill)?.display_name}…`
              : "Ask anything — Auto picks the right skill."
        }
      />
    </div>
  );
}

function MessageRow({
  message,
  isStreaming,
  showThinking,
}: {
  message: UIMessage;
  isStreaming: boolean;
  showThinking: boolean;
}) {
  const parts = useMemo(() => (message.parts ?? []) as PartLike[], [message.parts]);
  const isAssistant = message.role === "assistant";
  const assistantText = useMemo(
    () =>
      isAssistant
        ? parts
            .filter((p) => p.type === "text")
            .map((p) => p.text ?? "")
            .join("\n\n")
            .trim()
        : "",
    [isAssistant, parts],
  );

  return (
    <Message from={message.role}>
      <MessageContent
        className={
          message.role === "user"
            ? "!bg-primary !text-primary-foreground !rounded-2xl !rounded-br-md !px-4 !py-2.5"
            : "!p-0"
        }
      >
        {parts.map((part, idx) => renderPart(part, idx, isStreaming, showThinking))}
        {isAssistant && assistantText.length > 120 ? (
          <div className="mt-2 flex items-center gap-1.5">
            <CopyButton text={assistantText} />
            <OpenIn query={assistantText}>
              <OpenInTrigger>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground"
                >
                  <MoreHorizontal className="size-3.5" />
                  Open in
                </Button>
              </OpenInTrigger>
              <OpenInContent>
                <OpenInLabel>Continue this elsewhere</OpenInLabel>
                <OpenInSeparator />
                <OpenInChatGPT />
                <OpenInClaude />
              </OpenInContent>
            </OpenIn>
          </div>
        ) : null}
      </MessageContent>
    </Message>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignored
    }
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground"
      onClick={copy}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function renderPart(
  part: PartLike,
  idx: number,
  isStreaming: boolean,
  showThinking: boolean,
) {
  if (part.type === "text") {
    const text = String(part.text ?? "");
    const segments = parseCopySegments(text);
    // If no copy tags, render as plain prose — same as before.
    if (segments.length === 1 && segments[0].kind === "prose") {
      return (
        <div key={idx} className="prose prose-sm max-w-none">
          <Streamdown>{text}</Streamdown>
        </div>
      );
    }
    // Reset counter per part so variants A/B/C number as 1/2/3 each turn.
    let copyBlockCounter = 0;
    return (
      <div key={idx} className="flex flex-col gap-2">
        {segments.map((seg, si) => {
          if (seg.kind === "prose") {
            if (!seg.content.trim()) return null;
            return (
              <div key={si} className="prose prose-sm max-w-none">
                <Streamdown>{seg.content}</Streamdown>
              </div>
            );
          }
          const n = copyBlockCounter++;
          return (
            <CopyArtifact
              key={si}
              content={seg.content}
              streaming={seg.streaming}
              index={n}
            />
          );
        })}
      </div>
    );
  }

  if (part.type === "reasoning") {
    if (!showThinking) return null;
    const text = String(part.text ?? "");
    return (
      <Reasoning key={idx} isStreaming={isStreaming} className="my-1">
        <ReasoningTrigger />
        <ReasoningContent>{text}</ReasoningContent>
      </Reasoning>
    );
  }

  if (part.type === "tool-web_search" && part.state === "output-available") {
    const output = (part.output ?? {}) as { results?: Array<{ title: string; url: string; snippet?: string }> };
    const results = output.results ?? [];
    if (results.length > 0) {
      return (
        <Sources key={idx} className="not-prose my-3">
          <SourcesTrigger count={results.length} />
          <SourcesContent>
            {results.map((r, i) => (
              <Source key={i} href={r.url} title={r.title} />
            ))}
          </SourcesContent>
        </Sources>
      );
    }
    return renderGenericTool(part, idx);
  }

  if (part.type === "tool-brand_knowledge_search" && part.state === "output-available") {
    const output = (part.output ?? {}) as { matches?: number };
    return (
      <div
        key={idx}
        className="text-muted-foreground not-prose my-2 inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-0.5 text-[11px]"
      >
        <span className="size-1.5 rounded-full bg-primary/70" />
        <span>Searched brand docs · {output.matches ?? 0} match{output.matches === 1 ? "" : "es"}</span>
      </div>
    );
  }

  if (part.type === "tool-generate_email_variants" && part.state === "output-available") {
    const output = (part.output ?? {}) as { angle?: string; variants?: EmailVariantData[] };
    if (output.variants?.length) {
      return (
        <EmailVariants key={idx} angle={output.angle} variants={output.variants} />
      );
    }
  }

  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    return renderGenericTool(part, idx);
  }

  return null;
}

function renderGenericTool(part: PartLike, idx: number) {
  const name = part.type.replace(/^tool-/, "");
  const state = (part.state ?? "input-available") as
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  return (
    <CompactTool
      key={idx}
      name={name}
      state={state}
      input={part.input}
      output={part.output}
      errorText={part.errorText}
    />
  );
}
