export interface Profile {
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Brand {
  id: string;
  user_id: string;
  organization_id: string;
  created_by: string;
  name: string;
  brand_details: string;
  brand_guidelines: string;
  copywriting_style_guide: string;
  website_url?: string;
  created_at: string;
  updated_at: string;
}

export type ConversationType = 'email' | 'automation';
export type ConversationMode = 'planning' | 'email_copy' | 'flow';
export type EmailType = 'design' | 'letter' | 'flow';

// Flow Types
export type FlowType = 
  | 'welcome_series'
  | 'abandoned_cart'
  | 'post_purchase'
  | 'winback'
  | 'product_launch'
  | 'educational_series';

export interface FlowTemplate {
  id: FlowType;
  name: string;
  description: string;
  icon: string;
  defaultEmailCount: number;
  category: 'transactional' | 'promotional' | 'nurture';
}

export interface FlowOutlineEmail {
  sequence: number;
  title: string;
  purpose: string;
  timing: string;
  keyPoints: string[];
  cta: string;
}

export interface FlowOutlineData {
  flowType: FlowType;
  flowName: string;
  goal: string;
  targetAudience: string;
  emails: FlowOutlineEmail[];
}

export interface FlowOutline {
  id: string;
  conversation_id: string;
  flow_type: FlowType;
  outline_data: FlowOutlineData;
  approved: boolean;
  approved_at?: string;
  email_count: number;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  brand_id: string;
  user_id: string;
  created_by_name?: string;
  title: string;
  model: string;
  conversation_type: ConversationType;
  mode?: ConversationMode; // Optional for backward compatibility
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
  is_archived?: boolean;
  last_message_preview?: string;
  last_message_at?: string;
  
  // Flow-specific fields
  parent_conversation_id?: string | null;
  is_flow?: boolean;
  flow_type?: FlowType | null;
  flow_sequence_order?: number | null;
  flow_email_title?: string | null;
}

// Extended conversation with children
export interface FlowConversation extends Conversation {
  is_flow: true;
  flow_type: FlowType;
  outline?: FlowOutline;
  children?: Conversation[];
}

export type MessageRole = 'user' | 'assistant' | 'system';

export type AIStatus = 
  | 'idle'
  | 'thinking'
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

export interface ProductLink {
  name: string;
  url: string;
  description?: string;
}

export interface MessageMetadata {
  sections?: EmailSection[];
  hasEmailStructure?: boolean;
  context?: ConversationContext;
  editedFrom?: string; // Original message ID if this was edited
  productLinks?: ProductLink[]; // Products mentioned in the message
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  thinking?: string; // Extended thinking/reasoning content from AI
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

// Organization and Multi-Tenancy Types
export type OrganizationRole = 'admin' | 'brand_manager' | 'member';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  invited_by: string;
  joined_at: string;
  created_at: string;
  profile?: Profile;
}

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  invite_token: string;
  invited_by: string;
  expires_at: string;
  used_at?: string;
  created_at: string;
}

export interface UserWithOrganization {
  user: any;
  organization: Organization | null;
  role: OrganizationRole | null;
}

// Sidebar View Modes
export type SidebarViewMode = 'list' | 'grid';
export type FilterType = 'all' | 'mine' | 'person';

// Conversation Status for concurrent AI tracking
export type ConversationStatus = 'idle' | 'loading' | 'ai_responding' | 'error';

export interface ConversationWithStatus extends Conversation {
  status?: ConversationStatus;
  aiProgress?: number; // 0-100 for progress bar
}

// User Preferences
export interface UserPreferences {
  id: string;
  user_id: string;
  sidebar_view_mode: SidebarViewMode;
  sidebar_width: number;
  default_filter: FilterType;
  default_filter_person_id?: string;
  pinned_conversations: string[];
  archived_conversations: string[];
  created_at: string;
  updated_at: string;
}

// Quick Action Types
export type ConversationQuickAction = 
  | 'pin' 
  | 'unpin' 
  | 'archive' 
  | 'unarchive'
  | 'duplicate' 
  | 'export' 
  | 'rename' 
  | 'delete';

// Conversation Tags
export interface ConversationTag {
  id: string;
  label: string;
  color: 'blue' | 'purple' | 'pink' | 'green' | 'yellow' | 'red' | 'gray' | 'indigo' | 'cyan' | 'orange';
}

// Conversation with Extended Metadata
export interface ConversationWithMetadata extends ConversationWithStatus {
  tags?: ConversationTag[];
  messageCount?: number;
  wordCount?: number;
  tokensUsed?: number;
  lastActivityMinutesAgo?: number;
}

// Sidebar Section Type
export type SidebarSection = 'pinned' | 'recent' | 'archived' | 'all';

// Sort Options
export type ConversationSortOption = 
  | 'last_activity' 
  | 'created_date' 
  | 'title' 
  | 'message_count' 
  | 'creator';


