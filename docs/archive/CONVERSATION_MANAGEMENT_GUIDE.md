# Conversation Management Guide

## Overview

The Command Center now includes powerful conversation management features that allow you to efficiently organize, manage, and perform actions on your conversations individually or in bulk.

## Features

### 🗑️ Delete Conversations

You can now permanently delete conversations in two ways:

#### Individual Delete
1. **Hover over a conversation card** in the sidebar
2. Click the **red trash icon** in the quick actions overlay
3. Confirm the deletion when prompted

The conversation and all its messages will be permanently removed.

#### From Quick Actions Menu
Click on a conversation card to select it, then use the action menu to delete it.

---

### 📦 Bulk Actions

Perform actions on multiple conversations at once for improved efficiency.

#### Entering Bulk Select Mode

1. Click the **Bulk Select button** (clipboard with checkmark icon) next to the "New Conversation" button in the sidebar
2. The button will turn **orange** when bulk select mode is active
3. All conversation cards will display **checkboxes** in the top-left corner

#### Selecting Conversations

- **Click on any conversation card** to toggle its selection
- **Click the checkbox directly** on a conversation card to select/deselect it
- Use the **"Select all"** button in the bulk action bar to select all visible conversations

#### Available Bulk Actions

When you have conversations selected, a blue **Bulk Action Bar** appears at the top of the sidebar with the following options:

##### 📌 Pin / Unpin
- **Pin**: Pin selected conversations to keep them at the top of the list
- **Unpin**: Remove pin from selected conversations

##### 📁 Archive / Unarchive
- **Archive**: Move conversations to the archive (hidden from main view)
- **Unarchive**: Restore archived conversations to main view

##### 💾 Export
Export selected conversations as a JSON file containing:
- Conversation metadata
- All messages
- Timestamps
- Export date and version info

##### 🗑️ Delete
Permanently delete multiple conversations at once.

**Safety Feature**: Click the delete button once, it will turn red and ask for confirmation. Click again to confirm deletion. The confirmation automatically cancels after 5 seconds if you don't confirm.

#### Exiting Bulk Select Mode

- Click the **orange Bulk Select button** again (now showing an X icon)
- Click the **X button** in the bulk action bar
- Selection will be cleared automatically after performing any bulk action

---

## Usage Examples

### Example 1: Clean Up Old Conversations

1. Enable **Bulk Select mode**
2. Select all conversations older than a certain date
3. Click **Archive** to move them out of your main view
4. Or click **Delete** twice to permanently remove them

### Example 2: Organize Important Conversations

1. Enable **Bulk Select mode**
2. Select your most important conversations
3. Click **Pin** to keep them at the top of your sidebar

### Example 3: Export a Backup

1. Enable **Bulk Select mode**
2. Click **Select all** to select all conversations
3. Click **Export** to download a complete backup of all your conversations

### Example 4: Quick Delete Single Conversation

1. Hover over the conversation you want to delete
2. Click the **red trash icon** that appears
3. Confirm the deletion

---

## Visual Indicators

### Bulk Select Mode Active
- 🟧 **Orange button** in sidebar (Bulk Select toggle)
- ☑️ **Checkboxes** appear on all conversation cards
- 🔵 **Blue action bar** appears when conversations are selected

### Selected Conversations
- ✅ **Blue checkmark** in the checkbox
- 🔵 **Blue highlight** ring around the card
- 💡 **Light blue background** on the card

### Bulk Action Bar
Shows:
- Number of conversations selected
- Quick action buttons (Pin, Unpin, Archive, Unarchive, Export)
- Delete button (with confirmation safety feature)

---

## Safety Features

### Delete Confirmation
Both individual and bulk delete operations require confirmation:

**Individual Delete**: Standard browser confirmation dialog

**Bulk Delete**: 
1. Click delete button (turns red)
2. Warning message appears
3. Click again within 5 seconds to confirm
4. Auto-cancels if you wait longer than 5 seconds

### Visual Feedback
All actions show toast notifications:
- ✅ Success: "Conversation deleted", "5 conversations archived", etc.
- ❌ Error: "Failed to delete conversation", etc.

### Undo Protection
Deleted conversations cannot be recovered. Always double-check before confirming deletions!

---

## Tips & Best Practices

### 🎯 Organization Strategy

1. **Pin** your active projects and important conversations
2. **Archive** completed or reference conversations you want to keep but don't need daily
3. **Delete** test conversations or ones you no longer need

### 💾 Regular Backups

Use the bulk export feature regularly to create backups:
- Weekly exports of all conversations
- Project-specific exports before major changes

### 🚀 Workflow Efficiency

1. Use **Bulk Select** for batch operations instead of one-by-one
2. **Archive** instead of delete when unsure
3. **Pin** conversations you're actively working on

### 📱 Mobile Usage

- All features work on mobile devices
- Tap to select in bulk mode
- Swipe gestures for quick actions (coming soon!)

---

## Technical Details

### Data Structure

**Exported JSON Format**:
```json
{
  "conversations": [
    {
      "conversation": {
        "id": "uuid",
        "title": "Conversation Title",
        "created_at": "2025-01-01T00:00:00Z",
        ...
      },
      "messages": [
        {
          "role": "user",
          "content": "Message content",
          "created_at": "2025-01-01T00:00:00Z"
        }
      ]
    }
  ],
  "exportedAt": "2025-01-01T00:00:00Z",
  "count": 5,
  "version": "1.0"
}
```

### Database Operations

- **Delete**: Cascade deletes all associated messages
- **Archive**: Sets `is_archived` flag to true
- **Pin**: Sets `is_pinned` flag to true
- All operations are atomic and transactional

---

## Keyboard Shortcuts (Coming Soon)

- `Ctrl/Cmd + A` - Select all in bulk mode
- `Escape` - Exit bulk select mode
- `Delete` - Delete selected conversations (with confirmation)

---

## Troubleshooting

### Bulk Actions Not Working?

1. Make sure you've selected at least one conversation
2. Check that you're not trying to perform contradictory actions (e.g., pin and unpin simultaneously)
3. Refresh the page if the UI seems stuck

### Conversations Not Deleting?

1. Check your permissions in the database
2. Ensure you're not trying to delete a conversation that's currently open
3. Try deleting one at a time to identify the problematic conversation

### Selection Not Showing?

1. Make sure bulk select mode is active (orange button)
2. Click directly on the checkbox or card
3. Refresh the page if checkboxes aren't appearing

---

## Feature Comparison

| Action | Individual | Bulk | Notes |
|--------|-----------|------|-------|
| Delete | ✅ | ✅ | Both require confirmation |
| Archive | ✅ | ✅ | Reversible with unarchive |
| Pin | ✅ | ✅ | Max recommended: 10 pinned |
| Export | ✅ | ✅ | Bulk export includes all data |
| Duplicate | ✅ | ❌ | Individual only |
| Rename | ✅ | ❌ | Individual only |

---

## Future Enhancements

- 🔄 Undo functionality for recent deletions (trash/recycle bin)
- 🏷️ Tags and labels for better organization
- 🔍 Advanced filtering for bulk selection
- ⌨️ Full keyboard navigation
- 📱 Mobile-optimized swipe gestures
- 🗂️ Folder/project organization
- 🔄 Move between brands/projects

---

## Support

If you encounter any issues or have suggestions:
1. Check this documentation first
2. Review the troubleshooting section
3. Report issues through the feedback system

---

**Last Updated**: November 1, 2025  
**Version**: 1.0

