'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface Job {
  id: string;
  messageId: string;
  conversationId: string;
  status: 'queued' | 'processing' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
}

export default function QueueManagementPanel() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<'all' | 'queued' | 'processing' | 'completed' | 'failed'>('all');

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadJobs = async () => {
    try {
      const url = filter === 'all' ? '/api/jobs' : `/api/jobs?status=${filter}`;
      const response = await fetch(url);
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      logger.error('Failed to load jobs:', error);
    }
  };

  const cancelJob = async (jobId: string) => {
    await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' });
    loadJobs();
  };

  const filteredJobs = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Queue Management</h2>

      <div className="flex gap-2 mb-4">
        {(['all', 'queued', 'processing', 'completed', 'failed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({jobs.filter((j) => j.status === f).length})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            className="p-4 border rounded-lg flex items-center justify-between"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    job.status === 'queued'
                      ? 'bg-gray-200 text-gray-700'
                      : job.status === 'processing' || job.status === 'streaming'
                      ? 'bg-blue-200 text-blue-700'
                      : job.status === 'completed'
                      ? 'bg-green-200 text-green-700'
                      : 'bg-red-200 text-red-700'
                  }`}
                >
                  {job.status}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Priority: {job.priority}
                </span>
                {job.retryCount > 0 && (
                  <span className="text-xs text-orange-600">Retry #{job.retryCount}</span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Conversation: {job.conversationId.substring(0, 8)}...
              </div>
              {job.error && (
                <div className="text-xs text-red-600 mt-1">{job.error}</div>
              )}
            </div>
            {job.status === 'queued' && (
              <button
                onClick={() => cancelJob(job.id)}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded"
              >
                Cancel
              </button>
            )}
          </div>
        ))}

        {filteredJobs.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No jobs found
          </div>
        )}
      </div>
    </div>
  );
}

