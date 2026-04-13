'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthInput from '@/components/auth/AuthInput';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, ShieldCheck, ArrowLeft, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

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
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsValid(!!user);
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
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

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

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="size-12 mx-auto text-muted-foreground animate-spin" />
          <p className="text-muted-foreground">Validating reset link...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <AuthLayout
        title="Invalid or Expired Link"
        subtitle="This password reset link is no longer valid"
        showBrandPanel={false}
      >
        <div className="text-center py-4 space-y-4">
          <div className="size-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="size-8 text-destructive" />
          </div>

          <p className="text-muted-foreground">
            The reset link may have expired or already been used.
            Please request a new one.
          </p>

          <Button size="lg" className="w-full" asChild>
            <Link href="/forgot-password">Request New Link</Link>
          </Button>

          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block"
          >
            &larr; Back to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout
        title="Password Reset!"
        subtitle="Your password has been successfully updated"
        showBrandPanel={false}
      >
        <div className="text-center py-4 space-y-4">
          <div className="size-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
          </div>

          <p className="text-muted-foreground">
            You can now sign in with your new password.
          </p>

          <p className="text-sm text-muted-foreground">
            Redirecting to login in {countdown}s...
          </p>

          <Button size="lg" className="w-full" asChild>
            <Link href="/login">Sign in now</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your new password below"
      showBrandPanel={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
            icon={<Lock className="size-4" />}
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
          icon={<ShieldCheck className="size-4" />}
        />

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={loading}
          loadingText="Resetting..."
          disabled={!password || !confirmPassword}
        >
          Reset password
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}
