'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  User,
  Bell,
  Cpu,
  Sparkles,
  FlaskConical,
  Box,
  Users,
  Building2,
  Shield,
  Smartphone,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Settings,
  Bot,
  Star,
} from 'lucide-react';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  adminOnly?: boolean;
  danger?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Personal',
    items: [
      {
        name: 'Profile',
        href: '/settings/profile',
        icon: User,
        description: 'Your personal information'
      },
      {
        name: 'Notifications',
        href: '/settings/notifications',
        icon: Bell,
        description: 'Email and alert preferences'
      },
      {
        name: 'Starred Emails',
        href: '/settings/starred',
        icon: Star,
        description: 'Your saved favorites'
      },
    ],
  },
  {
    title: 'AI & Content',
    items: [
      {
        name: 'AI Models',
        href: '/settings/models',
        icon: Cpu,
        description: 'Model selection & defaults'
      },
      {
        name: 'Quick Actions',
        href: '/settings/prompts',
        icon: Sparkles,
        description: 'Custom prompt shortcuts'
      },
      {
        name: 'Agent Builder',
        href: '/settings/modes',
        icon: Bot,
        description: 'Create & customize AI agents'
      },
      {
        name: 'Artifact Types',
        href: '/settings/artifact-types',
        icon: Box,
        description: 'Output format presets'
      },
      {
        name: 'Automations',
        href: '/settings/agents',
        icon: Sparkles,
        description: 'Scheduled insights & workflows'
      },
    ],
  },
  {
    title: 'Team & Organization',
    items: [
      {
        name: 'Team Members',
        href: '/settings/team',
        icon: Users,
        description: 'Manage your team',
        adminOnly: true
      },
      {
        name: 'Organization',
        href: '/settings/organization',
        icon: Building2,
        description: 'Workspace settings',
        adminOnly: true
      },
    ],
  },
  {
    title: 'Security & Access',
    items: [
      {
        name: 'Password',
        href: '/settings/security',
        icon: Shield,
        description: 'Update your password'
      },
      {
        name: 'Active Sessions',
        href: '/settings/sessions',
        icon: Smartphone,
        description: 'Manage logged-in devices'
      },
      {
        name: 'Audit Log',
        href: '/settings/audit',
        icon: FileText,
        description: 'Security event history'
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        name: 'Delete Account',
        href: '/settings/account',
        icon: Trash2,
        description: 'Permanently delete',
        danger: true
      },
    ],
  },
];

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    checkUserData();
  }, []);

  const checkUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user.id)
        .single();

      if (memberData?.role === 'admin') {
        setIsAdmin(true);
      }
      if (profileData) {
        setUserName(profileData.full_name || '');
        setUserEmail(profileData.email || user.email || '');
      }
    } catch (error) {
      console.error('Error checking user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Find current page info for header and breadcrumbs
  const currentSection = navSections.find(section =>
    section.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))
  );
  const currentPage = navSections
    .flatMap(section => section.items)
    .find(item => pathname === item.href || pathname.startsWith(item.href + '/'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      {/* Compact Top Navigation */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </Link>
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-semibold text-gray-900 dark:text-white">Settings</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{userName || 'User'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{userEmail}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                {userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <nav className="sticky top-20 space-y-6">
              {navSections.map((section) => {
                // Filter out admin-only items if not admin
                const visibleItems = section.items.filter(
                  item => !item.adminOnly || (item.adminOnly && !loading && isAdmin)
                );

                if (visibleItems.length === 0) return null;

                return (
                  <div key={section.title}>
                    <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      {section.title}
                    </h3>
                    <ul className="space-y-1">
                      {visibleItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        const Icon = item.icon;

                        return (
                          <li key={item.name}>
                            <Link
                              href={item.href}
                              className={cn(
                                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                isActive
                                  ? "bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-700 dark:text-purple-300 shadow-sm border border-purple-200/50 dark:border-purple-800/50"
                                  : item.danger
                                    ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "w-5 h-5 flex-shrink-0 transition-colors",
                                  isActive
                                    ? "text-purple-600 dark:text-purple-400"
                                    : item.danger
                                      ? "text-red-500"
                                      : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                                )}
                              />
                              <span>{item.name}</span>
                              {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500" />
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Breadcrumb Navigation */}
            {currentSection && currentPage && (
              <nav aria-label="Breadcrumb" className="mb-4">
                <ol className="flex items-center gap-1.5 text-sm">
                  <li>
                    <Link
                      href="/settings"
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      Settings
                    </Link>
                  </li>
                  <li aria-hidden="true">
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600" />
                  </li>
                  <li>
                    <span className="text-gray-500 dark:text-gray-400">
                      {currentSection.title}
                    </span>
                  </li>
                  <li aria-hidden="true">
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600" />
                  </li>
                  <li aria-current="page">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {currentPage.name}
                    </span>
                  </li>
                </ol>
              </nav>
            )}

            {/* Page Header */}
            {currentPage && (
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    currentPage.danger
                      ? "bg-red-100 dark:bg-red-900/30"
                      : "bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30"
                  )}>
                    <currentPage.icon className={cn(
                      "w-5 h-5",
                      currentPage.danger
                        ? "text-red-600 dark:text-red-400"
                        : "text-purple-600 dark:text-purple-400"
                    )} />
                  </div>
                  <div>
                    <h1 className={cn(
                      "text-xl font-semibold",
                      currentPage.danger
                        ? "text-red-900 dark:text-red-100"
                        : "text-gray-900 dark:text-gray-100"
                    )}>
                      {currentPage.name}
                    </h1>
                    {currentPage.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {currentPage.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Content Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 p-6 min-h-[500px]">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation (visible on smaller screens) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 z-40">
        <div className="flex items-center justify-around py-2 px-4">
          {[
            { name: 'Profile', href: '/settings/profile', icon: User },
            { name: 'AI', href: '/settings/models', icon: Cpu },
            { name: 'Team', href: '/settings/team', icon: Users },
            { name: 'Security', href: '/settings/security', icon: Shield },
          ].map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors",
                  isActive
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-gray-500 dark:text-gray-400"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Add padding at bottom for mobile nav */}
      <div className="lg:hidden h-20" />
    </div>
  );
}
