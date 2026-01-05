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
  /** Shopify store domain for MCP integration (e.g., 'store.myshopify.com' or 'mystore.com') */
  shopify_domain?: string;
  brand_voice?: BrandVoiceData; // Structured voice data (optional - backward compatible)
  /** Concise 1-2 paragraph brand overview from Brand Builder */
  brand_overview?: string;
  /** Target customer description paragraph from Brand Builder */
  target_customer?: string;
  /** Brand Builder state for resuming sessions */
  brand_builder_state?: import('./brand-builder').BrandBuilderState;
  created_at: string;
  updated_at: string;
}

export type ConversationType = 'email' | 'automation';
// Base conversation modes stored in database
// 'assistant' = orchestrator mode that can invoke specialists
// 'planning' = general chat/exploration
// 'email_copy' = focused email writing
// 'flow' = automation flow building
// 'calendar_planner' = calendar-based email planning
export type BaseConversationMode = 'assistant' | 'planning' | 'email_copy' | 'flow' | 'calendar_planner';
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

// Conversation visibility - who can see this conversation
export type ConversationVisibility = 'private' | 'team';

export interface Conversation {
  id: string;
  brand_id: string;
  user_id: string;
  created_by_name?: string;
  title: string;
  model: string;
  conversation_type: ConversationType;
  mode: ConversationMode; // Set at creation, cannot be changed
  visibility?: ConversationVisibility; // 'private' = only creator, 'team' = all org members (default: 'private')
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
  | 'generating_image'
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

export interface GeneratedImage {
  index: number;
  base64?: string;
  url?: string;
  revisedPrompt?: string;
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
  generatedImages?: GeneratedImage[]; // AI-generated images
  imageModel?: string; // Model used for image generation
  imagePrompt?: string; // Original prompt for image generation
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

// ============================================================================
// Unified Document Store Types (brand_documents_v2)
// ============================================================================

// Document types in the unified store
export type BrandDocType = 'file' | 'text' | 'link';

// Document visibility/sharing options
export type DocumentVisibility = 'private' | 'shared' | 'org';

// Document categories
export type DocumentCategory = 
  | 'general'
  | 'brand_guidelines'
  | 'style_guide'
  | 'product_info'
  | 'marketing'
  | 'research'
  | 'competitor'
  | 'testimonial'
  | 'reference'
  | 'template';

// Unified Brand Document
export interface BrandDocumentV2 {
  id: string;
  brand_id: string;
  created_by: string;
  
  // Document type
  doc_type: BrandDocType;
  
  // Common fields
  title: string;
  description?: string;
  tags: string[];
  
  // For file type
  file_name?: string;
  file_type?: string; // MIME type
  file_size?: number;
  storage_path?: string;
  
  // For text type (rich text content)
  content?: string;
  
  // For link type
  url?: string;
  url_title?: string;
  url_description?: string;
  url_image?: string;
  
  // Sharing permissions
  visibility: DocumentVisibility;
  shared_with: string[]; // User IDs when visibility = 'shared'
  
  // RAG integration
  extracted_text?: string;
  is_indexed: boolean;
  
  // Organization
  category: DocumentCategory;
  folder_id?: string; // Optional folder assignment
  is_pinned: boolean;
  
  // Google Drive provenance (for imported files)
  drive_file_id?: string;
  drive_mime_type?: string;
  drive_owner?: string;
  drive_web_view_link?: string;
  drive_last_synced_at?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Joined data (populated by API)
  creator?: Profile;
  public_url?: string; // For files, signed URL
  shared_with_profiles?: Profile[]; // Populated when needed
  folder?: DocumentFolder; // Populated when needed
}

// Document category metadata for UI
export const DOCUMENT_CATEGORY_META: Record<DocumentCategory, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  general: { 
    label: 'General', 
    icon: '📁', 
    color: 'gray',
    description: 'General documents and files'
  },
  brand_guidelines: { 
    label: 'Brand Guidelines', 
    icon: '📋', 
    color: 'blue',
    description: 'Official brand guidelines and standards'
  },
  style_guide: { 
    label: 'Style Guide', 
    icon: '🎨', 
    color: 'purple',
    description: 'Writing and design style guidelines'
  },
  product_info: { 
    label: 'Product Info', 
    icon: '📦', 
    color: 'orange',
    description: 'Product details, specs, and catalogs'
  },
  marketing: { 
    label: 'Marketing', 
    icon: '📣', 
    color: 'green',
    description: 'Marketing materials and campaigns'
  },
  research: { 
    label: 'Research', 
    icon: '🔬', 
    color: 'cyan',
    description: 'Market research and insights'
  },
  competitor: { 
    label: 'Competitor', 
    icon: '🔍', 
    color: 'red',
    description: 'Competitor analysis and intel'
  },
  testimonial: { 
    label: 'Testimonial', 
    icon: '⭐', 
    color: 'yellow',
    description: 'Customer testimonials and reviews'
  },
  reference: { 
    label: 'Reference', 
    icon: '📚', 
    color: 'indigo',
    description: 'Reference materials and examples'
  },
  template: { 
    label: 'Template', 
    icon: '📝', 
    color: 'pink',
    description: 'Reusable templates'
  },
};

// Document type metadata for UI
export const DOCUMENT_TYPE_META: Record<BrandDocType, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  file: {
    label: 'File',
    icon: '📄',
    color: 'blue',
    description: 'Uploaded files (PDF, DOC, images, etc.)'
  },
  text: {
    label: 'Text Document',
    icon: '📝',
    color: 'green',
    description: 'Rich text documents created in-app'
  },
  link: {
    label: 'Web Link',
    icon: '🔗',
    color: 'purple',
    description: 'External web links and resources'
  },
};

