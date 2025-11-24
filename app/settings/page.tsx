'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { BrandDocument } from '@/types';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import PromptEditor from '@/components/PromptEditor';

export const dynamic = 'force-dynamic';

interface Profile {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  last_login_at: string | null;
  login_count: number;
  password_changed_at: string | null;
}

interface Session {
  id: string;
  device_info: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_activity: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  event_type: string;
  ip_address: string | null;
  created_at: string;
}

interface Brand {
  id: string;
  name: string;
}

interface CustomPrompt {
  id: string;
  name: string;
  description?: string;
  prompt_type: 'design_email' | 'letter_email' | 'flow_email';
  system_prompt: string;
  user_prompt: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function SettingsContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [starredEmails, setStarredEmails] = useState<BrandDocument[]>([]);
  const [loadingStarred, setLoadingStarred] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'sessions' | 'audit' | 'starred' | 'account' | 'debug'>('profile');
  const [showStarDialog, setShowStarDialog] = useState(false);
  const [emailToStar, setEmailToStar] = useState('');
  const [starringEmail, setStarringEmail] = useState(false);
  
  // Debug Mode State
  const [debugModeEnabled, setDebugModeEnabled] = useState(false);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [promptForm, setPromptForm] = useState<{
    name: string;
    description: string;
    prompt_type: string;
    system_prompt: string;
    user_prompt: string;
  }>({
    name: '',
    description: '',
    prompt_type: 'design_email',
    system_prompt: '',
    user_prompt: '',
  });
  const [savingPrompt, setSavingPrompt] = useState(false);

  // Profile form
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Account deletion
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    loadData();
    
