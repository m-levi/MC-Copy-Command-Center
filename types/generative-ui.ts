/**
 * Generative UI Types
 *
 * Interactive UI elements that can be embedded within artifacts.
 * These elements allow the AI to create buttons, multiple choice questions,
 * and other interactive components that trigger actions.
 */

// ============================================================================
// ACTION TYPES
// ============================================================================

/**
 * Action that occurs when a generative UI element is interacted with
 */
export type GenerativeUIActionType =
  | 'send_message'    // Send a message to the chat
  | 'update_artifact' // Update the current artifact
  | 'navigate'        // Navigate to a URL
  | 'copy'            // Copy content to clipboard
  | 'custom';         // Custom action handler

/**
 * Payload for generative UI actions
 */
export interface GenerativeUIActionPayload {
  /** Message to send to chat (for send_message) */
  message?: string;
  /** Fields to update on artifact (for update_artifact) */
  update?: Record<string, unknown>;
  /** URL to navigate to (for navigate) */
  url?: string;
  /** Content to copy (for copy) */
  copyContent?: string;
  /** Custom handler identifier (for custom) */
  handler?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Complete action definition
 */
export interface GenerativeUIAction {
  type: GenerativeUIActionType;
  payload: GenerativeUIActionPayload;
  /** Optional label for the action in analytics/logging */
  label?: string;
}

// ============================================================================
// ELEMENT TYPES
// ============================================================================

/**
 * Available generative UI element types
 */
export type GenerativeUIElementType =
  | 'action_button'
  | 'multiple_choice'
  | 'text_input'
  | 'confirmation';

/**
 * Base interface for all generative UI elements
 */
export interface BaseGenerativeUIElement {
  type: GenerativeUIElementType;
  id: string;
  /** Whether the element is disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
}

// ============================================================================
// ACTION BUTTON
// ============================================================================

/**
 * Button variant styles
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

/**
 * Action button element - triggers an action when clicked
 */
export interface ActionButtonElement extends BaseGenerativeUIElement {
  type: 'action_button';
  /** Button label text */
  label: string;
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Lucide icon name */
  icon?: string;
  /** Icon position */
  iconPosition?: 'left' | 'right';
  /** Action to perform when clicked */
  action: GenerativeUIAction;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// MULTIPLE CHOICE
// ============================================================================

/**
 * Option for multiple choice element
 */
export interface MultipleChoiceOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  /** Whether this option is disabled */
  disabled?: boolean;
}

/**
 * Multiple choice element - presents options for user selection
 */
export interface MultipleChoiceElement extends BaseGenerativeUIElement {
  type: 'multiple_choice';
  /** Question or prompt text */
  question: string;
  /** Available options */
  options: MultipleChoiceOption[];
  /** Allow multiple selections */
  allowMultiple?: boolean;
  /** Action to perform when selection is made */
  action: GenerativeUIAction;
  /** Layout style */
  layout?: 'vertical' | 'horizontal' | 'grid';
  /** Minimum selections required (for allowMultiple) */
  minSelections?: number;
  /** Maximum selections allowed (for allowMultiple) */
  maxSelections?: number;
}

// ============================================================================
// TEXT INPUT
// ============================================================================

/**
 * Text input element - collects text from user
 */
export interface TextInputElement extends BaseGenerativeUIElement {
  type: 'text_input';
  /** Input label */
  label: string;
  /** Placeholder text */
  placeholder?: string;
  /** Use multiline textarea */
  multiline?: boolean;
  /** Maximum character length */
  maxLength?: number;
  /** Action to perform when submitted */
  action: GenerativeUIAction;
  /** Submit button text */
  submitLabel?: string;
}

// ============================================================================
// CONFIRMATION
// ============================================================================

/**
 * Confirmation element - yes/no or confirm/cancel prompt
 */
export interface ConfirmationElement extends BaseGenerativeUIElement {
  type: 'confirmation';
  /** Question to confirm */
  question: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Confirm button variant */
  confirmVariant?: ButtonVariant;
  /** Action to perform on confirm */
  confirmAction: GenerativeUIAction;
  /** Action to perform on cancel (optional) */
  cancelAction?: GenerativeUIAction;
}

// ============================================================================
// UNION TYPE
// ============================================================================

/**
 * Union of all generative UI element types
 */
export type GenerativeUIElement =
  | ActionButtonElement
  | MultipleChoiceElement
  | TextInputElement
  | ConfirmationElement;

// ============================================================================
// CONTAINER
// ============================================================================

/**
 * Position within the artifact where the UI block should render
 */
export type GenerativeUIPosition = 'inline' | 'footer' | 'header' | 'sidebar';

/**
 * Container for generative UI elements within an artifact
 */
export interface GenerativeUIBlock {
  /** Unique block identifier */
  id: string;
  /** Where to render this block */
  position: GenerativeUIPosition;
  /** Elements in this block */
  elements: GenerativeUIElement[];
  /** Optional title for the block */
  title?: string;
  /** Optional description */
  description?: string;
  /** Layout direction for elements */
  layout?: 'vertical' | 'horizontal';
  /** Gap between elements */
  gap?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Event emitted when a generative UI element is interacted with
 */
export interface GenerativeUIEvent {
  /** Element that triggered the event */
  elementId: string;
  /** Type of element */
  elementType: GenerativeUIElementType;
  /** The action to perform */
  action: GenerativeUIAction;
  /** Value from the interaction (e.g., selected option IDs, input text) */
  value?: string | string[];
  /** Artifact ID containing the element */
  artifactId?: string;
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isActionButton(element: GenerativeUIElement): element is ActionButtonElement {
  return element.type === 'action_button';
}

export function isMultipleChoice(element: GenerativeUIElement): element is MultipleChoiceElement {
  return element.type === 'multiple_choice';
}

export function isTextInput(element: GenerativeUIElement): element is TextInputElement {
  return element.type === 'text_input';
}

export function isConfirmation(element: GenerativeUIElement): element is ConfirmationElement {
  return element.type === 'confirmation';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a simple action button
 */
export function createActionButton(
  id: string,
  label: string,
  message: string,
  options?: Partial<Omit<ActionButtonElement, 'type' | 'id' | 'label' | 'action'>>
): ActionButtonElement {
  return {
    type: 'action_button',
    id,
    label,
    action: {
      type: 'send_message',
      payload: { message },
    },
    ...options,
  };
}

/**
 * Create a multiple choice question
 */
export function createMultipleChoice(
  id: string,
  question: string,
  options: Array<{ id: string; label: string; description?: string }>,
  config?: Partial<Omit<MultipleChoiceElement, 'type' | 'id' | 'question' | 'options' | 'action'>>
): MultipleChoiceElement {
  return {
    type: 'multiple_choice',
    id,
    question,
    options,
    action: {
      type: 'send_message',
      payload: {
        message: `Selected: {{selected}}`, // Placeholder replaced at runtime
      },
    },
    ...config,
  };
}

/**
 * Create a confirmation prompt
 */
export function createConfirmation(
  id: string,
  question: string,
  confirmMessage: string,
  options?: Partial<Omit<ConfirmationElement, 'type' | 'id' | 'question' | 'confirmAction'>>
): ConfirmationElement {
  return {
    type: 'confirmation',
    id,
    question,
    confirmAction: {
      type: 'send_message',
      payload: { message: confirmMessage },
    },
    ...options,
  };
}
