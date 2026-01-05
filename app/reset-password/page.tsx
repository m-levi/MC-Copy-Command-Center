'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthInput from '@/components/auth/AuthInput';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if user has a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsValid(!!session);
      setValidating(false);
    };

    checkSession();
  }, [supabase]);

  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (success && countdown === 0) {
      router.push('/login');
    }
  }, [success, countdown, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      // Record password change
      try {
        await fetch('/api/auth/record-password-change', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        // Don't fail if logging fails
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Validating reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid link state
  if (!isValid) {
    return (
      <AuthLayout
        title="Invalid or Expired Link"
        subtitle="This password reset link is no longer valid"
        showBrandPanel={false}
      >
        <div className="text-center py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The reset link may have expired or already been used.
            Please request a new one.
          </p>

          <Link
            href="/forgot-password"
            className="
              inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl font-semibold text-white
              bg-gradient-to-r from-blue-600 to-blue-700
              hover:from-blue-500 hover:to-blue-600
              transition-all duration-200
            "
          >
            Request New Link
          </Link>
          
          <div className="mt-6">
            <Link 
              href="/login"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              ← Back to login
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Success state
  if (success) {
    return (
      <AuthLayout
        title="Password Reset!"
        subtitle="Your password has been successfully updated"
        showBrandPanel={false}
      >
        <div className="text-center py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Success icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center animate-in zoom-in-50 duration-500">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You can now sign in with your new password.
          </p>
          
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Redirecting to login in {countdown}s...
          </p>
          
          <Link
            href="/login"
            className="
              inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl font-semibold text-white
              bg-gradient-to-r from-blue-600 to-blue-700
              hover:from-blue-500 hover:to-blue-600
              transition-all duration-200
            "
          >
            Sign in now
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // Reset form
  return (
    <AuthLayout 
      title="Reset your password"
      subtitle="Enter your new password below"
      showBrandPanel={false}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <AuthInput
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
            showPasswordToggle
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />
          <PasswordStrengthIndicator password={password} />
        </div>

        <AuthInput
          label="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          disabled={loading}
          showPasswordToggle
          error={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className="
            w-full py-3.5 px-4 rounded-xl font-semibold text-white
            bg-gradient-to-r from-blue-600 to-blue-700
            hover:from-blue-500 hover:to-blue-600
            disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed
            transition-all duration-200
            active:scale-[0.98]
            flex items-center justify-center gap-2
          "
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Resetting...</span>
            </>
          ) : (
            <span>Reset password</span>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link 
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}
