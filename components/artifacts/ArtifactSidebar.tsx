'use client';

import React, { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useArtifactContext } from '@/contexts/ArtifactContext';
import { ArtifactVariant, getArtifactKindConfig } from '@/types/artifacts';
import { EmailArtifactView } from './EmailArtifactView';
import { ArtifactVersionHistory } from './ArtifactVersionHistory';
import { ArtifactComments } from './ArtifactComments';
import { 
  XIcon, 
  HistoryIcon,
  Share2Icon,
  ChevronDownIcon,
  CheckIcon,
  TrashIcon,
  MessageSquareIcon,
  MailIcon,
  GitBranchIcon,
  MegaphoneIcon,
  FileTextIcon,
  TypeIcon,
  FileEditIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

// =====================================================
// ARTIFACT SIDEBAR
// Extensible sidebar for viewing/editing artifacts
// Uses registry pattern for artifact-type-specific viewers
// =====================================================

// Icon map for artifact kinds
const ARTIFACT_KIND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  email: MailIcon,
  flow: GitBranchIcon,
  campaign: MegaphoneIcon,
  template: FileTextIcon,
  subject_lines: TypeIcon,
  content_brief: FileEditIcon,
};

interface ArtifactSidebarProps {
  className?: string;
  conversationId?: string;
  onQuoteText?: (text: string) => void;
}

type TabView = 'content' | 'history' | 'comments';

