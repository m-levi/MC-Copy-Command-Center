'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2,
  Check,
  // Common action icons
  Send,
  Download,
  Upload,
  Copy,
  Trash2,
  Edit,
  Plus,
  Minus,
  X,
  // Navigation icons
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  // Status icons
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  HelpCircle,
  // Content icons
  Mail,
  MessageSquare,
  FileText,
  Image,
  Link,
  ExternalLink,
  // UI icons
  Settings,
  Search,
  Filter,
  RefreshCw,
  Save,
  Star,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Wand2,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

// Icon map for dynamic lookup - only includes commonly used icons
const ICON_MAP: Record<string, LucideIcon> = {
  Loader2,
  Check,
  Send,
  Download,
  Upload,
  Copy,
  Trash2,
  Edit,
  Plus,
  Minus,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  HelpCircle,
  Mail,
  MessageSquare,
  FileText,
  Image,
  Link,
  ExternalLink,
  Settings,
  Search,
  Filter,
  RefreshCw,
  Save,
  Star,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Wand2,
  Zap,
};
import type {
  GenerativeUIBlock,
  GenerativeUIElement,
  GenerativeUIAction,
  GenerativeUIEvent,
  ActionButtonElement,
  MultipleChoiceElement,
  TextInputElement,
  ConfirmationElement,
  ButtonVariant,
} from '@/types/generative-ui';

// ============================================================================
// TYPES
// ============================================================================

interface GenerativeUIRendererProps {
  /** Blocks to render */
  blocks: GenerativeUIBlock[];
  /** Filter by position (render only blocks at this position) */
  position?: 'inline' | 'footer' | 'header' | 'sidebar';
  /** Handler for when an action is triggered */
  onAction: (event: GenerativeUIEvent) => void;
  /** Whether all elements should be disabled */
  disabled?: boolean;
  /** Artifact ID for event tracking */
  artifactId?: string;
  /** Additional className */
  className?: string;
}

interface ElementRendererProps {
  element: GenerativeUIElement;
  onAction: (action: GenerativeUIAction, value?: string | string[]) => void;
  disabled?: boolean;
}

// ============================================================================
// BUTTON VARIANT MAPPING
// ============================================================================

const variantMap: Record<ButtonVariant, 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'> = {
  primary: 'default',
  secondary: 'secondary',
  outline: 'outline',
  ghost: 'ghost',
  destructive: 'destructive',
};

// ============================================================================
// ICON COMPONENT
// ============================================================================

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  // Get the icon from our curated icon map
  const IconComponent = ICON_MAP[name];
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
}

// ============================================================================
// ACTION BUTTON RENDERER
// ============================================================================

function ActionButtonRenderer({
  element,
  onAction,
  disabled,
}: ElementRendererProps & { element: ActionButtonElement }) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    setLoading(true);
    try {
      await onAction(element.action);
    } finally {
      setLoading(false);
    }
  }, [element.action, onAction]);

  const variant = element.variant ? variantMap[element.variant] : 'default';
  const size = element.size || 'md';
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-1' : size === 'lg' ? 'text-base px-6 py-3' : 'text-sm px-4 py-2';

  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Button
        variant={variant}
        className={`${sizeClass} gap-2`}
        onClick={handleClick}
        disabled={disabled || element.disabled || loading || element.loading}
      >
        {element.icon && element.iconPosition !== 'right' && (
          <DynamicIcon name={element.icon} className="w-4 h-4" />
        )}
        {loading || element.loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          element.label
        )}
        {element.icon && element.iconPosition === 'right' && (
          <DynamicIcon name={element.icon} className="w-4 h-4" />
        )}
      </Button>
    </motion.div>
  );
}

// ============================================================================
// MULTIPLE CHOICE RENDERER
// ============================================================================

