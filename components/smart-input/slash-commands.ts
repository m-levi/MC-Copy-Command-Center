import { 
  Scissors, 
  Zap, 
  Smile, 
  Briefcase, 
  Star, 
  Target, 
  FileText, 
  Sparkles,
  MessageSquare,
  Wand2,
  Languages,
  ListOrdered,
  Heading1,
  AlignLeft,
  Hash,
  Quote,
  Code,
  Lightbulb,
  RefreshCw,
  Maximize2,
  ThumbsUp,
  Users,
  type LucideIcon
} from 'lucide-react';

export interface SlashCommand {
  id: string;
  command: string;
  label: string;
  description: string;
  icon: LucideIcon;
  category: SlashCommandCategory;
  /** The prompt to execute or inject */
  prompt?: string;
  /** For formatting commands - the markdown syntax to insert */
  syntax?: string;
  /** Whether this is a formatting command (inserts syntax rather than sending) */
  isFormatting?: boolean;
  /** Keyboard shortcut hint */
  shortcut?: string;
}

export type SlashCommandCategory = 
  | 'shortcuts'
  | 'quick-actions'
  | 'tone'
  | 'formatting'
  | 'improve'
  | 'translate';

export const SLASH_COMMAND_CATEGORIES: { id: SlashCommandCategory; label: string; icon: LucideIcon }[] = [
  { id: 'shortcuts', label: 'Your Shortcuts', icon: Sparkles },
  { id: 'quick-actions', label: 'Quick Actions', icon: Zap },
  { id: 'tone', label: 'Tone & Style', icon: MessageSquare },
  { id: 'improve', label: 'Improve', icon: Wand2 },
  { id: 'formatting', label: 'Formatting', icon: FileText },
  { id: 'translate', label: 'Translate', icon: Languages },
];

export const SLASH_COMMANDS: SlashCommand[] = [
  // Quick Actions
  {
    id: 'shorten',
    command: '/shorten',
    label: 'Make Shorter',
    description: 'Reduce length while keeping key message',
    icon: Scissors,
    category: 'quick-actions',
    prompt: 'Rewrite the previous email to be 30% shorter while keeping the key message and CTA.',
  },
  {
    id: 'expand',
    command: '/expand',
    label: 'Expand',
    description: 'Add more detail and depth',
    icon: Maximize2,
    category: 'quick-actions',
    prompt: 'Expand on the previous content with more detail, examples, and depth while maintaining the core message.',
  },
  {
    id: 'urgent',
    command: '/urgent',
    label: 'Add Urgency',
    description: 'Create FOMO and time pressure',
    icon: Zap,
    category: 'quick-actions',
    prompt: 'Add more urgency and scarcity elements to the previous email without being pushy.',
  },
  {
    id: 'proof',
    command: '/proof',
    label: 'Add Social Proof',
    description: 'Include testimonials & stats',
    icon: Star,
    category: 'quick-actions',
    prompt: 'Add social proof elements (testimonials, statistics, reviews) to the previous email.',
  },
  {
    id: 'cta',
    command: '/cta',
    label: 'Improve CTAs',
    description: 'Make calls-to-action more compelling',
    icon: Target,
    category: 'quick-actions',
    prompt: 'Rewrite the CTAs in the previous email to be more compelling and action-oriented.',
  },
  {
    id: 'regenerate',
    command: '/regenerate',
    label: 'Regenerate',
    description: 'Create a fresh alternative version',
    icon: RefreshCw,
    category: 'quick-actions',
    prompt: 'Generate a completely fresh alternative version of the previous email with a different approach.',
  },

  // Tone & Style
  {
    id: 'casual',
    command: '/casual',
    label: 'Casual Tone',
    description: 'Friendly and conversational',
    icon: Smile,
    category: 'tone',
    prompt: 'Rewrite the previous email in a more casual, friendly, and conversational tone.',
  },
  {
    id: 'professional',
    command: '/professional',
    label: 'Professional Tone',
    description: 'Polished and business-like',
    icon: Briefcase,
    category: 'tone',
    prompt: 'Rewrite the previous email in a more professional and polished tone.',
  },
  {
    id: 'enthusiastic',
    command: '/enthusiastic',
    label: 'Enthusiastic',
    description: 'Excited and energetic',
    icon: Sparkles,
    category: 'tone',
    prompt: 'Rewrite the previous email with more enthusiasm and energy while staying authentic.',
  },
  {
    id: 'empathetic',
    command: '/empathetic',
    label: 'Empathetic',
    description: 'Understanding and caring',
    icon: ThumbsUp,
    category: 'tone',
    prompt: 'Rewrite the previous email with more empathy and understanding, connecting emotionally with the reader.',
  },
  {
    id: 'authoritative',
    command: '/authoritative',
    label: 'Authoritative',
    description: 'Expert and confident',
    icon: Users,
    category: 'tone',
    prompt: 'Rewrite the previous email in a more authoritative, expert tone that builds trust and credibility.',
  },

  // Improve
  {
    id: 'improve',
    command: '/improve',
    label: 'General Improve',
    description: 'Overall quality enhancement',
    icon: Wand2,
    category: 'improve',
    prompt: 'Improve the previous email by enhancing clarity, flow, and impact while maintaining the original intent.',
  },
  {
    id: 'fix-grammar',
    command: '/grammar',
    label: 'Fix Grammar',
    description: 'Correct spelling & grammar',
    icon: FileText,
    category: 'improve',
    prompt: 'Fix any grammar, spelling, and punctuation errors in the previous email.',
  },
  {
    id: 'simplify',
    command: '/simplify',
    label: 'Simplify',
    description: 'Use simpler language',
    icon: Lightbulb,
    category: 'improve',
    prompt: 'Simplify the language in the previous email to make it easier to understand while keeping the message intact.',
  },

  // Formatting (these insert markdown syntax)
  {
    id: 'heading',
    command: '/h1',
    label: 'Heading',
    description: 'Insert a heading',
    icon: Heading1,
    category: 'formatting',
    syntax: '# ',
    isFormatting: true,
  },
  {
    id: 'bullet-list',
    command: '/list',
    label: 'Bullet List',
    description: 'Start a bullet list',
    icon: ListOrdered,
    category: 'formatting',
    syntax: '- ',
    isFormatting: true,
  },
  {
    id: 'numbered-list',
    command: '/numbered',
    label: 'Numbered List',
    description: 'Start a numbered list',
    icon: Hash,
    category: 'formatting',
    syntax: '1. ',
    isFormatting: true,
  },
  {
    id: 'quote',
    command: '/quote',
    label: 'Quote',
    description: 'Insert a blockquote',
    icon: Quote,
    category: 'formatting',
    syntax: '> ',
    isFormatting: true,
  },
  {
    id: 'code',
    command: '/code',
    label: 'Code Block',
    description: 'Insert a code block',
    icon: Code,
    category: 'formatting',
    syntax: '```\n',
    isFormatting: true,
  },
  {
    id: 'paragraph',
    command: '/p',
    label: 'Paragraph Break',
    description: 'Insert paragraph break',
    icon: AlignLeft,
    category: 'formatting',
    syntax: '\n\n',
    isFormatting: true,
  },

  // Translate
  {
    id: 'translate-spanish',
    command: '/spanish',
    label: 'Translate to Spanish',
    description: 'Translate content to Spanish',
    icon: Languages,
    category: 'translate',
    prompt: 'Translate the previous email to Spanish while maintaining the tone and marketing effectiveness.',
  },
  {
    id: 'translate-french',
    command: '/french',
    label: 'Translate to French',
    description: 'Translate content to French',
    icon: Languages,
    category: 'translate',
    prompt: 'Translate the previous email to French while maintaining the tone and marketing effectiveness.',
  },
  {
    id: 'translate-german',
    command: '/german',
    label: 'Translate to German',
    description: 'Translate content to German',
    icon: Languages,
    category: 'translate',
    prompt: 'Translate the previous email to German while maintaining the tone and marketing effectiveness.',
  },
];

