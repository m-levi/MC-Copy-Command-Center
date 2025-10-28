# Auto-Naming & Easy Renaming - Visual Guide

## 🎬 User Flow Diagrams

### Auto-Naming Flow

```
┌─────────────────────────────────────────────────────────┐
│  User creates new conversation                          │
│  Title: "New Conversation"                              │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  User sends first message:                              │
│  "I need to create a promotional email                  │
│   for our summer sale"                                  │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  🤖 AI Processing (Background)                          │
│  ┌──────────────────────────────────────────┐          │
│  │ POST /api/conversations/{id}/name        │          │
│  │ Model: gpt-4o-mini                       │          │
│  │ Cost: ~$0.000015                         │          │
│  │ Time: 500ms - 2s                         │          │
│  └──────────────────────────────────────────┘          │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  ✅ Title Updated Automatically                         │
│  New Title: "Summer Sale Promotional Email"            │
│  User continues chatting without interruption           │
└─────────────────────────────────────────────────────────┘
```

### Manual Renaming Flow (Double-Click)

```
┌─────────────────────────────────────────────────────────┐
│  Conversation Title: "Summer Sale Email"                │
│  👆 User double-clicks on title                         │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  📝 Editing Mode Activated                              │
│  ┌────────────────────────────────────┐               │
│  │ [Q3 Summer Campaign________]       │ ← Input field  │
│  └────────────────────────────────────┘               │
│  • Input field appears with blue border                 │
│  • Auto-focused and ready to type                       │
│  • Press Enter to save, Escape to cancel               │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  User types new name and presses Enter                  │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  🔄 API Call                                            │
│  ┌──────────────────────────────────────────┐          │
│  │ PATCH /api/conversations/{id}/name       │          │
│  │ { title: "Q3 Summer Campaign" }          │          │
│  │ Response time: 100-300ms                 │          │
│  └──────────────────────────────────────────┘          │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  ✅ Title Updated                                       │
│  New Title: "Q3 Summer Campaign"                        │
│  Toast: "Conversation renamed"                          │
└─────────────────────────────────────────────────────────┘
```

### Manual Renaming Flow (Button)

```
┌─────────────────────────────────────────────────────────┐
│  Conversation Item in Sidebar                           │
│  ┌───────────────────────────────────────────┐         │
│  │ Summer Sale Email          [✏️] [🗑️]      │ ← Hover │
│  │ John Doe • Oct 28                         │         │
│  └───────────────────────────────────────────┘         │
│  👆 User clicks pencil icon                             │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  📝 Editing Mode (Same as double-click)                 │
│  Input field appears, user edits, saves                 │
└─────────────────────────────────────────────────────────┘
```

## 🎨 UI States

### 1. Default State (Not Hovering)
```
┌─────────────────────────────────────────┐
│ Summer Sale Promotional Email           │
│ John Doe • Oct 28                       │
└─────────────────────────────────────────┘
```

### 2. Hover State (Actions Visible)
```
┌─────────────────────────────────────────┐
│ Summer Sale Email       ✏️ Rename 🗑️    │
│ John Doe • Oct 28                       │
└─────────────────────────────────────────┘
      ↑                      ↑        ↑
   Cursor               Edit btn  Delete btn
```

### 3. Editing State
```
┌─────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐│
│ │ Q3 Summer Campaign|                 ││ ← Blue border
│ └─────────────────────────────────────┘│
│ John Doe • Oct 28                       │
└─────────────────────────────────────────┘
```

### 4. Current Conversation (Selected)
```
┌─────────────────────────────────────────┐
│ ⚡ Summer Sale Email      ✏️ 🗑️         │ ← White/gray-700
│ John Doe • Oct 28                       │    background
└─────────────────────────────────────────┘
```

## 🎯 Interactive Elements

### Conversation Item Anatomy
```
┌──────────────────────────────────────────────────┐
│  ┌────────────────────┐  ┌─────┐  ┌─────┐      │
│  │    Title Area      │  │ ✏️  │  │ 🗑️  │      │
│  │ (Double-click here)│  │Edit │  │Del. │      │
│  └────────────────────┘  └─────┘  └─────┘      │
│  John Doe • Oct 28                               │
│  ├─────────┘   └─────────┤                      │
│  Creator      Date                               │
└──────────────────────────────────────────────────┘
```

### Button States
```
✏️ Rename Button:
   • Default: Gray (hidden)
   • Hover on conversation: Visible, gray
   • Hover on button: Blue
   • Click: Activates edit mode

🗑️ Delete Button:
   • Default: Gray (hidden)
   • Hover on conversation: Visible, gray
   • Hover on button: Red
   • Click: Shows confirmation dialog
```

## 💬 Toast Notifications

### Success Messages
```
┌─────────────────────────────────────┐
│ ✅ Conversation renamed             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ✅ New conversation created         │
└─────────────────────────────────────┘
```

### Error Messages
```
┌─────────────────────────────────────┐
│ ❌ Failed to rename conversation    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ❌ Failed to generate title         │
└─────────────────────────────────────┘
```

## 🎬 Animation Timeline

