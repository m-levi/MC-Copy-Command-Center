'use client';

import React, { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Brand, BrandVoiceData } from '@/types';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Mic,
  Sparkles,
  Upload,
  Link as LinkIcon,
  FileText,
  Zap,
  Check,
  X,
  Send,
  RefreshCw,
  Save,
  CheckCircle2,
  XCircle,
  Volume2,
  Target,
  Quote,
  Lightbulb,
  Mail,
  ShoppingBag,
  Megaphone,
  Clock,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Step = 'input' | 'analyzing' | 'refine';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  voiceData?: BrandVoiceData | null;
  sampleEmails?: { product?: string; content?: string };
}

const FEEDBACK_SUGGESTIONS = [
  "Make it warmer and friendlier",
  "More confident, less hedging",
  "Too formal — more casual please",
  "We never use exclamation points",
  "Add more energy and excitement",
  "Tone down the salesy language",
  "Perfect! Save this voice.",
];

const EMAIL_SCENARIOS = [
  { id: 'welcome', label: 'Welcome Email', icon: Heart },
  { id: 'product-launch', label: 'Product Launch', icon: ShoppingBag },
  { id: 'flash-sale', label: 'Flash Sale', icon: Zap },
  { id: 'newsletter', label: 'Newsletter', icon: Mail },
  { id: 'abandoned-cart', label: 'Abandoned Cart', icon: Clock },
];

