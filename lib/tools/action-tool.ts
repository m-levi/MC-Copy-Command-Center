/**
 * Action Tool
 * 
 * Allows the AI to suggest dynamic actions/buttons for the user.
 * These appear in the UI and execute with user approval.
 */

import { z } from 'zod';
import { tool } from 'ai';

/**
 * Available action types
 */
export const ActionType = z.enum([
  'create_emails_from_plan',   // Create multiple email conversations from a plan
  'approve_and_generate',      // Approve something and trigger generation
  'export_content',            // Export artifact to a format
  'schedule_send',             // Schedule content for sending
  'create_variation',          // Create a variation of existing content
  'regenerate_section',        // Regenerate a specific section
  'save_as_template',          // Save current content as a template
  'share_with_team',           // Share with team members
  'copy_to_clipboard',         // Copy content to clipboard
  'open_in_editor',            // Open in full editor view
]);

export type ActionTypeValue = z.infer<typeof ActionType>;

/**
 * Action tool parameters
 */
export const ActionToolSchema = z.object({
  label: z.string().describe(
    'Button label shown to the user (e.g., "Generate All Emails", "Save as Template")'
  ),
  action_type: ActionType.describe(
    'The type of action to perform when clicked'
  ),
  description: z.string().describe(
    'Explanation of what this action will do (shown as tooltip or subtitle)'
  ),
  action_data: z.record(z.string(), z.unknown()).optional().describe(
    'Data needed to execute the action (e.g., list of emails to create)'
  ),
  style: z.enum(['primary', 'secondary', 'success', 'warning']).optional().describe(
    'Visual style of the button'
  ),
  icon: z.string().optional().describe(
    'Icon name to show (e.g., "sparkles", "mail", "calendar")'
  ),
});

export type ActionToolInput = z.infer<typeof ActionToolSchema>;

/**
 * The suggest action tool
 * 
 * Creates a clickable button in the UI that executes an action
 * when the user clicks it.
 */
export const suggestActionTool = tool({
  description: `Suggest a dynamic action button for the user. The action will appear as a clickable element in the chat interface.

Use this to offer quick actions based on context, such as:
- After creating a plan: "Generate All Emails" button
- After creating content: "Save as Template" or "Export" buttons
- After approval: "Schedule Send" button

The button will be displayed with the label and description you provide.
When clicked, the action will execute based on the action_type and action_data.

Common action types:
- create_emails_from_plan: Creates email conversations from a plan
- export_content: Exports to specified format
- save_as_template: Saves as reusable template
- create_variation: Creates A/B variation`,
  inputSchema: ActionToolSchema,
  execute: async (input: ActionToolInput) => {
    return {
      status: 'action_suggested',
      label: input.label,
      action_type: input.action_type,
      description: input.description,
      action_data: input.action_data,
    };
  },
});

/**
 * Multiple actions suggestion schema
 */
export const MultipleActionsSchema = z.object({
  actions: z.array(ActionToolSchema).describe(
    'Array of actions to suggest'
  ),
  layout: z.enum(['inline', 'stacked']).optional().describe(
    'How to display the buttons'
  ),
});

export type MultipleActionsInput = z.infer<typeof MultipleActionsSchema>;

/**
 * Suggest multiple actions at once
 */
export const suggestMultipleActionsTool = tool({
  description: `Suggest multiple action buttons at once. Use this when offering the user several options, like:
- "Generate All Emails" + "Modify Plan" 
- "Save as Draft" + "Send Now" + "Schedule"`,
  inputSchema: MultipleActionsSchema,
  execute: async (input: MultipleActionsInput) => {
    return {
      status: 'actions_suggested',
      actions: input.actions,
      layout: input.layout || 'inline',
    };
  },
});

