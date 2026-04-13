'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { MoonCommerceLogo } from '@/components/MoonCommerceLogo';
import AuthInput from '@/components/auth/AuthInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, UserPlus, ArrowLeft, ArrowRight, Key, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

type OnboardingStep = 'choice' | 'create-org' | 'join-org';

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>('choice');
  const [orgName, setOrgName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (membership) {
      router.push('/');
      return;
    }

    setCheckingAuth(false);
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!orgName.trim()) {
      setError('Please enter an organization name');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);

    try {
      const validateResponse = await fetch(`/api/organizations/invites/validate?token=${inviteCode}`);
      const validateData = await validateResponse.json();

      if (!validateData.valid) {
        throw new Error(validateData.error || 'Invalid invite code');
      }

      const acceptResponse = await fetch('/api/organizations/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteCode }),
      });

      const acceptData = await acceptResponse.json();

      if (!acceptResponse.ok) {
        throw new Error(acceptData.error || 'Failed to join organization');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-12 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        {/* Logo */}
        <div className="text-center">
          <MoonCommerceLogo className="h-10 w-auto mx-auto text-foreground" />
        </div>

        {/* Main card */}
        <Card>
          <CardContent>
            {/* Choice step */}
            {step === 'choice' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h1 className="text-2xl font-bold">Welcome! Let's get you set up</h1>
                  <p className="text-muted-foreground mt-2">How would you like to get started?</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setStep('create-org')}
                    className="w-full p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-accent transition-colors text-left group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="size-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="size-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">Create a new organization</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Start fresh and invite your team members
                        </p>
                      </div>
                      <ChevronRight className="size-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                    </div>
                  </button>

                  <button
                    onClick={() => setStep('join-org')}
                    className="w-full p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-accent transition-colors text-left group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="size-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <UserPlus className="size-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">I have an invite code</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Join an existing organization with your invite
                        </p>
                      </div>
                      <ChevronRight className="size-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Create organization step */}
            {step === 'create-org' && (
              <div className="space-y-6">
                <button
                  onClick={() => { setStep('choice'); setError(''); }}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  Back
                </button>

                <div className="text-center">
                  <div className="size-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="size-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">Create your organization</h2>
                  <p className="text-muted-foreground mt-1">This will be your team's workspace</p>
                </div>

                <form onSubmit={handleCreateOrg} className="space-y-4">
                  <AuthInput
                    label="Organization name"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    disabled={loading}
                    icon={<Building2 className="size-4" />}
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
                    loadingText="Creating..."
                    disabled={!orgName.trim()}
                  >
                    Create Organization
                    <ArrowRight className="size-4" />
                  </Button>
                </form>
              </div>
            )}

            {/* Join organization step */}
            {step === 'join-org' && (
              <div className="space-y-6">
                <button
                  onClick={() => { setStep('choice'); setError(''); }}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  Back
                </button>

                <div className="text-center">
                  <div className="size-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                    <UserPlus className="size-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">Join with invite code</h2>
                  <p className="text-muted-foreground mt-1">Enter the invite code from your email</p>
                </div>

                <form onSubmit={handleJoinOrg} className="space-y-4">
                  <AuthInput
                    label="Invite code"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                    disabled={loading}
                    icon={<Key className="size-4" />}
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
                    loadingText="Joining..."
                    disabled={!inviteCode.trim()}
                  >
                    Join Organization
                    <ArrowRight className="size-4" />
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an invite code?{' '}
                  <button
                    onClick={() => setStep('create-org')}
                    className="text-foreground hover:underline font-medium"
                  >
                    Create your own organization
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sign out option */}
        <div className="text-center">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out and use a different account
          </button>
        </div>
      </div>
    </div>
  );
}
