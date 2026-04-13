'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthInput from '@/components/auth/AuthInput';
import OAuthButtons from '@/components/auth/OAuthButtons';
import MagicLinkForm from '@/components/auth/MagicLinkForm';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      try {
        await fetch('/api/auth/login', { method: 'POST' });
      } catch (trackError) {
        console.error('Failed to track login:', trackError);
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      <Tabs defaultValue="password" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
        </TabsList>

        <TabsContent value="magic-link">
          <MagicLinkForm onError={setError} />
        </TabsContent>

        <TabsContent value="password">
          <form onSubmit={handleLogin} className="space-y-4">
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
                disabled={loading}
                showPasswordToggle
                icon={<Lock className="size-4" />}
              />
              <div className="mt-2 text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

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
              loadingText="Signing in..."
            >
              Sign in
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {/* Divider */}
      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-4 text-sm text-muted-foreground">
          or continue with
        </span>
      </div>

      <OAuthButtons onError={setError} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link href="/signup" className="font-semibold text-foreground hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