/**
 * Get commands filtered by search query
 */
export function filterCommands(query: string): SlashCommand[] {
  if (!query) return SLASH_COMMANDS;
  
  const normalizedQuery = query.toLowerCase().replace(/^\//, '');
  
  return SLASH_COMMANDS.filter(cmd => {
    const searchText = `${cmd.command} ${cmd.label} ${cmd.description}`.toLowerCase();
    return searchText.includes(normalizedQuery) || 
           cmd.command.toLowerCase().startsWith('/' + normalizedQuery);
  });
}

/**
 * Get commands grouped by category
 */
export function getCommandsByCategory(commands: SlashCommand[]): Map<SlashCommandCategory, SlashCommand[]> {
  const grouped = new Map<SlashCommandCategory, SlashCommand[]>();
  
  SLASH_COMMAND_CATEGORIES.forEach(cat => {
    grouped.set(cat.id, []);
  });
  
  commands.forEach(cmd => {
    const existing = grouped.get(cmd.category) || [];
    existing.push(cmd);
    grouped.set(cmd.category, existing);
  });
  
  return grouped;
}

/**
 * Find a command by its exact command string
 */
export function findCommand(command: string, additionalCommands?: SlashCommand[]): SlashCommand | undefined {
  const allCommands = additionalCommands 
    ? [...additionalCommands, ...SLASH_COMMANDS] 
    : SLASH_COMMANDS;
  return allCommands.find(cmd => cmd.command.toLowerCase() === command.toLowerCase());
}

/**
 * Create a combined command list from built-in commands and user shortcuts
 */
export function combineCommands(userCommands: SlashCommand[]): SlashCommand[] {
  // User commands come first (in the "shortcuts" category)
  return [...userCommands, ...SLASH_COMMANDS];
}

/**
 * Filter combined commands by query
 */
export function filterCombinedCommands(query: string, userCommands: SlashCommand[]): SlashCommand[] {
  const allCommands = combineCommands(userCommands);
  
  if (!query) return allCommands;
  
  const normalizedQuery = query.toLowerCase().replace(/^\//, '');
  
  return allCommands.filter(cmd => {
    const searchText = `${cmd.command} ${cmd.label} ${cmd.description}`.toLowerCase();
    return searchText.includes(normalizedQuery) || 
           cmd.command.toLowerCase().startsWith('/' + normalizedQuery);
  });
}







