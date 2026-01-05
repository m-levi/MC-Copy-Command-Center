'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { cn, getErrorMessage } from '@/lib/utils';
import { AlertTriangle, Trash2, Loader2, X, Lock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AccountPage() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password');
      return;
    }

    if (confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
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
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(getErrorMessage(error));
    } finally {
      setDeletingAccount(false);
    }
  };

  const canDelete = deletePassword && confirmText === 'DELETE';

  return (
    <div className="max-w-2xl">
      {/* Warning Info Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-800/50 mb-8">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-amber-900 dark:text-amber-100 mb-2">
              Before you delete your account
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              Deleting your account is permanent and cannot be undone. All your data, including brands,
              conversations, and settings will be permanently removed from our servers.
            </p>
          </div>
        </div>
      </div>

      {/* What gets deleted */}
      <div className="mb-8">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
          What will be deleted:
        </h4>
        <ul className="space-y-3">
          {[
            { label: 'Profile information', desc: 'Your name, email, and avatar' },
            { label: 'All brands', desc: 'Including brand settings and documents' },
            { label: 'Conversations', desc: 'All chat history and messages' },
            { label: 'Settings & preferences', desc: 'AI model preferences, notifications, etc.' },
            { label: 'Team memberships', desc: 'You will be removed from all teams' },
          ].map((item, index) => (
            <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Delete Button */}
      <button
        onClick={() => setShowDeleteDialog(true)}
        className="flex items-center gap-2 px-5 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-xl font-medium transition-colors"
      >
        <Trash2 className="w-5 h-5" />
        Delete My Account
      </button>

      {/* Delete Account Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    Delete Account
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeletePassword('');
                    setConfirmText('');
                  }}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  This action is <strong className="text-red-600 dark:text-red-400">permanent</strong> and
                  cannot be undone. All your data will be permanently deleted.
                </p>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter your password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    disabled={deletingAccount}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all disabled:opacity-50"
                    placeholder="Your account password"
                  />
                </div>
              </div>

              {/* Confirm Text Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type <span className="font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  disabled={deletingAccount}
                  className={cn(
                    "w-full px-4 py-3 border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 transition-all disabled:opacity-50 font-mono",
                    confirmText === 'DELETE'
                      ? "border-red-300 dark:border-red-700 focus:ring-red-500/20 focus:border-red-500"
                      : "border-gray-200 dark:border-gray-700 focus:ring-gray-500/20 focus:border-gray-500"
                  )}
                  placeholder="Type DELETE"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeletePassword('');
                    setConfirmText('');
                  }}
                  disabled={deletingAccount}
                  className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount || !canDelete}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all",
                    canDelete
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  )}
                >
                  {deletingAccount ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Forever
                    </>
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













