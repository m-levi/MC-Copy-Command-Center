'use client';

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { usePathname, useParams } from 'next/navigation';

// Lazy load the Prompt Lab for better performance
const DebugPromptLab = lazy(() => import('./DebugPromptLab'));

interface CustomPrompt {
  id: string;
  name: string;
  prompt_type: string;
  is_active: boolean;
}

interface DebugPromptSelectorProps {
  brandId?: string;
  emailType?: 'design' | 'letter';
}

export default function DebugPromptSelector({ brandId: propBrandId, emailType = 'design' }: DebugPromptSelectorProps = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPromptLab, setShowPromptLab] = useState(false);
  const [activePrompts, setActivePrompts] = useState<CustomPrompt[]>([]);
  const [availablePrompts, setAvailablePrompts] = useState<CustomPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const pathname = usePathname();
  const params = useParams();
  
  // Get brandId from props or URL params
  const brandId = propBrandId || (params?.brandId as string);

  // Only show on relevant pages
  const isEmailPage = pathname?.includes('/brand-architect') || 
                      pathname?.includes('/chat') || 
                      pathname?.includes('/flow') ||
                      pathname?.includes('/brands/');

  useEffect(() => {
    // Set initial position based on window width
    if (typeof window !== 'undefined') {
      setPosition({ x: window.innerWidth - 350, y: 100 });
    }
  }, []);

  useEffect(() => {
    if (isEmailPage) {
      checkDebugMode();
    }
  }, [isEmailPage]);

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + D to toggle panel
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (isVisible) {
          setIsExpanded(prev => !prev);
        }
      }
      // Cmd/Ctrl + Shift + P to open Prompt Lab
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        if (isVisible && brandId) {
          setShowPromptLab(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, brandId]);

  const checkDebugMode = async () => {
    try {
      const response = await fetch('/api/debug/settings');
      if (response.ok) {
        const data = await response.json();
        setIsVisible(data.debug_mode_enabled);
        if (data.debug_mode_enabled) {
          fetchPrompts();
        }
      }
    } catch (error) {
      console.error('Error checking debug mode:', error);
    }
  };

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/prompts');
      if (response.ok) {
        const data = await response.json();
        setAvailablePrompts(data);
        setActivePrompts(data.filter((p: CustomPrompt) => p.is_active));
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivatePrompt = async (prompt: CustomPrompt) => {
    try {
      const response = await fetch(`/api/debug/prompts/${prompt.id}/activate`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchPrompts(); // Refresh to get updated active state
      }
    } catch (error) {
      console.error('Error activating prompt:', error);
    }
  };

  const handleUseDefault = async (promptType?: string) => {
    try {
      if (promptType) {
        // Deactivate prompts for specific type
        const response = await fetch('/api/debug/prompts/deactivate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt_type: promptType }),
        });
        if (response.ok) {
          fetchPrompts();
        }
      } else {
        // Deactivate all prompts
        const response = await fetch('/api/debug/prompts/deactivate', {
          method: 'DELETE',
        });
        if (response.ok) {
          fetchPrompts();
        }
      }
    } catch (error) {
      console.error('Error switching to default prompts:', error);
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isVisible || !isEmailPage) return null;

  return (
    <div
      className={`fixed z-50 transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
      style={{ left: position.x, top: position.y }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-80">
        {/* Header - Draggable */}
        <div
          className="bg-gray-100 dark:bg-gray-700 px-4 py-2 cursor-move flex items-center justify-between"
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
              Debug Mode
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isExpanded ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="p-4 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Active Prompts
                  </h4>
                  {activePrompts.length === 0 ? (
                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-100 dark:border-green-800">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Using Default Prompts
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activePrompts.map(prompt => (
                        <div key={prompt.id} className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-800">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            {prompt.name}
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            {prompt.prompt_type.replace('_', ' ')}
                          </p>
                        </div>
                      ))}
                      {/* Button to switch back to default */}
                      <button
                        onClick={() => handleUseDefault()}
                        className="w-full mt-2 px-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors flex items-center justify-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Switch to Default Prompts
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Quick Switch
                  </h4>
                  <div className="space-y-1">
                    {availablePrompts.map(prompt => (
                      <button
                        key={prompt.id}
                        onClick={() => handleActivatePrompt(prompt)}
                        className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors flex items-center justify-between ${
                          prompt.is_active
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 font-medium'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>{prompt.name}</span>
                        {prompt.is_active && (
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                    {availablePrompts.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 px-2">
                        No custom prompts available. Create one in Settings.
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    {brandId && (
                      <button
                        onClick={() => setShowPromptLab(true)}
                        className="w-full px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Open Prompt Lab
                        <kbd className="ml-1 px-1 py-0.5 bg-white/20 rounded text-[10px]">⌘⇧P</kbd>
                      </button>
                    )}
                    <a href="/settings?tab=debug" target="_blank" className="text-xs text-blue-600 dark:text-blue-400 hover:underline block text-center">
                        Manage Prompts in Settings
                    </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Prompt Lab Modal */}
      {showPromptLab && brandId && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        }>
          <DebugPromptLab
            brandId={brandId}
            isOpen={showPromptLab}
            onClose={() => setShowPromptLab(false)}
            onPromptChange={() => fetchPrompts()}
            currentEmailType={emailType}
          />
        </Suspense>
      )}
    </div>
  );
}

