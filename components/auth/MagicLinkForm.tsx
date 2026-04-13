'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AuthInput from './AuthInput';
import { Mail, Zap, CheckCircle2 } from 'lucide-react';

interface MagicLinkFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function MagicLinkForm({ onSuccess, onError }: MagicLinkFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || cooldown > 0) return;

    setLoading(true);

    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send magic link');
      }

      setSent(true);
      onSuccess?.();

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
      console.error('Magic link error:', err);
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="size-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
        </div>

        <div>
          <h3 className="text-lg font-semibold">Check your inbox</h3>
          <p className="text-muted-foreground mt-1">
            We've sent a sign-in link to
            <br />
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Click the link in the email to sign in. The link expires in 1 hour.
        </p>

        <button
          onClick={() => setSent(false)}
          disabled={cooldown > 0}
          className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Didn't receive it? Try again"}
        </button>
      </div>
    );
  }

  return (
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

      <Button
        type="submit"
        size="lg"
        className="w-full"
        loading={loading}
        loadingText="Sending link..."
        disabled={!email}
      >
        <Zap className="size-4" />
        Send magic link
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        We'll email you a secure link to sign in without a password.
      </p>
    </form>
  );
}