export const ArtifactSidebar = memo(function ArtifactSidebar({ 
  className,
  conversationId,
  onQuoteText,
}: ArtifactSidebarProps) {
  const {
    artifacts,
    activeArtifact,
    isSidebarOpen,
    streamingState,
    closeSidebar,
    setActiveArtifact,
    selectVariant,
    shareArtifact,
    deleteArtifact,
    currentArtifactKind,
    getKindConfig,
  } = useArtifactContext();

  // Get configuration for current artifact kind
  const kindConfig = useMemo(() => {
    return getKindConfig(currentArtifactKind);
  }, [getKindConfig, currentArtifactKind]);

  const KindIcon = ARTIFACT_KIND_ICONS[currentArtifactKind] || MailIcon;

  const [activeTab, setActiveTab] = useState<TabView>('content');
  const [showArtifactPicker, setShowArtifactPicker] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [justShared, setJustShared] = useState(false);
  
  // State for comments - highlighted text from the artifact
  const [highlightedTextForComment, setHighlightedTextForComment] = useState<string | null>(null);
  
  // Handle when user selects text in artifact and clicks "Comment"
  const handleCommentText = useCallback((text: string) => {
    setHighlightedTextForComment(text);
    setActiveTab('comments');
  }, []);

  const handleClose = useCallback(() => {
    closeSidebar();
  }, [closeSidebar]);

  const handleShare = useCallback(async () => {
    if (!activeArtifact || isSharing) return;
    setIsSharing(true);
    try {
      const url = await shareArtifact(activeArtifact.id);
      if (url) {
        setJustShared(true);
        setTimeout(() => setJustShared(false), 2000);
      }
    } finally {
      setIsSharing(false);
    }
  }, [activeArtifact, isSharing, shareArtifact]);

  const handleVariantChange = useCallback((variant: ArtifactVariant) => {
    if (activeArtifact) {
      selectVariant(activeArtifact.id, variant);
    }
  }, [activeArtifact, selectVariant]);

  useEffect(() => {
    if (showArtifactPicker) {
      const handleClick = () => setShowArtifactPicker(false);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showArtifactPicker]);

  const availableVariants = activeArtifact ? (['a', 'b', 'c'] as ArtifactVariant[]).filter(v => {
    if (v === 'a') return !!activeArtifact.version_a_content;
    if (v === 'b') return !!activeArtifact.version_b_content;
    if (v === 'c') return !!activeArtifact.version_c_content;
    return false;
  }) : [];

  const versionCount = activeArtifact?.version_count || 1;

  if (!isSidebarOpen) return null;

  return (
    <div className={cn(
      'h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col',
      className
    )}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {streamingState.isStreaming && !activeArtifact ? (
              // Streaming without artifact - show writing indicator
              <div className="flex items-center gap-2">
                <KindIcon className="w-4 h-4 text-blue-500" />
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  Writing {kindConfig.label}...
                </span>
              </div>
            ) : artifacts.length > 1 ? (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowArtifactPicker(!showArtifactPicker);
                  }}
                  className="flex items-center gap-2 px-2 py-1 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                    {activeArtifact?.title || 'Email'}
                  </span>
                  <ChevronDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
                
                {showArtifactPicker && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <div className="px-3 py-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                      {artifacts.length} Email{artifacts.length !== 1 ? 's' : ''} in this conversation
                    </div>
                    {artifacts.map((a) => {
                      const createdTime = new Date(a.created_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      });
                      const createdDate = new Date(a.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      });
                      const isActive = a.id === activeArtifact?.id;
                      
                      return (
                        <div
                          key={a.id}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group',
                            isActive && 'bg-blue-50 dark:bg-blue-900/30'
                          )}
                        >
                          <button
                            onClick={() => {
                              setActiveArtifact(a.id);
                              setShowArtifactPicker(false);
                              setActiveTab('content');
                            }}
                            className="flex-1 text-left min-w-0"
                          >
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                'text-sm font-medium truncate',
                                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                              )}>
                                {a.title}
                              </span>
                              <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0">
                                v{a.version_count}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {createdDate} at {createdTime}
                            </div>
                          </button>
                          
                          {artifacts.length > 1 && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${a.title}"?`)) {
                                  await deleteArtifact(a.id);
                                  if (isActive && artifacts.length > 1) {
                                    const remaining = artifacts.filter(art => art.id !== a.id);
                                    if (remaining.length > 0) {
                                      setActiveArtifact(remaining[0].id);
                                    }
                                  }
                                }
                              }}
                              className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <span className="font-semibold text-gray-900 dark:text-white truncate">
                {activeArtifact?.title || 'Email'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Only show share when we have an artifact and the kind supports sharing */}
            {activeArtifact && kindConfig.supportsSharing && (
              <button
                onClick={handleShare}
                disabled={isSharing}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  justShared
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                )}
              >
                {justShared ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2Icon className="w-3.5 h-3.5" />
                    Share
                  </>
                )}
              </button>
            )}
            
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Only show tabs when we have an artifact (not during streaming-only) */}
        {activeArtifact && (
          <div className="flex items-center gap-1 px-4 pb-2">
            <TabButton 
              active={activeTab === 'content'} 
              onClick={() => setActiveTab('content')}
            >
              <KindIcon className="w-3.5 h-3.5" />
              {kindConfig.label}
            </TabButton>
            {/* Only show comments tab if the artifact kind supports comments */}
            {kindConfig.supportsComments && (
              <TabButton 
                active={activeTab === 'comments'} 
                onClick={() => setActiveTab('comments')}
              >
                <MessageSquareIcon className="w-3.5 h-3.5" />
                Comments
              </TabButton>
            )}
            <TabButton 
              active={activeTab === 'history'} 
              onClick={() => setActiveTab('history')}
              badge={versionCount > 1 ? `${versionCount}` : undefined}
            >
              <HistoryIcon className="w-3.5 h-3.5" />
              History
            </TabButton>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {streamingState.isStreaming && !activeArtifact ? (
          // Show streaming content even without an artifact yet
          <StreamingEmailView content={streamingState.partialContent} />
        ) : !activeArtifact ? (
          <EmptyState />
        ) : activeTab === 'history' ? (
          <ArtifactVersionHistory
            artifactId={activeArtifact.id}
            onClose={() => setActiveTab('content')}
          />
        ) : activeTab === 'comments' ? (
          <ArtifactComments
            artifactId={activeArtifact.id}
            conversationId={conversationId || activeArtifact.conversation_id}
            highlightedText={highlightedTextForComment}
            selectedVariant={activeArtifact.selected_variant || 'a'}
            onHighlightedTextUsed={() => setHighlightedTextForComment(null)}
          />
        ) : (
          <EmailArtifactView
            artifact={activeArtifact}
            availableVariants={availableVariants}
            selectedVariant={activeArtifact.selected_variant || 'a'}
            onVariantChange={handleVariantChange}
            isStreaming={streamingState.isStreaming}
            streamingContent={streamingState.partialContent}
            onCommentText={handleCommentText}
            onQuoteText={onQuoteText}
          />
        )}
      </div>
    </div>
  );
});

function TabButton({ 
  children, 
  active, 
  onClick,
  badge 
}: { 
  children: React.ReactNode; 
  active: boolean; 
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
        active
          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      )}
    >
      {children}
      {badge && (
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded-full',
          active 
            ? 'bg-white/20 dark:bg-gray-900/20' 
            : 'bg-gray-200 dark:bg-gray-700'
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No email selected
      </p>
    </div>
  );
}

