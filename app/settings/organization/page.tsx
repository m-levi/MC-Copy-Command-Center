'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export default function OrganizationSettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadOrganization();
  }, []);

  useEffect(() => {
    if (slug && organization && slug !== organization.slug) {
      const timer = setTimeout(() => checkSlugAvailability(slug), 500);
      return () => clearTimeout(timer);
    } else {
      setSlugAvailable(null);
    }
  }, [slug, organization]);

  const loadOrganization = async () => {
    try {
      const response = await fetch('/api/organizations');
      const data = await response.json();

      if (!data.organization) {
        router.push('/onboarding');
        return;
      }

      setOrganization(data.organization);
      setRole(data.role);
      setName(data.organization.name);
      setSlug(data.organization.slug);
    } catch (error) {
      console.error('Failed to load organization:', error);
      toast.error('Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  };

  const checkSlugAvailability = async (newSlug: string) => {
    setCheckingSlug(true);
    try {
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', newSlug.toLowerCase())
        .neq('id', organization?.id || '')
        .single();
      
      setSlugAvailable(!existing);
    } catch {
      setSlugAvailable(true); // No match found means available
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organization) return;
    if (slugAvailable === false) {
      toast.error('Please choose a different slug');
      return;
    }

    setSaving(true);

    try {
      const updates: any = {};
      if (name !== organization.name) updates.name = name;
      if (slug !== organization.slug) updates.slug = slug;

      if (Object.keys(updates).length === 0) {
        toast('No changes to save');
        setSaving(false);
        return;
      }

      const response = await fetch('/api/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setOrganization(data.organization);
      toast.success('Organization settings saved');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== organization?.name) {
      toast.error('Please type the organization name to confirm');
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch('/api/organizations', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      toast.success('Organization deleted');
      router.push('/onboarding');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const isAdmin = role === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!organization) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Organization Settings
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Manage your organization's profile and settings
        </p>
      </div>

      {/* General Settings */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-light-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            General
          </h2>
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Organization Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Organization name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAdmin || saving}
              className="
                w-full px-4 py-3 rounded-xl
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all
              "
            />
          </div>

          {/* Organization Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Organization URL slug
            </label>
            <div className="relative">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                disabled={!isAdmin || saving}
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-white dark:bg-gray-800
                  border border-gray-200 dark:border-gray-700
                  text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all
                "
              />
              {slug !== organization.slug && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingSlug ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : slugAvailable === true ? (
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : slugAvailable === false ? (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : null}
                </div>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Only lowercase letters, numbers, and hyphens are allowed
            </p>
          </div>

          {/* Created date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Created
            </label>
            <p className="text-gray-900 dark:text-white">
              {new Date(organization.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {isAdmin && (
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving || (slug !== organization.slug && !slugAvailable)}
                className="
                  px-6 py-2.5 rounded-xl font-medium text-white
                  bg-blue-600 hover:bg-blue-700
                  disabled:bg-gray-400 disabled:cursor-not-allowed
                  transition-colors
                  flex items-center gap-2
                "
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Danger Zone */}
      {isAdmin && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
              Danger Zone
            </h2>
          </div>
          
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Delete organization
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Permanently delete this organization and all its data. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="
                  px-4 py-2 rounded-lg font-medium text-red-600 dark:text-red-400
                  border border-red-300 dark:border-red-700
                  hover:bg-red-50 dark:hover:bg-red-900/20
                  transition-colors flex-shrink-0
                "
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 fade-in duration-200">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Delete organization?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                This will permanently delete <span className="font-semibold text-gray-900 dark:text-white">{organization.name}</span> and all associated data including brands, conversations, and team members.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                Type <span className="font-mono font-semibold text-gray-900 dark:text-white">{organization.name}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={organization.name}
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-white dark:bg-gray-800
                  border border-gray-200 dark:border-gray-700
                  text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-red-500/20 focus:border-red-500
                  transition-all
                "
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="
                  flex-1 px-4 py-2.5 rounded-xl font-medium
                  text-gray-700 dark:text-gray-300
                  bg-gray-100 dark:bg-gray-800
                  hover:bg-gray-200 dark:hover:bg-gray-700
                  transition-colors
                "
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmation !== organization.name || deleting}
                className="
                  flex-1 px-4 py-2.5 rounded-xl font-medium text-white
                  bg-red-600 hover:bg-red-700
                  disabled:bg-gray-400 disabled:cursor-not-allowed
                  transition-colors
                  flex items-center justify-center gap-2
                "
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete organization'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

