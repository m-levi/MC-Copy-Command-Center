'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthInput from '@/components/auth/AuthInput';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cooldown > 0) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSubmitted(true);

      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="We've sent you a password reset link"
        showBrandPanel={false}
      >
        <div className="text-center py-4 space-y-4">
          <div className="size-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div>
            <p className="text-muted-foreground">If an account exists for</p>
            <p className="font-semibold text-foreground mt-1">{email}</p>
          </div>

          <p className="text-sm text-muted-foreground">
            you'll receive a password reset link shortly.
            <br />
            Don't see it? Check your spam folder.
          </p>

          <button
            onClick={() => setSubmitted(false)}
            disabled={cooldown > 0}
            className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Didn't receive it? Try again"}
          </button>

          <div className="pt-4 border-t border-border">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back to login
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="No worries, we'll send you reset instructions"
      showBrandPanel={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          icon={<Mail className="size-4" />}
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
          loadingText="Sending..."
          disabled={!email}
        >
          Send reset link
          <ArrowRight className="size-4" />
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
