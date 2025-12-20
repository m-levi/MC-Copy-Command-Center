'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useArtifactContext } from '@/contexts/ArtifactContext';
import { 
  ClockIcon, 
  RotateCcwIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  PencilIcon,
  CopyIcon,
  CheckIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ArtifactVersion {
  id: string;
  artifact_id: string;
  version: number;
  content: string;
  title: string;
  change_type: string;
  created_at: string;
}

interface ArtifactVersionHistoryProps {
  artifactId: string;
  onClose: () => void;
}

export const ArtifactVersionHistory = memo(function ArtifactVersionHistory({
  artifactId,
  onClose,
}: ArtifactVersionHistoryProps) {
  const { getVersionHistory, restoreVersion } = useArtifactContext();
  const [versions, setVersions] = useState<ArtifactVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    async function loadHistory() {
      setIsLoading(true);
      try {
        const history = await getVersionHistory(artifactId);
        if (!cancelled) {
          const sorted = [...(history as unknown as ArtifactVersion[])].sort((a, b) => b.version - a.version);
          setVersions(sorted);
        }
      } catch (error) {
        console.error('Failed to load version history:', error);
        if (!cancelled) {
          toast.error('Failed to load version history');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    
    loadHistory();
    
    return () => {
      cancelled = true;
    };
  }, [artifactId, getVersionHistory]);

  const handleRestore = useCallback(async (versionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRestoringId(versionId);
    try {
      await restoreVersion(artifactId, versionId);
      toast.success('Version restored!');
      onClose();
    } catch (error) {
      toast.error('Failed to restore');
    } finally {
      setRestoringId(null);
    }
  }, [artifactId, restoreVersion, onClose]);

  const handleCopy = useCallback(async (content: string, versionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const clean = content.replace(/^```\n?/gm, '').replace(/\n?```$/gm, '').trim();
    await navigator.clipboard.writeText(clean);
    setCopiedId(versionId);
    toast.success('Copied!');
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const formatTime = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getChangeTypeDisplay = (changeType: string, isCurrent: boolean, isOriginal: boolean) => {
    if (isOriginal) return { icon: SparklesIcon, label: 'Original', color: 'text-green-500' };
    if (changeType?.toLowerCase().includes('restore')) return { icon: RotateCcwIcon, label: 'Restored', color: 'text-purple-500' };
    if (changeType?.toLowerCase().includes('edit')) return { icon: PencilIcon, label: 'Edited', color: 'text-blue-500' };
    if (changeType?.toLowerCase().includes('feedback') || changeType?.toLowerCase().includes('update')) {
      return { icon: PencilIcon, label: 'Revised', color: 'text-blue-500' };
    }
    return { icon: PencilIcon, label: changeType || 'Changed', color: 'text-gray-500' };
  };

  const getContentPreview = (content: string) => {
    const lines = content.split('\n').filter(l => {
      const trimmed = l.trim();
      return trimmed && !trimmed.startsWith('**') && !trimmed.startsWith('```');
    });
    
    for (const line of lines) {
      const clean = line.replace(/^(Headline|Subhead|Body|CTA|Quote):\s*/i, '').trim();
      if (clean.length > 10) {
        return clean.length > 80 ? clean.slice(0, 80) + '...' : clean;
      }
    }
    return 'Email content...';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {versions.length} version{versions.length !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Click to expand
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <ClockIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No version history yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Edits will appear here
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
            
            <div className="py-4 space-y-0">
              {versions.map((version, index) => {
                const isCurrent = index === 0;
                const isOriginal = index === versions.length - 1;
                const isExpanded = expandedId === version.id;
                const { icon: TypeIcon, label: typeLabel, color: typeColor } = getChangeTypeDisplay(version.change_type, isCurrent, isOriginal);
                
                return (
                  <div key={version.id} className="relative">
                    <div className={cn(
                      'absolute left-5 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10',
                      isCurrent
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                    )}>
                      {isCurrent && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    
                    <div 
                      className={cn(
                        'ml-12 mr-4 mb-3 rounded-lg border transition-all cursor-pointer',
                        isCurrent
                          ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                      onClick={() => setExpandedId(isExpanded ? null : version.id)}
                    >
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'text-xs font-bold px-2 py-0.5 rounded',
                            isCurrent
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          )}>
                            v{version.version}
                          </span>
                          
                          <div className={cn(
                            'flex items-center gap-1 text-xs font-medium',
                            typeColor
                          )}>
                            <TypeIcon className="w-3 h-3" />
                            {typeLabel}
                          </div>
                          
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatTime(version.created_at)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isCurrent && (
                            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                              Current
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUpIcon className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      {!isExpanded && (
                        <div className="px-3 pb-3 -mt-1">
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                            {getContentPreview(version.content)}
                          </p>
                        </div>
                      )}
                      
                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-700">
                          <div className="p-3 max-h-64 overflow-y-auto">
                            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                              {version.content.replace(/^```\n?/gm, '').replace(/\n?```$/gm, '').trim()}
                            </pre>
                          </div>
                          
                          <div className="flex items-center gap-2 p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <button
                              onClick={(e) => handleCopy(version.content, version.id, e)}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                                copiedId === version.id
                                  ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              )}
                            >
                              {copiedId === version.id ? (
                                <>
                                  <CheckIcon className="w-3.5 h-3.5" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <CopyIcon className="w-3.5 h-3.5" />
                                  Copy
                                </>
                              )}
                            </button>
                            
                            {!isCurrent && (
                              <button
                                onClick={(e) => handleRestore(version.id, e)}
                                disabled={restoringId === version.id}
                                className={cn(
                                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                                  restoringId === version.id
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60'
                                )}
                              >
                                <RotateCcwIcon className={cn('w-3.5 h-3.5', restoringId === version.id && 'animate-spin')} />
                                Restore this version
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default ArtifactVersionHistory;







