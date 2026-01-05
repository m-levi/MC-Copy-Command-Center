// =====================================================
// ARTIFACT SYSTEM TYPES
// Extensible artifact system for email, flows, campaigns, etc.
// =====================================================

import { EmailType } from './index';
import type { GenerativeUIBlock } from './generative-ui';

// =====================================================
// CORE TYPES - Extensible foundation for all artifacts
// =====================================================

/**
 * Artifact kinds - Add new types here as the system grows
 * Each kind has its own viewer component registered in the artifact registry
 */
export type ArtifactKind =
  | 'email'           // Email copy with A/B/C variants
  | 'flow'            // Email flow/automation sequences
  | 'campaign'        // Full campaign plans
  | 'template'        // Reusable templates
  | 'subject_lines'   // Subject line variants
  | 'content_brief'   // Content briefs/outlines
  | 'email_brief'     // Email brief for calendar planning
  | 'calendar'        // Visual email calendar with scheduled items
  // Baseline artifact types
  | 'markdown'        // Rich text documents
  | 'spreadsheet'     // Structured data tables
  | 'code'            // Code snippets with syntax highlighting
  | 'checklist';      // Interactive todo/checklist

// Legacy type alias for backwards compatibility
export type ArtifactType = ArtifactKind;

export type ArtifactVariant = 'a' | 'b' | 'c';
export type ArtifactStatus = 'draft' | 'final' | 'archived';

// =====================================================
// BASE ARTIFACT - All artifacts extend this
// =====================================================

/**
 * Base artifact interface - the foundation for all artifact types
 * Type-specific data goes in the `metadata` field
 */
export interface BaseArtifact<K extends ArtifactKind = ArtifactKind, M = Record<string, unknown>> {
  id: string;
  kind: K;
  conversation_id: string;
  user_id: string;
  title: string;
  content: string;
  version: number;
  metadata: M & SharedMetadata;
  created_at: string;
  updated_at: string;
}

/**
 * Shared metadata fields used across artifact types
 */
export interface SharedMetadata {
  // Sharing
  share_token?: string;
  is_shared?: boolean;
  shared_at?: string;

  // Source tracking
  source_message_id?: string;

  // Status
  status?: ArtifactStatus;

  // Generative UI - interactive elements within artifacts
  generative_ui?: GenerativeUIBlock[];
}

// =====================================================
// EMAIL ARTIFACT - Email copy with A/B/C variants
// =====================================================

export interface EmailArtifactMetadata extends SharedMetadata {
  email_type?: EmailType;
  selected_variant?: ArtifactVariant;
  
  // A/B/C variant content
  version_a_content?: string;
  version_a_approach?: string;
  version_b_content?: string;
  version_b_approach?: string;
  version_c_content?: string;
  version_c_approach?: string;
}

export interface EmailArtifact extends BaseArtifact<'email', EmailArtifactMetadata> {}

/**
 * Flattened email artifact for easier consumption in components
 * This merges metadata fields to the top level
 */
export interface EmailArtifactWithContent extends Omit<EmailArtifact, 'metadata'> {
  // Core fields
  type: 'email';
  status: ArtifactStatus;
  is_shared: boolean;
  share_token?: string;
  shared_at?: string;

  // Email specific
  email_type?: EmailType;
  selected_variant?: ArtifactVariant;
  source_message_id?: string;

  // Variant content (flattened from metadata)
  version_a_content?: string;
  version_a_approach?: string;
  version_b_content?: string;
  version_b_approach?: string;
  version_c_content?: string;
  version_c_approach?: string;

  // Version info
  version_count?: number;
  current_version_number?: number;
  latest_change_summary?: string;

  // Generative UI (from SharedMetadata)
  generative_ui?: GenerativeUIBlock[];

  // Extended fields for other artifact kinds (optional, flattened from metadata)
  // Code artifact fields
  language?: string;
  filename?: string;
  description?: string;

  // Spreadsheet artifact fields
  columns?: SpreadsheetColumn[];
  rows?: SpreadsheetRow[];
  has_header?: boolean;

  // Checklist artifact fields
  items?: ChecklistItem[];
  allow_add?: boolean;
  show_progress?: boolean;

  // Email brief artifact fields (for calendar planning)
  campaign_type?: EmailBriefCampaignType;
  send_date?: string;
  target_segment?: string;
  objective?: string;
  key_message?: string;
  value_proposition?: string;
  product_ids?: string[];
  call_to_action?: string;
  subject_line_direction?: string;
  tone_notes?: string;
  content_guidelines?: string;
  approval_status?: EmailBriefApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_notes?: string;
  calendar_artifact_id?: string;
  email_conversation_id?: string;
}

