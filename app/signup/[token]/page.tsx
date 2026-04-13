'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AuthInput from '@/components/auth/AuthInput';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import { MoonCommerceLogo } from '@/components/MoonCommerceLogo';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Lock, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2, XCircle, Loader2, BadgeCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface InviteData {
  email: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function InviteSignupPage() {
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const supabase = createClient();

  useEffect(() => {
    validateInvite();
  }, [token]);

  const validateInvite = async () => {
    try {
      const response = await fetch(`/api/organizations/invites/validate?token=${token}`);
      const data = await response.json();

      if (!data.valid) {
        setValidationError(data.error || 'Invalid invitation');
        setLoading(false);
        return;
      }

      setInviteData(data);
    } catch (err: any) {
      setValidationError('Failed to validate invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!inviteData) return;

    setSubmitting(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: inviteData.email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      let acceptResponse: Response | undefined;
      let acceptData: any;
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        acceptResponse = await fetch('/api/organizations/invites/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        acceptData = await acceptResponse.json();

        if (!acceptResponse.ok && acceptData.error?.includes('profile not found')) {
          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            continue;
          }
        }

        break;
      }

      if (!acceptResponse || !acceptResponse.ok) {
        throw new Error(acceptData?.error || 'Failed to accept invitation');
      }

      setSuccess(true);

      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);

    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="size-12 mx-auto text-white/70 animate-spin" />
          <p className="text-white/70">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // Invalid invite state
  if (validationError || !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-6">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/10 text-center">
          <CardContent className="space-y-4">
            <div className="size-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="size-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Invalid Invitation</h1>
            <p className="text-white/60">{validationError}</p>
            <Button variant="secondary" asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-6">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/10 text-center">
          <CardContent className="space-y-4">
            <div className="size-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="size-10 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome aboard!</h1>
            <p className="text-white/70">
              You've successfully joined <span className="font-semibold text-white">{inviteData.organization.name}</span>
            </p>
            <div className="flex justify-center">
              <Loader2 className="size-6 text-white/50 animate-spin" />
            </div>
            <p className="text-white/50 text-sm">Redirecting to the dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Signup form
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel - Organization branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <MoonCommerceLogo className="h-8 w-auto text-white" />

          <div className="space-y-8">
            <Card className="bg-white/10 backdrop-blur-sm border-white/10">
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-2xl font-bold">
                    {inviteData.organization.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{inviteData.organization.name}</h2>
                    <p className="text-white/60 text-sm">is inviting you to join</p>
                  </div>
                </div>

                <Badge variant="secondary" className="bg-violet-500/20 text-violet-300 border-violet-400/30">
                  <BadgeCheck className="size-3.5 mr-1" />
                  Joining as {inviteData.role.replace('_', ' ')}
                </Badge>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-white leading-tight">
                You're invited to
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
                  join the team
                </span>
              </h1>
              <p className="text-lg text-gray-300 max-w-md">
                Create your account to start collaborating with your team on AI-powered email campaigns.
              </p>
            </div>
          </div>

          <div className="text-white/40 text-sm">
            Powered by MoonCommerce
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden mb-8 text-center">
            <MoonCommerceLogo className="h-8 w-auto text-foreground mx-auto mb-6" />
            <Badge variant="secondary">
              Joining {inviteData.organization.name} as {inviteData.role.replace('_', ' ')}
            </Badge>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold">Complete your account</h2>
            <p className="mt-2 text-muted-foreground">Set up your profile to get started</p>
          </div>

          <Card>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                {/* Email (pre-filled, disabled) */}
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span className="flex-1 truncate">{inviteData.email}</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Verified</span>
                </div>

                <AuthInput
                  label="Full name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={submitting}
                  icon={<User className="size-4" />}
                />

                <div>
                  <AuthInput
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={submitting}
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
                  disabled={submitting}
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
                  loading={submitting}
                  loadingText="Creating account..."
                >
                  Accept Invitation & Join
                  <ArrowRight className="size-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-foreground hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
