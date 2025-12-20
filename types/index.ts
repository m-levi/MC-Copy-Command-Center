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
// Base conversation modes stored in database
export type BaseConversationMode = 'planning' | 'email_copy' | 'flow';
// Full conversation mode type including custom modes (custom_<uuid>)
export type ConversationMode = BaseConversationMode | `custom_${string}`;
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

// Brand File Categories
export type BrandFileCategory = 
  | 'brand_guidelines'
  | 'style_guide'
  | 'logo'
  | 'product_catalog'
  | 'marketing_material'
  | 'research'
  | 'competitor_analysis'
  | 'customer_data'
  | 'general';

// Brand Files for Document Store
export interface BrandFile {
  id: string;
  brand_id: string;
  uploaded_by: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  category: BrandFileCategory;
  description?: string;
  tags?: string[];
  extracted_text?: string;
  is_indexed: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  uploader?: Profile;
  public_url?: string;
}

// File category metadata for UI
export const FILE_CATEGORY_META: Record<BrandFileCategory, {
  label: string;
  icon: string;
  color: string;
}> = {
  brand_guidelines: { label: 'Brand Guidelines', icon: '📋', color: 'blue' },
  style_guide: { label: 'Style Guide', icon: '🎨', color: 'purple' },
  logo: { label: 'Logo', icon: '✨', color: 'pink' },
  product_catalog: { label: 'Product Catalog', icon: '📦', color: 'orange' },
  marketing_material: { label: 'Marketing Material', icon: '📣', color: 'green' },
  research: { label: 'Research', icon: '🔬', color: 'cyan' },
  competitor_analysis: { label: 'Competitor Analysis', icon: '🔍', color: 'red' },
  customer_data: { label: 'Customer Data', icon: '👥', color: 'yellow' },
  general: { label: 'General', icon: '📁', color: 'gray' },
};

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

// ============================================================================
// Custom Modes Types
// ============================================================================

// Available mode colors
export type ModeColor = 'blue' | 'purple' | 'pink' | 'green' | 'yellow' | 'red' | 'indigo' | 'cyan' | 'orange' | 'gray';

// Mode color metadata for UI styling
export const MODE_COLOR_META: Record<ModeColor, {
  bg: string;
  text: string;
  border: string;
  darkBg: string;
  darkText: string;
  darkBorder: string;
}> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-300', darkBorder: 'dark:border-blue-800' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', darkBg: 'dark:bg-purple-900/30', darkText: 'dark:text-purple-300', darkBorder: 'dark:border-purple-800' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', darkBg: 'dark:bg-pink-900/30', darkText: 'dark:text-pink-300', darkBorder: 'dark:border-pink-800' },
  green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', darkBg: 'dark:bg-green-900/30', darkText: 'dark:text-green-300', darkBorder: 'dark:border-green-800' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', darkBg: 'dark:bg-yellow-900/30', darkText: 'dark:text-yellow-300', darkBorder: 'dark:border-yellow-800' },
  red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-300', darkBorder: 'dark:border-red-800' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', darkBg: 'dark:bg-indigo-900/30', darkText: 'dark:text-indigo-300', darkBorder: 'dark:border-indigo-800' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', darkBg: 'dark:bg-cyan-900/30', darkText: 'dark:text-cyan-300', darkBorder: 'dark:border-cyan-800' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-300', darkBorder: 'dark:border-orange-800' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', darkBg: 'dark:bg-gray-800', darkText: 'dark:text-gray-300', darkBorder: 'dark:border-gray-700' },
};

// Available mode icons (emojis)
export const MODE_ICONS = [
  '💬', '✍️', '📝', '💡', '🎯', '🚀', '⚡', '🔥', '💎', '🌟',
  '📧', '✉️', '📬', '📮', '💌', '📨', '🎨', '🖌️', '✨', '🎭',
  '📊', '📈', '📉', '💹', '📋', '📌', '🔍', '🔎', '💼', '🎪',
  '🎬', '🎥', '📸', '🎤', '🎧', '🎹', '🎸', '🎺', '🎷', '🥁',
];

// =============================================================================
// CUSTOM MODES - Enhanced Configuration Types
// =============================================================================

// Base mode determines core behavior pattern
export type ModeBaseType = 'chat' | 'create' | 'analyze';

// Tool configuration - what the AI can do
export interface ModeToolsConfig {
  web_search: boolean;
  memory: boolean;
  product_search: boolean;
  image_generation: boolean;
  code_execution: boolean;
}

// Context sources - what information to include
export interface ModeContextConfig {
  brand_voice: boolean;
  brand_details: boolean;
  product_catalog: boolean;
  past_emails: boolean;
  web_research: boolean;
  custom_documents: string[];  // Document IDs
}

// Output configuration
export type ModeOutputType = 'freeform' | 'structured' | 'email' | 'code' | 'analysis';
export type ModeEmailFormat = 'design' | 'letter' | 'any' | null;

export interface ModeOutputConfig {
  type: ModeOutputType;
  email_format: ModeEmailFormat;
  show_thinking: boolean;
  version_count: number;
}

// Model preferences
export interface ModeModelConfig {
  preferred: string | null;
  allow_override: boolean;
  temperature: number | null;
}