// Document visibility metadata for UI
export const DOCUMENT_VISIBILITY_META: Record<DocumentVisibility, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  private: {
    label: 'Private',
    icon: '🔒',
    color: 'gray',
    description: 'Only you can access this document'
  },
  shared: {
    label: 'Shared',
    icon: '👥',
    color: 'blue',
    description: 'Shared with specific team members'
  },
  org: {
    label: 'Organization',
    icon: '🏢',
    color: 'green',
    description: 'Everyone in the organization can access'
  },
};

// Document filter options for UI
export interface DocumentFilters {
  docType?: BrandDocType | null;
  category?: DocumentCategory | null;
  visibility?: DocumentVisibility | null;
  search?: string;
  tags?: string[];
  createdBy?: string | null;
  isPinned?: boolean | null;
}

// Document sort options
export type DocumentSortOption = 
  | 'created_at_desc'
  | 'created_at_asc'
  | 'updated_at_desc'
  | 'title_asc'
  | 'title_desc';

// Create document input types
export interface CreateFileDocumentInput {
  doc_type: 'file';
  title: string;
  description?: string;
  tags?: string[];
  category?: DocumentCategory;
  visibility?: DocumentVisibility;
  shared_with?: string[];
  file: File; // The actual file to upload
}

export interface CreateTextDocumentInput {
  doc_type: 'text';
  title: string;
  description?: string;
  content: string;
  tags?: string[];
  category?: DocumentCategory;
  visibility?: DocumentVisibility;
  shared_with?: string[];
}

export interface CreateLinkDocumentInput {
  doc_type: 'link';
  title: string;
  description?: string;
  url: string;
  tags?: string[];
  category?: DocumentCategory;
  visibility?: DocumentVisibility;
  shared_with?: string[];
}

export type CreateDocumentInput = 
  | CreateFileDocumentInput 
  | CreateTextDocumentInput 
  | CreateLinkDocumentInput;

// Update document input
export interface UpdateDocumentInput {
  title?: string;
  description?: string;
  content?: string; // For text docs
  tags?: string[];
  category?: DocumentCategory;
  visibility?: DocumentVisibility;
  shared_with?: string[];
  is_pinned?: boolean;
  folder_id?: string | null;
}

// ============================================================================
// Document Folders Types
// ============================================================================

// Folder color options
export type FolderColor = 'blue' | 'purple' | 'pink' | 'green' | 'yellow' | 'red' | 'indigo' | 'cyan' | 'orange' | 'gray';

// Folder color metadata for UI
export const FOLDER_COLOR_META: Record<FolderColor, {
  bg: string;
  text: string;
  border: string;
  darkBg: string;
  darkText: string;
  icon: string;
  borderActive: string;
}> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-300', icon: 'text-blue-500', borderActive: 'border-l-blue-600' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', darkBg: 'dark:bg-purple-900/30', darkText: 'dark:text-purple-300', icon: 'text-purple-500', borderActive: 'border-l-purple-600' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', darkBg: 'dark:bg-pink-900/30', darkText: 'dark:text-pink-300', icon: 'text-pink-500', borderActive: 'border-l-pink-600' },
  green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', darkBg: 'dark:bg-green-900/30', darkText: 'dark:text-green-300', icon: 'text-green-500', borderActive: 'border-l-green-600' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', darkBg: 'dark:bg-yellow-900/30', darkText: 'dark:text-yellow-300', icon: 'text-yellow-500', borderActive: 'border-l-yellow-500' },
  red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-300', icon: 'text-red-500', borderActive: 'border-l-red-600' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', darkBg: 'dark:bg-indigo-900/30', darkText: 'dark:text-indigo-300', icon: 'text-indigo-500', borderActive: 'border-l-indigo-600' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', darkBg: 'dark:bg-cyan-900/30', darkText: 'dark:text-cyan-300', icon: 'text-cyan-500', borderActive: 'border-l-cyan-600' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-300', icon: 'text-orange-500', borderActive: 'border-l-orange-500' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', darkBg: 'dark:bg-gray-800', darkText: 'dark:text-gray-300', icon: 'text-gray-500', borderActive: 'border-l-gray-600' },
};

