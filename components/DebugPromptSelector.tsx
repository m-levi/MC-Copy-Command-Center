'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface CustomPrompt {
  id: string;
  name: string;
  prompt_type: string;
  is_active: boolean;
}

export default function DebugPromptSelector() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePrompts, setActivePrompts] = useState<CustomPrompt[]>([]);
  const [availablePrompts, setAvailablePrompts] = useState<CustomPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const pathname = usePathname();

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
    // Keyboard shortcut: Cmd/Ctrl + D to toggle
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (isVisible) {
          setIsExpanded(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

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
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      Using default system prompts
                    </p>
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
                
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <a href="/settings?tab=debug" target="_blank" className="text-xs text-blue-600 dark:text-blue-400 hover:underline block text-center">
                        Manage Prompts in Settings
                    </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

