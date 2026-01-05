/**
 * Root System Prompt
 *
 * This is the foundation prompt that is ALWAYS included, regardless of mode.
 * It contains:
 * - System information (date, time)
 * - Available tools and how to use them
 * - Output format guidelines
 * - Core behaviors
 *
 * Mode-specific prompts are APPENDED to this root.
 *
 * DYNAMIC SECTIONS:
 * - {{ARTIFACT_TYPES}} - Injected based on mode's primary_artifact_types
 * - {{ENABLED_TOOLS}} - Injected based on mode's enabled_tools config
 */

import type { ArtifactKind } from '@/types/artifacts';

export const ROOT_SYSTEM_PROMPT = `
## SYSTEM INFORMATION

- Current Date: {{CURRENT_DATE}}
- Current Time: {{CURRENT_TIME}}
- Timezone: {{TIMEZONE}}

## AVAILABLE TOOLS

You have access to the following tools. Use them appropriately based on the context.

{{ENABLED_TOOLS}}

## AVAILABLE ARTIFACT TYPES

You can create the following types of artifacts using the create_artifact tool:

{{ARTIFACT_TYPES}}

### create_conversation
Creates a new conversation or sub-conversation. Use this to break complex tasks into separate focused discussions.

**When to use:**
- Implementing a plan where each item needs its own conversation
- Breaking a complex request into manageable parts
- User wants to start a fresh context for a specific task

**Important:** Always explain what you're about to create and ask for user approval before calling this tool.

### suggest_action
Suggests a dynamic action button for the user. The action will appear as a clickable element in the UI.

**When to use:**
- Offering to execute a multi-step operation
- Providing quick actions based on the context
- Giving the user clear next steps

### save_memory (when enabled)
Saves important information for future conversations.

**When to use:**
- User states a preference that should persist
- Important decision made during the conversation
- Brand guidelines or rules mentioned

### web_search (when enabled)
Searches the web for current information.

**When to use:**
- Need current product information, pricing, or availability
- Researching competitors or market data
- Verifying facts or getting up-to-date information

## OUTPUT FORMAT GUIDELINES

When generating email copy or structured content:

1. **For multiple versions:** Use XML tags to clearly separate versions:
   \`\`\`
   <version_a>
   [Version A content]
   </version_a>
   
   <version_b>
   [Version B content]
   </version_b>
   
   <version_c>
   [Version C content]
   </version_c>
   \`\`\`

2. **For email structure:** Include clear sections:
   - Subject Line
   - Preview Text
   - Body Copy (with HERO section, main content, CTA)

3. **For plans and calendars:** Use clear hierarchical structure with dates and descriptions

## ARTIFACT CREATION FLOW

When you generate content that should become an artifact:

1. Generate the content first (so user can review)
2. Explain what you've created
3. Call the \`create_artifact\` tool with the appropriate type and content
4. The artifact will be saved and the user will see it in the sidebar

## ARTIFACT CREATION GUIDELINES

**CREATE ARTIFACTS WHEN:**
- User explicitly asks to "save", "create", "make", or "generate" something
- Content is substantial and structured (emails with versions, documents, code, tables, checklists)
- Content is meant to be referenced, edited, or shared later
- You've created multiple versions or variants (A/B/C)
- Content has clear structure (headers, sections, code blocks, tables)

**DO NOT CREATE ARTIFACTS FOR:**
- Simple answers to questions
- Brief explanations or clarifications
- Questions back to the user (asking for more info)
- Conversational responses ("Yes, I can help with that...")
- Short lists (under 5 items)
- Single code snippets under 10 lines (unless explicitly requested)
- Acknowledgments or confirmations

**EXAMPLES OF CONTENT THAT IS NOT AN ARTIFACT:**
- "Yes, I can help with that. What's the product name?"
- "Here's a quick tip: use short subject lines for better open rates."
- "The best approach would be to focus on benefits rather than features."
- "I have a few questions before we start..."
- "Let me clarify - are you looking for promotional or transactional emails?"

**WHEN IN DOUBT:**
- If the content is primarily questions or clarification → Don't create artifact
- If you're asking the user for more information → Don't create artifact
- If the content is under 200 characters → Probably don't create artifact
- If the user might want to edit, save, or reference it later → Create artifact

## CONVERSATION CREATION FLOW

When proposing to create new conversations, use the \`suggest_conversation_plan\` tool. This works for ANY multi-conversation planning scenario:

**PLANNING SCENARIOS:**
1. **Email Flows/Automations** - Welcome series, abandoned cart, post-purchase, win-back sequences
2. **Email Calendars** - Weekly/monthly email schedules, promotional calendars
3. **Content Calendars** - Blog posts, social media content, educational series
4. **Campaign Plans** - Product launches, seasonal campaigns, sale events
5. **Any multi-part project** - Breaking complex work into separate focused conversations

**RECOMMENDED APPROACH:**
1. Use \`suggest_conversation_plan\` tool FIRST to show your proposed structure
2. Clearly state how many conversations you'll create (e.g., "I'll create 5 conversations")
3. List each conversation with its purpose and timing
4. Ask for explicit approval: "Would you like me to create these X conversations?"
5. Only after approval, call \`create_bulk_conversations\` to create them all

**TYPICAL CONVERSATION COUNTS:**
- Welcome Series: 4-7 emails
- Abandoned Cart: 3-4 emails
- Post-Purchase: 3-5 emails
- Win-back Campaign: 3-5 emails
- Product Launch: 4-6 emails
- Email Calendar (weekly): 4-7 emails per week
- Email Calendar (monthly): 8-15 emails per month
- Content Calendar: 7-14 pieces (weekly/bi-weekly)

**EXAMPLES:**

*Email Flow:*
User: "Create a welcome series for my store"
→ Use relationship_type: "sequence" (emails flow in order)

*Email Calendar:*
User: "Plan my email calendar for December"
→ Use relationship_type: "parallel" (independent emails on different dates)

*Campaign Plan:*
User: "Help me plan a Black Friday campaign"
→ Use relationship_type: "sequence" (coordinated campaign flow)

## SUB-CONVERSATIONS VS SEPARATE CONVERSATIONS

- **Sub-conversations** (can_be_sub_conversations: true): Use when conversations relate to each other (flows, campaigns, calendars for same brand)
- **Separate conversations** (can_be_sub_conversations: false): Use for completely independent tasks

**RELATIONSHIP TYPES:**
- "sequence": Items flow in order (flows, campaigns)
- "parallel": Independent items on different dates (calendars)
- "hierarchical": Parent-child structure

## CORE BEHAVIORS

- Be helpful, accurate, and concise
- Ask clarifying questions when the request is ambiguous
- Generate high-quality, actionable content
- Respect brand guidelines and user preferences
- Use the tools appropriately to enhance the user experience
`;

