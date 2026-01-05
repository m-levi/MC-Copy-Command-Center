'use client';

import React, { useState, useCallback, useRef } from 'react';
import { PhaseComponentProps } from '@/types/brand-builder';
import { BuilderMessage, getNextPhase } from '@/types/brand-builder';
import { BuilderChat } from '../shared/BuilderChat';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Upload,
  Link as LinkIcon,
  FileText,
  X,
  Zap,
  RefreshCw,
  ArrowRight,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ResearchPhase({
  brandId,
  brandName,
  state,
  onStateChange,
  onPhaseComplete,
}: PhaseComponentProps) {
  const [urlInput, setUrlInput] = useState('');
  const [extractingUrl, setExtractingUrl] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcome message if empty
  React.useEffect(() => {
    if (state.conversationHistory.length === 0) {
      const welcomeMessage: BuilderMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Let's build a complete brand profile for **${brandName}**! I'll guide you through creating a clear brand overview, defining your target customer, and developing a distinctive copywriting style.

**To get started, share any brand materials you have:**
- Upload documents (transcripts, brand guides, marketing materials)
- Paste URLs from your website or existing content
- Or just tell me about your brand in your own words

The more context you give me, the better I can understand your brand's unique voice and personality.`,
        phase: 'research',
        createdAt: new Date().toISOString(),
      };

      onStateChange({
        ...state,
        conversationHistory: [welcomeMessage],
      });
    }
  }, []);

  // Extract content from URL
  const handleExtractUrl = async () => {
    if (!urlInput.trim()) return;

    setExtractingUrl(true);
    try {
      const response = await fetch('/api/brands/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to extract');

      // Add user message about URL
      const userMessage: BuilderMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: `I've added content from: ${urlInput}`,
        phase: 'research',
        createdAt: new Date().toISOString(),
      };

      // Send to AI for analysis
      await sendToAI([...state.conversationHistory, userMessage], data.content || data.brandInfo?.brand_details);

      setUrlInput('');
      toast.success('Content extracted and analyzed!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to extract URL');
    } finally {
      setExtractingUrl(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: Array<{ name: string; content: string }> = [];

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'txt' || ext === 'md') {
        const content = await file.text();
        if (content.trim()) {
          newFiles.push({ name: file.name, content: content.trim() });
        }
      } else if (ext === 'pdf') {
        // For PDFs, we'd need to extract text - for now, add to documents
        toast.error(`PDF support coming soon. Please paste text content instead.`);
        continue;
      } else {
        toast.error(`${file.name}: Only .txt and .md files supported`);
        continue;
      }
    }

    if (newFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...newFiles]);

      // Create user message about uploads
      const fileNames = newFiles.map((f) => f.name).join(', ');
      const userMessage: BuilderMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: `I've uploaded: ${fileNames}`,
        phase: 'research',
        createdAt: new Date().toISOString(),
      };

      // Combine all file content
      const combinedContent = newFiles.map((f) => `--- ${f.name} ---\n${f.content}`).join('\n\n');

      await sendToAI([...state.conversationHistory, userMessage], combinedContent);
      toast.success(`${newFiles.length} file(s) uploaded and analyzed!`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove uploaded file
  const removeFile = (fileName: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  // Send message to AI
  const sendToAI = async (history: BuilderMessage[], additionalContext?: string) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/brand-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          action: 'continue',
          phase: 'research',
          conversationHistory: history,
          additionalContext,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get response');

      const assistantMessage: BuilderMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        phase: 'research',
        metadata: data.metadata,
        createdAt: new Date().toISOString(),
      };

      onStateChange({
        ...state,
        conversationHistory: [...history, assistantMessage],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user message
  const handleSendMessage = async (message: string) => {
    const userMessage: BuilderMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      phase: 'research',
      createdAt: new Date().toISOString(),
    };

    const newHistory = [...state.conversationHistory, userMessage];
    onStateChange({
      ...state,
      conversationHistory: newHistory,
    });

    await sendToAI(newHistory);
  };

  // Handle proceeding to next phase
  const handleProceed = () => {
    onPhaseComplete('research', '');
  };

  const hasContent = state.conversationHistory.length > 1 || uploadedFiles.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Upload Bar */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 flex-wrap">
            {/* URL Input */}
            <div className="flex-1 min-w-[200px]">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste a URL to extract..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    onKeyDown={(e) => e.key === 'Enter' && handleExtractUrl()}
                  />
                </div>
                <Button
                  onClick={handleExtractUrl}
                  disabled={!urlInput.trim() || extractingUrl}
                  variant="outline"
                  size="sm"
                  className="px-4"
                >
                  {extractingUrl ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Files
            </Button>

            {/* Proceed Button */}
            {hasContent && (
              <Button
                onClick={handleProceed}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white gap-2"
              >
                Continue to Overview
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{file.name}</span>
                  <button
                    onClick={() => removeFile(file.name)}
                    className="hover:text-red-600 dark:hover:text-red-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      <BuilderChat
        messages={state.conversationHistory}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        placeholder="Tell me about your brand, or ask me anything..."
        quickActions={[
          { label: "I've shared everything I have", action: "I've shared all the brand materials I have. Let's move forward with what we have." },
          { label: 'What else do you need?', action: 'What other information would help you understand my brand better?' },
        ]}
      />
    </div>
  );
}
