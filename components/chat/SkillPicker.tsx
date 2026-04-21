'use client';

import { useState } from 'react';
import { Sparkles, Lock, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface SkillOption {
  slug: string;
  display_name: string;
  description: string;
  scope: 'builtin' | 'global' | 'org' | 'brand' | 'user';
  icon?: string;
}

export function SkillPicker({
  locked,
  skills,
  onChange,
}: {
  locked: string | null;
  skills: SkillOption[];
  onChange: (slug: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const lockedSkill = skills.find((s) => s.slug === locked) ?? null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={cn(
            'h-8 gap-1.5 rounded-full pl-2 pr-2',
            lockedSkill ? 'border-primary/60 bg-primary/5' : 'border-dashed',
          )}
          aria-label={lockedSkill ? `Locked to ${lockedSkill.display_name}` : 'Auto skill routing'}
        >
          {lockedSkill ? (
            <>
              <Lock className="size-3.5" />
              <span className="max-w-[140px] truncate">{lockedSkill.display_name}</span>
              <span
                className="ml-1 inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                role="button"
                aria-label="Clear skill lock"
              >
                <X className="size-3" />
              </span>
            </>
          ) : (
            <>
              <Sparkles className="size-3.5 text-primary" />
              <span>Auto</span>
              <ChevronDown className="size-3.5 opacity-60" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Find a skill…" className="h-9" />
          <CommandList className="max-h-80">
            <CommandEmpty>No skills match.</CommandEmpty>
            <CommandGroup heading="Auto">
              <CommandItem
                value="auto"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Sparkles className="mr-2 size-4 text-primary" />
                <div className="flex flex-col">
                  <span className="text-sm">Auto</span>
                  <span className="text-xs text-muted-foreground">
                    Let the model pick the right skill each turn.
                  </span>
                </div>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Lock to a skill">
              {skills.map((s) => (
                <CommandItem
                  key={s.slug}
                  value={`${s.slug} ${s.display_name} ${s.description}`}
                  onSelect={() => {
                    onChange(s.slug);
                    setOpen(false);
                  }}
                >
                  <Lock className="mr-2 size-4" />
                  <div className="flex flex-col">
                    <span className="text-sm">{s.display_name}</span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {s.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
