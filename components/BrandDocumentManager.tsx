'use client';

import { useState, useEffect } from 'react';
import { BrandDocument } from '@/types';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface BrandDocumentManagerProps {
  brandId: string;
  brandName: string;
}

export default function BrandDocumentManager({ brandId, brandName }: BrandDocumentManagerProps) {
  const [documents, setDocuments] = useState<BrandDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newDoc, setNewDoc] = useState({
    docType: 'example' as BrandDocument['doc_type'],
    title: '',
    content: '',
  });

  const supabase = createClient();

  useEffect(() => {
    loadDocuments();
  }, [brandId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('brand_documents')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDoc.title.trim() || !newDoc.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setUploading(true);

    try {
      // Call the embeddings API to create the document with embedding
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          docType: newDoc.docType,
          title: newDoc.title,
          content: newDoc.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload document');
      }

      const document = await response.json();
      
      setDocuments(prev => [document, ...prev]);
      setNewDoc({ docType: 'example', title: '', content: '' });
      setShowUploadForm(false);
      toast.success('Document uploaded successfully!');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('brand_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      setDocuments(prev => prev.filter(d => d.id !== documentId));
      toast.success('Document deleted');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const docTypeLabels = {
    example: { label: 'Example Email', icon: '📧', color: 'blue' },
    competitor: { label: 'Competitor Analysis', icon: '🔍', color: 'purple' },
    research: { label: 'Research', icon: '📊', color: 'green' },
    testimonial: { label: 'Customer Testimonial', icon: '⭐', color: 'yellow' },
  };

  const getDocTypeColor = (type: BrandDocument['doc_type']) => {
    const colors = {
      example: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      competitor: 'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      research: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      testimonial: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    };
    return colors[type];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Brand Knowledge Base
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Upload documents to enhance AI responses with brand-specific context
          </p>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Document
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <form onSubmit={handleUpload} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Document Type
            </label>
            <select
              value={newDoc.docType}
              onChange={(e) => setNewDoc({ ...newDoc, docType: e.target.value as BrandDocument['doc_type'] })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(docTypeLabels).map(([value, { label, icon }]) => (
                <option key={value} value={value}>
                  {icon} {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={newDoc.title}
              onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
              placeholder="e.g., Black Friday 2024 Email"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content
            </label>
            <textarea
              value={newDoc.content}
              onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
              placeholder="Paste your email copy, competitor analysis, research notes, or testimonial here..."
              rows={6}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              required
            />
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowUploadForm(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
          <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No documents yet. Add your first document to enhance AI responses.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => {
            const typeInfo = docTypeLabels[doc.doc_type];
            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getDocTypeColor(doc.doc_type)}`}>
                        {typeInfo.icon} {typeInfo.label}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      {doc.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {doc.content}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Added {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="ml-4 p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete document"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



















