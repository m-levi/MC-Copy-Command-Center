'use client';

import { useState } from 'react';
import AuthInput from './AuthInput';

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
      
      // Start cooldown
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
      <div className="text-center py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Success icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center animate-in zoom-in-50 duration-300">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Check your inbox
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We've sent a sign-in link to
          <br />
          <span className="font-medium text-gray-900 dark:text-white">{email}</span>
        </p>
        
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
          Click the link in the email to sign in. The link expires in 1 hour.
        </p>
        
        {/* Resend button */}
        <button
          onClick={() => setSent(false)}
          disabled={cooldown > 0}
          className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
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
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
      />

      <button
        type="submit"
        disabled={loading || !email}
        className="
          w-full py-3.5 px-4 rounded-xl font-semibold text-white
          bg-gradient-to-r from-violet-600 to-violet-700
          hover:from-violet-500 hover:to-violet-600
          disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed
          transition-all duration-200
          active:scale-[0.98]
          flex items-center justify-center gap-2
        "
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Sending link...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Send magic link</span>
          </>
        )}
      </button>
      
      <p className="text-center text-xs text-gray-500 dark:text-gray-500">
        We'll email you a secure link to sign in without a password.
      </p>
    </form>
  );
}























