'use client';

import { useState } from 'react';
import { OrganizationMember, OrganizationRole } from '@/types';
import UserRoleBadge from './UserRoleBadge';
import toast from 'react-hot-toast';

interface TeamMemberListProps {
  members: OrganizationMember[];
  currentUserId: string;
  isAdmin: boolean;
  onMemberUpdated: () => void;
}

export default function TeamMemberList({ members, currentUserId, isAdmin, onMemberUpdated }: TeamMemberListProps) {
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<OrganizationRole>('member');
  const [loading, setLoading] = useState(false);

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

      toast.success('Member role updated successfully!');
      setEditingMember(null);
      onMemberUpdated();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the organization?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/organizations/members/${memberId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member');
      }

      toast.success('Member removed successfully!');
      onMemberUpdated();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Team Members</h2>
        <p className="text-sm text-gray-600 mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="divide-y divide-gray-200">
        {members.map((member) => (
          <div key={member.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {member.profile?.full_name?.charAt(0) || member.profile?.email?.charAt(0).toUpperCase() || '?'}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800">
                      {member.profile?.full_name || 'Unknown'}
                      {member.user_id === currentUserId && (
                        <span className="ml-2 text-xs text-gray-500">(You)</span>
                      )}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">{member.profile?.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Joined {formatDate(member.joined_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {editingMember === member.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as OrganizationRole)}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                      disabled={loading}
                    >
                      <option value="member">Member</option>
                      <option value="brand_manager">Brand Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => handleRoleChange(member.id)}
                      disabled={loading}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingMember(null)}
                      disabled={loading}
                      className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <UserRoleBadge role={member.role} />
                    
                    {isAdmin && member.user_id !== currentUserId && (
                      <div className="relative group">
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 16 16">
                            <circle cx="8" cy="2" r="1.5" />
                            <circle cx="8" cy="8" r="1.5" />
                            <circle cx="8" cy="14" r="1.5" />
                          </svg>
                        </button>
                        
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 hidden group-hover:block">
                          <button
                            onClick={() => {
                              setEditingMember(member.id);
                              setNewRole(member.role);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                          >
                            Change Role
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member.id, member.profile?.full_name || member.profile?.email || 'this member')}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
                          >
                            Remove Member
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

