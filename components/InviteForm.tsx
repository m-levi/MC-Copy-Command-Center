'use client';

import { useState } from 'react';
import { OrganizationRole } from '@/types';
import toast from 'react-hot-toast';

interface InviteFormProps {
  onInviteSent: () => void;
}

export default function InviteForm({ onInviteSent }: InviteFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>('member');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setInviteLink('');

    try {
      const response = await fetch('/api/organizations/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setInviteLink(data.inviteLink);
      
      if (data.emailSent) {
        toast.success('Invitation email sent successfully!');
      } else {
        toast.success('Invitation created! Copy the link below.');
      }
      
      setEmail('');
      onInviteSent();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied to clipboard!');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Send Team Invitation</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="colleague@example.com"
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as OrganizationRole)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="member">Member - Can view and chat</option>
            <option value="brand_manager">Brand Manager - Can create & manage brands</option>
            <option value="admin">Admin - Full access</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send Invitation'}
        </button>
      </form>

      {inviteLink && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-800 mb-2">
            Invitation Created!
            <span className="block text-xs font-normal mt-1">
              An email has been sent to the user. You can also copy the link below manually.
            </span>
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="flex-1 px-3 py-2 text-sm bg-white border border-green-300 rounded-lg"
            />
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-green-700 mt-2">
            Share this link with the invitee. It expires in 7 days.
          </p>
        </div>
      )}
    </div>
  );
}

