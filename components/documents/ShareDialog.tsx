'use client';

import { useState, useEffect } from 'react';
import { BrandDocumentV2, DocumentVisibility, Profile, DOCUMENT_VISIBILITY_META } from '@/types';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { 
  X, 
  Lock,
  Users,
  Building2,
  Loader2,
  Check,
  UserPlus,
  Search,
  Cloud,
  ExternalLink,
  Info
} from 'lucide-react';

interface ShareDialogProps {
  document: BrandDocumentV2;
  brandId: string;
  onUpdate: (visibility: DocumentVisibility, sharedWith: string[]) => Promise<void>;
  onClose: () => void;
}

export default function ShareDialog({
  document,
  brandId,
  onUpdate,
  onClose,
}: ShareDialogProps) {
  const [visibility, setVisibility] = useState<DocumentVisibility>(document.visibility);
  const [selectedUsers, setSelectedUsers] = useState<string[]>(document.shared_with || []);
  const [orgMembers, setOrgMembers] = useState<Profile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  // Load organization members
  useEffect(() => {
    loadOrgMembers();
  }, [brandId]);

  const loadOrgMembers = async () => {
    setLoadingMembers(true);
    try {
      // Get brand's organization
      const { data: brand } = await supabase
        .from('brands')
        .select('organization_id')
        .eq('id', brandId)
        .single();

      if (!brand) return;

      // Get organization members
      const { data: members } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          profiles:user_id (
            user_id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('organization_id', brand.organization_id);

      if (members) {
        const profiles = members
          .map((m) => m.profiles as unknown as Profile)
          .filter((p): p is Profile => p !== null);
        setOrgMembers(profiles);
      }
    } catch (error) {
      console.error('Failed to load org members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(visibility, selectedUsers);
      onClose();
    } catch (error) {
      console.error('Failed to update sharing:', error);
      alert('Failed to update sharing settings');
    } finally {
      setSaving(false);
    }
  };

  // Filter members based on search
  const filteredMembers = orgMembers.filter((member) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.email.toLowerCase().includes(query) ||
      (member.full_name?.toLowerCase().includes(query) ?? false)
    );
  });

  const visibilityOptions = [
    {
      value: 'private' as const,
      label: 'Private',
      icon: Lock,
      description: 'Only you can access this document',
      color: 'gray',
    },
    {
      value: 'shared' as const,
      label: 'Shared',
      icon: Users,
      description: 'Share with specific team members',
      color: 'blue',
    },
    {
      value: 'org' as const,
      label: 'Organization',
      icon: Building2,
      description: 'Everyone in your organization can access',
      color: 'green',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Share Document
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[300px]">
              {document.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Visibility Options */}
          <div className="space-y-3 mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Who can access this document?
            </label>
            
            {visibilityOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = visibility === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => setVisibility(option.value)}
                  className={cn(
                    'w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left',
                    isSelected
                      ? `border-${option.color}-500 bg-${option.color}-50 dark:bg-${option.color}-950/30`
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                    isSelected
                      ? `bg-${option.color}-100 dark:bg-${option.color}-900/50 text-${option.color}-600 dark:text-${option.color}-400`
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'font-medium',
                        isSelected
                          ? 'text-gray-900 dark:text-gray-100'
                          : 'text-gray-700 dark:text-gray-300'
                      )}>
                        {option.label}
                      </span>
                      {isSelected && (
                        <Check className={`w-4 h-4 text-${option.color}-600 dark:text-${option.color}-400`} />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Google Drive Provenance Info */}
          {document.drive_file_id && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 flex items-center justify-center flex-shrink-0">
                  <Cloud className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Imported from Google Drive
                  </p>
                  {document.drive_owner && (
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      Original owner: {document.drive_owner}
                    </p>
                  )}
                  {document.drive_last_synced_at && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                      Synced: {new Date(document.drive_last_synced_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
                {document.drive_web_view_link && (
                  <a
                    href={document.drive_web_view_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/70 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Drive
                  </a>
                )}
              </div>
              <div className="mt-3 flex items-start gap-2 text-xs text-blue-600 dark:text-blue-400">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <p>
                  Sharing settings here only affect access within this app. 
                  The original Google Drive sharing settings remain unchanged.
                </p>
              </div>
            </div>
          )}

          {/* User Selection (only when shared) */}
          {visibility === 'shared' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select team members
              </label>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Member List */}
              <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                    {searchQuery ? 'No members found' : 'No team members available'}
                  </div>
                ) : (
                  filteredMembers.map((member) => {
                    const isSelected = selectedUsers.includes(member.user_id);
                    const isCreator = member.user_id === document.created_by;
                    
                    return (
                      <button
                        key={member.user_id}
                        onClick={() => !isCreator && toggleUser(member.user_id)}
                        disabled={isCreator}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 transition-colors',
                          isCreator
                            ? 'opacity-50 cursor-not-allowed'
                            : isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/30'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        )}
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                          {member.avatar_url ? (
                            <img 
                              src={member.avatar_url} 
                              alt="" 
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                              {(member.full_name || member.email).charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {member.full_name || 'Unknown'}
                            {isCreator && (
                              <span className="ml-2 text-xs text-gray-500">(Owner)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {member.email}
                          </p>
                        </div>
                        
                        {/* Checkbox */}
                        <div className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                          isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 dark:border-gray-600'
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedUsers.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedUsers.length} {selectedUsers.length === 1 ? 'person' : 'people'} selected
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (visibility === 'shared' && selectedUsers.length === 0)}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2',
              saving || (visibility === 'shared' && selectedUsers.length === 0)
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
            )}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Update Sharing
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}







