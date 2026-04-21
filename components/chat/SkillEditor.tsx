'use client';

import { useState, useTransition } from 'react';
import { Pencil } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';

/**
 * Minimal SKILL.md editor for user-authored skills. Slug, description,
 * body. Deliberately thin — power users can export/import full SKILL.md
 * files once the UI has more depth.
 */
export function SkillEditor({
  scope = 'user',
  brandId,
  onCreated,
}: {
  scope?: 'user' | 'brand';
  brandId?: string;
  onCreated?: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setSlug('');
    setDescription('');
    setBody('');
    setError(null);
  }

  function submit() {
    if (!slug || !description || !body) {
      setError('Slug, description, and instructions are all required.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError('Slug must be lowercase letters, digits, and hyphens only.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, description, body, scope, brand_id: brandId }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'Create failed' }));
        setError(msg ?? 'Create failed');
        return;
      }
      onCreated?.(slug);
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Pencil className="size-3.5" />
          New skill
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create a skill</DialogTitle>
          <DialogDescription>
            Skills are reusable instructions the model can auto-activate. Describe when it should
            fire; write the instructions the model follows once it does.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="skill-slug (lowercase, hyphens)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={isPending}
          />
          <Textarea
            placeholder="When should this skill activate? Be specific — this is the description the model uses to decide."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[80px]"
            disabled={isPending}
          />
          <Textarea
            placeholder={'Skill instructions (markdown). Use {{brand.name}}, {{rag}}, {{memory}}, {{userInput}}.'}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[240px] font-mono text-sm"
            disabled={isPending}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? 'Creating…' : 'Create skill'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
