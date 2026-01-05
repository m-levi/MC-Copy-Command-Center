'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  User,
  Bell,
  Cpu,
  Sparkles,
  FlaskConical,
  Shield,
  Users,
  ArrowRight,
  Check,
  Clock,
  Zap,
  Smartphone,
} from 'lucide-react';

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

const quickActions: QuickAction[] = [
  {
    title: 'Edit Profile',
    description: 'Update your name and avatar',
    href: '/settings/profile',
    icon: User,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40',
  },
  {
    title: 'AI Models',
    description: 'Choose your preferred models',
    href: '/settings/models',
    icon: Cpu,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40',
  },
  {
    title: 'Notifications',
    description: 'Manage email preferences',
    href: '/settings/notifications',
    icon: Bell,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40',
  },
  {
    title: 'Mode Lab',
    description: 'Create custom AI modes',
    href: '/settings/modes',
    icon: FlaskConical,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
  },
  {
    title: 'Quick Actions',
    description: 'Set up prompt shortcuts',
    href: '/settings/prompts',
    icon: Sparkles,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-50 dark:bg-pink-950/30 hover:bg-pink-100 dark:hover:bg-pink-900/40',
  },
  {
    title: 'Security',
    description: 'Change your password',
    href: '/settings/security',
    icon: Shield,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40',
  },
];

interface UserStats {
  fullName: string;
  email: string;
  lastLogin: string | null;
  loginCount: number;
  memberSince: string;
  teamSize: number;
  hasPassword: boolean;
  enabledModelsCount: number;
  activeSessions: number;
}

export default function SettingsOverviewPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Parallel fetch for better performance
      const [profileResult, prefsResult, teamResult, sessionsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, email, last_login_at, login_count, password_changed_at, created_at')
          .eq('user_id', user.id)
          .single(),
        fetch('/api/user-preferences').then(r => r.json()),
        supabase.from('organization_members').select('id', { count: 'exact' }),
        supabase.from('sessions').select('id', { count: 'exact' }).eq('user_id', user.id),
      ]);

      const profile = profileResult.data;

      setStats({
        fullName: profile?.full_name || '',
        email: profile?.email || user.email || '',
        lastLogin: profile?.last_login_at,
        loginCount: profile?.login_count || 0,
        memberSince: profile?.created_at || user.created_at,
        teamSize: teamResult.count || 0,
        hasPassword: !!profile?.password_changed_at,
        enabledModelsCount: prefsResult.enabled_models?.length || 0,
        activeSessions: sessionsResult.count || 1,
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatMemberSince = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-600 to-blue-600 p-6 text-white">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1">
            {loading ? 'Welcome' : `Welcome, ${stats?.fullName?.split(' ')[0] || 'there'}`}
          </h2>
          <p className="text-purple-100 text-sm">
            Manage your account, preferences, and security settings
          </p>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
      </div>

      {/* Stats Row */}
      {!loading && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Last Login</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatDate(stats.lastLogin)}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Logins</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {stats.loginCount}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Team Size</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {stats.teamSize} {stats.teamSize === 1 ? 'member' : 'members'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Sessions</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {stats.activeSessions}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className={cn(
                  "group flex items-center gap-4 p-4 rounded-xl border border-transparent transition-all duration-200",
                  action.bgColor
                )}
              >
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center bg-white dark:bg-gray-800 shadow-sm",
                )}>
                  <Icon className={cn("w-5 h-5", action.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-gray-900">
                    {action.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-1 transition-transform" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Security Checklist */}
      <div className="p-5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Security Checklist
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Keep your account secure
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            {
              title: 'Profile completed',
              done: !loading && !!stats?.fullName,
              href: '/settings/profile',
            },
            {
              title: 'Strong password set',
              done: !loading && stats?.hasPassword,
              href: '/settings/security',
            },
            {
              title: 'Notifications configured',
              done: true, // Always true since defaults are set
              href: '/settings/notifications',
            },
          ].map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 transition-colors group"
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                item.done
                  ? "bg-emerald-100 dark:bg-emerald-900/30"
                  : "bg-gray-100 dark:bg-gray-700"
              )}>
                {item.done ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-500" />
                )}
              </div>
              <span className={cn(
                "text-sm font-medium flex-1",
                item.done
                  ? "text-gray-600 dark:text-gray-400"
                  : "text-gray-900 dark:text-gray-100"
              )}>
                {item.title}
              </span>
              {!item.done && (
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Complete
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Member Since Footer */}
      {!loading && stats && (
        <div className="text-center py-4">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Member since {formatMemberSince(stats.memberSince)}
          </p>
        </div>
      )}
    </div>
  );
}