    // Check if tab query parameter is present
    const tabParam = searchParams.get('tab');
    if (tabParam === 'starred') {
      setActiveTab('starred');
    } else if (tabParam === 'debug') {
      setActiveTab('debug');
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'starred' && selectedBrandId) {
      loadStarredEmails();
    } else if (activeTab === 'debug') {
      loadDebugSettings();
      loadPrompts();
    }
  }, [activeTab, selectedBrandId]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      
      setProfile(profileData);
      setFullName(profileData.full_name || '');
      setAvatarUrl(profileData.avatar_url || '');

      // Load active sessions
      const { data: sessionsData } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_activity', { ascending: false })
        .limit(10);

      if (sessionsData) setSessions(sessionsData);

      // Load audit logs
      const { data: auditData } = await supabase
        .from('security_audit_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (auditData) setAuditLogs(auditData);

      // Load brands for starred emails
      const { data: brandsData } = await supabase
        .from('brands')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (brandsData && brandsData.length > 0) {
        setBrands(brandsData);
        setSelectedBrandId(brandsData[0].id);
      }

    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadDebugSettings = async () => {
    try {
      const response = await fetch('/api/debug/settings');
      if (response.ok) {
        const data = await response.json();
        setDebugModeEnabled(data.debug_mode_enabled);
      }
    } catch (error) {
      console.error('Error loading debug settings:', error);
    }
  };

  const loadPrompts = async () => {
    setLoadingPrompts(true);
    try {
      const response = await fetch('/api/debug/prompts');
      if (response.ok) {
        const data = await response.json();
        setCustomPrompts(data);
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
      toast.error('Failed to load custom prompts');
    } finally {
      setLoadingPrompts(false);
    }
  };

  const toggleDebugMode = async () => {
    const newValue = !debugModeEnabled;
    setDebugModeEnabled(newValue);
    try {
      const response = await fetch('/api/debug/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debug_mode_enabled: newValue }),
      });
      
      if (!response.ok) throw new Error('Failed to update debug settings');
      toast.success(`Debug mode ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating debug settings:', error);
      setDebugModeEnabled(!newValue); // Revert on error
      toast.error('Failed to update settings');
    }
  };

  const handleOpenPromptDialog = (prompt: CustomPrompt | null = null) => {
    if (prompt) {
      setEditingPrompt(prompt);
      setPromptForm({
        name: prompt.name,
        description: prompt.description || '',
        prompt_type: prompt.prompt_type,
        system_prompt: prompt.system_prompt || '',
        user_prompt: prompt.user_prompt || '',
      });
    } else {
      setEditingPrompt(null);
      setPromptForm({
        name: '',
        description: '',
        prompt_type: 'design_email',
        system_prompt: '',
        user_prompt: '',
      });
    }
    setShowPromptDialog(true);
  };

  const handleSavePrompt = async () => {
    if (!promptForm.name) {
      toast.error('Prompt name is required');
      return;
    }
    
    if (!promptForm.system_prompt && !promptForm.user_prompt) {
      toast.error('At least one prompt (system or user) is required');
      return;
    }

    setSavingPrompt(true);
    try {
      const url = editingPrompt 
        ? `/api/debug/prompts/${editingPrompt.id}`
        : '/api/debug/prompts';
      
      const method = editingPrompt ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...promptForm,
          is_active: editingPrompt ? editingPrompt.is_active : false
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save prompt');
      }

      toast.success(`Prompt ${editingPrompt ? 'updated' : 'created'} successfully`);
      setShowPromptDialog(false);
      loadPrompts();
    } catch (error: any) {
      console.error('Error saving prompt:', error);
      toast.error(error.message || 'Failed to save prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      const response = await fetch(`/api/debug/prompts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete prompt');

      toast.success('Prompt deleted successfully');
      loadPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('Failed to delete prompt');
    }
  };

  const handleActivatePrompt = async (prompt: CustomPrompt) => {
    try {
      // Optimistic update
      setCustomPrompts(prev => prev.map(p => {
        if (p.prompt_type === prompt.prompt_type) {
          return { ...p, is_active: p.id === prompt.id };
        }
        return p;
      }));

      const response = await fetch(`/api/debug/prompts/${prompt.id}/activate`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to activate prompt');

      toast.success('Prompt activated');
      // Refresh to ensure sync with server triggers
      loadPrompts();
    } catch (error) {
      console.error('Error activating prompt:', error);
      toast.error('Failed to activate prompt');
      loadPrompts(); // Revert on error
    }
  };

  const loadStarredEmails = async () => {
    if (!selectedBrandId) return;
    
    setLoadingStarred(true);
    try {
      const { data, error } = await supabase
        .from('brand_documents')
        .select('*')
        .eq('brand_id', selectedBrandId)
        .eq('doc_type', 'example')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStarredEmails(data || []);
    } catch (error: any) {
      console.error('Error loading starred emails:', error);
      toast.error('Failed to load starred emails');
    } finally {
      setLoadingStarred(false);
    }
  };

  const handleUnstarEmail = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('brand_documents')
        .delete()
        .eq('id', emailId);

      if (error) throw error;

      setStarredEmails(prev => prev.filter(e => e.id !== emailId));
      toast.success('Email removed from starred');
    } catch (error: any) {
      console.error('Error removing starred email:', error);
      toast.error('Failed to remove email');
    }
  };

  const handleStarEmail = async () => {
    if (!emailToStar.trim()) {
      toast.error('Please enter email content');
      return;
    }

    if (!selectedBrandId) {
      toast.error('Please select a brand');
      return;
    }

    if (starredEmails.length >= 10) {
      toast.error('You\'ve reached the limit of 10 starred emails. Please remove some first.');
      return;
    }

    setStarringEmail(true);

    try {
      // Generate title from first line
      const firstLine = emailToStar.split('\n')[0]
        .replace(/^#+\s*/, '')
        .replace(/EMAIL SUBJECT LINE:|SUBJECT:/gi, '')
        .trim()
        .substring(0, 100);

      const title = firstLine || 'Email Copy';

      // Generate embedding
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrandId,
          docType: 'example',
          title,
          content: emailToStar,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to star email');
      }

      toast.success('Email starred successfully!');
      setEmailToStar('');
      setShowStarDialog(false);
      await loadStarredEmails();
    } catch (error: any) {
      console.error('Error starring email:', error);
      toast.error('Failed to star email');
    } finally {
      setStarringEmail(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: avatarUrl,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      await loadData();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setChangingPassword(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile) throw new Error('Not authenticated');

      // Verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      });

      if (verifyError) {
        toast.error('Current password is incorrect');
        setChangingPassword(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Record password change (this requires service role, so we'll do it via API)
      await fetch('/api/auth/record-password-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      toast.success('Password changed successfully');
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      await loadData();
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Session revoked');
      await loadData();
    } catch (error: any) {
      console.error('Error revoking session:', error);
      toast.error('Failed to revoke session');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password');
      return;
    }

    if (!confirm('Are you absolutely sure? This action cannot be undone. All your data will be permanently deleted.')) {
      return;
    }

    setDeletingAccount(true);

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      toast.success('Account deleted successfully');
      
      // Sign out and redirect
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login':
        return '🔓';
      case 'logout':
        return '🔒';
      case 'password_change':
        return '🔑';
      case 'failed_login':
        return '❌';
      case 'account_locked':
        return '🚫';
      default:
        return '📝';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Account Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your account, security, and preferences
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'security'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Security
            </button>
            <button
              onClick={() => setActiveTab('starred')}
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'starred'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <svg className="w-4 h-4 fill-current text-yellow-500" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Starred Emails
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'sessions'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Active Sessions
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Security Log
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'account'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Account
            </button>
            <button
              onClick={() => setActiveTab('debug')}
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'debug'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M20 10V8h-4V4h-2v4h-4V4H8v4H4v2h4v4H4v2h4v4h2v-4h4v4h2v-4h4v-2h-4v-4h4zm-6 4h-4v-4h4v4z"/>
              </svg>
              Debug Mode
            </button>
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Profile Information
            </h2>
            
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 rounded-lg"
                />
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Email cannot be changed directly. Contact support if needed.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Avatar URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              {profile && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Last Login</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      {profile.last_login_at ? formatDate(profile.last_login_at) : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Logins</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      {profile.login_count || 0}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Change Password
            </h2>
            
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={changingPassword}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={changingPassword}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  placeholder="Enter new password"
                />
                <PasswordStrengthIndicator password={newPassword} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={changingPassword}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  placeholder="Confirm new password"
                />
              </div>

              {profile?.password_changed_at && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Last changed:</strong> {formatDate(profile.password_changed_at)}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
              >
                {changingPassword && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {changingPassword ? 'Changing Password...' : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Active Sessions
            </h2>
            
            {sessions.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No active sessions</p>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {session.device_info || 'Unknown Device'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        IP: {session.ip_address || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Last active: {formatDate(session.last_activity)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Starred Emails Tab */}
        {activeTab === 'starred' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Starred Emails
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage your starred email examples that help train the AI
                </p>
              </div>
              <div className="flex items-center gap-3">
                {brands.length > 1 && (
                  <select
                    value={selectedBrandId}
                    onChange={(e) => setSelectedBrandId(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => setShowStarDialog(true)}
                  disabled={starredEmails.length >= 10}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title={starredEmails.length >= 10 ? 'Remove some emails first' : 'Star a new email'}
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Star Email
                </button>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    How starred emails improve AI
                  </p>
                  <p className="text-blue-700 dark:text-blue-200">
                    When you star an email, the AI uses it as a reference example to learn your preferred style, tone, and structure. Star 3-10 high-quality emails for best results.
                  </p>
                </div>
              </div>
            </div>

            {loadingStarred ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : starredEmails.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">No starred emails yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Start starring your favorite emails in the chat to build your reference library
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {starredEmails.length} of 10 emails starred
                  </p>
                  {starredEmails.length >= 10 && (
                    <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full">
                      ⚠️ Limit reached
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {starredEmails.map((email) => {
                    const preview = email.content.substring(0, 200).replace(/\n/g, ' ');
                    const firstLine = email.title || email.content.split('\n')[0].replace(/^#+\s*/, '').substring(0, 80);
                    
                    return (
                      <div
                        key={email.id}
                        className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" viewBox="0 0 24 24">
                                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                              <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {firstLine}
                              </h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                              {preview}...
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                              <div className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {new Date(email.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleUnstarEmail(email.id)}
                            className="p-2 text-yellow-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Unstar this email"
                          >
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Security Audit Log
            </h2>
            
            {auditLogs.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No security events</p>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getEventIcon(log.event_type)}</span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {log.event_type.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {log.ip_address && `IP: ${log.ip_address}`}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Account Tab - Danger Zone */}
        {activeTab === 'account' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Account Management
            </h2>
            
            {/* Danger Zone */}
            <div className="border-2 border-red-200 dark:border-red-800 rounded-lg p-6 bg-red-50 dark:bg-red-950/20">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                    Danger Zone
                  </h3>
                  <p className="text-red-800 dark:text-red-200 mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
              
              <div className="border-t border-red-300 dark:border-red-700 pt-4 mt-4">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-2">
                  What happens when you delete your account:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 ml-4">
                  <li>• All your personal information will be permanently deleted</li>
                  <li>• All brands you created will be deleted</li>
                  <li>• All conversations and messages will be deleted</li>
                  <li>• All settings and preferences will be lost</li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Debug Mode Tab */}
        {activeTab === 'debug' && (
          <div className="space-y-6">
            {/* Toggle Debug Mode */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Debug Mode
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Enable debug mode to test custom prompts during email generation
                  </p>
                </div>
                <button
                  onClick={toggleDebugMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    debugModeEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span className="sr-only">Enable Debug Mode</span>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      debugModeEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Custom Prompts Library */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Prompt Library
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Create and manage custom prompts for testing
                  </p>
                </div>
                <button
                  onClick={() => handleOpenPromptDialog()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Prompt
                </button>
              </div>

              {/* Info Banner */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      How Custom Prompts Work
                    </p>
                    <ul className="text-blue-700 dark:text-blue-200 space-y-1 list-disc list-inside">
                      <li><strong>System Prompt</strong> — Instructions for the AI (tone, rules, format)</li>
                      <li><strong>User Prompt</strong> — Template with variables like {'{{COPY_BRIEF}}'}</li>
                      <li>Only <strong>one prompt</strong> can be active per email type</li>
                      <li>Leave either field empty to use the default for that part</li>
                    </ul>
                  </div>
                </div>
              </div>

              {loadingPrompts ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Loading prompts...</p>
                </div>
              ) : customPrompts.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                  <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">No custom prompts yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Create a custom prompt to test different generation styles
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customPrompts.map((prompt) => (
                    <div 
                      key={prompt.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        prompt.is_active 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                              {prompt.name}
                            </h3>
                            {prompt.is_active && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300`}>
                              {prompt.prompt_type.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {new Date(prompt.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleActivatePrompt(prompt)}
                            disabled={prompt.is_active}
                            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                              prompt.is_active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                            }`}
                            title={prompt.is_active ? "Currently active" : "Set as active"}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleOpenPromptDialog(prompt)}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Edit prompt"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeletePrompt(prompt.id)}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete prompt"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                        {prompt.description || 'No description provided.'}
                      </p>
                      <div className="space-y-1">
                        {prompt.system_prompt && (
                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded px-2 py-1 text-xs font-mono text-purple-700 dark:text-purple-300 truncate">
                            <span className="font-semibold">System:</span> {prompt.system_prompt.substring(0, 50)}...
                          </div>
                        )}
                        {prompt.user_prompt && (
                          <div className="bg-green-50 dark:bg-green-900/20 rounded px-2 py-1 text-xs font-mono text-green-700 dark:text-green-300 truncate">
                            <span className="font-semibold">User:</span> {prompt.user_prompt.substring(0, 50)}...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Prompt Editor Dialog */}
      {showPromptDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
              </h2>
              <button
                onClick={() => setShowPromptDialog(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prompt Name
                  </label>
                  <input
                    type="text"
                    value={promptForm.name}
                    onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Formal Corporate Tone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prompt Type
                  </label>
                  <select
                    value={promptForm.prompt_type}
                    onChange={(e) => setPromptForm({ ...promptForm, prompt_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="design_email">Design Email</option>
                    <option value="letter_email">Letter Email</option>
                    <option value="flow_email">Flow Email</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={promptForm.description}
                  onChange={(e) => setPromptForm({ ...promptForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of what this prompt does..."
                />
              </div>

              {/* System Prompt */}
              <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50/50 dark:bg-purple-950/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <label className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    System Prompt
                  </label>
                  <span className="text-xs text-purple-600 dark:text-purple-400">(Instructions for the AI)</span>
                </div>
                <PromptEditor
                  value={promptForm.system_prompt}
                  onChange={(value) => setPromptForm({ ...promptForm, system_prompt: value })}
                  minHeight="200px"
                  placeholder="You are an expert email copywriter..."
                />
              </div>

              {/* User Prompt */}
              <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50/50 dark:bg-green-950/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <label className="text-sm font-semibold text-green-900 dark:text-green-100">
                    User Prompt Template
                  </label>
                  <span className="text-xs text-green-600 dark:text-green-400">(Template with variables)</span>
                </div>
                <PromptEditor
                  value={promptForm.user_prompt}
                  onChange={(value) => setPromptForm({ ...promptForm, user_prompt: value })}
                  minHeight="200px"
                  placeholder="Create an email based on this brief: {{COPY_BRIEF}}..."
                />
              </div>

              {/* Help Section */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Available Variables
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-200 mb-3">
                  Use these in your <strong>User Prompt</strong>. They will be replaced with actual values:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                  {promptForm.prompt_type === 'design_email' && (
                    <>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{COPY_BRIEF}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{BRAND_INFO}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{BRAND_VOICE_GUIDELINES}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{RAG_CONTEXT}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{MEMORY_CONTEXT}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{WEBSITE_URL}}'}</code>
                    </>
                  )}
                  {promptForm.prompt_type === 'letter_email' && (
                    <>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{COPY_BRIEF}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{EMAIL_BRIEF}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{BRAND_INFO}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{RAG_CONTEXT}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{MEMORY_CONTEXT}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{WEBSITE_URL}}'}</code>
                    </>
                  )}
                  {promptForm.prompt_type === 'flow_email' && (
                    <>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{EMAIL_SEQUENCE}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{TOTAL_EMAILS}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{FLOW_NAME}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{BRAND_INFO}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{FLOW_GOAL}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{TARGET_AUDIENCE}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{EMAIL_TITLE}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{EMAIL_PURPOSE}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{KEY_POINTS}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{PRIMARY_CTA}}'}</code>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowPromptDialog(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrompt}
                disabled={savingPrompt}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingPrompt ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  'Save Prompt'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Star Email Dialog */}
      {showStarDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400 fill-current" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      Star an Email
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Paste email content to add it as a reference example
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowStarDialog(false);
                    setEmailToStar('');
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Content
              </label>
              <textarea
                value={emailToStar}
                onChange={(e) => setEmailToStar(e.target.value)}
                className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none font-mono text-sm"
                placeholder="Paste your email content here..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                {starredEmails.length}/10 emails starred
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowStarDialog(false);
                  setEmailToStar('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStarEmail}
                disabled={starringEmail || !emailToStar.trim()}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {starringEmail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Starring...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    Star Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-md w-full border-2 border-red-500 dark:border-red-600">
            <div className="bg-red-600 dark:bg-red-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-900 dark:text-red-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    Delete Account
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeletePassword('');
                  }}
                  className="p-2 text-white hover:bg-red-700 dark:hover:bg-red-800 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-800 dark:text-gray-200 font-medium mb-2">
                  This action is permanent and cannot be undone.
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  All your data, including brands, conversations, and settings will be permanently deleted.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  disabled={deletingAccount}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
                  placeholder="Enter your password"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeletePassword('');
                  }}
                  disabled={deletingAccount}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount || !deletePassword}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deletingAccount ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete My Account'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

