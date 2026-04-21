'use client';

import { useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { DefaultChatTransport as _DefaultChatTransport } from 'ai';
// `@supermemory/tools` bundles its own copy of `ai`, which produces two
// distinct `ChatTransport` brand types. Cast through `any` so the useChat
// call sees our transport as the expected type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DefaultChatTransport = _DefaultChatTransport as any;
import { Send } from 'lucide-react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { SkillPicker, type SkillOption } from './SkillPicker';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/**
 * Main chat surface. AI Elements + a compact footer: SkillPicker on the
 * left, textarea in the middle, send on the right. All shadcn + Tailwind.
 */
export function ChatArea({
  brandId,
  conversationId,
  initialSkillSlug,
  skills,
}: {
  brandId: string;
  conversationId?: string;
  initialSkillSlug: string | null;
  skills: SkillOption[];
}) {
  const [lockedSkill, setLockedSkill] = useState<string | null>(initialSkillSlug);
  const [input, setInput] = useState('');

  const chat = useChat({
    id: conversationId ?? `new-${brandId}`,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({
        brandId,
        conversationId,
        skillSlug: lockedSkill,
      }),
    }),
  });

  useEffect(() => {
    setLockedSkill(initialSkillSlug);
  }, [initialSkillSlug]);

  const isBusy = chat.status === 'streaming' || chat.status === 'submitted';

  function onSend() {
    const text = input.trim();
    if (!text || isBusy) return;
    chat.sendMessage({ text });
    setInput('');
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {chat.messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent>
                {(m.parts ?? []).map((part, idx) => {
                  if (part.type === 'text') {
                    return <span key={idx}>{part.text}</span>;
                  }
                  if (part.type === 'reasoning') {
                    return (
                      <Reasoning key={idx}>
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-background p-3">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <div className="flex items-center gap-2">
            <SkillPicker locked={lockedSkill} skills={skills} onChange={setLockedSkill} />
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onSend();
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                lockedSkill
                  ? `Describe what you need for ${skills.find((s) => s.slug === lockedSkill)?.display_name}…`
                  : 'Ask anything. Auto picks the right skill.'
              }
              className="max-h-40 min-h-[52px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <Button type="submit" disabled={!input.trim() || isBusy} className="gap-2">
              <Send className="size-4" />
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
