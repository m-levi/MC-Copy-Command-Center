"use client";

import * as React from "react";
import { PanelLeftIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Minimal shadcn-style sidebar. Fixed rail on the left, collapsible via
 * the context + SidebarTrigger in the top bar. Left narrow for focus on
 * chat content.
 */

type SidebarContext = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const SidebarCtx = React.createContext<SidebarContext | null>(null);

export function useSidebar() {
  const ctx = React.useContext(SidebarCtx);
  if (!ctx) throw new Error("useSidebar must be used inside SidebarProvider");
  return ctx;
}

export function SidebarProvider({
  defaultOpen = true,
  children,
  className,
  style,
  ...props
}: React.ComponentProps<"div"> & { defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const toggle = React.useCallback(() => setOpen((o) => !o), []);
  const value = React.useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);
  return (
    <SidebarCtx.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        data-state={open ? "open" : "closed"}
        style={
          {
            "--sidebar-width": "260px",
            "--sidebar-width-collapsed": "0px",
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          "group/sidebar-wrapper flex h-dvh w-full bg-background text-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarCtx.Provider>
  );
}

export function Sidebar({ className, children, ...props }: React.ComponentProps<"aside">) {
  const { open } = useSidebar();
  return (
    <aside
      data-slot="sidebar"
      data-state={open ? "open" : "closed"}
      className={cn(
        "bg-sidebar text-sidebar-foreground relative z-10 hidden shrink-0 border-r transition-[width] duration-200 md:block",
        open ? "w-[var(--sidebar-width)]" : "w-[var(--sidebar-width-collapsed)]",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full w-[var(--sidebar-width)] overflow-hidden transition-opacity duration-150",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="flex h-full flex-col">{children}</div>
      </div>
    </aside>
  );
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex min-h-[52px] items-center gap-2 px-3 py-2", className)}
      {...props}
    />
  );
}

export function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-1", className)}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("mt-auto flex flex-col gap-1 border-t p-2", className)}
      {...props}
    />
  );
}

export function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      className={cn("flex flex-col gap-0.5 py-1", className)}
      {...props}
    />
  );
}

export function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        "text-muted-foreground px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn("flex min-w-0 flex-1 flex-col", className)}
      {...props}
    />
  );
}

export function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggle } = useSidebar();
  return (
    <Button
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("size-8", className)}
      onClick={(e) => {
        toggle();
        onClick?.(e);
      }}
      aria-label="Toggle sidebar"
      {...props}
    >
      <PanelLeftIcon className="size-4" />
    </Button>
  );
}

export function SidebarMenu({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    />
  );
}

export function SidebarMenuButton({
  className,
  isActive,
  size = "default",
  ...props
}: React.ComponentProps<"button"> & { isActive?: boolean; size?: "default" | "lg" }) {
  return (
    <button
      data-slot="sidebar-menu-button"
      data-active={isActive ? "true" : "false"}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium",
        size === "lg" ? "h-11" : "h-8",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}
