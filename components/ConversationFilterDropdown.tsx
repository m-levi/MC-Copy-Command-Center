'use client';

import { useState, useRef, useEffect } from 'react';
import { OrganizationMember } from '@/types';

export type FilterType = 'all' | 'mine' | 'person';

interface ConversationFilterDropdownProps {
  currentFilter: FilterType;
  selectedPersonId: string | null;
  teamMembers: OrganizationMember[];
  onFilterChange: (filter: FilterType, personId?: string) => void;
}

export default function ConversationFilterDropdown({
  currentFilter,
  selectedPersonId,
  teamMembers,
  onFilterChange
}: ConversationFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFilterLabel = () => {
    if (currentFilter === 'all') return 'All Team';
    if (currentFilter === 'mine') return 'Just Mine';
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {getFilterLabel()}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
          <button
            onClick={() => handleFilterSelect('all')}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
              currentFilter === 'all' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
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
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
              currentFilter === 'mine' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              Just Mine
            </div>
          </button>

          {teamMembers.length > 0 && (
            <>
              <div className="border-t border-gray-200 my-1"></div>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team Members
              </div>
              {teamMembers.map((member) => (
                <button
                  key={member.user_id}
                  onClick={() => handleFilterSelect('person', member.user_id)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                    currentFilter === 'person' && selectedPersonId === member.user_id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700'
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
      )}
    </div>
  );
}

