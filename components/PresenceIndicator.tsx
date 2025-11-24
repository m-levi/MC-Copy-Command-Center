'use client';

import { usePresence } from '@/hooks/usePresence';

interface PresenceIndicatorProps {
  conversationId: string;
}

export default function PresenceIndicator({ conversationId }: PresenceIndicatorProps) {
  const activeUsers = usePresence(conversationId);

  // Show indicator even if just 1 user (me) so we know it's working
  if (activeUsers.length === 0) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500">
        Connecting...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 animate-in fade-in duration-300 mr-2">
      <div className="flex items-center -space-x-2 overflow-hidden">
        {activeUsers.map((user, i) => (
          <div 
            key={`${user.user_id}-${i}`} 
            className="relative inline-block border-2 border-white dark:border-gray-900 rounded-full transition-transform hover:scale-110 z-0 hover:z-10"
            title={`${user.full_name || user.email} (Online)`}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
              {getInitials(user.email || '', user.full_name)}
            </div>
            <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-400 ring-2 ring-white dark:ring-gray-900 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
        {activeUsers.length} online
      </div>
    </div>
  );
}

function getInitials(email: string, fullName?: string) {
  if (fullName) return fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  return email.substring(0, 2).toUpperCase();
}
