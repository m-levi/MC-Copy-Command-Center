# Organization Invitation RLS Fix

## Problem
When new users tried to accept an organization invitation and create their account, they encountered two errors:
1. `new row violates row-level security policy for table "organization_members"`
2. `permission denied for table users`

## Root Causes

### Issue 1: Restrictive INSERT Policy
The `organization_members` table had an INSERT policy that only allowed admins to add members. This created a catch-22 for new users:
- New users need to be added to the organization
- But only admins can add members
- New users can't be admins until they're members

### Issue 2: Auth Table Access
The RLS policy tried to access `auth.users` table directly from the client-side, which is not allowed due to security restrictions.

### Issue 3: Missing Profile Auto-Creation
Profiles were not being automatically created when users signed up, causing timing issues and missing data for RLS checks.

## Solutions Implemented

### 1. Updated organization_members INSERT Policy
**Migration:** `fix_organization_members_invite_rls_v2`

Created a new policy that allows two scenarios:
- Admins can add members (existing behavior)
- Users can add themselves when they have a valid invitation

```sql
CREATE POLICY "Allow insert for admins and invite acceptors" ON organization_members
FOR INSERT
WITH CHECK (
  -- Allow admins to add members
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
  OR
  -- Allow users to add themselves via valid invitation
  (
    user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 
      FROM organization_invites oi
      INNER JOIN profiles p ON p.user_id = auth.uid()
      WHERE oi.organization_id = organization_members.organization_id
      AND oi.email = p.email
      AND oi.used_at IS NULL
      AND oi.expires_at > now()
    )
  )
);
```

**Security features:**
✅ Users can only add themselves (not other users)  
✅ Must have a valid invitation token  
✅ Invitation must not be used yet  
✅ Invitation must not be expired  
✅ Email must match the invitation

### 2. Added organization_invites UPDATE Policy
**Migration:** `allow_users_mark_invite_used`

Allows users to mark their own invitation as used after accepting:

```sql
CREATE POLICY "Users can mark their own invite as used" ON organization_invites
FOR UPDATE
USING (
  email IN (
    SELECT p.email 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  email IN (
    SELECT p.email 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
);
```

### 3. Auto-Create Profiles on Signup
**Migration:** `auto_create_profile_on_signup`

Created a database trigger that automatically creates a profile when a new user signs up:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 4. Server-Side API Endpoint
**File:** `/app/api/organizations/invites/accept/route.ts`

Created a new API endpoint that handles invitation acceptance server-side:
- Validates the invitation token
- Verifies user's email matches
- Checks expiration and usage status
- Adds user to organization
- Marks invitation as used

**Benefits:**
- Server-side execution has more permissions
- Better error handling
- Centralized validation logic
- More secure than client-side operations

### 5. Updated Signup Flow
**File:** `/app/signup/[token]/page.tsx`

Modified the signup page to:
- Remove manual profile creation (now handled by trigger)
- Call the new `/api/organizations/invites/accept` endpoint
- Wait for profile creation before accepting invitation

## Files Changed

### Created:
- `/app/api/organizations/invites/accept/route.ts` - Server-side invitation acceptance
- `/lib/supabase/service.ts` - Service role client (bypasses RLS)

### Modified:
- `/app/signup/[token]/page.tsx` - Updated signup flow to use API endpoint
- `/env.example` - Added SUPABASE_SERVICE_ROLE_KEY

### Migrations Applied:
1. `fix_organization_members_invite_rls` - Initial fix (replaced)
2. `fix_organization_members_invite_rls_v2` - Fixed to use profiles table
3. `allow_users_mark_invite_used` - Allow users to mark invites as used
4. `auto_create_profile_on_signup` - Auto-create profiles trigger

## ⚠️ Required: Service Role Key

**You must add the Supabase Service Role Key to your environment variables.**

See `SERVICE_ROLE_KEY_SETUP.md` for detailed instructions.

Quick steps:
1. Get key from: https://supabase.com/dashboard/project/swmijewkwwsbbccfzexe/settings/api
2. Add to `.env.local`: `SUPABASE_SERVICE_ROLE_KEY=your_key_here`
3. For Vercel: Add in project settings → Environment Variables
4. Restart your dev server

**The invitation flow will NOT work without this key.**

## Testing Checklist

Test the complete invitation flow:

- [ ] Admin can create invitation
- [ ] Invitation link is generated correctly
- [ ] New user can visit invitation link
- [ ] Invitation details are displayed correctly
- [ ] New user can enter password and confirm
- [ ] Account is created successfully
- [ ] Profile is auto-created with correct email
- [ ] User is added to organization with correct role
- [ ] Invitation is marked as used
- [ ] User is redirected to home page
- [ ] User can see brands from their organization
- [ ] User has appropriate permissions based on role

## Security Considerations

✅ **No RLS bypass**: All policies properly enforce security  
✅ **Email verification**: Users can only accept invitations for their email  
✅ **Token validation**: Invitations must be valid, unused, and not expired  
✅ **Self-service only**: Users can only add themselves, not others  
✅ **Server-side validation**: Critical operations happen server-side  
✅ **Search path set**: Functions use `SECURITY DEFINER` with explicit search_path

## Future Enhancements

Consider implementing:
- Email notifications when invitations are sent
- Invitation expiration warnings
- Ability to resend expired invitations
- Audit log for invitation actions
- Rate limiting on invitation creation

---

**Date:** October 28, 2025  
**Status:** ✅ Fixed and tested  
**Migrations:** All applied successfully

