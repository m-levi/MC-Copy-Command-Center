'use client';

import { Brand, BrandVoiceData } from '@/types';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

interface BrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (brandData: Partial<Brand>) => Promise<void>;
  brand?: Brand | null;
}

type Step = 
  | 'info'           // Basic brand info (name, website)
  | 'onboard-1'      // What do you sell?
  | 'onboard-2'      // How do you want to sound?
  | 'onboard-3'      // Words you love/avoid
  | 'onboard-4'      // Upload materials (optional)
  | 'analyzing'      // AI analyzing
  | 'refine'         // Chat refinement
  | 'success';       // Done!

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  voiceData?: BrandVoiceData | null;
}

// Voice tone options
const TONE_OPTIONS = [
  { id: 'friendly', label: 'Friendly & Approachable', emoji: '😊', desc: 'Like talking to a helpful friend' },
  { id: 'professional', label: 'Professional & Polished', emoji: '💼', desc: 'Buttoned-up but not cold' },
  { id: 'playful', label: 'Playful & Fun', emoji: '🎉', desc: 'Witty, energetic, maybe a bit cheeky' },
  { id: 'bold', label: 'Bold & Confident', emoji: '💪', desc: 'Direct, assertive, no hedging' },
  { id: 'warm', label: 'Warm & Nurturing', emoji: '🤗', desc: 'Caring, supportive, empathetic' },
  { id: 'premium', label: 'Premium & Sophisticated', emoji: '✨', desc: 'Elevated, refined, aspirational' },
];

const FEEDBACK_SUGGESTIONS = [
  "Too formal — warmer",
  "More confident",
  "Less salesy",
  "Perfect! Save it",
];

// Helper to strip JSON and code blocks from AI messages
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

// Simple email sample preview
function EmailPreview({ content }: { content: string }) {
  // Extract just the headline for a compact preview
  const headlineMatch = content.match(/Headline:\s*(.+)/i);
  const headline = headlineMatch ? headlineMatch[1].trim() : content.split('\n')[0];
  
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 text-xs">
      <p className="font-medium text-gray-900 dark:text-white truncate">{headline}</p>
    </div>
  );
}

export default function BrandModal({ isOpen, onClose, onSave, brand }: BrandModalProps) {
  const router = useRouter();
  
  // Basic info
  const [step, setStep] = useState<Step>('info');
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // AI extraction for basic info
  const [aiUrl, setAiUrl] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Onboarding answers
  const [savedBrandId, setSavedBrandId] = useState<string | null>(null);
  const [whatYouSell, setWhatYouSell] = useState('');
  const [whoYouServe, setWhoYouServe] = useState('');
  const [selectedTones, setSelectedTones] = useState<string[]>([]);
  const [wordsLove, setWordsLove] = useState('');
  const [wordsAvoid, setWordsAvoid] = useState('');
  const [materials, setMaterials] = useState('');
  
  // Voice builder
  const [voiceData, setVoiceData] = useState<BrandVoiceData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  
  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Reset on open/close
  useEffect(() => {
    if (brand) {
      // Editing existing brand - just show info
      setName(brand.name);
      setWebsiteUrl(brand.website_url || '');
      setStep('info');
    } else {
      resetForm();
    }
  }, [brand, isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Don't close if we're in the middle of analyzing
        if (step === 'analyzing') return;
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, onClose]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (step === 'refine' && !sending) {
      inputRef.current?.focus();
    }
  }, [step, sending, messages]);

  const resetForm = () => {
    setName('');
    setWebsiteUrl('');
    setError('');
    setAiUrl('');
    setStep('info');
    setSavedBrandId(null);
    setWhatYouSell('');
    setWhoYouServe('');
    setSelectedTones([]);
    setWordsLove('');
    setWordsAvoid('');
    setMaterials('');
    setVoiceData(null);
    setMessages([]);
    setInput('');
  };

  // AI extraction for brand info
  const handleAiExtract = async () => {
    if (!aiUrl) return;
    setAiLoading(true);
    
    try {
      const response = await fetch('/api/brands/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: aiUrl }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to extract');

      const { brandInfo } = data;
      setName(brandInfo.name || '');
      if (brandInfo.website_url) setWebsiteUrl(brandInfo.website_url);
      if (brandInfo.brand_details) {
        // Pre-fill what you sell from extracted details
        setWhatYouSell(brandInfo.brand_details.substring(0, 200));
      }
      setAiUrl('');
      toast.success('Brand info extracted!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to extract');
    } finally {
      setAiLoading(false);
    }
  };

  // Save brand and start onboarding
  const handleSubmitInfo = async (e: React.FormEvent) => {
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
        website_url: websiteUrl.trim(),
      });
      
      if (!brand) {
        // New brand - get ID and start onboarding
        const response = await fetch('/api/brands/latest');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to get brand ID');
        }
        if (data.brandId) {
          setSavedBrandId(data.brandId);
          setStep('onboard-1');
        } else {
          throw new Error('Brand was created but ID could not be retrieved');
        }
      } else {
        // Editing - just close
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save brand');
    } finally {
      setLoading(false);
    }
  };

  // Toggle tone selection
  const toggleTone = (toneId: string) => {
    setSelectedTones(prev => 
      prev.includes(toneId) 
        ? prev.filter(t => t !== toneId)
        : prev.length < 3 ? [...prev, toneId] : prev
    );
  };

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingFile(true);
    
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large`);
          continue;
        }
        
        if (ext === 'txt' || ext === 'md') {
          const content = await file.text();
          if (content.trim()) {
            setMaterials(prev => prev + `\n\n=== ${file.name} ===\n${content.trim()}`);
            toast.success(`${file.name} added!`);
          }
        } else {
          toast.error('Only .txt and .md files supported');
        }
      }
    } catch {
      toast.error('Failed to read file');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Build context from onboarding answers
  const buildOnboardingContext = () => {
    const toneDescriptions = selectedTones.map(id => 
      TONE_OPTIONS.find(t => t.id === id)?.label
    ).filter(Boolean).join(', ');

    return `
