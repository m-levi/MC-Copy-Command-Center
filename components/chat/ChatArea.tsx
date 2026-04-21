"use client";

import { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatHeader } from "./ChatHeader";
import { ChatEmptyState } from "./ChatEmptyState";
import { MessageList } from "./MessageList";
import { PromptBar } from "./PromptBar";
import type { SkillOption } from "./SkillPicker";

/**
 * Right-hand chat surface. Composition-only: header + messages (or empty
 * state) + prompt bar. All state lives in useChat.
 */
export function ChatArea({
  brandId,
  brandName,
  conversationId,
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
  const [lockedSkill, setLockedSkill] = useState<string | null>(initialSkillSlug);
  const [modelId, setModelId] = useState<string>(initialModelId);
  const [input, setInput] = useState("");

  // `@supermemory/tools` bundles its own copy of `ai`, creating two
  // distinct ChatTransport brand types. Cast through unknown→any so
  // useChat accepts our DefaultChatTransport.
  const transport = new (DefaultChatTransport as unknown as {
    new (init: {
      api: string;
      body: () => Record<string, unknown>;
    }): unknown;
  })({
    api: "/api/chat",
    body: () => ({
      brandId,
      conversationId,
      skillSlug: lockedSkill,
      modelId,
    }),
  });
  const chat = useChat({
    id: conversationId ?? `new-${brandId}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transport: transport as any,
  });

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

  return (
    <div className="flex h-dvh min-w-0 flex-1 flex-col">
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

      {chat.messages.length === 0 ? (
        <ChatEmptyState
          brandName={brandName}
          onPick={(prompt: string) => {
            setInput(prompt);
            setTimeout(() => onSend(prompt), 0);
          }}
        />
      ) : (
        <MessageList messages={chat.messages} status={chat.status} />
      )}

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
