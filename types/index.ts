export interface Profile {
  user_id: string;
  email: string;
  created_at: string;
}

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  brand_details: string;
  brand_guidelines: string;
  copywriting_style_guide: string;
  created_at: string;
  updated_at: string;
}

export type ConversationType = 'email' | 'automation';
export type ConversationMode = 'planning' | 'email_copy';

export interface Conversation {
  id: string;
  brand_id: string;
  user_id: string;
  title: string;
  model: string;
  conversation_type: ConversationType;
  mode?: ConversationMode; // Optional for backward compatibility
  created_at: string;
  updated_at: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export type AIStatus = 
  | 'idle'
  | 'analyzing_brand'
  | 'crafting_subject'
  | 'writing_hero'
  | 'developing_body'
  | 'creating_cta'
  | 'finalizing';

export interface EmailSection {
  type: 'hero' | 'body' | 'cta' | 'subject';
  title: string;
  content: string;
  order: number;
}

export interface ConversationContext {
  campaignType?: string;
  targetAudience?: string;
  goals?: string[];
  tone?: string;
  keyPoints?: string[];
}

export interface MessageMetadata {
  sections?: EmailSection[];
  hasEmailStructure?: boolean;
  context?: ConversationContext;
  editedFrom?: string; // Original message ID if this was edited
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  metadata?: MessageMetadata;
  edited_at?: string;
  parent_message_id?: string;
}

// Future automation types
export interface AutomationOutline {
  id: string;
  conversation_id: string;
  outline_data: any;
  approved: boolean;
  created_at: string;
}

export interface AutomationEmail {
  id: string;
  automation_id: string;
  sequence_order: number;
  email_copy: string;
  status: string;
  created_at: string;
}

// Brand Documents for RAG
export interface BrandDocument {
  id: string;
  brand_id: string;
  doc_type: 'example' | 'competitor' | 'research' | 'testimonial';
  title: string;
  content: string;
  embedding?: number[];
  created_at: string;
}

// Conversation Summaries
export interface ConversationSummary {
  id: string;
  conversation_id: string;
  summary: string;
  message_count: number;
  created_at: string;
}

// Prompt Templates
export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: 'promotional' | 'transactional' | 'nurture' | 'announcement';
  icon?: string;
}

// Quick Actions
export type QuickAction = 
  | 'make_shorter'
  | 'add_urgency'
  | 'change_tone_casual'
  | 'change_tone_professional'
  | 'add_social_proof'
  | 'improve_cta';

// AI Models
export type AIModel = 
  | 'gpt-5'
  | 'o1'
  | 'claude-4.5-sonnet'
  | 'claude-opus-3.5';

export interface AIModelOption {
  id: AIModel;
  name: string;
  provider: 'openai' | 'anthropic';
}


