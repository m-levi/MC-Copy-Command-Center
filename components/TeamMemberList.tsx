'use client';

import { useState } from 'react';
import { OrganizationMember, OrganizationRole } from '@/types';
import toast from 'react-hot-toast';

interface TeamMemberListProps {
  members: OrganizationMember[];
  currentUserId: string;
  isAdmin: boolean;
  onMemberUpdated: () => void;
}

const roleOptions: { value: OrganizationRole; label: string }[] = [
  { value: 'member', label: 'Member' },
  { value: 'brand_manager', label: 'Brand Manager' },
  { value: 'admin', label: 'Admin' },
];

const getRoleBadgeClasses = (role: OrganizationRole) => {
  switch (role) {
    case 'admin':
      return 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800';
    case 'brand_manager':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  }
};

const getRoleLabel = (role: OrganizationRole) => {
  return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getInitials = (name?: string, email?: string) => {
  if (name) {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return '??';
};

const getAvatarGradient = (index: number) => {
  const gradients = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-pink-500 to-rose-500',
    'from-indigo-500 to-blue-600',
  ];
  return gradients[index % gradients.length];
};

export default function TeamMemberList({ members, currentUserId, isAdmin, onMemberUpdated }: TeamMemberListProps) {
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<OrganizationRole>('member');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const handleRoleChange = async (memberId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/organizations/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role');
      }

      toast.success('Role updated');
      setEditingMember(null);
      onMemberUpdated();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    setShowMenu(null);
    
    // Use a confirmation toast
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-in fade-in' : 'animate-out fade-out'} bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm`}>
        <p className="text-sm text-gray-900 dark:text-white mb-3">
          Remove <span className="font-semibold">{memberName}</span> from the organization?
        </p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              setLoading(true);
              try {
                const response = await fetch(`/api/organizations/members/${memberId}`, {
                  method: 'DELETE'
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                toast.success('Member removed');
                onMemberUpdated();
              } catch (error: any) {
                toast.error(error.message);
              } finally {
                setLoading(false);
              }
            }}
            className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Remove
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 10000 });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Close menu when clicking outside
  const handleCloseMenu = () => setShowMenu(null);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-light-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Team Members
        </h3>
      </div>

      {members.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">No team members yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Invite someone to get started</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {members.map((member, index) => {
            const isCurrentUser = member.user_id === currentUserId;
            const isEditing = editingMember === member.id;
            
            return (
              <div 
                key={member.id} 
                className={`
                  p-4 transition-colors
                  ${isCurrentUser ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
                `}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className={`
                    w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarGradient(index)}
                    flex items-center justify-center text-white font-semibold text-sm
                    flex-shrink-0 shadow-sm
                  `}>
                    {getInitials(member.profile?.full_name, member.profile?.email)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {member.profile?.full_name || 'Unknown User'}
                      </p>
                      {isCurrentUser && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {member.profile?.email}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Joined {formatDate(member.joined_at)}
                    </p>
                  </div>

                  {/* Role and Actions */}
                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                        <select
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value as OrganizationRole)}
                          disabled={loading}
                          className="
                            px-3 py-1.5 text-sm rounded-lg
                            bg-white dark:bg-gray-800
                            border border-gray-200 dark:border-gray-700
                            text-gray-900 dark:text-white
                            focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                            disabled:opacity-50
                          "
                        >
                          {roleOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleRoleChange(member.id)}
                          disabled={loading}
                          className="
                            p-1.5 rounded-lg text-white bg-blue-600 hover:bg-blue-700
                            disabled:opacity-50 transition-colors
                          "
                        >
                          {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => setEditingMember(null)}
                          disabled={loading}
                          className="
                            p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300
                            hover:bg-gray-100 dark:hover:bg-gray-800
                            disabled:opacity-50 transition-colors
                          "
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Role Badge */}
                        <span className={`
                          px-2.5 py-1 text-xs font-medium rounded-full border
                          ${getRoleBadgeClasses(member.role)}
                        `}>
                          {getRoleLabel(member.role)}
                        </span>
                        
                        {/* Actions Menu */}
                        {isAdmin && !isCurrentUser && (
                          <div className="relative">
                            <button 
                              onClick={() => setShowMenu(showMenu === member.id ? null : member.id)}
                              className="
                                p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-gray-800
                                transition-colors
                              "
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                            
                            {showMenu === member.id && (
                              <>
                                {/* Backdrop */}
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={handleCloseMenu}
                                />
                                
                                {/* Menu */}
                                <div className="
                                  absolute right-0 mt-1 w-44 z-20
                                  bg-white dark:bg-gray-900 
                                  rounded-xl shadow-lg 
                                  border border-gray-200 dark:border-gray-700
                                  py-1 overflow-hidden
                                  animate-in fade-in slide-in-from-top-2 duration-150
                                ">
                                  <button
                                    onClick={() => {
                                      setShowMenu(null);
                                      setEditingMember(member.id);
                                      setNewRole(member.role);
                                    }}
                                    className="
                                      w-full text-left px-4 py-2.5 text-sm
                                      text-gray-700 dark:text-gray-300
                                      hover:bg-gray-50 dark:hover:bg-gray-800
                                      flex items-center gap-2
                                    "
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Change role
                                  </button>
                                  <button
                                    onClick={() => handleRemoveMember(
                                      member.id, 
                                      member.profile?.full_name || member.profile?.email || 'this member'
                                    )}
                                    className="
                                      w-full text-left px-4 py-2.5 text-sm
                                      text-red-600 dark:text-red-400
                                      hover:bg-red-50 dark:hover:bg-red-900/20
                                      flex items-center gap-2
                                    "
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Remove
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
