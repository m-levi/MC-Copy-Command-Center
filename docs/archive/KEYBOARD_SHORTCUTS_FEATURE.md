# Keyboard Shortcuts Feature

## Overview
A comprehensive keyboard shortcuts system has been implemented to improve productivity and navigation throughout the application.

## Features

### 1. Command Palette (⌘K / Ctrl+K)
A powerful quick-access search interface that allows you to:
- **Search Conversations**: Find any conversation by title or content preview
- **Switch Brands**: Quickly switch between different brand workspaces
- **Quick Actions**: Access common actions like creating new conversations or flows
- **Fuzzy Search**: Smart search that matches partial text and character sequences

#### How to Use
1. Press `⌘K` (Mac) or `Ctrl+K` (Windows/Linux) anywhere in the app
2. Type to search across conversations, brands, and actions
3. Use `↑`/`↓` arrow keys to navigate results
4. Press `Enter` to select an item
5. Press `Esc` to close

### 2. Global Keyboard Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| `⌘K` / `Ctrl+K` | Open Command Palette | Quick access to search and actions |
| `⌘N` / `Ctrl+N` | New Conversation | Start a new email conversation |
| `⌘⇧N` / `Ctrl+Shift+N` | New Flow | Create a new email automation flow |
| `⌘B` / `Ctrl+B` | Toggle Sidebar | Show/hide the conversations sidebar |
| `⌘/` / `Ctrl+/` | Show Keyboard Shortcuts | Display this help menu |
| `Esc` | Close Modal | Close any open modal or dialog |
| `⌘Enter` / `Ctrl+Enter` | Send Message | Send your message in chat input |
| `Shift+Enter` | New Line | Add a new line in chat input |

### 3. Visual Indicators
- **Header Button**: A search button with the `⌘K` shortcut hint is visible in the header
- **Keyboard Icon**: Click the keyboard icon in the header to view all shortcuts
- **Input Hints**: Helper text below the chat input shows Enter/Shift+Enter shortcuts

## Implementation Details

### Components Created
1. **CommandPalette.tsx**: The main command palette modal with fuzzy search
2. **KeyboardShortcutsHelp.tsx**: Help modal displaying all available shortcuts
3. **useKeyboardShortcuts.ts**: Reusable hook for registering keyboard shortcuts
4. **GlobalKeyboardShortcuts.tsx**: App-wide keyboard shortcuts provider

### Integration Points
- **App-wide**: Command Palette (⌘K) and Help (⌘/) work everywhere via `GlobalKeyboardShortcuts` in `app/layout.tsx`
- **Page-specific**: New Conversation, New Flow, Toggle Sidebar work on chat pages
- Global keyboard event listeners that respect input focus states
- Platform detection (Mac vs Windows/Linux) for displaying correct modifier keys
- Fixed Escape key behavior to not interfere with browser navigation

## User Experience Features

### Smart Context Handling
- Shortcuts are disabled when typing in input fields (except Escape)
- Modal shortcuts work in layers (Escape closes the topmost modal first)
- Command palette prevents duplicate actions when other modals are open

### Search Algorithm
- **Exact Match Scoring**: Direct substring matches get highest priority
- **Fuzzy Matching**: Characters can be scattered (e.g., "emlcp" finds "Email Copy")
- **Bonus Points**: Consecutive character matches get higher scores
- **Limited Results**: Shows top 10 matches for performance

### Performance Optimizations
- Lazy loading of heavy components
- Memoized search filtering
- Debounced keyboard input handling
- Virtual scrolling support in result lists

## Accessibility
- Full keyboard navigation support
- ARIA labels on interactive elements
- Visual focus indicators
- Screen reader compatible

## Browser Support
- All modern browsers (Chrome, Firefox, Safari, Edge)
- Graceful degradation for older browsers
- Touch-friendly on mobile devices

## Future Enhancements
Potential improvements for future versions:
- Recent searches history
- Keyboard shortcut customization
- Additional quick actions (duplicate, export, etc.)
- Search within conversation content
- Keyboard navigation for sidebar conversations

## Testing
To test the keyboard shortcuts:
1. Start the development server
2. Navigate to any brand's chat page
3. Try each keyboard shortcut listed above
4. Test the command palette search with various queries
5. Verify shortcuts work in different contexts (with/without modals open)

## Notes
- The Command K pattern follows industry standards (VS Code, Linear, etc.)
- Shortcuts are designed to not conflict with browser defaults
- Platform-specific shortcuts are automatically detected and displayed