function MultipleChoiceRenderer({
  element,
  onAction,
  disabled,
}: ElementRendererProps & { element: MultipleChoiceElement }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = useCallback((optionId: string) => {
    if (element.allowMultiple) {
      setSelected(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelected([optionId]);
      // Auto-submit for single select
      const option = element.options.find(o => o.id === optionId);
      if (option) {
        setSubmitted(true);
        onAction(element.action, [optionId]);
      }
    }
  }, [element.allowMultiple, element.options, element.action, onAction]);

  const handleSubmit = useCallback(() => {
    if (selected.length > 0) {
      setSubmitted(true);
      onAction(element.action, selected);
    }
  }, [selected, element.action, onAction]);

  const layout = element.layout || 'vertical';
  const layoutClass = layout === 'horizontal'
    ? 'flex flex-wrap gap-2'
    : layout === 'grid'
      ? 'grid grid-cols-2 gap-2'
      : 'flex flex-col gap-2';

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        {element.question}
      </p>

      <div className={layoutClass}>
        {element.options.map(option => {
          const isSelected = selected.includes(option.id);

          return (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleSelect(option.id)}
              disabled={disabled || element.disabled || submitted || option.disabled}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              } ${(disabled || element.disabled || submitted) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {element.allowMultiple ? (
                <Checkbox
                  checked={isSelected}
                  className="mt-0.5"
                />
              ) : (
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {option.icon && <DynamicIcon name={option.icon} className="w-4 h-4 text-gray-500" />}
                  <span className="font-medium text-sm text-gray-900 dark:text-white">
                    {option.label}
                  </span>
                </div>
                {option.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {option.description}
                  </p>
                )}
              </div>

              {isSelected && !element.allowMultiple && (
                <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>

      {element.allowMultiple && selected.length > 0 && !submitted && (
        <Button
          onClick={handleSubmit}
          disabled={disabled || element.disabled}
          className="mt-2"
        >
          Continue with {selected.length} selected
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// TEXT INPUT RENDERER
// ============================================================================

function TextInputRenderer({
  element,
  onAction,
  disabled,
}: ElementRendererProps & { element: TextInputElement }) {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(() => {
    if (value.trim()) {
      setSubmitted(true);
      onAction(element.action, value.trim());
    }
  }, [value, element.action, onAction]);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-900 dark:text-white">
        {element.label}
      </Label>

      {element.multiline ? (
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={element.placeholder}
          maxLength={element.maxLength}
          disabled={disabled || element.disabled || submitted}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={element.placeholder}
          maxLength={element.maxLength}
          disabled={disabled || element.disabled || submitted}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      <div className="flex items-center justify-between">
        {element.maxLength && (
          <span className="text-xs text-gray-400">
            {value.length}/{element.maxLength}
          </span>
        )}
        <Button
          onClick={handleSubmit}
          disabled={disabled || element.disabled || submitted || !value.trim()}
          size="sm"
        >
          {element.submitLabel || 'Submit'}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// CONFIRMATION RENDERER
// ============================================================================

function ConfirmationRenderer({
  element,
  onAction,
  disabled,
}: ElementRendererProps & { element: ConfirmationElement }) {
  const [responded, setResponded] = useState(false);

  const handleConfirm = useCallback(() => {
    setResponded(true);
    onAction(element.confirmAction);
  }, [element.confirmAction, onAction]);

  const handleCancel = useCallback(() => {
    setResponded(true);
    if (element.cancelAction) {
      onAction(element.cancelAction);
    }
  }, [element.cancelAction, onAction]);

  const confirmVariant = element.confirmVariant ? variantMap[element.confirmVariant] : 'default';

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        {element.question}
      </p>

      <div className="flex gap-2">
        <Button
          variant={confirmVariant}
          onClick={handleConfirm}
          disabled={disabled || element.disabled || responded}
        >
          {element.confirmLabel || 'Confirm'}
        </Button>
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={disabled || element.disabled || responded}
        >
          {element.cancelLabel || 'Cancel'}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// ELEMENT RENDERER
// ============================================================================

function ElementRenderer({ element, onAction, disabled }: ElementRendererProps) {
  switch (element.type) {
    case 'action_button':
      return <ActionButtonRenderer element={element} onAction={onAction} disabled={disabled} />;
    case 'multiple_choice':
      return <MultipleChoiceRenderer element={element} onAction={onAction} disabled={disabled} />;
    case 'text_input':
      return <TextInputRenderer element={element} onAction={onAction} disabled={disabled} />;
    case 'confirmation':
      return <ConfirmationRenderer element={element} onAction={onAction} disabled={disabled} />;
    default:
      return null;
  }
}

// ============================================================================
// BLOCK RENDERER
// ============================================================================

function BlockRenderer({
  block,
  onAction,
  disabled,
  artifactId,
}: {
  block: GenerativeUIBlock;
  onAction: (event: GenerativeUIEvent) => void;
  disabled?: boolean;
  artifactId?: string;
}) {
  const handleElementAction = useCallback((
    element: GenerativeUIElement,
    action: GenerativeUIAction,
    value?: string | string[]
  ) => {
    onAction({
      elementId: element.id,
      elementType: element.type,
      action,
      value,
      artifactId,
      timestamp: Date.now(),
    });
  }, [onAction, artifactId]);

  const layoutClass = block.layout === 'horizontal'
    ? 'flex flex-wrap items-center'
    : 'flex flex-col';

  const gapClass = block.gap === 'sm' ? 'gap-2' : block.gap === 'lg' ? 'gap-6' : 'gap-4';

  return (
    <div className="space-y-2">
      {block.title && (
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          {block.title}
        </h4>
      )}
      {block.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {block.description}
        </p>
      )}
      <div className={`${layoutClass} ${gapClass}`}>
        {block.elements.map(element => (
          <ElementRenderer
            key={element.id}
            element={element}
            onAction={(action, value) => handleElementAction(element, action, value)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Renders generative UI blocks within artifacts
 */
export function GenerativeUIRenderer({
  blocks,
  position,
  onAction,
  disabled,
  artifactId,
  className = '',
}: GenerativeUIRendererProps) {
  // Filter blocks by position if specified
  const filteredBlocks = position
    ? blocks.filter(block => block.position === position)
    : blocks;

  if (filteredBlocks.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {filteredBlocks.map(block => (
        <BlockRenderer
          key={block.id}
          block={block}
          onAction={onAction}
          disabled={disabled}
          artifactId={artifactId}
        />
      ))}
    </div>
  );
}

export default GenerativeUIRenderer;
