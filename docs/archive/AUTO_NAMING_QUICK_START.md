# Auto-Naming Quick Start Guide

## What's New?

Your conversations now get **automatically named** using AI when you create them, and you can **easily rename** them with a simple double-click!

## 🎯 Quick Demo

### Auto-Naming in Action

1. **Create a new conversation** (click "New Conversation" button)
2. **Send your first message**: "I want to create an email for our Black Friday sale"
3. **Watch the magic**: The conversation title automatically changes from "New Conversation" to something like "Black Friday Sale Email"

**That's it!** No manual naming required.

### Easy Renaming

**Method 1: Double-Click** (Fastest)
1. Double-click on any conversation title in the sidebar
2. Type your new name
3. Press Enter (or click away to save)

**Method 2: Rename Button**
1. Hover over a conversation in the sidebar
2. Click the pencil icon that appears
3. Type your new name
4. Press Enter to save

**Keyboard Shortcuts:**
- **Enter** = Save changes
- **Escape** = Cancel editing

## 💰 Cost Information

**Auto-naming is VERY cheap:**
- Uses `gpt-4o-mini` or `claude-3-5-haiku` (lowest cost models)
- Cost per title: ~$0.000015 - $0.000025
- **10,000 conversations = $0.15 - $0.25**

You can enable/disable by adding or removing API keys from your `.env` file.

## ⚙️ Setup

### Required (at least one):
```env
OPENAI_API_KEY=sk-proj-...
# OR
ANTHROPIC_API_KEY=sk-ant-...
```

### Without API Keys:
The system will fallback to extracting the first 5-6 words from your message as the title.

## 🎨 UI Features

### Sidebar Conversation Items:
- **Blue highlight** when editing
- **Hover effects** show rename and delete buttons
- **Smooth transitions** for a polished feel
- **Tooltips** to guide users ("Double-click to rename")

### Visual Indicators:
- Pencil icon = Rename
- Trash icon = Delete
- Blue border = Currently editing

## 📱 Best Practices

1. **First messages matter**: Make your first message descriptive for better auto-naming
   - ✅ Good: "Create promotional email for summer sale"
   - ❌ Less good: "Hey"

2. **Rename when needed**: Auto-names are smart but not perfect - rename for clarity

3. **Keep it short**: Titles truncate in the UI, so keep them concise (3-8 words ideal)

## 🐛 Troubleshooting

**Title not auto-generating?**
- Check your API keys in `.env`
- Look at server console for errors
- Fallback will still work (extracts first words)

**Can't rename?**
- Make sure you're clicking the pencil icon or double-clicking the title
- Check that you have edit permissions for the conversation

**Title too long?**
- Titles are capped at 100 characters
- Sidebar truncates display with "..." for readability

## 💡 Pro Tips

1. **Batch create**: Create multiple conversations quickly - they'll all get auto-named
2. **Organize later**: Auto-names give you a starting point, rename for your workflow
3. **Use descriptive first messages**: Better first message = better auto-name
4. **Double-click is fastest**: Skip the hover, just double-click the title

## 🚀 What's Different?

### Before:
```
Every conversation: "New Conversation"
Manual naming required every time
Hard to find past conversations
```

### After:
```
Auto-generated descriptive titles
"Summer Sale Campaign"
"Customer Onboarding Email"
"Holiday Promotion Draft"
Easy to find and organize!
```

## Examples

| First Message | Auto-Generated Title |
|--------------|---------------------|
| "I need to create a welcome email for new subscribers" | "Welcome Email for New Subscribers" |
| "Help me write a promotional campaign for our product launch" | "Product Launch Promotional Campaign" |
| "Create an abandoned cart recovery email" | "Abandoned Cart Recovery Email" |
| "Draft a thank you email for recent purchases" | "Thank You Email Recent Purchases" |

## Need Help?

Check `AUTO_NAMING_FEATURE.md` for full technical documentation.

Enjoy your automatically organized conversations! 🎉

