'use client';

import { createContext, useContext } from 'react';

export type SidebarPanelContextType = {
  isCollapsed: boolean;
  toggleCollapse: () => void;
} | null;

export const SidebarPanelContext = createContext<SidebarPanelContextType>(null);

export function useSidebarPanel() {
  return useContext(SidebarPanelContext);
}

