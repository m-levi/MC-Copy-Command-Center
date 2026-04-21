import type { ReactNode } from 'react';

/**
 * Outer two-pane shell: sidebar | main. Kept intentionally trivial so the
 * chat page is just `<ChatShell sidebar={...}>{area}</ChatShell>`.
 */
export function ChatShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      {sidebar}
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
