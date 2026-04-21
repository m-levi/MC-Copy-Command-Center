'use client';

import React, { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Brand, BrandVoiceData } from '@/types';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

type Step = 'input' | 'analyzing' | 'refine';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  voiceData?: BrandVoiceData | null;
  sampleEmails?: { product?: string; content?: string };
}

const FEEDBACK_SUGGESTIONS = [
  "Too formal — make it warmer",
  "Too casual — more professional",
  "More confident, less hedging",
  "We never use exclamation points",
  "This headline is perfect, more like this",
  "Add more energy/excitement",
  "Tone down the salesy language",
  "This is exactly right! Save it.",
];

// Helper to strip JSON code blocks from AI messages (keep email samples separate)
function cleanMessageContent(content: string): string {
  // Remove JSON code blocks only
  let cleaned = content.replace(/```json[\s\S]*?```/g, '');
  // Remove email code blocks (we'll render them separately)
  cleaned = cleaned.replace(/```email_product[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/```email_content[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/```email[\s\S]*?```/g, '');
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

// Extract email samples from AI response
function extractEmailSamples(content: string): { product?: string; content?: string; generic?: string } {
  const productMatch = content.match(/```email_product\s*([\s\S]*?)```/);
  const contentMatch = content.match(/```email_content\s*([\s\S]*?)```/);
  const genericMatch = content.match(/```email\s*([\s\S]*?)```/);
  
  return {
    product: productMatch ? productMatch[1].trim() : undefined,
    content: contentMatch ? contentMatch[1].trim() : undefined,
    generic: genericMatch ? genericMatch[1].trim() : undefined,
  };
}

// Component to render an email sample nicely - matches standard email format
function EmailSampleCard({ title, content, icon }: { title: string; content: string; icon: string }) {
  // Parse the standard email format into sections
  const parseSections = (text: string) => {
    const sections: Array<{type: 'section', name: string, content: string[]}> = [];
    let currentSection: {type: 'section', name: string, content: string[]} | null = null;
    
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Check for section headers like **HERO SECTION:** or **Section Title:** Something
      const sectionMatch = trimmed.match(/^\*\*([^*]+)\*\*:?\s*(.*)$/);
      if (sectionMatch) {
        const sectionName = sectionMatch[1].trim();
        const remainder = sectionMatch[2].trim();
        
        // Check if this is a main section (HERO, Section Title, FINAL CTA)
        if (sectionName.toLowerCase().includes('section') || 
            sectionName.toLowerCase().includes('hero') || 
            sectionName.toLowerCase().includes('cta')) {
          // Save previous section
          if (currentSection) {
            sections.push(currentSection);
          }
          currentSection = { type: 'section', name: sectionName, content: [] };
          if (remainder) {
            currentSection.content.push(remainder);
          }
        } else {
          // This is a field within a section (Headline, Sub-headline, etc.)
          if (currentSection) {
            currentSection.content.push(trimmed);
          }
        }
      } else if (currentSection) {
        currentSection.content.push(trimmed);
      }
    }
    
    // Push last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  };

  const sections = parseSections(content);

  const renderField = (line: string, index: number) => {
    // Field with bold label: **Headline:** text or - **Headline:** text
    const boldFieldMatch = line.match(/^[-•]?\s*\*\*([^*]+)\*\*:?\s*(.*)$/);
    if (boldFieldMatch) {
      const [, label, value] = boldFieldMatch;
      const labelLower = label.toLowerCase();
      const isHeadline = labelLower.includes('headline');
      const isCTA = labelLower.includes('cta') || labelLower.includes('call to action') || labelLower.includes('button');
      const isSubheadline = labelLower.includes('sub');
      
      if (isCTA && value) {
        return (
          <div key={index} className="mt-2">
            <span className="inline-block px-4 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-md">
              {value}
            </span>
          </div>
        );
      }
      if (isHeadline && !isSubheadline && value) {
        return <p key={index} className="font-semibold text-gray-900 dark:text-white text-sm">{value}</p>;
      }
      if (isSubheadline && value) {
        return <p key={index} className="text-gray-600 dark:text-gray-400 text-xs">{value}</p>;
      }
      if (value) {
        return <p key={index} className="text-gray-600 dark:text-gray-400 text-xs">{value}</p>;
      }
      return null;
    }
    
    // Simple field: - Headline: text
    const simpleFieldMatch = line.match(/^[-•]?\s*(Headline|Sub-headline|Subhead|Body|CTA|Call to Action Button|Content|Quote|Attribution):\s*(.*)$/i);
    if (simpleFieldMatch) {
      const [, label, value] = simpleFieldMatch;
      const labelLower = label.toLowerCase();
      const isHeadline = labelLower.includes('headline') && !labelLower.includes('sub');
      const isCTA = labelLower.includes('cta') || labelLower.includes('call to action') || labelLower.includes('button');
      
      if (isCTA && value) {
        return (
          <div key={index} className="mt-2">
            <span className="inline-block px-4 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-md">
              {value}
            </span>
          </div>
        );
      }
      if (isHeadline && value) {
        return <p key={index} className="font-semibold text-gray-900 dark:text-white text-sm">{value}</p>;
      }
      if (value) {
        return <p key={index} className="text-gray-600 dark:text-gray-400 text-xs">{value}</p>;
      }
      return null;
    }
    
    // Bullet points
    if (line.startsWith('•') || line.startsWith('-')) {
      const bulletContent = line.replace(/^[-•]\s*/, '');
      return (
        <p key={index} className="text-gray-600 dark:text-gray-400 text-xs pl-3 before:content-['•'] before:mr-2 before:text-violet-500">
          {bulletContent}
        </p>
      );
    }
    
    // Regular text
    return <p key={index} className="text-gray-600 dark:text-gray-400 text-xs">{line}</p>;
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
      <div className="px-3 py-2 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <span>{icon}</span>
        <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">{title}</span>
      </div>
      <div className="p-3 space-y-4">
        {sections.length > 0 ? (
          sections.map((section, i) => (
            <div key={i} className="space-y-1.5">
              {/* Section header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-3 bg-violet-500 rounded-full"></div>
                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                  {section.name.replace(/section|:/gi, '').trim()}
                </span>
              </div>
              {/* Section content */}
              <div className="pl-3 border-l-2 border-gray-100 dark:border-gray-700 space-y-1">
                {section.content.map((line, j) => renderField(line, j))}
              </div>
            </div>
          ))
        ) : (
          // Fallback: just render content as-is with basic formatting
          <div className="space-y-1">
            {content.split('\n').filter(l => l.trim()).map((line, i) => renderField(line.trim(), i))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrandVoiceBuilderPage({ params }: { params: Promise<{ brandId: string }> }) {
  const resolvedParams = use(params);
  const brandId = resolvedParams.brandId;
  const router = useRouter();
  const supabase = createClient();

  // State
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('input');
  
  // Materials input
  const [materials, setMaterials] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [extractingUrl, setExtractingUrl] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; content: string }>>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Voice data
  const [voiceData, setVoiceData] = useState<BrandVoiceData | null>(null);
  const [sampleEmails, setSampleEmails] = useState<{ product?: string; content?: string }>({});
  
  // Chat refinement
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load brand
  useEffect(() => {
    loadBrand();
  }, [brandId]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input
  useEffect(() => {
    if (step === 'refine' && !sending) {
      inputRef.current?.focus();
    }
  }, [step, sending, messages]);

  const loadBrand = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (error) throw error;
      setBrand(data);
      
      // If brand already has voice, go to refine mode
      if (data.brand_voice) {
        setVoiceData(data.brand_voice as BrandVoiceData);
        setStep('refine');
        setMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Welcome back! Here's ${data.name}'s current voice profile. Want to refine it? Give me feedback like "too formal" or "we never say X" and I'll adjust.`,
          voiceData: data.brand_voice as BrandVoiceData,
        }]);
      }
    } catch (error) {
      logger.error('Error loading brand:', error);
      toast.error('Failed to load brand');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

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

      // Append extracted content to materials
      const extractedContent = `
=== Extracted from ${urlInput} ===
${data.content || data.brandInfo?.brand_details || ''}
`;
      setMaterials(prev => prev + (prev ? '\n\n' : '') + extractedContent.trim());
      setUrlInput('');
      toast.success('Content extracted!');
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
    
    setUploadingFile(true);
    
    try {
      for (const file of Array.from(files)) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }
        
        let content = '';
        
        if (fileExtension === 'txt' || fileExtension === 'md') {
          // Read text files directly
          content = await file.text();
        } else if (fileExtension === 'pdf') {
          // For PDF, we'll need to extract text server-side or use a library
          // For now, let's try to read it as text (won't work well for binary PDFs)
          toast.error('PDF support coming soon. Please copy/paste the text.');
          continue;
        } else if (fileExtension === 'docx') {
          // For DOCX, we'd need a library like mammoth
          toast.error('DOCX support coming soon. Please copy/paste the text.');
          continue;
        } else {
          // Try to read as text
          try {
            content = await file.text();
          } catch {
            toast.error(`Cannot read ${file.name}. Try .txt or .md files.`);
            continue;
          }
        }
        
        if (content.trim()) {
          setUploadedFiles(prev => [...prev, { name: file.name, content: content.trim() }]);
          
          // Append to materials
          const fileContent = `
=== From ${file.name} ===
${content.trim()}
`;
          setMaterials(prev => prev + (prev ? '\n\n' : '') + fileContent.trim());
          toast.success(`${file.name} added!`);
        }
      }
    } catch (error) {
      toast.error('Failed to read file');
    } finally {
      setUploadingFile(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
    // Remove from materials
    const pattern = new RegExp(`\\n*=== From ${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} ===\\n[\\s\\S]*?(?=\\n=== |$)`, 'g');
    setMaterials(prev => prev.replace(pattern, '').trim());
  };

  // Analyze materials
  const handleAnalyze = async () => {
    if (!materials.trim() || materials.trim().length < 100) {
      toast.error('Please add more brand materials (at least 100 characters)');
      return;
    }
    
    if (!brand) return;
    
    setStep('analyzing');
    
    try {
      const response = await fetch('/api/brands/voice-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          brandName: brand.name,
          materials: materials.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error);

      setVoiceData(data.voiceData);
      setSampleEmails(data.sampleEmails || {});
      
      // Start refinement chat
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        voiceData: data.voiceData,
        sampleEmails: data.sampleEmails,
      }]);
      
      setStep('refine');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analysis failed');
      setStep('input');
    }
  };

  // Send feedback
  const sendFeedback = async (feedbackText?: string) => {
    const feedback = feedbackText || input.trim();
    if (!feedback || !brand || !voiceData) return;
    
    // Check if user wants to save
    if (feedback.toLowerCase().includes('save') || feedback.toLowerCase().includes('perfect') || feedback.toLowerCase().includes('exactly right')) {
      handleSave();
      return;
    }
    
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: feedback,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await fetch('/api/brands/voice-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refine',
          brandName: brand.name,
          currentVoice: voiceData,
          materials,
          feedback,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        voiceData: data.voiceData,
        sampleEmails: data.sampleEmails,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      if (data.voiceData) {
        setVoiceData(data.voiceData);
      }
      if (data.sampleEmails) {
        setSampleEmails(data.sampleEmails);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refine');
    } finally {
      setSending(false);
    }
  };

  // Generate additional sample
  const generateSample = async (scenario: string) => {
    if (!voiceData) return;
    
    setSending(true);
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: `Show me a ${scenario} email`,
    }]);

    try {
      const response = await fetch('/api/brands/voice-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_sample',
          voiceData,
          scenario,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error);

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Here's a ${scenario} email in your voice:\n\n\`\`\`email\n${data.email}\n\`\`\`\n\nHow does this feel? Tell me what to adjust.`,
      }]);
    } catch (error) {
      toast.error('Failed to generate sample');
    } finally {
      setSending(false);
    }
  };

  // Save voice
  const handleSave = async () => {
    if (!voiceData) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/brands/voice-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          brandId,
          voiceData,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error);

      toast.success('Brand voice saved!');
      
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `✅ **Voice profile saved!** ${brand?.name}'s emails will now use this voice.\n\nYou can come back here anytime to refine it further.`,
        voiceData,
      }]);
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendFeedback();
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 animate-pulse" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Brand not found</p>
          <button onClick={() => router.push('/')} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/brands/${brandId}`)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900 dark:text-white">Brand Voice Builder</h1>
                <p className="text-xs text-gray-500">{brand.name}</p>
              </div>
            </div>
          </div>

          {voiceData && step === 'refine' && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              Save Voice Profile
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex">
        {/* ==================== INPUT STEP ==================== */}
        {step === 'input' && (
          <div className="flex-1 max-w-3xl mx-auto px-4 py-8">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/20">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Paste Your Brand Materials</h2>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  I'll analyze your copy to extract your voice patterns, vocabulary, and personality — then create a voice profile with sample emails.
                </p>
              </div>

              {/* URL Extraction & File Upload Row */}
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                {/* URL Extraction */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Extract from URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://yourbrand.com"
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleExtractUrl()}
                    />
                    <button
                      onClick={handleExtractUrl}
                      disabled={!urlInput.trim() || extractingUrl}
                      className="px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {extractingUrl ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Upload files</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.text"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-dashed rounded-lg text-sm text-gray-500 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {uploadingFile ? (
                      <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    )}
                    <span>.txt, .md files</span>
                  </button>
                </div>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center gap-2 px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-xs"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{file.name}</span>
                        <button
                          onClick={() => removeFile(file.name)}
                          className="hover:text-red-600 dark:hover:text-red-400"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Main materials input */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Brand Materials <span className="text-violet-600">*</span>
                </label>
                <textarea
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  placeholder={`Paste your brand copy here:

