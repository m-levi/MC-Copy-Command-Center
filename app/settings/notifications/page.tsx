'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface EmailNotificationSettings {
  enabled: boolean;
  comment_added: boolean;
  comment_assigned: boolean;
  comment_mention: boolean;
  review_requested: boolean;
  review_completed: boolean;
  team_invite: boolean;
}

const defaultSettings: EmailNotificationSettings = {
  enabled: true,
  comment_added: true,
  comment_assigned: true,
  comment_mention: true,
  review_requested: true,
  review_completed: true,
  team_invite: true,
};

const notificationTypes = [
  {
    key: 'comment_added' as const,
    title: 'New Comments',
    description: 'When someone comments on your conversations',
    icon: '💬',
  },
  {
    key: 'comment_assigned' as const,
    title: 'Task Assignments',
    description: 'When someone assigns you to a comment or task',
    icon: '📌',
  },
  {
    key: 'comment_mention' as const,
    title: 'Mentions',
    description: 'When someone @mentions you in a comment',
    icon: '👋',
  },
  {
    key: 'review_requested' as const,
    title: 'Review Requests',
    description: 'When someone requests your review on an email',
    icon: '🔍',
  },
  {
    key: 'review_completed' as const,
    title: 'Review Updates',
    description: 'When a reviewer completes their review',
    icon: '✅',
  },
  {
    key: 'team_invite' as const,
    title: 'Team Invitations',
    description: 'When you\'re invited to join a team',
    icon: '✨',
  },
];

export default function NotificationsPage() {
  const [settings, setSettings] = useState<EmailNotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/user-preferences');
      if (!response.ok) throw new Error('Failed to load preferences');
      
      const data = await response.json();
      
      if (data.email_notifications) {
        setSettings({ ...defaultSettings, ...data.email_notifications });
      }
    } catch (error: any) {
      console.error('Error loading notification settings:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: EmailNotificationSettings) => {
    setSaving(true);
    try {
      const response = await fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_notifications: newSettings,
        }),
      });

      if (!response.ok) throw new Error('Failed to save preferences');
      
      toast.success('Notification settings saved');
    } catch (error: any) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save notification settings');
      // Revert on error
      loadSettings();
    } finally {
      setSaving(false);
    }
  };

  const toggleMasterSwitch = async () => {
    const newSettings = { ...settings, enabled: !settings.enabled };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const sendTestEmail = async () => {
    setSendingTest(true);
    setTestResult(null);
    setTestMessage('');

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setTestResult('success');
        setTestMessage(`Test email sent to ${data.config?.recipientEmail || 'your email'}. Check your inbox!`);
      } else {
        setTestResult('error');
        setTestMessage(data.error || data.details?.error || 'Failed to send test email');
      }
    } catch (error: any) {
      setTestResult('error');
      setTestMessage(error.message || 'Network error');
    } finally {
      setSendingTest(false);
      // Reset the result after 5 seconds
      setTimeout(() => {
        setTestResult(null);
        setTestMessage('');
      }, 5000);
    }
  };

  const toggleSetting = async (key: keyof EmailNotificationSettings) => {
    if (key === 'enabled') return toggleMasterSwitch();
    
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Email Notifications
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
        Control which notifications you receive via email. In-app notifications are always enabled.
      </p>

      {/* Master Toggle */}
      <div className="mb-8 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg">
              ✉️
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Email Notifications
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {settings.enabled ? 'Enabled' : 'Disabled'} — Toggle to turn all email notifications on or off
              </p>
            </div>
          </div>
          <button
            onClick={toggleMasterSwitch}
            disabled={saving}
            className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
              settings.enabled 
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600' 
                : 'bg-gray-300 dark:bg-gray-700'
            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                settings.enabled ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Individual Settings */}
      <div className={`space-y-4 transition-opacity duration-200 ${!settings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Notification Types
        </h3>
        
        {notificationTypes.map((type) => (
          <div
            key={type.key}
            className="flex items-center justify-between p-4 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{type.icon}</span>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  {type.title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {type.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleSetting(type.key)}
              disabled={saving || !settings.enabled}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                settings[type.key] 
                  ? 'bg-indigo-500' 
                  : 'bg-gray-300 dark:bg-gray-600'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  settings[type.key] ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Test Email Section */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <span className="text-2xl">🧪</span>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                Test Email Delivery
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Send a test email to verify notifications are working
              </p>
            </div>
          </div>
          <button
            onClick={sendTestEmail}
            disabled={sendingTest}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              testResult === 'success'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : testResult === 'error'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50'
            } ${sendingTest ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {sendingTest ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </span>
            ) : testResult === 'success' ? (
              '✓ Sent!'
            ) : testResult === 'error' ? (
              '✗ Failed'
            ) : (
              'Send Test Email'
            )}
          </button>
        </div>
        {testMessage && (
          <p className={`mt-3 text-sm ${
            testResult === 'success' 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {testMessage}
          </p>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/50">
        <div className="flex gap-3">
          <span className="text-amber-600 dark:text-amber-500">💡</span>
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
              About Email Notifications
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300/80">
              Email notifications help you stay on top of important updates even when you&apos;re not actively using Scribe. 
              You&apos;ll always receive in-app notifications regardless of these settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

