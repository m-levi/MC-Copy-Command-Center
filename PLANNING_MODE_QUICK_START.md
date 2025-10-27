# Planning Mode - Quick Start Guide

## Setup (One-Time)

Run this SQL migration in your Supabase SQL Editor:

```sql
-- Add mode column to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS mode TEXT CHECK (mode IN ('planning', 'email_copy')) DEFAULT 'planning';

-- Update existing conversations
UPDATE conversations 
SET mode = CASE 
  WHEN EXISTS (
    SELECT 1 FROM messages WHERE messages.conversation_id = conversations.id
  ) THEN 'email_copy'
  ELSE 'planning'
END
WHERE mode IS NULL;
```

## Using Planning Mode

### Option 1: Plan First (Recommended for Complex Emails)

1. **Start New Conversation** - Automatically in Planning Mode (💡)

2. **Discuss Your Strategy**
   ```
   "I need to create a welcome email for new customers 
    who signed up for our fitness app"
   ```

3. **Refine with AI**
   - AI suggests structure, tone, key points
   - Continue conversation to refine approach
   - Get strategic advice

4. **Transfer to Email Copy**
   - Click the blue "Transfer Plan" button
   - Input auto-fills with plan summary
   - Edit if needed

5. **Generate Email**
   - Send to create actual email copy
   - Use Quick Actions to refine

### Option 2: Direct Email Creation

1. **Start New Conversation**

2. **Toggle to Email Copy Mode** (✉️)

3. **Describe Email**
   ```
   "Create a flash sale email: 
    40% off running shoes, 
    24 hours only, 
    targeting marathon runners"
   ```

4. **Refine Output**
   - Use Quick Actions (shorten, add urgency, etc.)
   - Regenerate sections as needed

## UI Elements

### Mode Toggle
Located in header, next to model selector:
- **💡 Planning** - Strategy and brainstorming
- **✉️ Email Copy** - Email generation

### Transfer Plan Button
Appears in Planning Mode after AI responses:
- Prominent blue button
- Switches to Email Copy mode
- Pre-fills input with plan context

### Quick Actions
Only visible in Email Copy Mode:
- Make shorter
- Add urgency
- Change tone (casual/professional)
- Add social proof
- Improve CTAs

## Tips

### When to Use Planning Mode
- ✅ Complex email campaigns
- ✅ New types of emails you haven't created before
- ✅ When you're unsure of the approach
- ✅ Multi-step sequences
- ✅ Sensitive or high-stakes emails

### When to Use Email Copy Mode Directly
- ✅ Simple promotional emails
- ✅ Templates you've used before
- ✅ Time-sensitive campaigns
- ✅ Quick iterations
- ✅ Standard transactional emails

## Example Planning Conversation

```
User: I need to create a re-engagement email for users 
      who haven't opened our app in 30 days

AI: Let me help you plan an effective re-engagement 
    campaign. Here's what I recommend:
    
    1. Subject Line Strategy: ...
    2. Opening Hook: ...
    3. Value Reminders: ...
    4. Incentive: ...
    5. CTA: ...

User: I like this but the incentive feels too strong. 
      Can we try a softer approach?

AI: Absolutely! Here's a revised approach with a 
    gentler incentive strategy...

User: Perfect! [Clicks "Transfer Plan"]

[Mode switches to Email Copy, input pre-filled]

User: [Reviews and sends to generate email]
```

## Keyboard Shortcuts & Tips

- **Enter** to send message
- **Shift+Enter** for new line
- **/** for slash commands (in Email Copy mode)
- Switch modes anytime - conversations remember your mode

## Troubleshooting

**Q: Transfer button not showing?**
- Make sure you're in Planning Mode (💡)
- Wait for AI to finish responding
- Button only appears after AI messages

**Q: Lost my plan after switching modes?**
- Don't worry! Your messages are saved
- Switch back to Planning Mode to review
- Or scroll up to see conversation history

**Q: How do I know which mode I'm in?**
- Look at the header toggle - active mode is highlighted blue
- Empty state screen shows mode-specific icon and guidance
- Input placeholder text is different per mode

## Best Practices

1. **Start with Planning** for unfamiliar email types
2. **Save successful plans** by taking notes or screenshots
3. **Iterate in Planning** before generating copy
4. **Use Quick Actions** to refine email copy
5. **Switch back to Planning** if you need to rethink strategy

## Need Help?

- Review full documentation: `PLANNING_MODE_FEATURE.md`
- Check implementation details: `PLANNING_MODE_IMPLEMENTATION_SUMMARY.md`
- View database migration: `PLANNING_MODE_MIGRATION.sql`


