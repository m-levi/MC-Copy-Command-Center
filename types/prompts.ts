// =====================================================
// PROMPT LIBRARY TYPES
// Saved prompts that can be quickly sent in chat
// =====================================================

import { ConversationMode } from './index';

/**
 * A saved prompt (shortcut) in the quick actions library
 */
export interface SavedPrompt {
  id: string;
  user_id: string;
  
  // Display
  name: string;
  description?: string;
  icon: string; // Emoji
  
  // The actual prompt text
  prompt: string;
  
  // Slash command trigger (e.g., "/subjects" - stored without the leading slash)
  slash_command?: string;
  
  // Where this prompt appears
  modes: ConversationMode[];
  
  // Settings
  is_active: boolean;
  is_default: boolean; // System default, can't be deleted
  sort_order: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new shortcut
 */
export interface CreatePromptInput {
  name: string;
  description?: string;
  icon?: string;
  prompt: string;
  slash_command?: string;
  modes?: ConversationMode[];
}

/**
 * Input for updating a shortcut
 */
export interface UpdatePromptInput {
  name?: string;
  description?: string;
  icon?: string;
  prompt?: string;
  slash_command?: string;
  modes?: ConversationMode[];
  is_active?: boolean;
  sort_order?: number;
}

/**
 * Default shortcuts that come pre-loaded
 */
export const DEFAULT_PROMPTS: Omit<SavedPrompt, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Subject Lines',
    description: 'Generate compelling subject line options',
    icon: '📧',
    prompt: 'Generate 5 compelling subject line options for this email. For each option, include:\n1. The subject line\n2. A preview text (the first line that appears in inbox)\n3. The style/approach (e.g., Curiosity, Urgency, Benefit-focused, Personal, Question)\n\nMake them varied in style and optimized for open rates.',
    slash_command: 'subjects',
    modes: ['email_copy'],
    is_active: true,
    is_default: true,
    sort_order: 0,
  },
  {
    name: 'More Variants',
    description: 'Generate additional versions',
    icon: '✨',
    prompt: 'Create 2 more alternative versions of this email with different angles or tones. Keep the core message but vary the approach.',
    slash_command: 'variants',
    modes: ['email_copy'],
    is_active: true,
    is_default: true,
    sort_order: 1,
  },
  {
    name: 'Shorter Version',
    description: 'Make it more concise',
    icon: '📝',
    prompt: 'Create a shorter, more concise version of this email. Cut it down by about 30-40% while keeping the key message and call-to-action intact.',
    slash_command: 'shorter',
    modes: ['email_copy', 'flow', 'planning'],
    is_active: true,
    is_default: true,
    sort_order: 2,
  },
  {
    name: 'More Urgent',
    description: 'Add urgency and FOMO',
    icon: '⚡',
    prompt: 'Rewrite this email with more urgency and FOMO (fear of missing out). Add time-sensitive language and scarcity elements while keeping it authentic.',
    slash_command: 'fomo',
    modes: ['email_copy'],
    is_active: true,
    is_default: true,
    sort_order: 3,
  },
  {
    name: 'Friendlier Tone',
    description: 'Make it warmer and more personal',
    icon: '😊',
    prompt: 'Rewrite this email with a warmer, friendlier tone. Make it feel more personal and conversational, like a message from a friend.',
    slash_command: 'friendly',
    modes: ['email_copy'],
    is_active: true,
    is_default: true,
    sort_order: 4,
  },
];

/**
 * Icons available for prompts
 */
export const PROMPT_ICONS = [
  '📧', '✨', '📝', '⚡', '😊', '🎯', '💡', '🔥', '💪', '🚀',
  '✍️', '💬', '📊', '🎨', '🔄', '⭐', '💎', '🎁', '📣', '🔔',
  '❤️', '👋', '🤝', '💼', '📈', '🛒', '🎉', '✅', '🔍', '💰',
];








