'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { OrganizationMember } from '@/types';

export type FilterType = 'all' | 'mine' | 'person' | 'emails' | 'flows' | 'planning' | 'archived';

interface ConversationFilterDropdownProps {
  currentFilter: FilterType;
  selectedPersonId: string | null;
  teamMembers: OrganizationMember[];
  onFilterChange: (filter: FilterType, personId?: string) => void;
  compact?: boolean;
}

export default function ConversationFilterDropdown({
  currentFilter,
  selectedPersonId,
  teamMembers,
  onFilterChange,
  compact = false
}: ConversationFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: compact ? rect.right - 224 : rect.left, // 224 = 56 * 4 (w-56 = 14rem = 224px)
        width: compact ? 224 : rect.width,
      });
    }
  }, [isOpen, compact]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      window.addEventListener('scroll', handleScroll, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen]);

  const getFilterLabel = () => {
    if (compact) return ''; // Hide label in compact mode
    if (currentFilter === 'all') return 'All Conversations';
    // ... existing logic ...
    if (currentFilter === 'mine') return 'Just Mine';
    if (currentFilter === 'emails') return 'Emails Only';
    if (currentFilter === 'flows') return 'Flows Only';
    if (currentFilter === 'planning') return 'Chat Mode';
    if (currentFilter === 'archived') return 'Archived';
    if (currentFilter === 'person' && selectedPersonId) {
      const member = teamMembers.find(m => m.user_id === selectedPersonId);
      return member?.profile?.full_name || member?.profile?.email || 'Selected Person';
    }
    return 'Filter';
  };

  const handleFilterSelect = (filter: FilterType, personId?: string) => {
    onFilterChange(filter, personId);
    setIsOpen(false);
  };

  const dropdownContent = (
    <div 
      ref={dropdownRef}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-96 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 origin-top"
      style={{
        position: 'fixed',
        top: dropdownPosition?.top ?? 0,
        left: dropdownPosition?.left ?? 0,
        width: dropdownPosition?.width ?? 'auto',
        zIndex: 9999,
      }}
    >
      {/* Owner Section */}
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
        Owner
      </div>
      
      <button
        onClick={() => handleFilterSelect('all')}
        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
          currentFilter === 'all' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
          All Team
        </div>
      </button>

      <button
        onClick={() => handleFilterSelect('mine')}
        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
          currentFilter === 'mine' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          Just Mine
        </div>
      </button>

      {/* Type Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 mt-1"></div>
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Type
      </div>

      <button
        onClick={() => handleFilterSelect('emails')}
        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
          currentFilter === 'emails' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Emails Only
        </div>
      </button>

      <button
        onClick={() => handleFilterSelect('flows')}
        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
          currentFilter === 'flows' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Flows Only
        </div>
      </button>

      <button
        onClick={() => handleFilterSelect('planning')}
        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
          currentFilter === 'planning' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Chat Mode
        </div>
      </button>

      {/* Status Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 mt-1"></div>
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Status
      </div>

      <button
        onClick={() => handleFilterSelect('archived')}
        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
          currentFilter === 'archived' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          Archived
        </div>
      </button>

      {/* Team Members Section */}
      {teamMembers.length > 0 && (
        <>
          <div className="border-t border-gray-200 dark:border-gray-700 mt-1"></div>
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Team Members
          </div>
          {teamMembers.map((member) => (
            <button
              key={member.user_id}
              onClick={() => handleFilterSelect('person', member.user_id)}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                currentFilter === 'person' && selectedPersonId === member.user_id
                  ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                  {member.profile?.full_name?.charAt(0) || member.profile?.email?.charAt(0).toUpperCase() || '?'}
                </div>
                <span className="truncate">
                  {member.profile?.full_name || member.profile?.email}
                </span>
              </div>
            </button>
          ))}
        </>
      )}
    </div>
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-center transition-colors cursor-pointer
          ${compact 
            ? 'w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300' 
            : 'w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 justify-between'
          }
          ${isOpen ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600' : ''}
        `}
        title="Filter conversations"
      >
        {compact ? (
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
           </svg>
        ) : (
          <>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {getFilterLabel()}
            </span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {mounted && isOpen && dropdownPosition && createPortal(dropdownContent, document.body)}
    </div>
  );
}

