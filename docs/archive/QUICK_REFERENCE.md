# Enhanced Chat - Quick Reference Guide

## 🚀 Getting Started

### Step 1: Database Setup (Required for RAG)
```bash
# Open Supabase SQL Editor
# Copy and run: DATABASE_MIGRATION.sql
```

### Step 2: Environment Check
```env
# Ensure these are set in .env.local:
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Step 3: Start Using!
All features work immediately except RAG (needs DB migration)

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in message |
| `Cmd/Ctrl+Enter` | Save edited message |
| `Esc` | Cancel edit / Close dialog |
| `↑` `↓` | Navigate slash commands |
| `Tab` | Accept slash command |

---

## 💬 Slash Commands

Type `/` in the chat input:

| Command | Effect |
|---------|--------|
| `/shorten` | Make the previous email 30% shorter |
| `/urgent` | Add urgency and scarcity elements |
| `/casual` | Change to casual, friendly tone |
| `/professional` | Change to professional tone |
| `/proof` | Add social proof (reviews, stats) |
| `/cta` | Improve call-to-action buttons |

---

## ⚡ Quick Actions

Appear after AI generates a response:

- **📏 Make Shorter** - Reduce word count by ~30%
- **⚡ Add Urgency** - Add scarcity/FOMO elements
- **😊 More Casual** - Friendlier, conversational tone
- **💼 More Professional** - Polished, formal tone
- **⭐ Add Social Proof** - Include testimonials/stats
- **🎯 Improve CTAs** - Better action buttons

---

## 📧 Email Templates

### Promotional
- **Flash Sale** - Limited-time urgent offers
- **Seasonal** - Holiday/seasonal campaigns

### Announcements
- **Product Launch** - New product reveals
- **Back in Stock** - Popular item returns

### Transactional
- **Welcome** - First email to subscribers
- **Abandoned Cart** - Recover lost sales
- **Post-Purchase** - Thank you & tips

### Nurture
- **Educational** - Tips and insights
- **Success Story** - Customer testimonials
- **Re-engagement** - Win back inactive users
- **VIP/Loyalty** - Reward best customers

---

## ✏️ Editing Messages

1. **Hover** over your message
2. **Click** "Edit" button
3. **Modify** the text
4. **Press** `Cmd/Ctrl+Enter` or click "Save & Regenerate"
5. **Watch** AI generate new response

Note: Editing deletes all messages after the edited one.

---

## 🔄 Section Regeneration

1. **Toggle** to "Sections" view (button in message toolbar)
2. **Click** regenerate icon on any section
3. **Wait** for only that section to update
4. **Repeat** for other sections if needed

Works for: Subject Line, Hero, Body Sections, CTA

---

## 📊 Conversation Stats

Automatically shown above messages:
- **Word Count** - Total words in email
- **Read Time** - Estimated reading time
- **Sections** - Number of email sections
- **Characters** - Total character count

---

## 🗃️ Brand Knowledge Base (RAG)

### Adding Documents

1. **Open** brand document manager
2. **Click** "Add Document"
3. **Choose** type:
   - 📧 Example Email
   - 🔍 Competitor Analysis
   - 📊 Research
   - ⭐ Customer Testimonial
4. **Enter** title and paste content
5. **Upload** - AI creates embedding automatically

### How It Works
- AI searches documents when answering
- Finds 3 most relevant documents
- Includes them in prompt context
- Results in more brand-aligned responses

---

## 📴 Offline Mode

### Auto-Save
- Drafts save every 2 seconds
- Stored in browser localStorage
- Restored when reopening conversation

### Offline Queue
- Messages sent while offline are queued
- Visual indicator shows offline status
- Auto-sends when connection restored
- Never lose work due to connectivity

---

## 🎭 Message Reactions

For AI messages only:
- **👍 Thumbs Up** - Good response
- **👎 Thumbs Down** - Needs improvement

Reactions stored for future analytics

---

## 🔧 Error Handling

### Automatic Retry
- Failed requests retry 3 times
- Exponential backoff (1s, 2s, 4s)
- 60-second timeout per request

### Model Fallback
If primary model fails:
- **GPT-5** → Claude 4.5 Sonnet
- **Claude** → GPT-5
- Transparent to user

---

## 🎯 Best Practices

### For Best Results
1. **Be Specific** - Include product names, discounts, timeframes
2. **Mention Audience** - "for millennials", "professional tone"
3. **Use Templates** - Start with pre-built structure
4. **Upload Examples** - Add your best emails to knowledge base
5. **Try Quick Actions** - Fast way to explore variations

### Efficient Workflow
1. Select template
2. Fill in specific details
3. Review initial generation
4. Use quick actions to refine
5. Regenerate individual sections if needed
6. Edit and regenerate for fine-tuning

---

## 🐛 Troubleshooting

### Slash Commands Not Working
- Type `/` at start of word, not mid-sentence
- Use arrow keys to navigate suggestions
- Press Tab or Enter to select

### Section Regeneration Not Updating
- Switch to "Sections" view first
- Click section's regenerate icon, not message regenerate

### Quick Actions Not Showing
- Only appear after AI responses
- Not shown during generation
- Hidden for user messages

### Offline Indicator Stuck
- Check browser online status
- Refresh page
- Clear localStorage if persistent

### RAG Not Finding Documents
- Run `DATABASE_MIGRATION.sql` first
- Verify documents uploaded successfully
- Check console for errors

---

## 📈 Performance Tips

### Faster Responses
- Use shorter prompts when possible
- Reference previous context
- Leverage templates

### Better Quality
- Upload brand examples
- Be specific about tone/audience
- Use section regeneration for fine-tuning

### Efficient Editing
- Edit early messages, not late ones
- Use quick actions before manual edits
- Try slash commands first

---

## 🔐 Privacy & Data

### What's Stored
- Messages in Supabase database
- Drafts in browser localStorage
- Offline queue in browser localStorage
- Document embeddings in database

### What's Not Stored
- API keys (server-side only)
- Slash command history
- Temporary UI state

### Security
- Row Level Security (RLS) on all tables
- Users can only access own data
- Embeddings encrypted at rest

---

## 🆘 Getting Help

### Check Logs
Browser Console → Look for:
- `Chat API error:` - API issues
- `RAG search error:` - Document search problems
- `Error editing message:` - Edit failures

### Common Solutions
1. Refresh the page
2. Clear browser cache
3. Check environment variables
4. Verify database migration ran
5. Check API key limits

---

## 🎓 Advanced Tips

### Power User Moves
- Chain quick actions (shorten → add urgency)
- Edit middle messages to branch conversation
- Use reactions to train future improvements
- Combine templates with custom sections

### Template Customization
- Start with closest template
- Edit to match your needs
- Save successful prompts for reuse
- Upload result as example document

### RAG Optimization
- Upload diverse examples
- Include competitor successes
- Add research/data sources
- Organize with clear titles

---

## 📞 Quick Links

- **Full Guide**: `ENHANCED_CHAT_IMPLEMENTATION_GUIDE.md`
- **Database Setup**: `DATABASE_MIGRATION.sql`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Original Plan**: `enhanced-chat-intelligence.plan.md`

---

**Happy Copywriting! ✨**



















