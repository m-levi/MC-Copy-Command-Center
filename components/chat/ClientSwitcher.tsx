'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
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

export interface BrandOption {
  id: string;
  name: string;
}

/**
 * Command-palette style brand switcher. Cmd+K filter, click-through to
 * the brand's chat page. For 1-3 brands it's instant; for 100+ the search
 * is how you find one.
 */
export function ClientSwitcher({
  current,
  brands,
}: {
  current: BrandOption | null;
  brands: BrandOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const label = useMemo(
    () => (current ? current.name : brands.length ? 'Select a client' : 'No clients yet'),
    [current, brands.length],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] p-0" align="start">
        <Command>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 opacity-50" />
            <CommandInput
              placeholder="Search clients…"
              className="h-9 border-0 focus:ring-0"
            />
          </div>
          <CommandList className="max-h-64">
            <CommandEmpty>No clients match that search.</CommandEmpty>
            <CommandGroup>
              {brands.map((b) => (
                <CommandItem
                  key={b.id}
                  value={b.name}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/brands/${b.id}/chat`);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      current?.id === b.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{b.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
