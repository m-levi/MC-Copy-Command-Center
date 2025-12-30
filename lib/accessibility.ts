/**
 * Accessibility Utilities
 *
 * Provides helpers for implementing accessible UI components
 * following WCAG 2.1 guidelines.
 */

/**
 * Generate a unique ID for ARIA relationships
 */
let idCounter = 0;
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Reset ID counter (for testing)
 */
export function resetAriaIdCounter(): void {
  idCounter = 0;
}

/**
 * Create aria-describedby value from multiple IDs
 */
export function combineAriaDescribedBy(...ids: (string | undefined | null)[]): string | undefined {
  const validIds = ids.filter(Boolean) as string[];
  return validIds.length > 0 ? validIds.join(' ') : undefined;
}

/**
 * Announce a message to screen readers using aria-live
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  if (typeof document === 'undefined') return;

  // Find or create the announcer element
  let announcer = document.getElementById('sr-announcer');

  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'sr-announcer';
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.setAttribute('role', 'status');
    announcer.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(announcer);
  }

  // Update priority if different
  if (announcer.getAttribute('aria-live') !== priority) {
    announcer.setAttribute('aria-live', priority);
  }

  // Clear and set the message (forces screen reader to announce)
  announcer.textContent = '';
  setTimeout(() => {
    announcer!.textContent = message;
  }, 100);
}

/**
 * Focus trap utilities for modals and dialogs
 */
export interface FocusTrapOptions {
  /** Element to trap focus within */
  container: HTMLElement;
  /** Initial element to focus */
  initialFocus?: HTMLElement | null;
  /** Element to return focus to on close */
  returnFocus?: HTMLElement | null;
  /** Callback when escape is pressed */
  onEscape?: () => void;
}

export function createFocusTrap(options: FocusTrapOptions) {
  const { container, initialFocus, returnFocus, onEscape } = options;

  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]',
  ].join(', ');

  function getFocusableElements(): HTMLElement[] {
    return Array.from(container.querySelectorAll(focusableSelectors));
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && onEscape) {
      event.preventDefault();
      onEscape();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  }

  function activate() {
    container.addEventListener('keydown', handleKeyDown);

    // Focus initial element or first focusable
    if (initialFocus) {
      initialFocus.focus();
    } else {
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
  }

  function deactivate() {
    container.removeEventListener('keydown', handleKeyDown);

    // Return focus
    if (returnFocus) {
      returnFocus.focus();
    }
  }

  return { activate, deactivate };
}

/**
 * Keyboard navigation helpers
 */
export interface KeyboardNavigationOptions {
  /** List of navigable items */
  items: HTMLElement[];
  /** Current focused index */
  currentIndex: number;
  /** Callback when index changes */
  onIndexChange: (index: number) => void;
  /** Whether navigation wraps around */
  wrap?: boolean;
  /** Orientation of the list */
  orientation?: 'horizontal' | 'vertical' | 'both';
}

export function handleKeyboardNavigation(
  event: KeyboardEvent,
  options: KeyboardNavigationOptions
): boolean {
  const { items, currentIndex, onIndexChange, wrap = true, orientation = 'vertical' } = options;

  if (items.length === 0) return false;

  const isVertical = orientation === 'vertical' || orientation === 'both';
  const isHorizontal = orientation === 'horizontal' || orientation === 'both';

  let newIndex = currentIndex;
  let handled = false;

  switch (event.key) {
    case 'ArrowDown':
      if (isVertical) {
        newIndex = wrap
          ? (currentIndex + 1) % items.length
          : Math.min(currentIndex + 1, items.length - 1);
        handled = true;
      }
      break;
    case 'ArrowUp':
      if (isVertical) {
        newIndex = wrap
          ? (currentIndex - 1 + items.length) % items.length
          : Math.max(currentIndex - 1, 0);
        handled = true;
      }
      break;
    case 'ArrowRight':
      if (isHorizontal) {
        newIndex = wrap
          ? (currentIndex + 1) % items.length
          : Math.min(currentIndex + 1, items.length - 1);
        handled = true;
      }
      break;
    case 'ArrowLeft':
      if (isHorizontal) {
        newIndex = wrap
          ? (currentIndex - 1 + items.length) % items.length
          : Math.max(currentIndex - 1, 0);
        handled = true;
      }
      break;
    case 'Home':
      newIndex = 0;
      handled = true;
      break;
    case 'End':
      newIndex = items.length - 1;
      handled = true;
      break;
  }

  if (handled && newIndex !== currentIndex) {
    event.preventDefault();
    onIndexChange(newIndex);
    items[newIndex]?.focus();
  }

  return handled;
}

/**
 * Skip link component helper
 */
export function createSkipLink(targetId: string, label: string = 'Skip to main content'): HTMLElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-gray-900 focus:rounded focus:shadow-lg';
  link.textContent = label;
  return link;
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if high contrast is preferred
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}

/**
 * Get color contrast ratio between two colors
 * Returns a number between 1 and 21
 */
export function getContrastRatio(color1: string, color2: string): number {
  const luminance1 = getRelativeLuminance(color1);
  const luminance2 = getRelativeLuminance(color2);

  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(hexColor: string): number {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * ARIA role descriptions for common patterns
 */
export const ARIA_ROLES = {
  navigation: {
    main: 'Main navigation',
    sidebar: 'Sidebar navigation',
    breadcrumb: 'Breadcrumb navigation',
    pagination: 'Pagination navigation',
  },
  regions: {
    main: 'Main content',
    aside: 'Sidebar',
    header: 'Page header',
    footer: 'Page footer',
    search: 'Search',
  },
  widgets: {
    dialog: 'Dialog',
    alertdialog: 'Alert dialog',
    menu: 'Menu',
    listbox: 'Listbox',
    combobox: 'Combobox',
    tablist: 'Tab list',
  },
} as const;

/**
 * Common aria-label patterns
 */
export const ARIA_LABELS = {
  buttons: {
    close: 'Close',
    menu: 'Open menu',
    search: 'Search',
    settings: 'Settings',
    notifications: 'Notifications',
    userMenu: 'User menu',
    moreOptions: 'More options',
    expand: 'Expand',
    collapse: 'Collapse',
    previous: 'Previous',
    next: 'Next',
    delete: 'Delete',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
  },
  inputs: {
    search: 'Search',
    email: 'Email address',
    password: 'Password',
    message: 'Type a message',
  },
  status: {
    loading: 'Loading',
    error: 'Error',
    success: 'Success',
    empty: 'No items',
  },
} as const;
