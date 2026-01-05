'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { OrganizationMember, OrganizationInvite } from '@/types';
import TeamMemberList from '@/components/TeamMemberList';
import InviteForm from '@/components/InviteForm';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUserId(user.id);

      // Check if user is admin
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('role, organization:organizations(name)')
        .eq('user_id', user.id)
        .single();

      if (!memberData) {
        router.push('/onboarding');
        return;
      }

      const userIsAdmin = memberData.role === 'admin';
      setIsAdmin(userIsAdmin);
      setOrganizationName((memberData.organization as any).name);

      // Load members and invites
      await Promise.all([
        loadMembers(),
        userIsAdmin ? loadInvites() : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const response = await fetch('/api/organizations/members');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load members');
      }

      setMembers(data.members || []);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error(getErrorMessage(error));
    }
  };

  const loadInvites = async () => {
    try {
      const response = await fetch('/api/organizations/invites');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load invites');
      }

      setInvites(data.invites || []);
    } catch (error) {
      console.error('Error loading invites:', error);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/organizations/invites/${inviteId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke invitation');
      }

      toast.success('Invitation revoked');
      await loadInvites();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/organizations/invites/${inviteId}/resend`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend invitation');
      }

      toast.success('Invitation resent');
      await loadInvites();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const isPending = (invite: OrganizationInvite) => {
    return !invite.used_at && new Date(invite.expires_at) > new Date();
  };

  const pendingInvites = invites.filter(isPending);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Team
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage members and invitations for {organizationName}
          </p>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
          </div>
          {isAdmin && pendingInvites.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                {pendingInvites.length} pending
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Invite form and pending invites */}
        {isAdmin && (
          <div className="lg:col-span-1 space-y-6">
            {/* Invite Form */}
            <InviteForm onInviteSent={() => loadInvites()} />

            {/* Pending Invitations */}
            {pendingInvites.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-light-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pending Invitations
                  </h3>
                </div>
                
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {invite.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`
                              inline-flex px-2 py-0.5 text-xs font-medium rounded-full
                              ${invite.role === 'admin' 
                                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' 
                                : invite.role === 'brand_manager'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                              }
                            `}>
                              {invite.role.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              · Expires {formatDate(invite.expires_at)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleResendInvite(invite.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Resend invitation"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRevokeInvite(invite.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Revoke invitation"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right column - Team members */}
        <div className={isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <TeamMemberList
            members={members}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onMemberUpdated={() => loadMembers()}
          />
        </div>
      </div>
    </div>
  );
}
