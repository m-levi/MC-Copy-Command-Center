'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function RealtimeStatusIndicator() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [message, setMessage] = useState('Checking Realtime...');

  useEffect(() => {
    const checkRealtime = async () => {
      try {
        const supabase = createClient();
        const testChannel = supabase.channel('test-status-' + Date.now());
        
        let subscribed = false;
        
        testChannel.subscribe((channelStatus) => {
          if (channelStatus === 'SUBSCRIBED') {
            subscribed = true;
            setStatus('connected');
            setMessage('Realtime connected');
            
            // Clean up and hide after 3 seconds
            setTimeout(() => {
              supabase.removeChannel(testChannel);
              setStatus('checking');
            }, 3000);
          } else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
            setStatus('error');
            setMessage('Realtime not enabled');
            supabase.removeChannel(testChannel);
          }
        });
        
        // Timeout after 5 seconds
        setTimeout(() => {
          if (!subscribed) {
            setStatus('error');
            setMessage('Realtime connection timeout');
            supabase.removeChannel(testChannel);
          }
        }, 5000);
        
      } catch (error) {
        setStatus('error');
        setMessage('Failed to check Realtime');
      }
    };

    checkRealtime();
  }, []);

  if (status === 'checking') return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-bottom-2 ${
      status === 'connected' 
        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800' 
        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
    }`}>
      <div className="flex items-center gap-2">
        {status === 'connected' ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span>{message}</span>
        {status === 'error' && (
          <a 
            href="https://supabase.com/docs/guides/realtime/getting_started" 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-2 underline hover:no-underline"
          >
            Setup Guide
          </a>
        )}
      </div>
    </div>
  );
}

