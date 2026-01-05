/**
 * Conversation Tool
 * 
 * Allows the AI to create new conversations or sub-conversations.
 * This enables flows like:
 * - "Create a 4-email sequence" → Creates 4 separate conversations
 * - "Let's break this into parts" → Creates sub-conversations
 * - "I'll create 10 emails for your welcome flow" → Bulk creation
 * 
 * NEW: Supports conversation planning where AI can propose a structure
 * before user approval.
 */

import { z } from 'zod';
import { tool } from 'ai';

/**
 * Conversation creation parameters
 */
export const ConversationToolSchema = z.object({
  title: z.string().describe(
    'Title for the new conversation (e.g., "Black Friday Email #1 - Teaser")'
  ),
  initial_prompt: z.string().describe(
    'The initial message/brief for the conversation. Be specific about what should be created.'
  ),
  parent_conversation_id: z.string().optional().describe(
    'ID of the parent conversation if this is a sub-conversation (automatically set from current context)'
  ),
  mode: z.string().optional().describe(
    'Mode to use for the new conversation (e.g., "email_copy", "planning", "flow")'
  ),
  metadata: z.object({
    sequence_position: z.number().optional().describe('Position in a sequence (1, 2, 3...)'),
    sequence_total: z.number().optional().describe('Total items in sequence'),
    scheduled_date: z.string().optional().describe('When this should be sent/published (e.g., "Day 1", "Nov 20")'),
    tags: z.array(z.string()).optional().describe('Tags for organization'),
    email_type: z.enum(['design', 'letter']).optional().describe('Email format: "design" for visual/promotional, "letter" for personal text-focused'),
    purpose: z.string().optional().describe('Brief purpose of this conversation/email'),
  }).optional(),
});

export type ConversationToolInput = z.infer<typeof ConversationToolSchema>;

/**
 * The conversation creation tool
 * 
 * Returns a pending_approval status - actual creation happens
 * after user approves the action.
 */
export const createConversationTool = tool({
  description: `Create a new conversation or sub-conversation. Use this to break complex tasks into separate focused discussions, or to implement plans where each item needs its own conversation.

IMPORTANT: Always explain what you're about to create and confirm with the user BEFORE calling this tool. For example:
"I'll create 4 separate conversations for your email sequence:
1. Teaser Email (Nov 20)
2. Early Access (Nov 22)
...
Would you like me to proceed?"

Only call this tool after receiving explicit approval.

For sequences (like email campaigns):
- Set sequence_position and sequence_total in metadata
- Include scheduled_date if relevant
- Use clear, numbered titles
- Specify email_type as "design" or "letter"`,
  inputSchema: ConversationToolSchema,
  execute: async (input: ConversationToolInput) => {
    // Returns pending status - actual creation happens in chat route
    return {
      status: 'pending_approval',
      action: 'create_conversation',
      title: input.title,
      message: 'Conversation creation pending user approval',
    };
  },
});

/**
 * Bulk conversation creation schema
 * For creating multiple conversations at once (e.g., email sequences)
 */
export const BulkConversationSchema = z.object({
  conversations: z.array(ConversationToolSchema).describe(
    'Array of conversations to create. Each conversation should have a clear title and initial_prompt.'
  ),
  sequence_name: z.string().optional().describe(
    'Name for this sequence of conversations (e.g., "Welcome Series", "Black Friday Campaign")'
  ),
  is_flow: z.boolean().optional().describe(
    'Whether these conversations are part of an email automation flow'
  ),
});

export type BulkConversationInput = z.infer<typeof BulkConversationSchema>;

/**
 * Bulk conversation creation tool
 */
export const createBulkConversationsTool = tool({
  description: `Create multiple conversations at once, typically for implementing a plan or sequence.

Use this when the user has approved creating multiple conversations, such as:
- An email automation flow (welcome series with 4-7 emails)
- A content calendar (multiple content pieces across dates)
- A multi-email campaign (product launch, sale, etc.)
- A series of related tasks broken into parts

EXAMPLES:
- "I'll create a 5-email welcome series" → Use this tool with 5 conversations
- "Let me set up your abandoned cart flow with 3 emails" → Use this tool with 3 conversations
- "I'll break this into 10 separate email conversations" → Use this tool with 10 conversations

IMPORTANT: 
1. Always get explicit user approval before calling this tool
2. Each conversation should have:
   - Clear, descriptive title
   - Specific initial_prompt with the task/brief
   - sequence_position in metadata for ordering
   - scheduled_date if applicable`,
  inputSchema: BulkConversationSchema,
  execute: async (input: BulkConversationInput) => {
    return {
      status: 'pending_approval',
      action: 'create_bulk_conversations',
      count: input.conversations.length,
      sequence_name: input.sequence_name,
      is_flow: input.is_flow,
      message: 'Bulk conversation creation pending user approval',
    };
  },
});

