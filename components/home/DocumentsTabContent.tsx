'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { FileText, Search, FolderOpen } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  brand_id: string;
  brand_name?: string;
  updated_at: string;
  type?: string;
}

interface DocumentsTabContentProps {
  documents?: Document[];
  onSelectDocument?: (documentId: string, brandId: string) => void;
}

export default function DocumentsTabContent({
  documents = [],
  onSelectDocument,
}: DocumentsTabContentProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className={cn(
              "w-full pl-9 pr-3 py-2 text-sm rounded-lg",
              "bg-gray-100 dark:bg-gray-800 border-0",
              "text-gray-900 dark:text-white placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-500"
            )}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredDocuments.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No documents found' : 'No documents yet'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Documents from your brands will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredDocuments.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onSelectDocument?.(doc.id, doc.brand_id)}
                className={cn(
                  "w-full px-3 py-2.5 text-left rounded-lg transition-all group",
                  "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                  "flex items-center gap-2.5"
                )}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {doc.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {doc.brand_name && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded truncate max-w-[80px]">
                        {doc.brand_name}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {formatTimeAgo(doc.updated_at)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