// Streaming view - shows content as it's being generated with version tabs
function StreamingEmailView({ content }: { content: string }) {
  const [selectedVersion, setSelectedVersion] = useState<'a' | 'b' | 'c'>('a');
  
  // Parse streaming content to detect versions
  const { versions, currentlyStreaming, beforeContent } = useMemo(() => {
    // Check which versions are available or being written
    const versionAMatch = content.match(/<version_a>([\s\S]*?)(<\/version_a>|$)/i);
    const versionBMatch = content.match(/<version_b>([\s\S]*?)(<\/version_b>|$)/i);
    const versionCMatch = content.match(/<version_c>([\s\S]*?)(<\/version_c>|$)/i);
    
    const versions: { id: 'a' | 'b' | 'c'; content: string; isComplete: boolean; approach?: string }[] = [];
    
    // Extract approach from content
    const extractApproach = (text: string) => {
      const match = text.match(/^\*\*Approach:\*\*\s*(.+?)(?:\n|$)/im);
      return match ? match[1].trim() : undefined;
    };
    
    if (versionAMatch) {
      const vContent = versionAMatch[1].trim();
      versions.push({
        id: 'a',
        content: vContent,
        isComplete: content.includes('</version_a>'),
        approach: extractApproach(vContent),
      });
    }
    
    if (versionBMatch) {
      const vContent = versionBMatch[1].trim();
      versions.push({
        id: 'b',
        content: vContent,
        isComplete: content.includes('</version_b>'),
        approach: extractApproach(vContent),
      });
    }
    
    if (versionCMatch) {
      const vContent = versionCMatch[1].trim();
      versions.push({
        id: 'c',
        content: vContent,
        isComplete: content.includes('</version_c>'),
        approach: extractApproach(vContent),
      });
    }
    
    // Determine what's currently streaming
    let currentlyStreaming: 'a' | 'b' | 'c' | null = null;
    if (versions.length > 0) {
      const lastVersion = versions[versions.length - 1];
      if (!lastVersion.isComplete) {
        currentlyStreaming = lastVersion.id;
      }
    }
    
    // Get content before version tags
    const beforeMatch = content.match(/^([\s\S]*?)<version_/i);
    const beforeContent = beforeMatch ? beforeMatch[1].trim() : '';
    
    return { versions, currentlyStreaming, beforeContent };
  }, [content]);
  
  // Auto-select the version being written
  useEffect(() => {
    if (currentlyStreaming) {
      setSelectedVersion(currentlyStreaming);
    } else if (versions.length > 0 && !versions.find(v => v.id === selectedVersion)) {
      setSelectedVersion(versions[0].id);
    }
  }, [currentlyStreaming, versions, selectedVersion]);
  
  const currentVersion = versions.find(v => v.id === selectedVersion);
  const isCurrentVersionStreaming = currentlyStreaming === selectedVersion;
  
  // Clean content for display
  const displayContent = currentVersion?.content
    .replace(/^\*\*Approach:\*\*\s*.+?\n*/im, '') // Remove approach line from content
    .replace(/^```\n?/gm, '')
    .replace(/\n?```$/gm, '')
    .trim() || '';

  return (
    <div className="flex flex-col h-full">
      {/* Header with version selector */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Writing email copy...
            </span>
          </div>
          
          {/* Version tabs */}
          {versions.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Version:</span>
              {(['a', 'b', 'c'] as const).map((v) => {
                const version = versions.find(ver => ver.id === v);
                const isAvailable = !!version;
                const isStreaming = currentlyStreaming === v;
                const isSelected = selectedVersion === v;
                
                return (
                  <button
                    key={v}
                    onClick={() => isAvailable && setSelectedVersion(v)}
                    disabled={!isAvailable}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-bold transition-all relative',
                      isSelected
                        ? 'bg-blue-500 text-white shadow-md scale-105'
                        : isAvailable
                          ? 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                          : 'bg-gray-100 dark:bg-gray-800/50 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    )}
                  >
                    {v.toUpperCase()}
                    {isStreaming && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Before content (AI intro) */}
        {beforeContent && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {beforeContent}
          </div>
        )}
        
        {currentVersion ? (
          <div className="space-y-3">
            {/* Approach card */}
            {currentVersion.approach && (
              <div className="px-3 py-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg border-l-2 border-violet-400">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <svg className="w-3.5 h-3.5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">
                    Approach
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{currentVersion.approach}</p>
              </div>
            )}
            
            {/* Email content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
                {displayContent}
                {isCurrentVersionStreaming && (
                  <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
                )}
              </pre>
            </div>
            
            {/* Progress indicator */}
            {isCurrentVersionStreaming && (
              <div className="flex items-center justify-center gap-2 py-2 text-blue-500">
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs">Writing Version {selectedVersion.toUpperCase()}...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Preparing email versions...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ArtifactSidebar;

