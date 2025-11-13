# Sidebar Collapse Architecture Refactor

## Problem
The previous sidebar collapse implementation had several architectural issues:
1. **Dual state systems**: Sidebar maintained its own `isCollapsed` state AND tried to sync with `ResizablePanel` via events
2. **Fixed width conflicts**: Sidebar used `lg:w-full` with conditional `lg:!w-[68px]` which fought against ResizablePanel's dynamic sizing
3. **Event-driven sync**: Custom events to sync state between components caused render-during-render errors
4. **Poor integration**: Collapse button didn't integrate with the resizable panel system - it was a separate mechanism
5. **Fragile timing**: `useEffect` broadcasting events could trigger `PanelGroup` updates during render

## Solution
Complete refactor to use React's built-in ResizablePanel collapse functionality:

### 1. Created Context for Panel Control
- New file: `contexts/SidebarPanelContext.tsx`
- Provides `isCollapsed` and `toggleCollapse` from parent panel wrapper
- Clean separation of concerns - sidebar component is a dumb component that renders based on context

### 2. Updated SidebarPanelWrapper
- Uses ResizablePanel's built-in `collapsible`, `collapsedSize`, `onCollapse`, and `onExpand` props
- Manages collapse state internally with `useState`
- Syncs to localStorage for persistence
- Calls panel's native `collapse()` and `expand()` methods via imperative handle
- Provides state via context to child components

### 3. Updated ChatSidebarEnhanced
- Removed internal `isCollapsed` state
- Consumes collapse state and toggle function from context
- Conditionally renders collapse buttons only when context is available (desktop mode)
- No more fixed width classes - lets ResizablePanel handle all sizing
- Changed from `lg:!w-[68px]` to `lg:w-full lg:h-full` to work with panel system

### 4. Benefits
- **Native integration**: Uses ResizablePanel's built-in collapse instead of fighting it
- **No event hacks**: State flows naturally through React context
- **Smooth animations**: Panel system handles all transitions
- **Drag-friendly**: Manual resizing works perfectly with programmatic collapse
- **Type-safe**: Proper TypeScript types throughout
- **Mobile-safe**: Context is optional, mobile overlay mode works independently

## Technical Details

### Panel Collapse Flow
1. User clicks collapse button in sidebar
2. Sidebar calls `toggleCollapse()` from context
3. Panel wrapper checks current `isCollapsed` state
4. Calls `panelRef.current.collapse()` or `expand()`
5. ResizablePanel animates to `collapsedSize` (5%) or previous size
6. Panel's `onCollapse`/`onExpand` callbacks fire
7. Wrapper updates `isCollapsed` state
8. Context provides new state to sidebar
9. Sidebar re-renders with collapsed UI

### State Management
```typescript
// Parent (SidebarPanelWrapper)
const [isCollapsed, setIsCollapsed] = useState(() => 
  localStorage.getItem('sidebarCollapsed') === 'true'
);

// Child (ChatSidebarEnhanced)
const panelContext = useSidebarPanel();
const isCollapsed = panelContext?.isCollapsed ?? false;
const toggleCollapse = panelContext?.toggleCollapse;
```

### Mobile vs Desktop
- **Desktop**: Panel wrapper provides context, full collapse functionality
- **Mobile**: No context (overlay mode), collapse buttons hidden via conditional render
- **Keyboard shortcut**: Cmd/Ctrl+B calls `toggleCollapse?.()` safely

## Files Changed
1. `contexts/SidebarPanelContext.tsx` - New context provider
2. `app/brands/[brandId]/chat/page.tsx` - Refactored panel wrapper
3. `components/ChatSidebarEnhanced.tsx` - Consume context, removed internal state

## Testing
- Collapse button should smoothly animate sidebar to ~68px width
- Dragging resize handle should work before, during, and after collapse
- Sidebar should remember collapse state after page reload
- Mobile overlay should work independently without collapse feature
- No console errors about setState during render
- Keyboard shortcut (Cmd/Ctrl+B) should work

## Future Improvements
- Could add animations with `transition-all` on panel width
- Could add hover expand preview in collapsed state
- Could sync collapse state across tabs with localStorage events

