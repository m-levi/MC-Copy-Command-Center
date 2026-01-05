/**
 * SmartInput - A composable, reusable rich text input with:
 * - Live markdown preview
 * - Slash commands with categories
 * - File attachments with drag & drop
 * - Fully customizable via props and render functions
 * 
 * @example Basic usage
 * ```tsx
 * import { SmartInput } from '@/components/smart-input';
 * 
 * <SmartInput
 *   onSubmit={(message, files) => handleSend(message, files)}
 *   placeholder="Type your message..."
 * />
 * ```
 * 
 * @example With slash commands
 * ```tsx
 * <SmartInput
 *   onSubmit={(message, files) => handleSend(message, files)}
 *   onCommandExecute={(command) => {
 *     if (command.prompt) {
 *       sendMessage(command.prompt);
 *     }
 *   }}
 *   enableSlashCommands={true}
 *   slashCommandStyle="full"
 * />
 * ```
 * 
 * @example With custom toolbar
 * ```tsx
 * <SmartInput
 *   onSubmit={handleSend}
 *   renderLeftTools={() => (
 *     <MyCustomButton />
 *   )}
 *   renderRightTools={() => (
 *     <VoiceButton onTranscript={setText} />
 *   )}
 * />
 * ```
 * 
 * @example Advanced: Using provider directly
 * ```tsx
 * import { SmartInputProvider, useSmartInput } from '@/components/smart-input';
 * 
 * function MyCustomInput() {
 *   const { value, setValue, files, addFiles } = useSmartInput();
 *   // ... custom implementation
 * }
 * 
 * <SmartInputProvider>
 *   <MyCustomInput />
 * </SmartInputProvider>
 * ```
 */

// Main component
export { SmartInput, type SmartInputProps, type SmartInputHandle } from './SmartInput';

// Context and hooks
export { 
  SmartInputProvider, 
  useSmartInput, 
  useOptionalSmartInput,
  type SmartInputContextValue,
  type SmartInputProviderProps,
  type FileAttachment,
} from './SmartInputContext';

// Slash commands
export { 
  SlashCommandMenu, 
  SlashCommandInline,
  type SlashCommandMenuProps,
} from './SlashCommandMenu';

export {
  SLASH_COMMANDS,
  SLASH_COMMAND_CATEGORIES,
  filterCommands,
  getCommandsByCategory,
  findCommand,
  combineCommands,
  filterCombinedCommands,
  type SlashCommand,
  type SlashCommandCategory,
} from './slash-commands';

// Markdown preview
export { 
  MarkdownPreview, 
  hasSignificantMarkdown,
} from './MarkdownPreview';

// Rich text input (inline markdown rendering)
export {
  RichTextInput,
  type RichTextInputProps,
  type RichTextInputHandle,
} from './RichTextInput';

// TipTap editor (proper WYSIWYG markdown)
export {
  TipTapEditor,
  type TipTapEditorProps,
  type TipTapEditorHandle,
} from './TipTapEditor';