// =====================================================
// FLOW ARTIFACT - Email flow/automation sequences
// =====================================================

export interface FlowStep {
  id: string;
  type: 'email' | 'delay' | 'condition' | 'action';
  title: string;
  content?: string;
  config?: Record<string, unknown>;
  next_steps?: string[];
}

export interface FlowArtifactMetadata extends SharedMetadata {
  steps?: FlowStep[];
  trigger?: {
    type: string;
    config?: Record<string, unknown>;
  };
  flow_type?: 'welcome' | 'abandoned_cart' | 'post_purchase' | 'winback' | 'custom';
}

export interface FlowArtifact extends BaseArtifact<'flow', FlowArtifactMetadata> {}

// =====================================================
// CAMPAIGN ARTIFACT - Full campaign plans
// =====================================================

export interface CampaignArtifactMetadata extends SharedMetadata {
  campaign_type?: 'promotional' | 'announcement' | 'seasonal' | 'newsletter';
  target_audience?: string;
  goals?: string[];
  channels?: ('email' | 'sms' | 'push')[];
  scheduled_date?: string;
  email_artifacts?: string[]; // References to email artifact IDs
}

export interface CampaignArtifact extends BaseArtifact<'campaign', CampaignArtifactMetadata> {}

// =====================================================
// TEMPLATE ARTIFACT - Reusable templates
// =====================================================

export interface TemplateArtifactMetadata extends SharedMetadata {
  template_type?: 'email' | 'flow' | 'campaign';
  variables?: string[];
  category?: string;
  is_public?: boolean;
}

export interface TemplateArtifact extends BaseArtifact<'template', TemplateArtifactMetadata> {}

// =====================================================
// SUBJECT LINE ARTIFACT - Subject line variants
// =====================================================

export interface SubjectLineVariant {
  text: string;
  approach?: string;
  emoji_usage?: boolean;
  character_count?: number;
}

export interface SubjectLineArtifactMetadata extends SharedMetadata {
  variants?: SubjectLineVariant[];
  selected_index?: number;
  email_artifact_id?: string;
}

export interface SubjectLineArtifact extends BaseArtifact<'subject_lines', SubjectLineArtifactMetadata> {}

// =====================================================
// EMAIL BRIEF ARTIFACT - For calendar planning
// =====================================================

/**
 * Campaign type for email briefs
 */
export type EmailBriefCampaignType =
  | 'promotional'
  | 'content'
  | 'announcement'
  | 'transactional'
  | 'nurture';

/**
 * Approval status for email briefs
 */
export type EmailBriefApprovalStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected';

export interface EmailBriefArtifactMetadata extends SharedMetadata {
  // Campaign classification
  campaign_type: EmailBriefCampaignType;
  send_date?: string;
  target_segment?: string;

  // Brief content
  objective: string;
  key_message: string;
  value_proposition?: string;
  product_ids?: string[];  // Reference to Shopify products
  call_to_action: string;

  // Direction for copywriter
  subject_line_direction?: string;
  tone_notes?: string;
  content_guidelines?: string;

  // Approval workflow
  approval_status: EmailBriefApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_notes?: string;

  // Calendar linkage
  calendar_artifact_id?: string;
  calendar_slot_index?: number;

  // Child conversation (when email is written)
  email_conversation_id?: string;
}

export interface EmailBriefArtifact extends BaseArtifact<'email_brief', EmailBriefArtifactMetadata> {}

// =====================================================
// MARKDOWN ARTIFACT - Rich text documents
// =====================================================

export interface MarkdownArtifactMetadata extends SharedMetadata {
  format?: 'article' | 'notes' | 'documentation';
}

export interface MarkdownArtifact extends BaseArtifact<'markdown', MarkdownArtifactMetadata> {}

// =====================================================
// SPREADSHEET ARTIFACT - Structured data tables
// =====================================================

export interface SpreadsheetColumn {
  id: string;
  name: string;
  type?: 'text' | 'number' | 'date' | 'boolean';
  width?: number;
}

export interface SpreadsheetRow {
  id: string;
  cells: Record<string, string | number | boolean | null>;
}

export interface SpreadsheetArtifactMetadata extends SharedMetadata {
  columns: SpreadsheetColumn[];
  rows: SpreadsheetRow[];
  has_header?: boolean;
}

export interface SpreadsheetArtifact extends BaseArtifact<'spreadsheet', SpreadsheetArtifactMetadata> {}

// =====================================================
// CODE ARTIFACT - Code snippets with syntax highlighting
// =====================================================

export interface CodeArtifactMetadata extends SharedMetadata {
  language: string;
  filename?: string;
  description?: string;
}

export interface CodeArtifact extends BaseArtifact<'code', CodeArtifactMetadata> {}