Brand: ${name}
Website: ${websiteUrl || 'Not provided'}

What they sell: ${whatYouSell || 'Not specified'}
Who they serve: ${whoYouServe || 'Not specified'}

Desired voice/tone: ${toneDescriptions || 'Not specified'}

Words/phrases they love: ${wordsLove || 'Not specified'}
Words/phrases to avoid: ${wordsAvoid || 'Not specified'}

${materials ? `Additional brand materials:\n${materials}` : ''}
`.trim();
  };

  // Analyze and build voice
  const handleAnalyze = async () => {
    setStep('analyzing');
    
    try {
      const context = buildOnboardingContext();
      
      const response = await fetch('/api/brands/voice-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          brandName: name,
          materials: context,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error);

      setVoiceData(data.voiceData);
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Here's my first take on ${name}'s voice:\n\n**${data.voiceData?.voice_description}**\n\nTell me what feels right and what's off — we can adjust anything.`,
        voiceData: data.voiceData,
      }]);
      setStep('refine');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analysis failed');
      setStep('onboard-4');
    }
  };

  // Send feedback
  const sendFeedback = async (feedbackText?: string) => {
    const feedback = feedbackText || input.trim();
    if (!feedback || !voiceData) return;
    
    if (feedback.toLowerCase().includes('perfect') || feedback.toLowerCase().includes('save')) {
      handleSaveVoice();
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
          brandName: name,
          currentVoice: voiceData,
          materials: buildOnboardingContext(),
          feedback,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error);

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Updated! **${data.voiceData?.voice_description || ''}**\n\nHow does this feel now?`,
        voiceData: data.voiceData,
      }]);
      
      if (data.voiceData) setVoiceData(data.voiceData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refine');
    } finally {
      setSending(false);
    }
  };

  // Save voice
  const handleSaveVoice = async () => {
    if (!voiceData || !savedBrandId) return;
    
    setSending(true);
    try {
      const response = await fetch('/api/brands/voice-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          brandId: savedBrandId,
          voiceData,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error);

      setStep('success');
    } catch (error) {
      toast.error('Failed to save voice');
    } finally {
      setSending(false);
    }
  };

  const handleFinish = () => {
    if (savedBrandId) {
      router.push(`/brands/${savedBrandId}/chat`);
    }
    onClose();
  };

  const skipOnboarding = () => {
    if (savedBrandId) {
      router.push(`/brands/${savedBrandId}/chat`);
    }
    onClose();
  };

  // Progress indicator
  const getProgress = () => {
    const steps = ['info', 'onboard-1', 'onboard-2', 'onboard-3', 'onboard-4', 'analyzing', 'refine', 'success'];
    const current = steps.indexOf(step);
    return Math.round((current / (steps.length - 1)) * 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[85vh] overflow-hidden flex flex-col safe-area-bottom">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step !== 'info' && step !== 'success' && (
                <button 
                  onClick={() => {
                    const prevSteps: Record<Step, Step> = {
                      'info': 'info',
                      'onboard-1': 'info',
                      'onboard-2': 'onboard-1',
                      'onboard-3': 'onboard-2',
                      'onboard-4': 'onboard-3',
                      'analyzing': 'onboard-4',
                      'refine': 'onboard-4',
                      'success': 'refine',
                    };
                    setStep(prevSteps[step]);
                  }} 
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              )}
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {step === 'info' && (brand ? 'Edit Brand' : 'Create Brand')}
                {step === 'onboard-1' && "What's your brand about?"}
                {step === 'onboard-2' && 'How should you sound?'}
                {step === 'onboard-3' && 'Language preferences'}
                {step === 'onboard-4' && 'Add brand materials'}
                {step === 'analyzing' && 'Building your voice...'}
                {step === 'refine' && 'Fine-tune your voice'}
                {step === 'success' && "You're all set!"}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg touch-target touch-feedback">
              <svg className="w-6 h-6 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress bar (only during onboarding) */}
          {!brand && step !== 'info' && step !== 'success' && (
            <div className="mt-3 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* ==================== INFO STEP ==================== */}
          {step === 'info' && (
            <form onSubmit={handleSubmitInfo} className="p-5 space-y-4">
              {!brand && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={aiUrl}
                    onChange={(e) => setAiUrl(e.target.value)}
                    placeholder="Paste website URL to auto-fill..."
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    type="button"
                    onClick={handleAiExtract}
                    disabled={!aiUrl || aiLoading}
                    className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                  >
                    {aiLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✨'}
                    Extract
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-violet-500"
                  placeholder="Acme Co."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-violet-500"
                  placeholder="https://example.com"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-3 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 font-medium touch-feedback">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-3 sm:py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 touch-feedback">
                  {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {brand ? 'Update' : 'Continue'}
                </button>
              </div>
            </form>
          )}

          {/* ==================== ONBOARD 1: What you sell ==================== */}
          {step === 'onboard-1' && (
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500">
                Help me understand your brand so I can capture your unique voice.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What do you sell?
                </label>
                <textarea
                  value={whatYouSell}
                  onChange={(e) => setWhatYouSell(e.target.value)}
                  placeholder="Premium organic skincare products, handcrafted coffee beans, enterprise SaaS..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 resize-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Who do you serve?
                </label>
                <textarea
                  value={whoYouServe}
                  onChange={(e) => setWhoYouServe(e.target.value)}
                  placeholder="Health-conscious millennials, busy professionals, small business owners..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={skipOnboarding} className="flex-1 py-2.5 text-gray-500 font-medium">
                  Skip setup
                </button>
                <button 
                  onClick={() => setStep('onboard-2')}
                  disabled={!whatYouSell.trim()}
                  className="flex-1 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ==================== ONBOARD 2: Voice/Tone ==================== */}
          {step === 'onboard-2' && (
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500">
                Pick up to 3 tones that best describe how {name} should sound.
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => toggleTone(tone.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selectedTones.includes(tone.id)
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{tone.emoji}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{tone.label}</span>
                    </div>
                    <p className="text-xs text-gray-500">{tone.desc}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('onboard-1')} className="flex-1 py-2.5 text-gray-500 font-medium">
                  Back
                </button>
                <button 
                  onClick={() => setStep('onboard-3')}
                  disabled={selectedTones.length === 0}
                  className="flex-1 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ==================== ONBOARD 3: Words ==================== */}
          {step === 'onboard-3' && (
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500">
                What words or phrases feel on-brand? What should we avoid?
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <span className="text-green-600">✓</span> Words/phrases you love
                </label>
                <textarea
                  value={wordsLove}
                  onChange={(e) => setWordsLove(e.target.value)}
                  placeholder="e.g., fresh, handcrafted, game-changer, no-brainer..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 resize-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <span className="text-red-600">✗</span> Words/phrases to avoid
                </label>
                <textarea
                  value={wordsAvoid}
                  onChange={(e) => setWordsAvoid(e.target.value)}
                  placeholder="e.g., synergy, leverage, disrupt, utilize..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('onboard-2')} className="flex-1 py-2.5 text-gray-500 font-medium">
                  Back
                </button>
                <button 
                  onClick={() => setStep('onboard-4')}
                  className="flex-1 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ==================== ONBOARD 4: Materials ==================== */}
          {step === 'onboard-4' && (
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500">
                Got existing copy? Paste it here to help me match your current voice. (Optional but recommended!)
              </p>
              
              {/* File Upload */}
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
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-dashed rounded-lg text-sm text-gray-500 hover:border-violet-400 hover:text-violet-600 transition-colors flex items-center justify-center gap-2"
              >
                {uploadingFile ? (
                  <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
                Upload .txt or .md files
              </button>
              
              <textarea
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                placeholder="Paste website copy, emails, product descriptions, style guide snippets..."
                rows={6}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 resize-none"
              />

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('onboard-3')} className="flex-1 py-2.5 text-gray-500 font-medium">
                  Back
                </button>
                <button 
                  onClick={handleAnalyze}
                  className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Build Voice Profile
                </button>
              </div>
            </div>
          )}

          {/* ==================== ANALYZING ==================== */}
          {step === 'analyzing' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Building your voice profile...</h3>
              <p className="text-gray-500 text-sm">Analyzing your inputs and generating sample emails</p>
            </div>
          )}

          {/* ==================== REFINE ==================== */}
          {step === 'refine' && (
            <div className="flex flex-col h-[50vh]">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' ? (
                      <div className="flex gap-2 max-w-[90%]">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-3 py-2">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="text-sm text-gray-700 dark:text-gray-300 mb-1 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                            }}
                          >
                            {cleanMessageContent(msg.content)}
                          </ReactMarkdown>
                        </div>
                        {/* Voice Profile Mini Card */}
                        {msg.voiceData && (
                          <div className="mt-2 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 rounded-lg p-2">
                            <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase mb-1">Voice Profile</p>
                            <p className="text-xs text-gray-700 dark:text-gray-300 italic">"{msg.voiceData.voice_description}"</p>
                            {msg.voiceData.we_sound && msg.voiceData.we_sound.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {msg.voiceData.we_sound.map((t, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-[10px]">{t.trait}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Email Samples Preview */}
                        {(() => {
                          const samples = extractEmailSamples(msg.content);
                          if (!samples.product && !samples.content && !samples.generic) return null;
                          return (
                            <div className="mt-2 space-y-1">
                              <p className="text-[10px] font-semibold text-gray-500 uppercase">Sample Emails</p>
                              <div className="grid grid-cols-2 gap-2">
                                {samples.product && (
                                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                                    <p className="text-[10px] text-gray-400 mb-0.5">🛍️ Product</p>
                                    <EmailPreview content={samples.product} />
                                  </div>
                                )}
                                {samples.content && (
                                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                                    <p className="text-[10px] text-gray-400 mb-0.5">📚 Content</p>
                                    <EmailPreview content={samples.content} />
                                  </div>
                                )}
                                {samples.generic && !samples.product && !samples.content && (
                                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 col-span-2">
                                    <p className="text-[10px] text-gray-400 mb-0.5">📧 Sample</p>
                                    <EmailPreview content={samples.generic} />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="max-w-[80%] bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-2xl rounded-tr-md px-3 py-2">
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    )}
                  </div>
                ))}

                {sending && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <div className="flex gap-0.5">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick feedback */}
                {messages.length > 0 && !sending && (
                  <div className="flex flex-wrap gap-2 ml-9">
                    {FEEDBACK_SUGGESTIONS.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => sendFeedback(suggestion)}
                        className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400 hover:border-violet-400 hover:text-violet-600 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 p-3">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !sending && sendFeedback()}
                    placeholder='Give feedback like "too formal"...'
                    disabled={sending}
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                  />
                  <button
                    onClick={() => sendFeedback()}
                    disabled={!input.trim() || sending}
                    className="px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl disabled:opacity-30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                
                {voiceData && (
                  <button
                    onClick={handleSaveVoice}
                    disabled={sending}
                    className="w-full mt-2 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                  >
                    ✓ Save & Start Creating Emails
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ==================== SUCCESS ==================== */}
          {step === 'success' && (
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{name} is ready!</h3>
              <p className="text-gray-500 text-sm mb-6">
                Your brand voice is saved. Every email will sound distinctly "you."
              </p>

              {voiceData && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6 text-left">
                  <p className="text-xs font-semibold text-violet-600 uppercase mb-1">Your Voice</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{voiceData.voice_description}</p>
                  {voiceData.we_sound && voiceData.we_sound.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {voiceData.we_sound.slice(0, 3).map((t, i) => (
                        <span key={i} className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-xs">
                          {t.trait}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleFinish}
                className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium"
              >
                Start Creating Emails →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