/**
 * Conversation Plan Schema
 * For suggesting a plan structure before committing to creation
 */
export const ConversationPlanSchema = z.object({
  plan_name: z.string().describe(
    'Name for this plan (e.g., "Welcome Series Plan", "Q4 Campaign Calendar")'
  ),
  plan_description: z.string().describe(
    'Brief description of what this plan will achieve'
  ),
  conversations: z.array(z.object({
    title: z.string().describe('Title for this planned conversation'),
    purpose: z.string().describe('What this conversation will accomplish'),
    timing: z.string().optional().describe('When this should happen (e.g., "Day 1", "Immediately", "Nov 20")'),
    email_type: z.enum(['design', 'letter']).optional().describe('For emails: "design" for visual, "letter" for personal'),
    estimated_complexity: z.enum(['simple', 'moderate', 'complex']).optional().describe('How complex this conversation will be'),
  })).describe('The planned conversations in order'),
  total_count: z.number().describe('Total number of conversations in the plan'),
  relationship_type: z.enum(['sequence', 'parallel', 'hierarchical']).describe(
    'How conversations relate: "sequence" for ordered flow, "parallel" for independent, "hierarchical" for parent-child'
  ),
  can_be_sub_conversations: z.boolean().describe(
    'Whether these should be sub-conversations of the current conversation'
  ),
});

export type ConversationPlanInput = z.infer<typeof ConversationPlanSchema>;

/**
 * Suggest Conversation Plan Tool
 * 
 * MODE-AGNOSTIC: Works for ANY multi-conversation planning scenario.
 * Use this to propose a structure of conversations to the user before creating them.
 * This gives the user visibility into what will be created and allows them to approve,
 * modify, or reject the plan.
 * 
 * SUPPORTED SCENARIOS:
 * - Email Flows (welcome series, abandoned cart, post-purchase, etc.)
 * - Email Calendars (weekly/monthly email schedules)
 * - Content Calendars (blog posts, social media, educational series)
 * - Campaign Plans (product launches, sales events, seasonal campaigns)
 * - Any multi-conversation project
 */
export const suggestConversationPlanTool = tool({
  description: `Suggest a plan for creating multiple conversations. Use this to show the user what you intend to create BEFORE actually creating anything.

THIS TOOL IS MODE-AGNOSTIC - works for ANY multi-conversation planning:

PLANNING SCENARIOS:
1. **Email Flows/Automations** - Welcome series, abandoned cart, post-purchase, win-back
2. **Email Calendars** - Weekly email schedule, monthly newsletter plan, promotional calendar
3. **Content Calendars** - Blog posts, social content, educational series
4. **Campaign Plans** - Product launches, seasonal campaigns, sale events
5. **Any multi-part project** - Breaking down complex work into separate conversations

HOW TO USE:
1. When user requests ANY multi-conversation plan, call this tool FIRST
2. Present the plan clearly with conversation count, titles, and purposes
3. Ask user to approve, modify, or reject
4. Only after approval, call create_bulk_conversations with the approved plan

EXAMPLES:

**Email Flow (sequence relationship):**
User: "Create a welcome series"
→ plan_name: "Welcome Series", total_count: 5, relationship_type: "sequence"

**Email Calendar (parallel relationship):**
User: "Plan my email calendar for December"
→ plan_name: "December Email Calendar", total_count: 8-12, relationship_type: "parallel"

**Campaign Plan:**
User: "Help me plan a Black Friday campaign"
→ plan_name: "Black Friday Campaign", total_count: 4-6, relationship_type: "sequence"

**Content Calendar:**
User: "Set up a content calendar for next week"
→ plan_name: "Weekly Content Calendar", total_count: 7, relationship_type: "parallel"

RELATIONSHIP TYPES:
- "sequence": Emails/content flow in order (flows, campaigns)
- "parallel": Independent items on different dates (calendars)
- "hierarchical": Parent-child structure

IMPORTANT: The user should clearly see:
- How many conversations will be created
- What each conversation is for
- The timing/schedule for each
- Whether they'll be sub-conversations or separate`,
  inputSchema: ConversationPlanSchema,
  execute: async (input: ConversationPlanInput) => {
    return {
      status: 'plan_suggested',
      action: 'suggest_conversation_plan',
      plan_name: input.plan_name,
      plan_description: input.plan_description,
      total_count: input.total_count,
      conversations: input.conversations,
      relationship_type: input.relationship_type,
      can_be_sub_conversations: input.can_be_sub_conversations,
      message: `Plan "${input.plan_name}" suggested with ${input.total_count} conversations`,
    };
  },
});