// Smart folder criteria for AI auto-categorization
export interface SmartFolderCriteria {
  keywords?: string[];           // Keywords to match in document content/title
  categories?: DocumentCategory[]; // Document categories to include
  doc_types?: BrandDocType[];    // Document types to include
  tags?: string[];               // Tags to match
  confidence_threshold?: number;  // Minimum confidence for AI categorization (0-1)
  date_range?: {                 // Optional date filter
    from?: string;
    to?: string;
  };
}

// Document Folder interface
export interface DocumentFolder {
  id: string;
  brand_id: string;
  created_by: string;
  
  // Folder details
  name: string;
  description?: string;
  color: FolderColor;
  icon: string;
  
  // Smart folder fields
  is_smart: boolean;
  smart_criteria?: SmartFolderCriteria;
  
  // Organization
  sort_order: number;
  parent_folder_id?: string;
  
  // Stats
  document_count: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Joined data
  creator?: Profile;
}

// Create folder input
export interface CreateFolderInput {
  name: string;
  description?: string;
  color?: FolderColor;
  icon?: string;
  is_smart?: boolean;
  smart_criteria?: SmartFolderCriteria;
  parent_folder_id?: string;
}

// Update folder input
export interface UpdateFolderInput {
  name?: string;
  description?: string;
  color?: FolderColor;
  icon?: string;
  smart_criteria?: SmartFolderCriteria;
  sort_order?: number;
  parent_folder_id?: string | null;
}

// AI organization result for smart folders
export interface AIOrganizeResult {
  folder_id: string;
  folder_name: string;
  document_id: string;
  document_title: string;
  confidence: number;
  reason: string;
}

// Preset smart folder templates
export const SMART_FOLDER_PRESETS: Array<{
  name: string;
  description: string;
  icon: string;
  color: FolderColor;
  criteria: SmartFolderCriteria;
}> = [
  {
    name: 'Brand Assets',
    description: 'Brand guidelines, logos, and style guides',
    icon: '🎨',
    color: 'purple',
    criteria: {
      categories: ['brand_guidelines', 'style_guide'],
      keywords: ['brand', 'logo', 'guidelines', 'style', 'colors', 'fonts'],
      confidence_threshold: 0.6,
    },
  },
  {
    name: 'Product Information',
    description: 'Product details, specs, and catalogs',
    icon: '📦',
    color: 'orange',
    criteria: {
      categories: ['product_info'],
      keywords: ['product', 'specification', 'catalog', 'SKU', 'inventory', 'price'],
      confidence_threshold: 0.6,
    },
  },
  {
    name: 'Marketing Materials',
    description: 'Campaigns, promotions, and marketing content',
    icon: '📣',
    color: 'green',
    criteria: {
      categories: ['marketing'],
      keywords: ['campaign', 'promotion', 'marketing', 'ad', 'banner', 'social'],
      confidence_threshold: 0.6,
    },
  },
  {
    name: 'Research & Insights',
    description: 'Market research, competitor analysis, and insights',
    icon: '🔬',
    color: 'cyan',
    criteria: {
      categories: ['research', 'competitor'],
      keywords: ['research', 'analysis', 'insight', 'competitor', 'market', 'trends'],
      confidence_threshold: 0.6,
    },
  },
  {
    name: 'Customer Content',
    description: 'Testimonials, reviews, and customer feedback',
    icon: '⭐',
    color: 'yellow',
    criteria: {
      categories: ['testimonial'],
      keywords: ['testimonial', 'review', 'feedback', 'customer', 'success story'],
      confidence_threshold: 0.6,
    },
  },
];

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
  // AI Model preferences
  enabled_models: string[] | null; // null means all models enabled
  default_model: string | null;
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
  | 'delete'
  | 'share_with_team'
  | 'make_private';

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
// CUSTOM MODES - Enhanced with Tool & Artifact Configuration
// =============================================================================

// Agent types for the agent system
export type AgentType = 'orchestrator' | 'specialist' | 'hybrid';

// Agent behavior configuration
export interface AgentBehavior {
  /** Show thinking/reasoning in UI */
  show_thinking?: boolean;
  /** Automatically invoke suggested agents without asking */
  auto_invoke?: boolean;
  /** Maximum number of agents that can be chained in a single response */
  chain_limit?: number;
  /** Announce when switching to another agent */
  announce_agent_switch?: boolean;
}