// Mode category for organization
export type ModeCategory = 'email' | 'research' | 'brand' | 'product' | 'strategy' | 'custom' | null;

// Default configurations
export const DEFAULT_MODE_TOOLS: ModeToolsConfig = {
  web_search: true,
  memory: true,
  product_search: true,
  image_generation: false,
  code_execution: false,
};

export const DEFAULT_MODE_CONTEXT: ModeContextConfig = {
  brand_voice: true,
  brand_details: true,
  product_catalog: false,
  past_emails: false,
  web_research: false,
  custom_documents: [],
};

export const DEFAULT_MODE_OUTPUT: ModeOutputConfig = {
  type: 'freeform',
  email_format: null,
  show_thinking: false,
  version_count: 1,
};

export const DEFAULT_MODE_MODEL: ModeModelConfig = {
  preferred: null,
  allow_override: true,
  temperature: null,
};

// Custom Mode interface (enhanced)
export interface CustomMode {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon: string;
  color: ModeColor;
  system_prompt: string;
  
  // Enhanced configuration
  base_mode: ModeBaseType;
  tools: ModeToolsConfig;
  context_sources: ModeContextConfig;
  output_config: ModeOutputConfig;
  model_config: ModeModelConfig;
  
  // Organization
  category?: ModeCategory;
  tags?: string[];
  
  // Sharing & inheritance
  is_shared: boolean;
  is_template: boolean;
  parent_mode_id?: string;
  organization_id?: string;
  
  // Status
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  
  // Usage stats
  usage_count: number;
  last_used_at?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Mode Template (for shared/public templates)
export interface ModeTemplate {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: ModeColor;
  category?: ModeCategory;
  tags?: string[];
  
  // Content
  system_prompt: string;
  base_mode: ModeBaseType;
  tools: ModeToolsConfig;
  context_sources: ModeContextConfig;
  output_config: ModeOutputConfig;
  model_config: ModeModelConfig;
  
  // Metadata
  is_official: boolean;
  is_public: boolean;
  created_by?: string;
  organization_id?: string;
  
  // Stats
  use_count: number;
  rating_sum: number;
  rating_count: number;
  
  created_at: string;
  updated_at: string;
}

// Mode Document (custom document context)
export interface ModeDocument {
  id: string;
  mode_id: string;
  name: string;
  content: string;
  content_type: 'text' | 'markdown' | 'json';
  file_size?: number;
  word_count?: number;
  created_at: string;
  updated_at: string;
}

// Helper to create a new mode with defaults
export function createDefaultMode(partial: Partial<CustomMode> & { name: string; system_prompt: string }): Omit<CustomMode, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  return {
    name: partial.name,
    description: partial.description || '',
    icon: partial.icon || '💬',
    color: partial.color || 'blue',
    system_prompt: partial.system_prompt,
    base_mode: partial.base_mode || 'create',
    tools: partial.tools || { ...DEFAULT_MODE_TOOLS },
    context_sources: partial.context_sources || { ...DEFAULT_MODE_CONTEXT },
    output_config: partial.output_config || { ...DEFAULT_MODE_OUTPUT },
    model_config: partial.model_config || { ...DEFAULT_MODE_MODEL },
    category: partial.category || null,
    tags: partial.tags || [],
    is_shared: partial.is_shared || false,
    is_template: partial.is_template || false,
    parent_mode_id: partial.parent_mode_id,
    organization_id: partial.organization_id,
    is_active: partial.is_active ?? true,
    is_default: partial.is_default || false,
    sort_order: partial.sort_order || 0,
    usage_count: partial.usage_count || 0,
    last_used_at: partial.last_used_at,
  };
}

// Mode Version (for history tracking)
export interface ModeVersion {
  id: string;
  mode_id: string;
  version_number: number;
  system_prompt: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

// Mode Test Result (for sandbox/analytics)
export interface ModeTestResult {
  id: string;
  user_id: string;
  mode_id?: string;
  mode_name?: string;
  mode_color?: ModeColor;
  system_prompt_snapshot?: string;
  test_input: string;
  test_output?: string;
  model_used: string;
  brand_id?: string;
  brand_name?: string;
  response_time_ms?: number;
  token_count?: number;
  rating?: number;
  notes?: string;
  is_comparison: boolean;
  comparison_group_id?: string;
  created_at: string;
}

// Helper to check if a mode string represents a custom mode (e.g., 'custom_abc123')
export function isCustomMode(mode: string | ConversationMode | CustomMode | null | undefined): boolean {
  if (!mode) return false;
  // Check if it's a CustomMode object
  if (typeof mode === 'object' && 'system_prompt' in mode) return true;
  // Check if it's a custom mode string (starts with 'custom_')
  if (typeof mode === 'string' && mode.startsWith('custom_')) return true;
  return false;
}

// Extract the custom mode ID from a mode string (e.g., 'custom_abc123' -> 'abc123')
export function getCustomModeId(mode: string | null | undefined): string | null {
  if (!mode || typeof mode !== 'string') return null;
  if (mode.startsWith('custom_')) {
    return mode.replace('custom_', '');
  }
  return null;
}


