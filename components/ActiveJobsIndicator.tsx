'use client';

import { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

interface Job {
  id: string;
  messageId: string;
  conversationId: string;
  status: 'queued' | 'processing' | 'streaming' | 'completed' | 'failed';
  createdAt: number;
}

// PERFORMANCE: Disable polling entirely - queue mode is not enabled
// The queue feature (ENABLE_MESSAGE_QUEUE) is a server-side env var
// If you enable queue mode in the future, set this to true
const ENABLE_JOB_POLLING = false;
const POLLING_INTERVAL = 10000; // 10 seconds when enabled (was 2 seconds)

export default function ActiveJobsIndicator() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // PERFORMANCE: Skip polling if disabled
    if (!ENABLE_JOB_POLLING) {
      return;
    }

    // Initial fetch
    const fetchJobs = async () => {
      try {
        const response = await fetch('/api/jobs?status=queued&status=processing&status=streaming');
        if (!response.ok) return;
        const data = await response.json();
        setJobs(data.jobs || []);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('Failed to fetch') && !errorMessage.includes('aborted')) {
          logger.error('Failed to fetch jobs:', error);
        }
      }
    };

    fetchJobs();
    intervalRef.current = setInterval(fetchJobs, POLLING_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const activeJobs = jobs.filter(
    (j) => j.status === 'queued' || j.status === 'processing' || j.status === 'streaming'
  );

  if (activeJobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
      >
        {activeJobs.length} {activeJobs.length === 1 ? 'job' : 'jobs'} running
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Active Jobs</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
          <div className="space-y-2">
            {activeJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {job.status === 'queued' && 'Queued'}
                    {job.status === 'processing' && 'Processing...'}
                    {job.status === 'streaming' && 'Streaming...'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Conversation {job.conversationId.substring(0, 8)}...
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await fetch(`/api/jobs/${job.id}/cancel`, { method: 'POST' });
                    } catch (error) {
                      // Silently fail - job may have already completed
                      const errorMessage = error instanceof Error ? error.message : String(error);
                      if (!errorMessage.includes('Failed to fetch') && !errorMessage.includes('aborted')) {
                        logger.error('Failed to cancel job:', error);
                      }
                    }
                  }}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

