export interface Profile {
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

// Brand Voice Builder - Structured voice data
export interface BrandVoiceTrait {
  trait: string;
  explanation: string;
}

export interface BrandVoiceVocabulary {
  use: string[];
  avoid: string[];
}

export interface BrandVoiceSampleEmails {
  product_focused: string;
  content_educational: string;
}

export interface BrandVoiceData {
  brand_summary: string;        // "[Name] — [What they sell] for [who they serve]"
  voice_description: string;    // "2-3 word description + analogy"
  we_sound: BrandVoiceTrait[];
  we_never_sound: string[];
  vocabulary: BrandVoiceVocabulary;
  proof_points: string[];
  audience: string;
  good_copy_example: string;
  bad_copy_example: string;
  patterns: string;
  sample_emails?: BrandVoiceSampleEmails;
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
  brand_voice?: BrandVoiceData; // Structured voice data (optional - backward compatible)
  created_at: string;
  updated_at: string;
}

export type ConversationType = 'email' | 'automation';
export type ConversationMode = 'planning' | 'email_copy' | 'flow';
export type EmailType = 'design' | 'letter' | 'flow';
export type EmailStyle = Extract<EmailType, 'design' | 'letter'>;

// Flow Types
export type FlowType = 
  | 'welcome_series'
  | 'abandoned_cart'
  | 'browse_abandonment'
  | 'site_abandonment'
  | 'post_purchase'
  | 'winback'
  | 'product_launch'
  | 'educational_series'
  | 'do_your_research';

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
  emailType: EmailStyle; // 'design' or 'letter' - AI decides per email
}

export interface FlowOutlineData {
  flowType: FlowType;
  flowName: string;
  goal: string;
  targetAudience: string;
  emails: FlowOutlineEmail[];
  emailStyle?: EmailStyle;
}

export interface FlowOutline {
  id: string;
  conversation_id: string;
  flow_type: FlowType;
  outline_data: FlowOutlineData;
  mermaid_chart?: string; // Auto-generated Mermaid flowchart syntax
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
  mode: ConversationMode; // Set at creation, cannot be changed
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
  | 'searching_web'
  | 'analyzing_brand'
  | 'crafting_subject'
  | 'writing_hero'
  | 'developing_body'
  | 'creating_cta'
  | 'finalizing'
  | 'saving_memory';

// Memory-related types
export interface MemoryNotification {
  type: 'saved' | 'recalled';
  content: string;
  timestamp: Date;
}

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
  image_url?: string;
}

// Attachment info stored with messages
export interface MessageAttachment {
  name: string;
  type: 'image' | 'file';
  mimeType: string;
  size?: number;
}

export interface MessageMetadata {
  sections?: EmailSection[];
  hasEmailStructure?: boolean;
  context?: ConversationContext;
  editedFrom?: string; // Original message ID if this was edited
  productLinks?: ProductLink[]; // Products mentioned in the message
  responseType?: 'email_copy' | 'clarification' | 'other';
  clarification?: string;
  attachments?: MessageAttachment[]; // Files attached to this message
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  thinking?: string; // Extended thinking/reasoning content from AI (includes strategy, analysis, and reasoning)
  created_at: string;
  metadata?: MessageMetadata;
  edited_at?: string;
  parent_message_id?: string;
  user_id?: string;
  user?: Profile;
}

// Future automation types
export interface AutomationOutlineData {
  name: string;
  description?: string;
  trigger?: string;
  steps?: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
}

export interface AutomationOutline {
  id: string;
  conversation_id: string;
  outline_data: AutomationOutlineData;
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

// AI Models - Using AI Gateway model identifiers (format: provider/model-name)
// See: https://sdk.vercel.ai/docs/ai-sdk-core/ai-gateway
export type AIModel = 
  // Anthropic models
  | 'anthropic/claude-sonnet-4.5'
  | 'anthropic/claude-opus-4.5'
  | 'anthropic/claude-haiku-4.5'
  // OpenAI models - '-thinking' variants stream reasoning
  | 'openai/gpt-5.1-thinking'
  | 'openai/gpt-5.1-instant'
  | 'openai/gpt-5-mini'
  | 'openai/gpt-5'
  | 'openai/o1'
  | 'openai/o3'
  | 'openai/o3-mini'
  | 'openai/o4-mini'
  // Google models
  | 'google/gemini-3-pro'
  | 'google/gemini-3-flash'
  | 'google/gemini-2.5-pro'
  | 'google/gemini-2.5-flash';

export interface AIModelOption {
  id: AIModel;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
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
  user: Profile;
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

// Bulk Action Types
export type BulkActionType =
  | 'delete'
  | 'archive'
  | 'unarchive'
  | 'pin'
  | 'unpin'
  | 'export';

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
  isSelected?: boolean; // For bulk selection
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


