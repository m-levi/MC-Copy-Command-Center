'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

/**
 * One-click new-client button. Single required field — name. Everything
 * else (voice, documents, style guide) can be filled in from inside the
 * chat. The goal is zero friction to start a new brand conversation.
 */
export function NewClientButton({ variant = 'default' }: { variant?: 'default' | 'ghost' }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the client a name to continue.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'Create failed' }));
        setError(msg ?? 'Create failed');
        return;
      }
      const { brand } = await res.json();
      setName('');
      setOpen(false);
      router.push(`/brands/${brand.id}/chat`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          className="w-full justify-start gap-2"
          aria-label="Add a new client"
        >
          <Plus className="size-4" />
          New client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
          <DialogDescription>
            Just the name — everything else can be filled in later from the chat.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3"
        >
          <Input
            autoFocus
            placeholder="Acme Supply Co."
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            aria-label="Client name"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create & open chat'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