// Tool configuration for modes/agents
export interface ModeToolConfig {
  create_artifact?: {
    enabled: boolean;
    allowed_kinds?: string[] | null;
  };
  create_conversation?: {
    enabled: boolean;
  };
  create_bulk_conversations?: {
    enabled: boolean;
  };
  suggest_conversation_plan?: {
    enabled: boolean;
  };
  suggest_action?: {
    enabled: boolean;
  };
  /** Agent invocation tool - allows this agent to invoke other agents */
  invoke_agent?: {
    enabled: boolean;
    /** Which agents this agent can invoke (empty = all) */
    allowed_agents?: string[];
  };
  web_search?: {
    enabled: boolean;
    allowed_domains?: string[];
    max_uses?: number;
  };
  save_memory?: {
    enabled: boolean;
  };
  generate_image?: {
    enabled: boolean;
    /** Which image models are allowed in this mode */
    allowed_models?: string[];
    /** Default model when user doesn't specify */
    default_model?: string;
    /** Default size */
    default_size?: '1024x1024' | '1024x1792' | '1792x1024';
    /** Default style (OpenAI only) */
    default_style?: 'natural' | 'vivid';
    /** Max images per request */
    max_images?: number;
  };
  /** Shopify MCP integration for direct product catalog access */
  shopify_product_search?: {
    enabled: boolean;
    /** Specific Shopify tools to enable (empty = all available) */
    allowed_tools?: string[];
    /** Maximum product searches per conversation */
    max_searches?: number;
  };
}

/**
 * Agent interface (formerly CustomMode)
 * Represents an AI agent with specific capabilities, tools, and behaviors.
 * The underlying database table is still `custom_modes` for backwards compatibility.
 */
export interface CustomMode {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon: string;
  color: ModeColor;
  system_prompt: string;

  // Tool & Artifact Configuration
  enabled_tools?: ModeToolConfig;
  primary_artifact_types?: string[];

  // Agent System Configuration
  /** Whether this agent has advanced capabilities enabled */
  is_agent_enabled?: boolean;
  /** Type of agent: orchestrator (routes to others), specialist (focused task), hybrid (both) */
  agent_type?: AgentType;
  /** Array of agent IDs this agent can invoke */
  can_invoke_agents?: string[];
  /** Default specialist to use for this agent */
  default_agent?: string;
  /** Agent behavior configuration */
  agent_behavior?: AgentBehavior;

  // Status
  is_active: boolean;
  is_default: boolean;
  sort_order: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Agent type alias for CustomMode
 * Use this in new code for clarity - "Agent" is the user-facing term
 */
export type Agent = CustomMode;

// Default tool configuration
export const DEFAULT_MODE_TOOL_CONFIG: ModeToolConfig = {
  create_artifact: {
    enabled: true,
    allowed_kinds: null, // null means all kinds allowed
  },
  create_conversation: {
    enabled: true,
  },
  create_bulk_conversations: {
    enabled: true, // Enabled by default to support flow/sequence creation
  },
  suggest_conversation_plan: {
    enabled: true, // Enabled by default - AI should always be able to propose plans
  },
  suggest_action: {
    enabled: true,
  },
  web_search: {
    enabled: false,
    allowed_domains: [],
    max_uses: 5,
  },
  save_memory: {
    enabled: true,
  },
  generate_image: {
    enabled: false,
    default_model: 'google/gemini-2.5-flash-image',
    allowed_models: ['google/gemini-2.5-flash-image', 'openai/dall-e-3'],
    default_size: '1024x1024',
    max_images: 2,
  },
  shopify_product_search: {
    enabled: true, // Enabled by default if brand has Shopify store
    allowed_tools: [], // Empty = all tools available
    max_searches: 10,
  },
};

// Available image models
export const IMAGE_MODELS = {
  // OpenAI
  DALLE_3: 'openai/dall-e-3',
  DALLE_2: 'openai/dall-e-2',
  GPT_IMAGE_1: 'openai/gpt-image-1',
  
  // Google "Nano Banana" / Gemini Flash Image
  GEMINI_FLASH_IMAGE: 'google/gemini-2.5-flash-image',
  IMAGEN_3: 'google/imagen-3',
} as const;

export type ImageModelId = typeof IMAGE_MODELS[keyof typeof IMAGE_MODELS];

// Helper to create a new mode with defaults
export function createDefaultMode(partial: Partial<CustomMode> & { name: string; system_prompt: string }): Omit<CustomMode, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  return {
    name: partial.name,
    description: partial.description || '',
    icon: partial.icon || '💬',
    color: partial.color || 'blue',
    system_prompt: partial.system_prompt,
    enabled_tools: partial.enabled_tools || DEFAULT_MODE_TOOL_CONFIG,
    primary_artifact_types: partial.primary_artifact_types || ['email'],
    is_active: partial.is_active ?? true,
    is_default: partial.is_default || false,
    sort_order: partial.sort_order || 0,
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


