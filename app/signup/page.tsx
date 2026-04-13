'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthInput from '@/components/auth/AuthInput';
import OAuthButtons from '@/components/auth/OAuthButtons';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Lock, ShieldCheck, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="We've sent you a confirmation link"
      >
        <div className="text-center py-4 space-y-4">
          <div className="size-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div>
            <p className="text-muted-foreground">We've sent a confirmation email to</p>
            <p className="font-semibold text-foreground mt-1">{email}</p>
          </div>

          <p className="text-sm text-muted-foreground">
            Click the link in the email to activate your account.
            <br />
            Don't see it? Check your spam folder.
          </p>

          <Link
            href="/login"
            className="text-sm font-medium text-foreground hover:underline inline-block"
          >
            &larr; Back to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start creating amazing email campaigns"
    >
      <form onSubmit={handleSignup} className="space-y-4">
        <AuthInput
          label="Full name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          disabled={loading}
          icon={<User className="size-4" />}
        />

        <AuthInput
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          icon={<Mail className="size-4" />}
        />

        <div>
          <AuthInput
            label="Password"
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
          label="Confirm password"
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
          loadingText="Creating account..."
        >
          Create account
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          By creating an account, you agree to our{' '}
          <a href="#" className="underline hover:text-foreground">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="underline hover:text-foreground">Privacy Policy</a>
        </p>
      </form>

      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-4 text-sm text-muted-foreground">
          or continue with
        </span>
      </div>

      <OAuthButtons onError={setError} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-foreground hover:underline">
          Sign in
        </Link>
      </p>

      <Alert className="mt-6">
        <Info className="size-4" />
        <AlertDescription>
          <span className="font-medium">Have an invite?</span> Use the link from your email to join an organization.
        </AlertDescription>
      </Alert>
    </AuthLayout>
  );
}
