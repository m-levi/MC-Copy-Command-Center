"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { nanoid } from "nanoid";
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
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Loader } from "@/components/ai-elements/loader";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Streamdown } from "streamdown";
import { AlertCircle, Sparkles } from "lucide-react";
import { ChatHeader } from "./ChatHeader";
import { PromptBar } from "./PromptBar";
import type { SkillOption } from "./SkillPicker";

interface PartLike {
  type: string;
  text?: string;
  [k: string]: unknown;
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
  skills,
}: {
  brandId: string;
  brandName: string;
  conversationId?: string;
  conversationTitle?: string;
  initialSkillSlug: string | null;
  initialModelId: string;
  skills: SkillOption[];
}) {
  const [conversationId] = useState<string>(() => initialConversationId ?? nanoid());
  const urlHasIdRef = useRef<boolean>(Boolean(initialConversationId));
  const urlReplacedRef = useRef<boolean>(false);
  const [lockedSkill, setLockedSkill] = useState<string | null>(initialSkillSlug);
  const [modelId, setModelId] = useState<string>(initialModelId);
  const [input, setInput] = useState("");

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transport: transport as any,
  });

  // Once the first user message has hit the server (= chat has anything
  // in it), swap the URL in-place to the persisted conversation id so a
  // reload returns to the same thread. Using history.replaceState avoids
  // remounting the ChatArea, which would wipe useChat's in-memory state.
  useEffect(() => {
    if (urlHasIdRef.current || urlReplacedRef.current) return;
    if (chat.messages.length === 0) return;
    const target = `/brands/${brandId}/chat/${conversationId}`;
    window.history.replaceState(null, "", target);
    urlReplacedRef.current = true;
  }, [chat.messages.length, conversationId, brandId]);

  useEffect(() => {
    setLockedSkill(initialSkillSlug);
  }, [initialSkillSlug]);

  const isBusy = chat.status === "streaming" || chat.status === "submitted";

  function onSend(text?: string) {
    const next = (text ?? input).trim();
    if (!next || isBusy) return;
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
            chat.messages.map((m) => {
              const parts = (m.parts ?? []) as PartLike[];
              return (
                <Message key={m.id} from={m.role}>
                  <MessageContent
                    className={
                      m.role === "user"
                        ? "!bg-primary !text-primary-foreground !rounded-2xl !rounded-br-md !px-4 !py-2.5"
                        : "!p-0"
                    }
                  >
                    {parts.map((part, idx) => renderPart(part, idx, chat.status === "streaming"))}
                  </MessageContent>
                </Message>
              );
            })
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

      <PromptBar
        value={input}
        onChange={setInput}
        onSubmit={() => onSend()}
        onStop={() => chat.stop()}
        isBusy={isBusy}
        placeholder={
          lockedSkill
            ? `Describe what you need for ${skills.find((s) => s.slug === lockedSkill)?.display_name}…`
            : "Ask anything — Auto picks the right skill."
        }
      />
    </div>
  );
}

function renderPart(part: PartLike, idx: number, isStreaming: boolean) {
  if (part.type === "text") {
    const text = String(part.text ?? "");
    return (
      <div key={idx} className="prose prose-sm max-w-none">
        <Streamdown>{text}</Streamdown>
      </div>
    );
  }
  if (part.type === "reasoning") {
    const text = String(part.text ?? "");
    return (
      <Reasoning key={idx} isStreaming={isStreaming} className="my-1">
        <ReasoningTrigger />
        <ReasoningContent>{text}</ReasoningContent>
      </Reasoning>
    );
  }
  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    const name = part.type.replace(/^tool-/, "");
    const toolPart = part as PartLike & {
      state?: string;
      input?: unknown;
      output?: unknown;
      errorText?: string;
    };
    const state = (toolPart.state ?? "input-available") as Parameters<typeof ToolHeader>[0]["state"];
    return (
      <Tool key={idx} defaultOpen={false}>
        <ToolHeader title={`Using ${name}`} type={part.type as `tool-${string}`} state={state} />
        <ToolContent>
          {toolPart.input ? <ToolInput input={toolPart.input} /> : null}
          {toolPart.output !== undefined || toolPart.errorText ? (
            <ToolOutput
              output={toolPart.output !== undefined ? JSON.stringify(toolPart.output, null, 2) : null}
              errorText={toolPart.errorText}
            />
          ) : null}
        </ToolContent>
      </Tool>
    );
  }
  return null;
}