### Auto-Naming Animation
```
0ms:   Title shows "New Conversation"
       User sends message
       ↓
500ms: API call to generate title
       (User continues interacting with UI)
       ↓
1500ms: Title smoothly fades to new name
        "Summer Sale Promotional Email"
        ↓
2000ms: Toast appears briefly
        "Conversation created"
```

### Manual Rename Animation
```
0ms:   User double-clicks title
       ↓
50ms:  Input field appears with blue border
       Text is selected (ready to replace)
       ↓
User:  Types new title
       ↓
500ms: Presses Enter
       ↓
700ms: API updates title (100-300ms)
       ↓
750ms: Title updates in UI
       Toast appears: "Conversation renamed"
```

## 📱 Responsive Behavior

### Desktop (398px sidebar)
```
┌──────────────────────────────────────┐
│ Summer Sale Promotional Email ✏️ 🗑️  │
│ John Doe • Oct 28                    │
└──────────────────────────────────────┘
```

### Tablet (narrow sidebar)
```
┌────────────────────────────┐
│ Summer Sale Email... ✏️ 🗑️ │
│ John • Oct 28              │
└────────────────────────────┘
         ↑
    Truncated with ellipsis
```

### Mobile (full width)
```
┌──────────────────────────────────────┐
│ Summer Sale Promotional Email        │
│ ✏️ Rename  🗑️ Delete                 │
│ John Doe • Oct 28                    │
└──────────────────────────────────────┘
    ↑
Buttons always visible (no hover)
```

## 🎨 Color Palette

### Light Mode
```
Background (default):     #f0f0f0
Background (hover):       #e5e5e5
Background (selected):    #ffffff
Border:                   #d8d8d8
Text (title):            #000000
Text (metadata):         #666666
Edit button (hover):     #3b82f6 (blue)
Delete button (hover):   #ef4444 (red)
Input border (editing):  #3b82f6 (blue)
```

### Dark Mode
```
Background (default):     #111827 (gray-900)
Background (hover):       #1f2937 (gray-800)
Background (selected):    #374151 (gray-700)
Border:                   #374151 (gray-700)
Text (title):            #ffffff
Text (metadata):         #9ca3af (gray-400)
Edit button (hover):     #60a5fa (blue-400)
Delete button (hover):   #f87171 (red-400)
Input border (editing):  #60a5fa (blue-400)
```

## ⌨️ Keyboard Shortcuts

```
┌────────────────────┬─────────────────────────────┐
│ Key                │ Action                      │
├────────────────────┼─────────────────────────────┤
│ Double-click       │ Start editing title         │
│ Enter              │ Save changes                │
│ Escape             │ Cancel editing              │
│ Tab                │ Navigate to next element    │
│ Click away         │ Save changes (blur)         │
└────────────────────┴─────────────────────────────┘
```

## 🔄 State Transitions

```
    Idle State
        │
        │ (User double-clicks or clicks edit)
        ▼
   Editing State
        │
        ├─ (User presses Enter) ─────────┐
        │                                 ▼
        │                            Saving State
        │                                 │
        │                                 ▼
        │                            Idle State (with new title)
        │
        └─ (User presses Escape) ───────▶ Idle State (unchanged)
```

## 📊 Performance Indicators

### Loading States
```
Auto-naming in progress:
  ┌─────────────────────────────────┐
  │ Generating title... ⏳          │
  └─────────────────────────────────┘

Saving rename:
  ┌─────────────────────────────────┐
  │ Saving... ⏳                     │
  └─────────────────────────────────┘
```

### Success Indicators
```
  ┌─────────────────────────────────┐
  │ ✅ Summer Sale Email            │
  │    John Doe • Oct 28            │
  └─────────────────────────────────┘
```

## 🎯 Click Zones

```
┌────────────────────────────────────────────┐
│  ████████████████████████  □  □           │
│  █ Title (double-click) █  E  D           │
│  █ to edit              █  d  e           │
│  █                      █  i  l           │
│  ████████████████████████  t  .           │
│  Metadata (not clickable)                  │
└────────────────────────────────────────────┘
   ↑                        ↑  ↑
   Double-click zone        │  Delete button
                            │
                        Edit button
```

## 💡 User Hints

### Tooltip Text
- **Title area**: "Double-click to rename"
- **Edit button**: "Rename"
- **Delete button**: "Delete"

### Placeholder Text (when editing)
```
┌─────────────────────────────────┐
│ Enter conversation title...     │
└─────────────────────────────────┘
```

## 🎉 Complete User Journey

```
Step 1: Create Conversation
   "New Conversation" appears in sidebar

Step 2: Send First Message
   User: "Create promotional email for sale"

Step 3: Auto-Naming (Background)
   🤖 AI generates: "Promotional Email for Sale"
   Title updates automatically

Step 4: Continue Chatting
   User interacts with AI, refines email

Step 5: Rename (Optional)
   User double-clicks title
   Changes to: "Q3 Flash Sale Campaign"
   Saves with Enter

Step 6: Find Later
   User easily finds conversation by descriptive title
   ✅ Better organization!
```

---

This visual guide provides a complete picture of how users interact with the auto-naming and renaming features!