• Homepage copy
• About page
• Product descriptions
• Email examples (especially good ones!)
• Style guide or brand guidelines
• Social media posts that feel "right"

The more you give me, the better I can capture your voice...`}
                  rows={14}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-2">
                  {materials.length} characters • {materials.length < 100 ? 'Need at least 100 characters' : materials.length < 500 ? 'Good start, more is better' : materials.length < 1500 ? 'Great amount!' : 'Excellent! Lots to work with.'}
                </p>
              </div>

              {/* Tips */}
              <div className="bg-violet-50 dark:bg-violet-950/20 rounded-xl p-4 mb-6">
                <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-2">💡 Best materials to include:</p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• <strong>Homepage & About</strong> — your core messaging</li>
                  <li>• <strong>Best-performing emails</strong> — proven copy that converts</li>
                  <li>• <strong>Product descriptions</strong> — how you talk about what you sell</li>
                  <li>• <strong>Customer testimonials</strong> — how customers describe you</li>
                </ul>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={materials.trim().length < 100}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Analyze & Build Voice Profile
              </button>
            </div>
          </div>
        )}

        {/* ==================== ANALYZING STEP ==================== */}
        {step === 'analyzing' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Analyzing your brand...</h3>
              <p className="text-gray-500 text-sm">Extracting voice patterns, vocabulary, and personality</p>
              <div className="mt-4 flex justify-center gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== REFINE STEP ==================== */}
        {step === 'refine' && (
          <>
            {/* Main chat layout with sticky input */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Scrollable chat messages */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' ? (
                        <div className="flex gap-3 max-w-[90%]">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                          </div>
                          <div className="space-y-3 flex-1">
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown
                                  components={{
                                    code: ({ className, children, ...props }: any) => {
                                      return <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs" {...props}>{children}</code>;
                                    },
                                    p: ({ children }) => <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                    strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                                    ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 text-sm text-gray-700 dark:text-gray-300">{children}</ul>,
                                    li: ({ children }) => <li className="text-sm">{children}</li>,
                                    h2: ({ children }) => <h2 className="text-base font-bold text-gray-900 dark:text-white mt-4 mb-2">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-3 mb-1">{children}</h3>,
                                  }}
                                >
                                  {cleanMessageContent(msg.content)}
                                </ReactMarkdown>
                              </div>
                            </div>
                            
                            {/* Voice Profile Card */}
                            {msg.voiceData && (
                              <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200 dark:border-violet-800/50 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-violet-600 dark:text-violet-400 text-lg">🎙️</span>
                                  <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">Voice Profile</span>
                                </div>
                                
                                {/* Brand Summary */}
                                {msg.voiceData.brand_summary && (
                                  <p className="text-xs text-gray-500">{msg.voiceData.brand_summary}</p>
                                )}
                                
                                {/* Voice Description */}
                                <p className="text-sm font-medium text-gray-900 dark:text-white italic">"{msg.voiceData.voice_description}"</p>
                                
                                {/* We Sound */}
                                {msg.voiceData.we_sound && msg.voiceData.we_sound.length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase mb-1.5">We Sound</p>
                                    <div className="space-y-1">
                                      {msg.voiceData.we_sound.map((t, i) => (
                                        <div key={i} className="text-xs">
                                          <span className="font-medium text-gray-900 dark:text-white">{t.trait}</span>
                                          <span className="text-gray-500"> — {t.explanation}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* We Never Sound */}
                                {msg.voiceData.we_never_sound && msg.voiceData.we_never_sound.length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase mb-1.5">We Never Sound</p>
                                    <div className="flex flex-wrap gap-1">
                                      {msg.voiceData.we_never_sound.map((s, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">{s}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Vocabulary */}
                                {msg.voiceData.vocabulary && (
                                  <div className="grid grid-cols-2 gap-3">
                                    {msg.voiceData.vocabulary.use && msg.voiceData.vocabulary.use.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase mb-1">✓ Use</p>
                                        <div className="flex flex-wrap gap-1">
                                          {msg.voiceData.vocabulary.use.slice(0, 6).map((w, i) => (
                                            <span key={i} className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-[10px]">{w}</span>
                                          ))}
                                          {msg.voiceData.vocabulary.use.length > 6 && (
                                            <span className="text-[10px] text-gray-400">+{msg.voiceData.vocabulary.use.length - 6} more</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {msg.voiceData.vocabulary.avoid && msg.voiceData.vocabulary.avoid.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase mb-1">✗ Avoid</p>
                                        <div className="flex flex-wrap gap-1">
                                          {msg.voiceData.vocabulary.avoid.slice(0, 6).map((w, i) => (
                                            <span key={i} className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-[10px] line-through">{w}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Good/Bad Examples */}
                                {(msg.voiceData.good_copy_example || msg.voiceData.bad_copy_example) && (
                                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-violet-200 dark:border-violet-800/50">
                                    {msg.voiceData.good_copy_example && (
                                      <div>
                                        <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase mb-1">✓ Good Copy</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 italic">"{msg.voiceData.good_copy_example}"</p>
                                      </div>
                                    )}
                                    {msg.voiceData.bad_copy_example && (
                                      <div>
                                        <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase mb-1">✗ We'd Never Say</p>
                                        <p className="text-xs text-gray-400 italic line-through">"{msg.voiceData.bad_copy_example}"</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Email Samples */}
                            {(() => {
                              const samples = extractEmailSamples(msg.content);
                              if (!samples.product && !samples.content && !samples.generic) return null;
                              return (
                                <div className="space-y-3">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sample Emails</p>
                                  <div className="grid md:grid-cols-2 gap-3">
                                    {samples.product && (
                                      <EmailSampleCard 
                                        title="Product Email" 
                                        content={samples.product} 
                                        icon="🛍️" 
                                      />
                                    )}
                                    {samples.content && (
                                      <EmailSampleCard 
                                        title="Content Email" 
                                        content={samples.content} 
                                        icon="📚" 
                                      />
                                    )}
                                    {samples.generic && !samples.product && !samples.content && (
                                      <EmailSampleCard 
                                        title="Sample Email" 
                                        content={samples.generic} 
                                        icon="📧" 
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-[75%] bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-2xl rounded-tr-md px-4 py-3">
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                              <div key={i} className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feedback suggestions */}
                  {messages.length > 0 && !sending && (
                    <div className="ml-11 space-y-2">
                      <p className="text-xs text-gray-400 mb-2">Quick feedback:</p>
                      <div className="flex flex-wrap gap-2">
                        {FEEDBACK_SUGGESTIONS.map((suggestion, i) => (
                          <button
                            key={i}
                            onClick={() => sendFeedback(suggestion)}
                            className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                      
                      {/* Sample email buttons */}
                      {voiceData && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => generateSample('welcome email')}
                            className="px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-xs font-medium hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                          >
                            📧 Welcome email
                          </button>
                          <button
                            onClick={() => generateSample('product launch')}
                            className="px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-xs font-medium hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                          >
                            🚀 Product launch
                          </button>
                          <button
                            onClick={() => generateSample('flash sale')}
                            className="px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-xs font-medium hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                          >
                            ⚡ Flash sale
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Sticky Input Area - Matches Main ChatInput */}
              <div className="sticky bottom-0 px-4 sm:px-6 lg:px-8 pt-0 pb-4 sm:pb-5 bg-transparent">
                <div className="max-w-5xl mx-auto relative">
                  {/* Main Input Card - Same styling as ChatInput */}
                  <div 
                    className={cn(
                      "relative bg-white dark:bg-gray-800 border rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50",
                      "border-gray-200 dark:border-gray-700"
                    )}
                  >
                    <div className="px-4 sm:px-6 pt-4 pb-2">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value);
                          requestAnimationFrame(() => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          });
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder='Give feedback like "too formal" or "we never say X"...'
                        disabled={sending}
                        rows={1}
                        className="w-full text-[15px] sm:text-base leading-relaxed bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0 focus:border-none outline-none resize-none max-h-32 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                      />
                    </div>
                    
                    {/* Bottom Controls Bar - Same as ChatInput */}
                    <div className="flex items-center justify-between px-3 sm:px-4 pb-3">
                      {/* Left: Options Pill */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-gray-50 dark:bg-gray-800/60 rounded-full px-1 py-0.5 border border-gray-100 dark:border-gray-700/50">
                          {/* Model indicator */}
                          <div className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            <span>Opus 4.5</span>
                          </div>
                          
                          {/* Sample email dropdown */}
                          {voiceData && (
                            <>
                              <span className="text-gray-300 dark:text-gray-600 text-[8px] mx-0.5">•</span>
                              <div className="relative group">
                                <button 
                                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                  title="Generate sample email"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span>Sample</span>
                                </button>
                                <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block z-50">
                                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[140px] p-1 animate-in fade-in zoom-in-95 duration-75 origin-bottom-left">
                                    {['Welcome email', 'Product launch', 'Flash sale', 'Newsletter', 'Abandoned cart'].map(scenario => (
                                      <button
                                        key={scenario}
                                        onClick={() => generateSample(scenario)}
                                        disabled={sending}
                                        className="w-full px-2.5 py-1.5 text-left text-[11px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md disabled:opacity-50 cursor-pointer"
                                      >
                                        {scenario}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Send button */}
                      <div className="flex items-center gap-1">
                        {sending ? (
                          <button
                            onClick={() => {}}
                            className="flex items-center justify-center w-7 h-7 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer"
                            title="Generating..."
                          >
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => sendFeedback()}
                            disabled={!input.trim() || sending}
                            className={cn(
                              "flex items-center justify-center w-7 h-7 rounded-full",
                              !input.trim() || sending
                                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                : "text-white bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 cursor-pointer"
                            )}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Voice Preview Sidebar */}
            {voiceData && (
              <div className="hidden xl:flex w-80 flex-col border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Current Voice Profile</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Brand Summary */}
                  {voiceData.brand_summary && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Brand</p>
                      <p className="text-sm text-gray-900 dark:text-white">{voiceData.brand_summary}</p>
                    </div>
                  )}

                  {/* Voice Description */}
                  <div>
                    <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide mb-1">Voice</p>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{voiceData.voice_description}</p>
                  </div>

                  {/* We Sound */}
                  {voiceData.we_sound?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-2">We Sound</p>
                      <div className="space-y-1.5">
                        {voiceData.we_sound.map((t, i) => (
                          <div key={i}>
                            <span className="text-xs font-medium text-gray-900 dark:text-white">{t.trait}</span>
                            <span className="text-xs text-gray-500"> — {t.explanation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* We Never Sound */}
                  {voiceData.we_never_sound?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-2">We Never Sound</p>
                      <div className="flex flex-wrap gap-1">
                        {voiceData.we_never_sound.map((s, i) => (
                          <span key={i} className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vocabulary */}
                  {voiceData.vocabulary && (
                    <div>
                      <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-2">Vocabulary</p>
                      {voiceData.vocabulary.use?.length > 0 && (
                        <div className="mb-2">
                          <p className="text-[10px] text-gray-400 mb-1">Use</p>
                          <div className="flex flex-wrap gap-1">
                            {voiceData.vocabulary.use.slice(0, 8).map((w, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-[10px]">{w}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {voiceData.vocabulary.avoid?.length > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-400 mb-1">Avoid</p>
                          <div className="flex flex-wrap gap-1">
                            {voiceData.vocabulary.avoid.slice(0, 8).map((w, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-[10px] line-through">{w}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audience */}
                  {voiceData.audience && (
                    <div>
                      <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide mb-1">Audience</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{voiceData.audience}</p>
                    </div>
                  )}

                  {/* Good Example */}
                  {voiceData.good_copy_example && (
                    <div>
                      <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-1">Good Copy</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic bg-green-50 dark:bg-green-950/20 rounded-lg p-2">
                        "{voiceData.good_copy_example}"
                      </p>
                    </div>
                  )}

                  {/* Bad Example */}
                  {voiceData.bad_copy_example && (
                    <div>
                      <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-1">We'd Never Say</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic line-through opacity-60 bg-red-50 dark:bg-red-950/20 rounded-lg p-2">
                        "{voiceData.bad_copy_example}"
                      </p>
                    </div>
                  )}

                  {/* Patterns */}
                  {voiceData.patterns && (
                    <div>
                      <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide mb-1">Patterns</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{voiceData.patterns}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
