'use client';

import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

function ConfirmPageContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (!token_hash || !type) {
          setStatus('error');
          setMessage('Invalid confirmation link');
          return;
        }

        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        });

        if (error) {
          console.error('Confirmation error:', error);
          setStatus('error');
          setMessage(error.message || 'Failed to confirm email');
          return;
        }

        setStatus('success');
        setMessage('Email confirmed successfully!');

        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 2000);
      } catch (error: any) {
        console.error('Confirmation error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred');
      }
    };

    confirmEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md text-center">
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="size-16 mx-auto text-muted-foreground animate-spin" />
              <h1 className="text-2xl font-bold">Confirming Your Email</h1>
              <p className="text-muted-foreground">
                Please wait while we verify your email address...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="size-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold">Email Confirmed!</h1>
              <p className="text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground">
                Redirecting you to the dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="size-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="size-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold">Confirmation Failed</h1>
              <p className="text-muted-foreground">{message}</p>
              <div className="flex gap-3 justify-center">
                <Button asChild>
                  <Link href="/login">Go to Login</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/forgot-password">Reset Password</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <Card className="w-full max-w-md text-center">
            <CardContent className="space-y-4">
              <Loader2 className="size-16 mx-auto text-muted-foreground animate-spin" />
              <h1 className="text-2xl font-bold">Loading...</h1>
              <p className="text-muted-foreground">Please wait...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ConfirmPageContent />
    </Suspense>
  );
}
