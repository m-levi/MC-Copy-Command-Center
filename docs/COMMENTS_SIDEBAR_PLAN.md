# Comments Sidebar Refactor - Implementation Plan

## Current State
- Comments are a fixed overlay (`position: fixed, right: 0`)
- Toggle on/off via `showCommentsPanel` state
- No resizing capability

## Target State
- Comments are a resizable sidebar (like left sidebar)
- Can toggle visibility
- Can resize width
- Integrated into main layout with ResizablePanel

## Changes Required

### 1. Chat Page Layout Restructure
Current layout:
```
<ResizablePanelGroup>
  <SidebarPanel> (left)
  <MainChatArea>
</ResizablePanelGroup>
```

New layout:
```
<ResizablePanelGroup>
  <SidebarPanel> (left)
  <MainChatArea>
  <CommentsPanel> (right, collapsible)
</ResizablePanelGroup>
```

### 2. Component Updates

**File**: `app/brands/[brandId]/chat/page.tsx`
- Import `CommentsSidebar` instead of `CommentsPanel`
- Add state for comments sidebar collapsed/expanded
- Add comments panel to ResizablePanelGroup
- Add toggle button in header
- Pass `onSendToChat` handler

**File**: `components/CommentsSidebar.tsx` (new)
- Already created with refined UI
- Resizable container
- "Send to Chat" functionality
- Better empty states

**File**: `components/CommentsPanel.tsx` (deprecated)
- Keep for now, will remove after migration

### 3. Features to Implement

- [ ] Resizable sidebar (like left sidebar)
- [ ] Toggle button in header (comments icon)
- [ ] Persist collapsed state in localStorage
- [ ] "Send to Chat" from comments
- [ ] "Send to Chat" from quoted text
- [ ] Inline comment indicators (already done)
- [ ] Refined selection menu (already done)

### 4. State Management

```typescript
// Add to chat page state
const [commentsSidebarCollapsed, setCommentsSidebarCollapsed] = useState(true);

// Add to localStorage
localStorage.getItem('commentsSidebarCollapsed')
localStorage.setItem('commentsSidebarCollapsed', 'true|false')
```

### 5. Handler Functions

```typescript
const handleSendToChat = (text: string) => {
  setDraftContent(prev => prev ? `${prev}\n\n${text}` : text);
  toast.success('Added to chat input');
};
```

## Implementation Status

✅ Created CommentsSidebar component
✅ Added "Send to Chat" buttons
✅ Refined selection menu (Comment + Copy)
✅ Removed debug elements
✅ Added inline comment indicators
⏳ Integrate into ResizablePanelGroup
⏳ Add toggle button
⏳ Wire up "Send to Chat"
⏳ Test and polish

## Next Steps

1. Update chat page layout with ResizablePanelGroup
2. Add toggle state and button
3. Wire up "Send to Chat" handler
4. Test resizing and collapsing
5. Remove old CommentsPanel
6. Update documentation

