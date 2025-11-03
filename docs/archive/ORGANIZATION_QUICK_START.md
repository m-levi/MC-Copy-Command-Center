# Organization System - Quick Start Guide

## Prerequisites

- Supabase project running
- Access to Supabase SQL Editor
- Node.js and npm installed
- `.env.local` configured with Supabase credentials

## Step 1: Run Database Migration

1. Open your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy the entire contents of `ORGANIZATION_MIGRATION.sql`
5. Paste into the SQL Editor
6. Click "Run" to execute the migration

**Expected Result:**
- 3 new tables created (organizations, organization_members, organization_invites)
- Existing tables modified (profiles, brands, conversations)
- Default "Moon Commerce" organization created
- All existing users added as admins
- All brands linked to Moon Commerce

## Step 2: Verify Migration

Run these queries to verify:

```sql
-- Check organization exists
SELECT * FROM organizations WHERE slug = 'moon-commerce';

-- Check all users are members
SELECT om.*, p.email 
FROM organization_members om
JOIN profiles p ON om.user_id = p.user_id;

-- Check all brands have organization_id
SELECT id, name, organization_id, created_by 
FROM brands;

-- Check RLS policies are active
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('organizations', 'organization_members', 'organization_invites', 'brands');
```

## Step 3: Test the Application

### A. Test Login
1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Log in with existing credentials
4. You should see:
   - "Moon Commerce" displayed in header
   - "Team Management" button (you're an admin)
   - All existing brands

### B. Test Admin Dashboard
1. Click "Team Management" in header
2. You should see:
   - Your admin panel
   - Invitation form
   - Your profile in team list

### C. Create an Invitation
1. In Admin Dashboard, enter:
   - Email: `teammate@example.com`
   - Role: `Brand Manager`
2. Click "Send Invitation"
3. Copy the generated link
4. Open link in incognito/private window
5. Complete signup with:
   - Full Name: Test User
   - Password: testpassword123
6. You should be redirected to the brands page

### D. Test Permissions
1. Log in as the new Brand Manager
2. You should see:
   - All Moon Commerce brands
   - "Create Brand" button (you're a brand manager)
   - NO "Team Management" button (not an admin)
3. Create a new brand
4. The brand should show "Created by Test User"

### E. Test Conversation Filtering
1. Create a new conversation
2. In the sidebar, click the filter dropdown
3. You should see:
   - All Team (default)
   - Just Mine
   - List of team members
4. Select "Just Mine"
5. You should only see your conversations
6. Conversations should show creator names

## Step 4: Invite More Users

### As Admin:
1. Go to Team Management
2. Send invitations with appropriate roles:
   - **Admin**: Full control, can manage team
   - **Brand Manager**: Can create/edit brands
   - **Member**: Can view and chat only

### Share Links:
- Copy the invitation link
- Send via email, Slack, or other channels
- Links expire in 7 days
- Can be revoked before use

## Common Tasks

### Change a Member's Role
1. Go to Team Management
2. Find the member
3. Click the three-dot menu
4. Select "Change Role"
5. Choose new role
6. Click "Save"

### Remove a Team Member
1. Go to Team Management
2. Find the member
3. Click the three-dot menu
4. Select "Remove Member"
5. Confirm the action

### Revoke an Invitation
1. Go to Team Management
2. Scroll to "Pending Invitations"
3. Click the X button on the invitation
4. Confirm revocation

### Filter Conversations
1. Open any brand's chat
2. Click the filter dropdown in sidebar
3. Select your filter:
   - All Team: See everyone's conversations
   - Just Mine: Only your conversations  
   - By Person: Select a specific team member

## Troubleshooting

### "You are not part of any organization"
**Cause:** User wasn't migrated properly  
**Fix:** Run this SQL:
```sql
INSERT INTO organization_members (organization_id, user_id, role)
VALUES (
  (SELECT id FROM organizations WHERE slug = 'moon-commerce'),
  'YOUR_USER_ID_HERE',
  'admin'
);
```

### "Failed to load brands"
**Cause:** Brands missing organization_id  
**Fix:** Run this SQL:
```sql
UPDATE brands 
SET organization_id = (SELECT id FROM organizations WHERE slug = 'moon-commerce')
WHERE organization_id IS NULL;
```

### Can't Create Brands
**Cause:** User is a "member" role  
**Fix:** Change role to "brand_manager" or "admin"

### Invitation Link Invalid
**Possible Causes:**
- Link already used (check `used_at` column)
- Link expired (check `expires_at` column)
- Link was revoked

**Fix:** Generate a new invitation

### RLS Errors
**Cause:** Policies not created properly  
**Fix:** Re-run the migration SQL

## Security Checklist

- [ ] All users belong to an organization
- [ ] All brands have organization_id set
- [ ] RLS policies are enabled on all tables
- [ ] Test with different roles (admin, brand_manager, member)
- [ ] Verify data isolation (users can't access other org's data)
- [ ] Check permission enforcement on brand creation
- [ ] Verify invitation tokens are secure and single-use

## Performance Tips

1. **Database Indexes:** Already created by migration
2. **Caching:** Consider caching organization membership checks
3. **Pagination:** Add pagination if team has >50 members
4. **Lazy Loading:** Conversations loaded on demand

## Next Steps

1. ✅ Run migration
2. ✅ Test with existing users
3. ✅ Create test invitations
4. ✅ Verify all permissions
5. 🔄 Deploy to production
6. 🔄 Configure email service for invitations
7. 🔄 Add organization branding
8. 🔄 Set up monitoring and analytics

## Support

If you encounter issues:
1. Check Supabase logs for database errors
2. Check browser console for client errors
3. Verify all environment variables are set
4. Ensure migration ran successfully
5. Review RLS policies in Supabase dashboard

---

**Ready to go!** 🚀

Your multi-tenant organization system is now active. All existing data is preserved, and you can start inviting team members.