// =====================================================
// CHECKLIST ARTIFACT - Interactive todo/checklist
// =====================================================

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  indent?: number;
}

export interface ChecklistArtifactMetadata extends SharedMetadata {
  items: ChecklistItem[];
  allow_add?: boolean;
  show_progress?: boolean;
}

export interface ChecklistArtifact extends BaseArtifact<'checklist', ChecklistArtifactMetadata> {}

// =====================================================
// CALENDAR ARTIFACT - Visual email calendar
// =====================================================

/**
 * A slot/item on the calendar representing a planned email
 */
export interface CalendarSlot {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  title: string;
  description?: string;
  email_type?: 'promotional' | 'content' | 'announcement' | 'transactional' | 'nurture';
  status?: 'draft' | 'scheduled' | 'sent' | 'approved' | 'pending';
  email_brief_id?: string; // Link to email brief artifact
  email_artifact_id?: string; // Link to generated email artifact
  conversation_id?: string; // Link to conversation where email was created
  color?: string; // Optional color coding
  timing?: string; // Human readable timing like "Morning" or "10:00 AM"
}

export interface CalendarArtifactMetadata extends SharedMetadata {
  // Calendar period
  month: string; // YYYY-MM format
  year?: number;

  // Calendar slots/items
  slots: CalendarSlot[];

  // Calendar settings
  view_mode?: 'month' | 'week' | 'list';
  show_weekends?: boolean;
  first_day_of_week?: 0 | 1; // 0 = Sunday, 1 = Monday

  // Campaign context
  campaign_name?: string;
  campaign_type?: string;
  brand_id?: string;
}

export interface CalendarArtifact extends BaseArtifact<'calendar', CalendarArtifactMetadata> {}

// =====================================================
// UNION TYPE - All possible artifact types
// =====================================================

export type Artifact =
  | EmailArtifact
  | FlowArtifact
  | CampaignArtifact
  | TemplateArtifact
  | SubjectLineArtifact
  | EmailBriefArtifact
  | CalendarArtifact
  | MarkdownArtifact
  | SpreadsheetArtifact
  | CodeArtifact
  | ChecklistArtifact;

// =====================================================
// ARTIFACT VERSION - For version history
// =====================================================

export interface ArtifactVersion {
  id: string;
  artifact_id: string;
  version: number;
  content: string;
  title?: string;
  change_type: 'created' | 'edited' | 'restored';
  change_summary?: string;
  triggered_by_message_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// =====================================================
// STREAMING STATE
// =====================================================

export interface ArtifactStreamingState {
  isStreaming: boolean;
  artifactId: string | null;
  artifactKind: ArtifactKind | null;
  streamingVariant: ArtifactVariant | null;
  partialContent: string;
}

// =====================================================
// INPUT TYPES - For creating/updating artifacts
// =====================================================

export interface CreateArtifactInput<K extends ArtifactKind = ArtifactKind> {
  kind: K;
  conversation_id: string;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
  message_id?: string;
}

export interface CreateEmailArtifact extends Omit<CreateArtifactInput<'email'>, 'kind' | 'content'> {
  title?: string;
  description?: string;
  email_type?: EmailType;
  
  // Initial content
  version_a_content?: string;
  version_a_approach?: string;
  version_b_content?: string;
  version_b_approach?: string;
  version_c_content?: string;
  version_c_approach?: string;
  
  // Source message
  message_id?: string;
}

export interface CreateEmailArtifactVersion {
  artifact_id: string;
  message_id?: string;
  
  version_a_content?: string;
  version_a_approach?: string;
  version_b_content?: string;
  version_b_approach?: string;
  version_c_content?: string;
  version_c_approach?: string;
  
