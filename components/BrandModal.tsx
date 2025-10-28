'use client';

import { Brand } from '@/types';
import { useState, useEffect, useRef } from 'react';

interface BrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (brandData: Partial<Brand>) => Promise<void>;
  brand?: Brand | null;
}

type FillMode = 'manual' | 'ai' | 'upload';

interface UploadedFile {
  name: string;
  content: string;
  type: string;
  size: number;
}

export default function BrandModal({ isOpen, onClose, onSave, brand }: BrandModalProps) {
  const [name, setName] = useState('');
  const [brandDetails, setBrandDetails] = useState('');
  const [brandGuidelines, setBrandGuidelines] = useState('');
  const [copywritingStyleGuide, setCopywritingStyleGuide] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New states for AI and upload features
  const [fillMode, setFillMode] = useState<FillMode>('manual');
  const [aiUrl, setAiUrl] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (brand) {
      setName(brand.name);
      setBrandDetails(brand.brand_details || '');
      setBrandGuidelines(brand.brand_guidelines || '');
      setCopywritingStyleGuide(brand.copywriting_style_guide || '');
      setWebsiteUrl(brand.website_url || '');
      setFillMode('manual');
    } else {
      setName('');
      setBrandDetails('');
      setBrandGuidelines('');
      setCopywritingStyleGuide('');
      setWebsiteUrl('');
      setFillMode('manual');
    }
    setError('');
    setAiError('');
    setAiUrl('');
    setUploadedFiles([]);
  }, [brand, isOpen]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setAiError(`File ${file.name} is too large. Maximum size is 5MB.`);
        continue;
      }

      try {
        const content = await readFileAsText(file);
        newFiles.push({
          name: file.name,
          content,
          type: file.type,
          size: file.size,
        });
      } catch (error) {
        console.error('Error reading file:', error);
        setAiError(`Failed to read file ${file.name}`);
      }
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  // Helper to read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else if (result instanceof ArrayBuffer) {
          // Convert ArrayBuffer to base64 string
          const base64 = btoa(
            new Uint8Array(result).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          );
          resolve(base64);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = reject;
      
      // Try to read as text first
      if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  // Remove uploaded file
  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle AI extraction
  const handleAiExtract = async () => {
    setAiError('');

    if (!aiUrl && uploadedFiles.length === 0) {
      setAiError('Please enter a URL or upload files to extract brand information.');
      return;
    }

    setAiLoading(true);

    try {
      const response = await fetch('/api/brands/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: aiUrl || undefined,
          files: uploadedFiles,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract brand information');
      }

      const { brandInfo } = data;

      // Pre-fill the form fields
      setName(brandInfo.name || '');
      setBrandDetails(brandInfo.brand_details || '');
      setBrandGuidelines(brandInfo.brand_guidelines || '');
      setCopywritingStyleGuide(brandInfo.copywriting_style_guide || '');
      if (brandInfo.website_url) {
        setWebsiteUrl(brandInfo.website_url);
      }

      // Switch back to manual mode so user can review/edit
      setFillMode('manual');
      setAiError('');
    } catch (error) {
      console.error('AI extraction error:', error);
      setAiError(error instanceof Error ? error.message : 'Failed to extract brand information');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Brand name is required');
      return;
    }

    setLoading(true);

    try {
      await onSave({
        name: name.trim(),
        brand_details: brandDetails.trim(),
        brand_guidelines: brandGuidelines.trim(),
        copywriting_style_guide: copywritingStyleGuide.trim(),
        website_url: websiteUrl.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save brand');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {brand ? 'Edit Brand' : 'Create New Brand'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Fill Mode Selection */}
          {!brand && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                How would you like to create your brand?
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFillMode('manual')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    fillMode === 'manual'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">✍️</div>
                    <div className="font-medium text-gray-800 dark:text-gray-200">Manual Entry</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fill out each field</div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFillMode('upload')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    fillMode === 'upload'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">📄</div>
                    <div className="font-medium text-gray-800 dark:text-gray-200">Upload Files</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Brand docs, PDFs</div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFillMode('ai')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    fillMode === 'ai'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">🤖</div>
                    <div className="font-medium text-gray-800 dark:text-gray-200">AI Extract</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">From URL & files</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* AI/Upload Mode UI */}
          {(fillMode === 'ai' || fillMode === 'upload') && !brand && (
            <div className="space-y-4 p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/10">
              <div className="flex items-start gap-2">
                <div className="text-blue-600 dark:text-blue-400 mt-1">ℹ️</div>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  AI will analyze your website and/or uploaded documents to automatically extract brand information.
                </p>
              </div>

              {/* URL Input */}
              <div>
                <label htmlFor="aiUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Website URL (optional)
                </label>
                <input
                  id="aiUrl"
                  type="url"
                  value={aiUrl}
                  onChange={(e) => setAiUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://www.yourbrand.com"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Documents (optional)
                </label>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.md,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xl">📎</span>
                      <span className="font-medium">Click to upload files</span>
                    </div>
                    <div className="text-xs mt-1">TXT, MD, PDF, DOC, DOCX (Max 5MB each)</div>
                  </button>

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-sm">📄</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                              {file.name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({Math.round(file.size / 1024)}KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-2"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Extract Button */}
              <button
                type="button"
                onClick={handleAiExtract}
                disabled={aiLoading || (!aiUrl && uploadedFiles.length === 0)}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {aiLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⚙️</span>
                    Extracting brand information...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>✨</span>
                    Extract Brand Information with AI
                  </span>
                )}
              </button>

              {aiError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {aiError}
                </div>
              )}
            </div>
          )}

          {/* Manual Entry Fields */}
          {fillMode === 'manual' && (
            <>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Acme Co."
                />
              </div>

              <div>
                <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Website URL
                </label>
                <input
                  id="websiteUrl"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://www.example.com"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Used to search for product information when AI mentions products</p>
              </div>

              <div>
                <label htmlFor="brandDetails" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Brand Details
                </label>
                <textarea
                  id="brandDetails"
                  value={brandDetails}
                  onChange={(e) => setBrandDetails(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Describe your brand, products, target audience, mission, etc."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1-2 paragraphs recommended</p>
              </div>

              <div>
                <label htmlFor="brandGuidelines" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Brand Guidelines
                </label>
                <textarea
                  id="brandGuidelines"
                  value={brandGuidelines}
                  onChange={(e) => setBrandGuidelines(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Brand voice, tone, values, things to avoid, etc."
                />
              </div>

              <div>
                <label htmlFor="styleGuide" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Copywriting Style Guide
                </label>
                <textarea
                  id="styleGuide"
                  value={copywritingStyleGuide}
                  onChange={(e) => setCopywritingStyleGuide(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Writing style preferences, formatting guidelines, example phrases, etc."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1-2 paragraphs recommended</p>
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : brand ? 'Update Brand' : 'Create Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


