'use client';

import { memo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  MessageSquare,
  Home,
  Settings,
  PlusCircle,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  brandId?: string;
  onNewConversation?: () => void;
  onOpenSidebar?: () => void;
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
  highlight?: boolean;
}

/**
 * Mobile bottom navigation bar
 * Shows on small screens (< lg breakpoint)
 * Provides quick access to key actions
 */
export const MobileBottomNav = memo(function MobileBottomNav({
  brandId,
  onNewConversation,
  onOpenSidebar,
  className,
}: MobileBottomNavProps) {
  const pathname = usePathname();

  const isHomePage = pathname === '/';
  const isChatPage = pathname?.includes('/chat');
  const isSettingsPage = pathname?.includes('/settings');

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="w-5 h-5" />,
      href: '/',
      isActive: isHomePage,
    },
    {
      id: 'chats',
      label: 'Chats',
      icon: <Menu className="w-5 h-5" />,
      onClick: onOpenSidebar,
      isActive: false,
    },
    {
      id: 'new',
      label: 'New',
      icon: <PlusCircle className="w-6 h-6" />,
      onClick: onNewConversation,
      highlight: true,
    },
    {
      id: 'current',
      label: 'Chat',
      icon: <MessageSquare className="w-5 h-5" />,
      href: brandId ? `/brands/${brandId}/chat` : undefined,
      isActive: isChatPage,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      href: '/settings',
      isActive: isSettingsPage,
    },
  ];

  return (
    <nav
      className={cn(
        // Only show on mobile
        'lg:hidden',
        // Fixed to bottom
        'fixed bottom-0 left-0 right-0 z-50',
        // Styling
        'bg-white dark:bg-gray-900',
        'border-t border-gray-200 dark:border-gray-800',
        // Safe area for notched phones
        'pb-[env(safe-area-inset-bottom,0px)]',
        // Shadow
        'shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]',
        className
      )}
    >
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map((item) => {
          const content = (
            <div
              className={cn(
                'flex flex-col items-center justify-center',
                'min-w-[56px] h-12',
                'rounded-xl',
                'transition-all duration-200',
                'touch-manipulation',
                'active:scale-95',
                item.highlight
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 -mt-4'
                  : item.isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {item.icon}
              {!item.highlight && (
                <span className="text-[10px] font-medium mt-0.5">
                  {item.label}
                </span>
              )}
            </div>
          );

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-center"
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className="flex items-center justify-center"
              aria-label={item.label}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
});

export default MobileBottomNav;