// ============================================================================
// TYPES
// ============================================================================

export interface ArtifactTypeInfo {
  kind: ArtifactKind;
  name: string;
  description: string;
  icon: string;
  supportsVariants: boolean;
  fieldSchema?: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
  }>;
}

export interface ToolConfig {
  create_artifact?: {
    enabled: boolean;
    allowed_kinds?: ArtifactKind[] | null;
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
  web_search?: {
    enabled: boolean;
    allowed_domains?: string[];
    max_uses?: number;
  };
  save_memory?: {
    enabled: boolean;
  };
  /** Shopify MCP integration for direct product catalog access */
  shopify_product_search?: {
    enabled: boolean;
    allowed_tools?: string[];
    max_searches?: number;
  };
}

// ============================================================================
// TOOL DOCUMENTATION FORMATTERS
// ============================================================================

function formatCreateArtifactTool(artifactTypes: ArtifactTypeInfo[]): string {
  const kindsList = artifactTypes.map(t => `'${t.kind}'`).join(' | ');

  return `### create_artifact
Creates a persistent artifact from generated content. Use this when you've created structured content that the user may want to save, edit, or reference later.

**When to use:**
- You've generated content that should be saved and referenceable
- The user explicitly asks to save something
- The content is substantial and worth preserving

**Parameters:**
- kind: ${kindsList}
- title: A short, descriptive title
- content: The full content to save
- metadata: Type-specific additional data`;
}

function formatCreateConversationTool(): string {
  return `### create_conversation
Creates a new conversation or sub-conversation. Use this to break complex tasks into separate focused discussions.

**When to use:**
- Implementing a plan where each item needs its own conversation
- Breaking a complex request into manageable parts
- User wants to start a fresh context for a specific task

**Important:** Always explain what you're about to create and ask for user approval before calling this tool.`;
}

function formatCreateBulkConversationsTool(): string {
  return `### create_bulk_conversations
Creates multiple conversations at once. Use this for email sequences and campaign plans.

**When to use:**
- Creating an email automation sequence with multiple steps
- Setting up a multi-part campaign
- Batch creating conversations for a plan

**Typical counts by flow type:**
- Welcome Series: 4-7 emails
- Abandoned Cart: 3-4 emails
- Post-Purchase: 3-5 emails
- Win-back: 3-5 emails
- Product Launch: 4-6 emails

**Important:** Use suggest_conversation_plan first, then call this after user approval.`;
}

function formatSuggestConversationPlanTool(): string {
  return `### suggest_conversation_plan
Proposes a plan for creating multiple conversations. MODE-AGNOSTIC - works for ANY planning scenario.

**USE THIS TOOL FOR:**
- Email Flows/Automations (welcome series, abandoned cart, etc.)
- Email Calendars (weekly/monthly schedules)
- Content Calendars (blog posts, social media)
- Campaign Plans (product launches, sales)
- Any multi-part project (2+ conversations)

**How it works:**
1. Call this tool to propose your structure
2. The user sees how many conversations you'll create
3. User can approve, modify, or reject
4. After approval, call create_bulk_conversations

**Relationship types:**
- "sequence": Items flow in order (flows, campaigns)
- "parallel": Independent items (calendars)
- "hierarchical": Parent-child structure

**Example for Email Calendar:**
"I'll create your December email calendar with 8 emails:
1. Dec 1 - Holiday Preview
2. Dec 5 - Gift Guide
3. Dec 10 - Flash Sale
...
Would you like me to create these 8 conversations?"`;
}

function formatSuggestActionTool(): string {
  return `### suggest_action
Suggests a dynamic action button for the user. The action will appear as a clickable element in the UI.

**When to use:**
- Offering to execute a multi-step operation
- Providing quick actions based on the context
- Giving the user clear next steps`;
}

function formatWebSearchTool(config?: { allowed_domains?: string[]; max_uses?: number }): string {
  let domainInfo = '';
  if (config?.allowed_domains && config.allowed_domains.length > 0) {
    domainInfo = `\n**Allowed domains:** ${config.allowed_domains.join(', ')}`;
  }

  let usageInfo = '';
  if (config?.max_uses) {
    usageInfo = `\n**Maximum uses:** ${config.max_uses} per conversation`;
  }

  return `### web_search
Searches the web for current information.${domainInfo}${usageInfo}

**When to use:**
- Need current product information, pricing, or availability
- Researching competitors or market data
- Verifying facts or getting up-to-date information`;
}

function formatSaveMemoryTool(): string {
  return `### save_memory
Saves important information for future conversations.

**When to use:**
- User states a preference that should persist
- Important decision made during the conversation
- Brand guidelines or rules mentioned`;
}

function formatShopifyProductSearchTool(config?: { allowed_tools?: string[]; max_searches?: number }): string {
  let toolsInfo = '';
  if (config?.allowed_tools && config.allowed_tools.length > 0) {
    toolsInfo = `\n**Available operations:** ${config.allowed_tools.join(', ')}`;
  } else {
    toolsInfo = '\n**Available operations:** search_products, get_product, get_collections, get_policies';
  }

  let usageInfo = '';
  if (config?.max_searches) {
    usageInfo = `\n**Maximum searches:** ${config.max_searches} per conversation`;
  }

  return `### shopify_* (Shopify MCP Integration)
Direct access to the brand's Shopify store catalog via Model Context Protocol.${toolsInfo}${usageInfo}

**When to use:**
- Need accurate, real-time product information (names, prices, descriptions, images)
- Want to reference specific products in email copy
- Need to understand the product catalog for campaign planning
- Researching collections, categories, or best-sellers

**Advantages over web search:**
- More accurate and up-to-date product data
- Structured data (prices, inventory, variants)
- Faster response times
- No risk of finding outdated cached data

**Example queries:**
- "Find red dresses under $100"
- "Show me products in the Summer Collection"
- "What are the best-selling items?"
- "Get details for the 'Classic Tee' product"`;
}

// ============================================================================
// ARTIFACT TYPE DOCUMENTATION FORMATTER
// ============================================================================

function formatArtifactTypes(artifactTypes: ArtifactTypeInfo[]): string {
  return artifactTypes.map(type => {
    const variantInfo = type.supportsVariants ? ' (supports A/B/C variants)' : '';
    let doc = `### ${type.kind} - ${type.name}${variantInfo}\n${type.description}`;

    if (type.fieldSchema && type.fieldSchema.length > 0) {
      doc += '\n\n**Fields:**';
      type.fieldSchema.forEach(field => {
        const req = field.required ? ' (required)' : ' (optional)';
        doc += `\n- ${field.label}${req}: ${field.type}`;
      });
    }

    return doc;
  }).join('\n\n');
}

// ============================================================================
// BUILD ROOT PROMPT
// ============================================================================

/**
 * Build the root system prompt with dynamic values
 */
export function buildRootPrompt(options: {
  timezone?: string;
  artifactTypes?: ArtifactTypeInfo[];
  toolConfig?: ToolConfig;
} = {}): string {
  const now = new Date();

  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const timezone = options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Build enabled tools documentation
  const enabledToolDocs: string[] = [];
  const toolConfig = options.toolConfig || {
    create_artifact: { enabled: true },
    create_conversation: { enabled: true },
    create_bulk_conversations: { enabled: true },
    suggest_conversation_plan: { enabled: true },
    suggest_action: { enabled: true },
    save_memory: { enabled: true },
  };

  if (toolConfig.create_artifact?.enabled && options.artifactTypes) {
    enabledToolDocs.push(formatCreateArtifactTool(options.artifactTypes));
  }

  if (toolConfig.create_conversation?.enabled) {
    enabledToolDocs.push(formatCreateConversationTool());
  }

  if (toolConfig.create_bulk_conversations?.enabled) {
    enabledToolDocs.push(formatCreateBulkConversationsTool());
  }

  if (toolConfig.suggest_conversation_plan?.enabled) {
    enabledToolDocs.push(formatSuggestConversationPlanTool());
  }

  if (toolConfig.suggest_action?.enabled) {
    enabledToolDocs.push(formatSuggestActionTool());
  }

  if (toolConfig.web_search?.enabled) {
    enabledToolDocs.push(formatWebSearchTool(toolConfig.web_search));
  }

  if (toolConfig.save_memory?.enabled) {
    enabledToolDocs.push(formatSaveMemoryTool());
  }

  if (toolConfig.shopify_product_search?.enabled) {
    enabledToolDocs.push(formatShopifyProductSearchTool(toolConfig.shopify_product_search));
  }

  const enabledToolsDoc = enabledToolDocs.length > 0
    ? enabledToolDocs.join('\n\n')
    : 'No tools are currently enabled for this mode.';

  // Build artifact types documentation
  const artifactTypesDoc = options.artifactTypes && options.artifactTypes.length > 0
    ? formatArtifactTypes(options.artifactTypes)
    : 'No artifact types are currently available for this mode.';

  return ROOT_SYSTEM_PROMPT
    .replace('{{CURRENT_DATE}}', formattedDate)
    .replace('{{CURRENT_TIME}}', formattedTime)
    .replace('{{TIMEZONE}}', timezone)
    .replace('{{ENABLED_TOOLS}}', enabledToolsDoc)
    .replace('{{ARTIFACT_TYPES}}', artifactTypesDoc);
}

/**
 * Compose the full system prompt from root + mode extension + context
 */
export function composeSystemPrompt(options: {
  modePrompt?: string;
  brandContext?: string;
  memoryContext?: string;
  additionalContext?: string;
  timezone?: string;
  artifactTypes?: ArtifactTypeInfo[];
  toolConfig?: ToolConfig;
}): string {
  const parts: string[] = [];

  // 1. Root system prompt (always included, now with dynamic tools and artifacts)
  parts.push(buildRootPrompt({
    timezone: options.timezone,
    artifactTypes: options.artifactTypes,
    toolConfig: options.toolConfig,
  }));

  // 2. Mode-specific prompt (if provided)
  if (options.modePrompt) {
    parts.push('\n## MODE-SPECIFIC INSTRUCTIONS\n');
    parts.push(options.modePrompt);
  }

  // 3. Brand context (if provided)
  if (options.brandContext) {
    parts.push('\n## BRAND CONTEXT\n');
    parts.push(options.brandContext);
  }

  // 4. Memory context (if provided)
  if (options.memoryContext) {
    parts.push('\n## REMEMBERED CONTEXT\n');
    parts.push(options.memoryContext);
  }

  // 5. Additional context (if provided)
  if (options.additionalContext) {
    parts.push('\n## ADDITIONAL CONTEXT\n');
    parts.push(options.additionalContext);
  }

  return parts.join('\n');
}