  change_summary?: string;
  selected_variant?: ArtifactVariant;
}

// =====================================================
// ARTIFACT REGISTRY - For extensible viewers
// =====================================================

/**
 * Configuration for each artifact kind
 * Used by the artifact sidebar to render the appropriate viewer
 */
export interface ArtifactKindConfig {
  kind: ArtifactKind;
  label: string;
  icon: string; // Lucide icon name
  description: string;
  supportsVariants: boolean;
  supportsSharing: boolean;
  supportsComments: boolean;
}

/**
 * Registry of all artifact kinds and their configurations
 */
export const ARTIFACT_KIND_REGISTRY: Record<ArtifactKind, ArtifactKindConfig> = {
  email: {
    kind: 'email',
    label: 'Email Copy',
    icon: 'Mail',
    description: 'Email copy with A/B/C variants',
    supportsVariants: true,
    supportsSharing: true,
    supportsComments: true,
  },
  flow: {
    kind: 'flow',
    label: 'Email Flow',
    icon: 'GitBranch',
    description: 'Email automation sequences',
    supportsVariants: false,
    supportsSharing: true,
    supportsComments: true,
  },
  campaign: {
    kind: 'campaign',
    label: 'Campaign',
    icon: 'Megaphone',
    description: 'Full campaign plans',
    supportsVariants: false,
    supportsSharing: true,
    supportsComments: true,
  },
  template: {
    kind: 'template',
    label: 'Template',
    icon: 'FileText',
    description: 'Reusable templates',
    supportsVariants: false,
    supportsSharing: true,
    supportsComments: false,
  },
  subject_lines: {
    kind: 'subject_lines',
    label: 'Subject Lines',
    icon: 'Type',
    description: 'Subject line variants',
    supportsVariants: true,
    supportsSharing: true,
    supportsComments: false,
  },
  content_brief: {
    kind: 'content_brief',
    label: 'Content Brief',
    icon: 'FileEdit',
    description: 'Content briefs and outlines',
    supportsVariants: false,
    supportsSharing: true,
    supportsComments: true,
  },
  email_brief: {
    kind: 'email_brief',
    label: 'Email Brief',
    icon: 'ClipboardList',
    description: 'Email brief for campaign calendar planning',
    supportsVariants: false,
    supportsSharing: true,
    supportsComments: true,
  },
  calendar: {
    kind: 'calendar',
    label: 'Email Calendar',
    icon: 'Calendar',
    description: 'Visual email marketing calendar with scheduled items',
    supportsVariants: false,
    supportsSharing: true,
    supportsComments: true,
  },
  // Baseline artifact types
  markdown: {
    kind: 'markdown',
    label: 'Document',
    icon: 'FileText',
    description: 'Rich text document with formatting',
    supportsVariants: false,
    supportsSharing: true,
    supportsComments: true,
  },
  spreadsheet: {
    kind: 'spreadsheet',
    label: 'Spreadsheet',
    icon: 'Table',
    description: 'Structured data in rows and columns',
    supportsVariants: false,
    supportsSharing: true,
    supportsComments: true,
  },
  code: {
    kind: 'code',
    label: 'Code',
    icon: 'Code',
    description: 'Code snippet with syntax highlighting',
    supportsVariants: false,
    supportsSharing: true,
    supportsComments: true,
  },
  checklist: {
    kind: 'checklist',
    label: 'Checklist',
    icon: 'CheckSquare',
    description: 'Interactive todo list',
    supportsVariants: false,
    supportsSharing: true,
    supportsComments: true,
  },
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Type guard to check if an artifact is an email artifact
 */
export function isEmailArtifact(artifact: { kind: ArtifactKind }): artifact is EmailArtifact {
  return artifact.kind === 'email';
}

/**
 * Type guard to check if an artifact is a flow artifact
 */
export function isFlowArtifact(artifact: { kind: ArtifactKind }): artifact is FlowArtifact {
  return artifact.kind === 'flow';
}

/**
 * Type guard to check if an artifact is a markdown artifact
 */
export function isMarkdownArtifact(artifact: { kind: ArtifactKind }): artifact is MarkdownArtifact {
  return artifact.kind === 'markdown';
}

/**
 * Type guard to check if an artifact is a spreadsheet artifact
 */
export function isSpreadsheetArtifact(artifact: { kind: ArtifactKind }): artifact is SpreadsheetArtifact {
  return artifact.kind === 'spreadsheet';
}

/**
 * Type guard to check if an artifact is a code artifact
 */
export function isCodeArtifact(artifact: { kind: ArtifactKind }): artifact is CodeArtifact {
  return artifact.kind === 'code';
}

/**
 * Type guard to check if an artifact is a checklist artifact
 */
export function isChecklistArtifact(artifact: { kind: ArtifactKind }): artifact is ChecklistArtifact {
  return artifact.kind === 'checklist';
}

/**
 * Type guard to check if an artifact is an email brief artifact
 */
export function isEmailBriefArtifact(artifact: { kind: ArtifactKind }): artifact is EmailBriefArtifact {
  return artifact.kind === 'email_brief';
}

/**
 * Type guard to check if an artifact is a calendar artifact
 */
export function isCalendarArtifact(artifact: { kind: ArtifactKind }): artifact is CalendarArtifact {
  return artifact.kind === 'calendar';
}

/**
 * Get the configuration for an artifact kind
 */
export function getArtifactKindConfig(kind: ArtifactKind): ArtifactKindConfig {
  return ARTIFACT_KIND_REGISTRY[kind];
}

/**
 * Check if an artifact kind supports variants
 */
export function artifactSupportsVariants(kind: ArtifactKind): boolean {
  return ARTIFACT_KIND_REGISTRY[kind]?.supportsVariants ?? false;
}




