// Helper to strip JSON code blocks from AI messages
function cleanMessageContent(content: string): string {
  let cleaned = content.replace(/```json[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/```email_product[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/```email_content[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/```email[\s\S]*?```/g, '');
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

// Email Sample Card Component
function EmailSampleCard({ title, content, icon }: { title: string; content: string; icon: string }) {
  const parseSections = (text: string) => {
    const sections: Array<{type: 'section', name: string, content: string[]}> = [];
    let currentSection: {type: 'section', name: string, content: string[]} | null = null;
    
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const sectionMatch = trimmed.match(/^\*\*([^*]+)\*\*:?\s*(.*)$/);
      if (sectionMatch) {
        const sectionName = sectionMatch[1].trim();
        const remainder = sectionMatch[2].trim();
        
        if (sectionName.toLowerCase().includes('section') || 
            sectionName.toLowerCase().includes('hero') || 
            sectionName.toLowerCase().includes('cta')) {
          if (currentSection) sections.push(currentSection);
          currentSection = { type: 'section', name: sectionName, content: [] };
          if (remainder) currentSection.content.push(remainder);
        } else if (currentSection) {
          currentSection.content.push(trimmed);
        }
      } else if (currentSection) {
        currentSection.content.push(trimmed);
      }
    }
    
    if (currentSection) sections.push(currentSection);
    return sections;
  };

  const sections = parseSections(content);

  const renderField = (line: string, index: number) => {
    const boldFieldMatch = line.match(/^[-•]?\s*\*\*([^*]+)\*\*:?\s*(.*)$/);
    if (boldFieldMatch) {
      const [, label, value] = boldFieldMatch;
      const labelLower = label.toLowerCase();
      const isHeadline = labelLower.includes('headline');
      const isCTA = labelLower.includes('cta') || labelLower.includes('call to action') || labelLower.includes('button');
      const isSubheadline = labelLower.includes('sub');
      
      if (isCTA && value) {
        return (
          <div key={index} className="mt-3">
            <span className="inline-block px-5 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium rounded-lg shadow-md">
              {value}
            </span>
          </div>
        );
      }
      if (isHeadline && !isSubheadline && value) {
        return <p key={index} className="font-semibold text-gray-900 dark:text-white">{value}</p>;
      }
      if (value) {
        return <p key={index} className="text-gray-600 dark:text-gray-400 text-sm">{value}</p>;
      }
      return null;
    }
    
    if (line.startsWith('•') || line.startsWith('-')) {
      const bulletContent = line.replace(/^[-•]\s*/, '');
      return (
        <p key={index} className="text-gray-600 dark:text-gray-400 text-sm pl-4 before:content-['•'] before:mr-2 before:text-violet-500">
          {bulletContent}
        </p>
      );
    }
    
    return <p key={index} className="text-gray-600 dark:text-gray-400 text-sm">{line}</p>;
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">{title}</span>
      </div>
      <div className="p-4 space-y-4">
        {sections.length > 0 ? (
          sections.map((section, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-4 bg-gradient-to-b from-violet-500 to-purple-500 rounded-full"></div>
                <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                  {section.name.replace(/section|:/gi, '').trim()}
                </span>
              </div>
              <div className="pl-4 border-l-2 border-gray-100 dark:border-gray-700 space-y-1.5">
                {section.content.map((line, j) => renderField(line, j))}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-1.5">
            {content.split('\n').filter(l => l.trim()).map((line, i) => renderField(line.trim(), i))}
          </div>
        )}
      </div>
    </div>
  );
}

// Voice Profile Card Component
function VoiceProfileCard({ voiceData, compact = false }: { voiceData: BrandVoiceData; compact?: boolean }) {
  return (
    <div className={cn(
      "bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/40 dark:via-purple-950/40 dark:to-fuchsia-950/40 border border-violet-200 dark:border-violet-800/50 rounded-2xl overflow-hidden",
      compact ? "p-4" : "p-6"
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white shadow-lg">
          <Volume2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Voice Profile</h3>
          {voiceData.brand_summary && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{voiceData.brand_summary}</p>
          )}
        </div>
      </div>
      
      {/* Voice Description */}
      <div className="mb-4 p-3 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-violet-200/50 dark:border-violet-700/50">
        <p className="text-violet-700 dark:text-violet-300 font-medium italic">
          "{voiceData.voice_description}"
        </p>
      </div>
      
      <div className={cn("space-y-4", compact && "text-sm")}>
        {/* We Sound */}
        {voiceData.we_sound && voiceData.we_sound.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">We Sound</span>
            </div>
            <div className="space-y-1.5">
              {voiceData.we_sound.slice(0, compact ? 3 : undefined).map((t, i) => (
                <div key={i} className="flex gap-2">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{t.trait}</span>
                  <span className="text-gray-500 text-sm">— {t.explanation}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* We Never Sound */}
        {voiceData.we_never_sound && voiceData.we_never_sound.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">We Never Sound</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {voiceData.we_never_sound.map((s, i) => (
                <span key={i} className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-xs font-medium">{s}</span>
              ))}
            </div>
          </div>
        )}
        
        {/* Vocabulary */}
        {voiceData.vocabulary && !compact && (
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-violet-200/50 dark:border-violet-700/50">
            {voiceData.vocabulary.use && voiceData.vocabulary.use.length > 0 && (
              <div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-2">✓ Words We Use</p>
                <div className="flex flex-wrap gap-1">
                  {voiceData.vocabulary.use.slice(0, 8).map((w, i) => (
                    <span key={i} className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded text-xs">{w}</span>
                  ))}
                </div>
              </div>
            )}
            {voiceData.vocabulary.avoid && voiceData.vocabulary.avoid.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-2">✗ Words We Avoid</p>
                <div className="flex flex-wrap gap-1">
                  {voiceData.vocabulary.avoid.slice(0, 8).map((w, i) => (
                    <span key={i} className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs line-through">{w}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Examples */}
        {(voiceData.good_copy_example || voiceData.bad_copy_example) && !compact && (
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-violet-200/50 dark:border-violet-700/50">
            {voiceData.good_copy_example && (
              <div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-2">✓ Good Copy</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-2.5">
                  "{voiceData.good_copy_example}"
                </p>
              </div>
            )}
            {voiceData.bad_copy_example && (
              <div>
                <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-2">✗ We'd Never Say</p>
                <p className="text-sm text-gray-400 italic line-through bg-red-50 dark:bg-red-950/20 rounded-lg p-2.5">
                  "{voiceData.bad_copy_example}"
                </p>
              </div>
            )}
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

  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('input');
  
  const [materials, setMaterials] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [extractingUrl, setExtractingUrl] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; content: string }>>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [voiceData, setVoiceData] = useState<BrandVoiceData | null>(null);
  const [sampleEmails, setSampleEmails] = useState<{ product?: string; content?: string }>({});
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadBrand();
  }, [brandId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

      const extractedContent = `\n=== Extracted from ${urlInput} ===\n${data.content || data.brandInfo?.brand_details || ''}`;
      setMaterials(prev => prev + (prev ? '\n\n' : '') + extractedContent.trim());
      setUrlInput('');
      toast.success('Content extracted!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to extract URL');
    } finally {
      setExtractingUrl(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingFile(true);
    
    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }
        
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        let content = '';
        
        if (fileExtension === 'txt' || fileExtension === 'md') {
          content = await file.text();
        } else {
          toast.error(`${file.name}: Only .txt and .md files supported`);
          continue;
        }
        
        if (content.trim()) {
          setUploadedFiles(prev => [...prev, { name: file.name, content: content.trim() }]);
          const fileContent = `\n=== From ${file.name} ===\n${content.trim()}`;
          setMaterials(prev => prev + (prev ? '\n\n' : '') + fileContent.trim());
          toast.success(`${file.name} added!`);
        }
      }
    } catch (error) {
      toast.error('Failed to read file');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
    const pattern = new RegExp(`\\n*=== From ${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} ===\\n[\\s\\S]*?(?=\\n=== |$)`, 'g');
    setMaterials(prev => prev.replace(pattern, '').trim());
  };

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

  const sendFeedback = async (feedbackText?: string) => {
    const feedback = feedbackText || input.trim();
    if (!feedback || !brand || !voiceData) return;
    
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
      
      if (data.voiceData) setVoiceData(data.voiceData);
      if (data.sampleEmails) setSampleEmails(data.sampleEmails);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refine');
    } finally {
      setSending(false);
    }
  };

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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-pulse shadow-lg shadow-violet-500/30">
            <Mic className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading voice builder...</p>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Brand not found</p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/brands/${brandId}`)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Voice Builder</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{brand.name}</p>
              </div>
            </div>
          </div>

          {voiceData && step === 'refine' && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/30"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Voice Profile
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* ==================== INPUT STEP ==================== */}
        {step === 'input' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
              {/* Hero */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-500/30">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  Build Your Brand Voice
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                  Paste your best copy and I'll extract your unique voice patterns, vocabulary, and personality. Then we'll create a voice profile together.
                </p>
              </div>

              {/* Input Card */}
              <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* URL & File Upload */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* URL Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-violet-500" />
                        Extract from URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://yourbrand.com"
                          className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          onKeyDown={(e) => e.key === 'Enter' && handleExtractUrl()}
                        />
                        <Button
                          onClick={handleExtractUrl}
                          disabled={!urlInput.trim() || extractingUrl}
                          variant="outline"
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <Upload className="w-4 h-4 text-violet-500" />
                        Upload Files
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-all flex items-center justify-center gap-2"
                      >
                        {uploadingFile ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                        <span>Drop .txt or .md files</span>
                      </button>
                    </div>
                  </div>

                  {/* Uploaded Files */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {uploadedFiles.map((file) => (
                        <div
                          key={file.name}
                          className="flex items-center gap-2 px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-sm"
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

                {/* Main Text Area */}
                <div className="p-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Brand Copy <span className="text-violet-600">*</span>
                  </label>
                  <textarea
                    value={materials}
                    onChange={(e) => setMaterials(e.target.value)}
                    placeholder={`Paste your brand copy here...

Examples of what works great:
• Homepage hero copy
• About page content
• Product descriptions
• Your best email campaigns
• Social media posts that feel "right"
• Any existing style guide

The more examples you give, the better I can capture your voice.`}
                    rows={16}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                  />
                  
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {materials.length} characters
                      {materials.length < 100 && ' • Need 100+ characters'}
                    </p>
                    <div className="flex gap-2">
                      {materials.length >= 100 && materials.length < 500 && (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg text-xs">Good start</span>
                      )}
                      {materials.length >= 500 && materials.length < 1500 && (
                        <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs">Great!</span>
                      )}
                      {materials.length >= 1500 && (
                        <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg text-xs">Excellent!</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="px-6 pb-6">
                  <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 rounded-2xl p-4 border border-violet-200/50 dark:border-violet-800/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      <span className="font-semibold text-violet-700 dark:text-violet-300">Pro Tips</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>Include your <strong>best-performing emails</strong></span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>Add <strong>product descriptions</strong> you love</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>Paste your <strong>homepage copy</strong></span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>Include <strong>customer testimonials</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                  <Button
                    onClick={handleAnalyze}
                    disabled={materials.trim().length < 100}
                    className="w-full py-4 text-base bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30 rounded-xl"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Analyze & Build Voice Profile
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ANALYZING STEP ==================== */}
        {step === 'analyzing' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 flex items-center justify-center mx-auto shadow-2xl shadow-violet-500/40">
                  <Sparkles className="w-12 h-12 text-white animate-pulse" />
                </div>
                <div className="absolute -inset-4 rounded-3xl bg-violet-500/20 animate-ping" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-2">Analyzing your brand...</h3>
              <p className="text-gray-500 mb-6">Extracting voice patterns, vocabulary, and personality</p>
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2, 3, 4].map(i => (
                  <div 
                    key={i} 
                    className="w-3 h-3 bg-violet-500 rounded-full animate-bounce" 
                    style={{ animationDelay: `${i * 100}ms` }} 
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== REFINE STEP ==================== */}
        {step === 'refine' && (
          <>
            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' ? (
                        <div className="flex gap-4 max-w-[90%]">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                          <div className="space-y-4 flex-1">
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-md px-5 py-4 shadow-sm">
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown
                                  components={{
                                    p: ({ children }) => <p className="text-gray-700 dark:text-gray-300 mb-3 last:mb-0 leading-relaxed">{children}</p>,
                                    strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                                    ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 text-gray-700 dark:text-gray-300">{children}</ul>,
                                    h2: ({ children }) => <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2">{children}</h2>,
                                    h3: ({ children }) => <h3 className="font-bold text-gray-900 dark:text-white mt-3 mb-1">{children}</h3>,
                                  }}
                                >
                                  {cleanMessageContent(msg.content)}
                                </ReactMarkdown>
                              </div>
                            </div>
                            
                            {/* Voice Profile */}
                            {msg.voiceData && <VoiceProfileCard voiceData={msg.voiceData} />}
                            
                            {/* Email Samples */}
                            {(() => {
                              const samples = extractEmailSamples(msg.content);
                              if (!samples.product && !samples.content && !samples.generic) return null;
                              return (
                                <div className="space-y-3">
                                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Sample Emails</p>
                                  <div className="grid md:grid-cols-2 gap-4">
                                    {samples.product && <EmailSampleCard title="Product Email" content={samples.product} icon="🛍️" />}
                                    {samples.content && <EmailSampleCard title="Content Email" content={samples.content} icon="📚" />}
                                    {samples.generic && !samples.product && !samples.content && (
                                      <EmailSampleCard title="Sample Email" content={samples.generic} icon="📧" />
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-[75%] bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-100 dark:to-white text-white dark:text-gray-900 rounded-2xl rounded-tr-md px-5 py-3 shadow-lg">
                          <p className="leading-relaxed">{msg.content}</p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                          <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                              <div key={i} className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  {messages.length > 0 && !sending && (
                    <div className="ml-14 space-y-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Quick feedback</p>
                        <div className="flex flex-wrap gap-2">
                          {FEEDBACK_SUGGESTIONS.map((suggestion, i) => (
                            <button
                              key={i}
                              onClick={() => sendFeedback(suggestion)}
                              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 hover:shadow-md transition-all"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {voiceData && (
                        <div>
                          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Generate sample email</p>
                          <div className="flex flex-wrap gap-2">
                            {EMAIL_SCENARIOS.map(scenario => (
                              <button
                                key={scenario.id}
                                onClick={() => generateSample(scenario.label)}
                                className="flex items-center gap-2 px-4 py-2 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-xl text-sm font-medium hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
                              >
                                <scenario.icon className="w-4 h-4" />
                                {scenario.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Input Area */}
              <div className="sticky bottom-0 bg-gradient-to-t from-violet-50 via-violet-50 to-transparent dark:from-gray-950 dark:via-gray-950 pt-4 pb-6 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-shadow focus-within:ring-2 focus-within:ring-violet-500/50 focus-within:border-violet-500">
                    <div className="p-4">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder='Give feedback like "too formal" or "add more energy"...'
                        disabled={sending}
                        rows={1}
                        className="w-full text-base bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none resize-none max-h-32 disabled:opacity-50"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between px-4 pb-4">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">Claude Opus 4.5</span>
                        <span>•</span>
                        <span>Press Enter to send</span>
                      </div>
                      
                      <Button
                        onClick={() => sendFeedback()}
                        disabled={!input.trim() || sending}
                        size="sm"
                        className={cn(
                          "rounded-xl",
                          input.trim()
                            ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                        )}
                      >
                        {sending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - Voice Preview */}
            {voiceData && (
              <div className="hidden xl:flex w-96 flex-col border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="p-5 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-violet-600" />
                      Current Voice
                    </h3>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      size="sm"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Brand Summary */}
                  {voiceData.brand_summary && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Brand</p>
                      <p className="text-sm text-gray-900 dark:text-white">{voiceData.brand_summary}</p>
                    </div>
                  )}

                  {/* Voice Description */}
                  <div className="p-4 bg-violet-50 dark:bg-violet-950/30 rounded-xl border border-violet-200/50 dark:border-violet-800/50">
                    <p className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-2">Voice</p>
                    <p className="text-violet-700 dark:text-violet-300 font-medium italic">"{voiceData.voice_description}"</p>
                  </div>

                  {/* We Sound */}
                  {voiceData.we_sound?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">We Sound</p>
                      </div>
                      <div className="space-y-2">
                        {voiceData.we_sound.map((t, i) => (
                          <div key={i} className="text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">{t.trait}</span>
                            <span className="text-gray-500"> — {t.explanation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* We Never Sound */}
                  {voiceData.we_never_sound?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <p className="text-xs font-bold text-red-600 uppercase tracking-wider">We Never Sound</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {voiceData.we_never_sound.map((s, i) => (
                          <span key={i} className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-xs font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vocabulary */}
                  {voiceData.vocabulary && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Vocabulary</p>
                      {voiceData.vocabulary.use?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-emerald-600 mb-1.5">✓ Use these words</p>
                          <div className="flex flex-wrap gap-1">
                            {voiceData.vocabulary.use.slice(0, 10).map((w, i) => (
                              <span key={i} className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded text-xs">{w}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {voiceData.vocabulary.avoid?.length > 0 && (
                        <div>
                          <p className="text-xs text-red-600 mb-1.5">✗ Avoid these words</p>
                          <div className="flex flex-wrap gap-1">
                            {voiceData.vocabulary.avoid.slice(0, 10).map((w, i) => (
                              <span key={i} className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs line-through">{w}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audience */}
                  {voiceData.audience && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-orange-500" />
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Audience</p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{voiceData.audience}</p>
                    </div>
                  )}

                  {/* Examples */}
                  {voiceData.good_copy_example && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Quote className="w-4 h-4 text-emerald-500" />
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Good Copy</p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3">
                        "{voiceData.good_copy_example}"
                      </p>
                    </div>
                  )}

                  {voiceData.bad_copy_example && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Quote className="w-4 h-4 text-red-500" />
                        <p className="text-xs font-bold text-red-600 uppercase tracking-wider">We'd Never Say</p>
                      </div>
                      <p className="text-sm text-gray-400 italic line-through bg-red-50 dark:bg-red-950/20 rounded-xl p-3">
                        "{voiceData.bad_copy_example}"
                      </p>
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
