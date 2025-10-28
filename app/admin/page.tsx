'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { OrganizationMember, OrganizationInvite } from '@/types';
import TeamMemberList from '@/components/TeamMemberList';
import InviteForm from '@/components/InviteForm';
import toast, { Toaster } from 'react-hot-toast';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
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

      if (!memberData || memberData.role !== 'admin') {
        toast.error('You must be an admin to access this page');
        router.push('/');
        return;
      }

      setIsAdmin(true);
      setOrganizationName((memberData.organization as any).name);

      // Load members and invites
      await Promise.all([
        loadMembers(),
        loadInvites()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load admin data');
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
    } catch (error: any) {
      console.error('Error loading members:', error);
      toast.error(error.message);
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
    } catch (error: any) {
      console.error('Error loading invites:', error);
      toast.error(error.message);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/invites/${inviteId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke invitation');
      }

      toast.success('Invitation revoked successfully!');
      await loadInvites();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isPending = (invite: OrganizationInvite) => {
    return !invite.used_at && new Date(invite.expires_at) > new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Team Management</h1>
            <p className="text-sm text-gray-600 mt-1">{organizationName}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Brands
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Invite form */}
          <div className="lg:col-span-1">
            <InviteForm onInviteSent={() => loadInvites()} />

            {/* Pending Invitations */}
            {invites.filter(isPending).length > 0 && (
              <div className="mt-6 bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Pending Invitations</h3>
                <div className="space-y-3">
                  {invites.filter(isPending).map((invite) => (
                    <div key={invite.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{invite.email}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Role: {invite.role.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Expires: {formatDate(invite.expires_at)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRevokeInvite(invite.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                          title="Revoke invitation"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column - Team members */}
          <div className="lg:col-span-2">
            <TeamMemberList
              members={members}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onMemberUpdated={() => loadMembers()}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

