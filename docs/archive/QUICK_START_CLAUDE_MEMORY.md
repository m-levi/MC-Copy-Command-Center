# 🚀 Quick Start - Claude Native Memory Tool

**Status:** ✅ Ready to use (after database migration)

---

## What Is This?

Claude now has **native memory** that works like a file system. Instead of you telling Claude to use `[REMEMBER:key=value:category]` syntax, Claude automatically decides what to remember and stores it in organized files.

**Example:**
```
User: "I prefer casual, friendly emails"

Claude (internally):
1. Creates /user_preferences/tone.txt
2. Writes: "Casual and friendly style"
3. Continues response to user

User (later): "Write an email"

Claude (internally):
1. Reads /user_preferences/tone.txt
2. Uses casual, friendly tone automatically
```

---

## Setup (5 minutes)

### Step 1: Apply Database Migration

1. Go to Supabase Dashboard → SQL Editor
2. Open file: `docs/database-migrations/CLAUDE_MEMORY_TOOL_MIGRATION.sql`
3. Copy and paste the SQL
4. Click "Run"

This creates the `claude_memory_files` table.

### Step 2: That's It!

No code changes needed. The system automatically:
- ✅ Uses native memory for Claude models
- ✅ Uses legacy memory for OpenAI models
- ✅ Loads memory context on every request
- ✅ Handles memory operations seamlessly

---

## How to Test (2 minutes)

### Test 1: Save a Preference

Start a new conversation:
```
User: "I want all my emails to be super short, max 2 sentences per section"
```

**Check Supabase:**
```sql
SELECT * FROM claude_memory_files;
```

You should see a new file like `/user_preferences/email_length.txt`

### Test 2: Memory Recall

In the same conversation:
```
User: "Write me an email about our summer sale"
```

**Expected:** Email has max 2 sentences per section, WITHOUT you reminding Claude!

### Test 3: Check Logs

In your terminal/console, look for:
```
[Claude Memory] Loading native memory context for conversation: ...
[Memory Tool] Processing command: create
[Memory Tool] Created/updated file: /user_preferences/email_length.txt
```

---

## What Changed?

### Files Modified

1. **`lib/claude-memory-tool.ts`** (NEW)
   - Memory tool handler
   - Supports all 6 commands: view, create, edit, insert, delete, rename

2. **`lib/unified-stream-handler.ts`**
   - Added memory tool to Anthropic requests
   - Parses memory tool use from Claude

3. **`app/api/chat/route.ts`**
   - Loads Claude memory context in parallel
   - Auto-selects: Claude → native, OpenAI → legacy

4. **`docs/database-migrations/CLAUDE_MEMORY_TOOL_MIGRATION.sql`** (NEW)
   - Creates `claude_memory_files` table
   - RLS policies and indexes

---

## Advantages

| Feature | Old System | New System |
|---------|------------|------------|
| **How it works** | Manual `[REMEMBER:...]` | **Automatic files** |
| **Whitelist** | 10 allowed keys only | **Unlimited** |
| **Organization** | Flat categories | **Directory structure** |
| **Decision** | You tell Claude | **Claude decides** |
| **Editing** | Replace entire value | **Targeted edits** |
| **Intelligence** | Prompt-dependent | **Built-in** |

---

## Common Questions

**Q: Do I need to remove the old memory system?**  
A: No! It still works for OpenAI models. Both systems run in parallel.

**Q: Will this break existing conversations?**  
A: No. Existing conversations keep using legacy memory. New Claude conversations use native memory.

**Q: Can I see memory files in the UI?**  
A: Not yet. Check Supabase for now. UI coming in future update.

**Q: How do I know if it's working?**  
A: Check server logs for `[Claude Memory]` and `[Memory Tool]` messages. Also check Supabase table for new entries.

**Q: What if Claude forgets to use memory?**  
A: Claude's native memory is smarter - it autonomously decides what's important. But you can explicitly say "Remember this..." if needed.

---

## Troubleshooting

### Memory Not Saving

**Check:**
- ✅ Database migration applied?
- ✅ Using Claude model (not OpenAI)?
- ✅ Server logs show `[Memory Tool]` messages?

**Fix:** Check `claude_memory_files` table exists in Supabase.

### Memory Not Loading

**Check:**
- ✅ `conversationId` passed to API?
- ✅ Server logs show `[Claude Memory] Loading...`?

**Fix:** Verify conversation exists in `conversations` table.

### No Memory Files Created

**Check:**
- ✅ Are you asking Claude to remember something?
- ✅ Is beta header enabled? (it is, but verify in code)

**Fix:** Be more explicit: "Please remember that I prefer..."

---

## Next Steps

### Now (Immediate)

1. ✅ Apply database migration
2. ✅ Test in a conversation
3. ✅ Monitor logs
4. ✅ Check Supabase table

### Soon (This Week)

1. Test with different scenarios:
   - User preferences
   - Brand voice
   - Campaign details
   - Product info

2. Monitor memory growth:
   - How many files per conversation?
   - File sizes?
   - Organization patterns?

### Later (Future)

1. Build memory UI:
   - Show files in sidebar
   - Manual editing
   - File browser

2. Cross-conversation memory:
   - Share preferences across chats
   - User-level memory

3. Memory analytics:
   - Usage tracking
   - Effectiveness metrics

---

## Files to Review

**For understanding:**
- `CLAUDE_MEMORY_IMPLEMENTATION.md` - Complete technical details
- `MEMORY_SYSTEM_AUDIT.md` - Original problem analysis
- `lib/claude-memory-tool.ts` - Implementation code

**For migration:**
- `docs/database-migrations/CLAUDE_MEMORY_TOOL_MIGRATION.sql` - Database setup

---

## Summary

✅ **Claude's native memory is implemented and ready!**

**What you get:**
- Automatic memory management by Claude
- File-based organization (not flat key-value)
- Unlimited memory capacity (no whitelist)
- Smarter memory decisions
- Better long-term context

**What you need to do:**
1. Apply database migration
2. Test it out
3. Monitor and iterate

**Backward compatibility:**
- Legacy system still works
- No breaking changes
- Gradual migration path

---

**Ready to go!** 🎉

Just apply the migration and start chatting with Claude. It will automatically manage its memory.

