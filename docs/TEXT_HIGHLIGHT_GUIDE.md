# Text Highlight Commenting - User Guide

## How to Comment on Highlighted Text

### Step-by-Step

1. **Find the text you want to comment on** in any AI message
2. **Click and drag** to select/highlight the text (at least 5 characters)
3. **Release** the mouse button
4. A **yellow "💬 Comment" button** appears above your selection
5. **Click the button** to open the comments panel
6. Your selected text appears in a **yellow box** in the panel
7. **Type your comment** about that specific text
8. **Press Ctrl/Cmd + Enter** or click "Post"
9. Your comment is saved with the highlighted text quoted

## Visual Example

```
Message: "Our product increases conversion rates by 50%..."
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
         (highlight this text)
                    ↓
         [💬 Comment] ← Yellow button appears here
                    ↓
         Comments Panel Opens:
         ┌─────────────────────────────────┐
         │ 💬 Commenting on:               │
         │ "increases conversion rates by  │
         │  50%"                            │
         │                                 │
         │ [Add your comment here...]      │
         └─────────────────────────────────┘
```

## Requirements

- ✅ **Minimum selection**: 5+ characters
- ✅ **Comment button enabled**: Must be in a conversation with comments feature
- ✅ **AI messages only**: Highlight commenting works on assistant messages

## Tips

### Best Practices
- **Select full phrases** for clarity (5+ characters)
- **Be specific** in your comments about the highlighted text
- **Use for feedback** on specific claims, wording, or suggestions
- **Quote sparingly** - only highlight what needs discussion

### Keyboard Shortcuts
- **Cmd/Ctrl + A**: Select all text
- **Cmd/Ctrl + Enter**: Post comment (after clicking highlight button)
- **Escape**: Close comments panel

### Troubleshooting

**Button doesn't appear?**
- Make sure you selected at least 5 characters
- Try selecting again with a slower drag
- Check the browser console for selection logs
- Ensure you're selecting text in an AI message (not user message)

**Button disappears?**
- Clicking anywhere else clears the selection
- Scrolling clears the selection
- This is by design - just select again

**Can't see the button?**
- Look for a **bright yellow button** with shadow
- It appears **above** your selection
- Very high z-index (99999) - should be visible over everything
- Has emoji 💬 and text "Comment"

## Technical Details

### Visual Design
- **Color**: Bright yellow (#EAB308)
- **Size**: Prominent (px-4 py-2.5)
- **Position**: Centered above selection, 60px up
- **Shadow**: Large shadow for visibility
- **Animation**: Fade and zoom in
- **Hover**: Scales up 5% larger

### Selection Detection
- **Event**: `onMouseUp` on message container
- **Delay**: 50ms to ensure selection completes
- **Min length**: 5 characters
- **Position**: Calculated from selection rect
- **Clear on**: Click outside, scroll, or use button

### Data Storage
- **Database column**: `quoted_text` in `conversation_comments`
- **API field**: `quotedText` in POST request
- **Display**: Yellow bordered box in comments panel

## Use Cases

### Product Claims
```
Highlight: "increases revenue by 30%"
Comment: "Do we have data to back this up?"
```

### Wording Feedback
```
Highlight: "game-changing innovation"
Comment: "Too salesy - let's tone this down"
```

### Specific Edits
```
Highlight: "limited time offer"
Comment: "Change to 'exclusive early access'"
```

### Questions
```
Highlight: "eco-friendly materials"
Comment: "Which specific materials? Need details"
```

## Limitations

- Currently no edit/delete of quote after posting
- Quoted text stored as plain string (no formatting)
- One highlight per comment (can't select multiple ranges)
- No visual highlight remains after commenting (quote shows in panel only)

## Future Enhancements

Potential improvements:
- [ ] Multiple highlights per comment
- [ ] Persistent highlight markers in message (like Google Docs)
- [ ] Edit quoted text after posting
- [ ] Link directly to quoted text from comment
- [ ] Suggest text replacements
- [ ] Track resolved highlights

---

**Try it now!** Select any text in an AI message to see the feature in action. 🎯

