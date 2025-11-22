# Brand Settings - Quick Setup Guide

## 🚀 Quick Start (3 Steps)

### Step 1: Run Database Migration

The new memories feature requires a database table. Run this migration in your Supabase SQL Editor:

1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy and paste the contents of: `docs/database-migrations/BRAND_MEMORIES_MIGRATION.sql`
4. Click **Run**

### Step 2: Verify Installation

All components are already in place:
- ✅ Tab components created
- ✅ API endpoints added
- ✅ Brand settings page updated
- ✅ Auto-save configured

### Step 3: Test It Out

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to any brand's settings page
3. You should see the new tabbed interface!

## 🎨 What You'll See

### New Tabbed Interface

The brand settings page now has **5 tabs**:

1. **📋 Brand Details**
   - Brand name and website URL
   - Comprehensive brand overview document

2. **✍️ Style Guide**
   - Copywriting style guide
   - AI Wizard for automatic generation

3. **📜 Guidelines**
   - Brand voice and values
   - Strategic messaging principles

4. **🧠 Memories & Notes**
   - Quick notes and insights
   - Important facts and dates
   - Campaign learnings

5. **✅ Do's & Don'ts**
   - What to embrace
   - What to avoid
   - Clear guidance rules

### Additional Features

- **Knowledge Base** button in header (purple)
- **Starred Emails** button in header (yellow)
- **Export** button (blue gradient)
- **Auto-save** indicator at top of tabs

## 📊 Database Schema

The new `brand_memories` table structure:

```
brand_memories
├── id (UUID)
├── brand_id (UUID) → references brands
├── title (TEXT)
├── content (TEXT)
├── category (TEXT) → 'general', 'preference', 'guideline', 'fact', 'dos_donts'
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

## 🔒 Security

All properly secured with:
- Row Level Security (RLS) policies
- User authentication checks
- Organization membership validation
- Brand access verification

## 🧪 Testing

Quick test to verify everything works:

1. **Navigate to Brand Settings**
   - Go to any brand → Settings icon or direct URL

2. **Test Tab Navigation**
   - Click through all 5 tabs
   - Each should load without errors

3. **Test Auto-Save**
   - Edit any field (e.g., brand name)
   - Look for "Saving..." then "All changes saved"

4. **Test Memories**
   - Go to "Memories & Notes" tab
   - Click "Add Memory"
   - Add a test memory with title and content
   - Click "Save"
   - Memory should appear in the list

5. **Test Do's & Don'ts**
   - Go to "Do's & Don'ts" tab
   - Add a test do or don't
   - Verify it saves and displays

6. **Test Export**
   - Click "Export" button in header
   - Should download a markdown file with all brand data

## ❗ Troubleshooting

### "Failed to load memories"

**Cause**: Database table doesn't exist

**Fix**: Run the migration from Step 1

### "Brand not found or access denied"

**Cause**: User doesn't have permission to view brand

**Fix**: 
- Verify you're logged in
- Check brand belongs to your organization
- Verify RLS policies are correct

### Tabs show blank content

**Cause**: Component import error or brand data not loading

**Fix**:
1. Check browser console for errors
2. Verify brand data loads (check Network tab)
3. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

### Auto-save not working

**Cause**: Debounce delay or network error

**Fix**:
- Wait 500ms after typing stops
- Check Network tab for failed requests
- Verify Supabase connection

## 📝 Usage Tips

### Best Practices

1. **Brand Details Tab**
   - Write 2-3 paragraphs about your brand
   - Include target audience and unique value proposition
   - Be comprehensive but concise

2. **Style Guide Tab**
   - Use the AI Wizard for a head start
   - Define tone (casual, professional, friendly)
   - Include specific word choices and formatting rules

3. **Guidelines Tab**
   - Define your brand voice personality
   - List core values and mission
   - Include what to emphasize and avoid

4. **Memories Tab**
   - Use for important dates and milestones
   - Record customer feedback patterns
   - Note campaign results and learnings

5. **Do's & Don'ts Tab**
   - Be specific and actionable
   - Use format: "DO: [action]" or "DON'T: [action]"
   - Include reasoning when helpful

### Keyboard Shortcuts

- `Tab` - Navigate between form fields
- `Cmd/Ctrl + S` - Force save (auto-save handles this)
- `Esc` - Cancel editing (in memory forms)

## 🎯 Next Steps

After setup, consider:

1. **Fill out all brand information** across tabs
2. **Use the Style Guide Wizard** to generate a comprehensive guide
3. **Add key memories** about your brand
4. **Define clear Do's & Don'ts** for consistency
5. **Export your brand profile** as backup

## 📚 Documentation

For more details:
- Full implementation guide: `BRAND_SETTINGS_REDESIGN.md`
- API documentation: Check API route files in `app/api/brands/[brandId]/memories/`
- Component docs: Check component files in `components/Brand*Tab.tsx`

## ✅ Checklist

Before going live, verify:

- [ ] Database migration completed successfully
- [ ] Can navigate between all tabs
- [ ] Auto-save works on all tabs
- [ ] Can create/edit/delete memories
- [ ] Export includes all data
- [ ] Knowledge Base modal opens
- [ ] Starred Emails modal opens
- [ ] No console errors
- [ ] Looks good on mobile
- [ ] Dark mode works correctly

## 🎉 You're Ready!

Your brand settings are now upgraded with a modern tabbed interface and powerful memories system. Start organizing your brand information today!

---

**Need Help?** Check `BRAND_SETTINGS_REDESIGN.md` for comprehensive documentation or `DEBUGGING_GUIDE.md` for troubleshooting.

