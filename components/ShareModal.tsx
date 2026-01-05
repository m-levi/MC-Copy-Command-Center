'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';
import LoadingDots from './LoadingDots';

interface ShareModalProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ conversationId, isOpen, onClose }: ShareModalProps) {
  const [publicLink, setPublicLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGenerating) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGenerating, onClose]);

  const handleCopyTeamLink = async () => {
    const teamLink = `${window.location.origin}${window.location.pathname}?conversation=${conversationId}`;
    await navigator.clipboard.writeText(teamLink);
    toast.success('Team link copied!');
  };

  const handleGeneratePublicLink = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareType: 'link',
          permissionLevel: 'view',
          // shareContent not included - column doesn't exist in DB yet
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Share API error:', response.status, errorText);
        let errorMessage = 'Failed to create link';
        try {
          const data = JSON.parse(errorText);
          errorMessage = data.error || data.message || errorMessage;
        } catch (e) {
          errorMessage = `Failed to create link (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const link = `${window.location.origin}/shared/${data.share.share_token}`;
      setPublicLink(link);
      await navigator.clipboard.writeText(link);
      toast.success('Public link copied!');
    } catch (error) {
      logger.error('Share error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create link');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 w-full h-full sm:h-auto sm:rounded-xl p-6 sm:max-w-md shadow-xl safe-area-bottom">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Share Conversation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors touch-target touch-feedback"
          >
            <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Team Link Option */}
        <div className="mb-4 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
          <div className="flex items-start gap-3 mb-3">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Share with Team</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Anyone in your organization can view this conversation</p>
            </div>
          </div>
          <button
            onClick={handleCopyTeamLink}
            className="w-full bg-blue-600 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium touch-feedback"
          >
            Copy Team Link
          </button>
        </div>

        {/* Public Link Option */}
        <div className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-400 dark:hover:border-purple-500 transition-colors">
          <div className="flex items-start gap-3 mb-3">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Public Link</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Anyone with the link can view (no login required)</p>
            </div>
          </div>
          <button
            onClick={handleGeneratePublicLink}
            disabled={isGenerating}
            className="w-full bg-purple-600 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium touch-feedback"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingDots size="sm" color="white" />
                Generating...
              </span>
            ) : (
              'Generate Public Link'
            )}
          </button>
          {publicLink && (
            <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-700 dark:text-green-300">
              ✓ Link created and copied to clipboard
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
