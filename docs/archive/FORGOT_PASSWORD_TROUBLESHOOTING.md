# 🔧 Forgot Password Troubleshooting Guide

## Issue: Password Reset Emails Not Sending

If the forgot password feature isn't working, follow these steps:

## ✅ Quick Fixes

### 1. Add Missing Environment Variable

Add this to your `.env.local` file:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, use your actual domain:
```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 2. Configure Supabase Email Settings

**Go to Supabase Dashboard:**
1. Visit: https://supabase.com/dashboard/project/swmijewkwwsbbccfzexe/auth/url-configuration

2. **Set Site URL:**
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

3. **Add Redirect URLs:**
   Click "Add URL" and add:
   - Development: `http://localhost:3000/reset-password`
   - Production: `https://yourdomain.com/reset-password`

### 3. Check Email Template Settings

**Go to Email Templates:**
1. Visit: https://supabase.com/dashboard/project/swmijewkwwsbbccfzexe/auth/templates

2. **Check "Reset Password" Template:**
   - Make sure it's enabled
   - Verify the template contains `{{ .ConfirmationURL }}`

### 4. Test Email Delivery

**Check Supabase Logs:**
1. Go to: https://supabase.com/dashboard/project/swmijewkwwsbbccfzexe/logs/explorer
2. Look for "auth" logs
3. Search for password reset attempts
4. Check for any error messages

## 🧪 Testing Steps

### Test 1: Try with a Known Email
```bash
# Use an email that exists in your system
# Check the SQL query - you have these emails:
# - zachdkatz@gmail.com (confirmed)
# - mordi@mooncommerce.net (confirmed)
# - yisraelmlevi@gmail.com (confirmed)
```

### Test 2: Check Browser Console
1. Open DevTools (F12)
2. Go to Network tab
3. Try password reset
4. Look for `/api/auth/forgot-password` request
5. Check response for errors

### Test 3: Check Terminal Logs
When running `npm run dev`, watch for:
```
Sending password reset email to: user@example.com
Redirect URL: http://localhost:3000/reset-password
Password reset email sent successfully
```

Or errors like:
```
Password reset error: { ... }
```

## 🔍 Common Issues & Solutions

### Issue 1: Email Not Configured in Supabase
**Symptom:** No email received
**Solution:** 
1. Go to Supabase dashboard
2. Auth → Email Templates
3. Verify SMTP settings or use Supabase's email service

### Issue 2: Redirect URL Not Whitelisted
**Symptom:** Email sent but reset link doesn't work
**Solution:**
1. Add redirect URL to Supabase dashboard
2. Auth → URL Configuration
3. Add your reset-password URL

### Issue 3: Email in Spam Folder
**Symptom:** Email sent but not in inbox
**Solution:**
- Check spam/junk folder
- Add noreply@mail.supabase.io to contacts
- In production, use custom domain email

### Issue 4: Development vs Production URLs
**Symptom:** Works locally but not in production
**Solution:**
- Update `NEXT_PUBLIC_APP_URL` for production
- Add production URL to Supabase redirect URLs
- Redeploy with new environment variable

## 🚀 Alternative Solution: Direct Client-Side Implementation

If server-side approach isn't working, try client-side:

**Update `/app/forgot-password/page.tsx`:**

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    // Use client directly instead of API route
    const supabase = createClient();
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error);
      throw error;
    }

    setSubmitted(true);
    toast.success('Password reset email sent!');
  } catch (error: any) {
    console.error('Forgot password error:', error);
    toast.error(error.message || 'Failed to send reset email');
  } finally {
    setLoading(false);
  }
};
```

## 📝 Verification Checklist

Before testing again:

- [ ] `NEXT_PUBLIC_APP_URL` set in `.env.local`
- [ ] Site URL configured in Supabase dashboard
- [ ] Redirect URL added to Supabase allowed list
- [ ] Email template enabled in Supabase
- [ ] Development server restarted (`npm run dev`)
- [ ] Using a confirmed email address for testing
- [ ] Checking spam folder
- [ ] Browser console shows no errors
- [ ] Terminal shows no errors

## 🆘 Still Not Working?

### Debug Steps:

1. **Test Supabase Auth Directly:**
```typescript
// In browser console on your site
const { data, error } = await window.supabase.auth.resetPasswordForEmail(
  'your@email.com',
  { redirectTo: window.location.origin + '/reset-password' }
);
console.log('Result:', { data, error });
```

2. **Check Supabase Project Status:**
   - Verify project is not paused
   - Check if email quota exceeded
   - Review project health in dashboard

3. **Contact Supabase Support:**
   If emails are definitely not sending, it might be a Supabase configuration issue. Contact support at:
   https://supabase.com/dashboard/support

## 💡 Quick Fix Script

Run this in your terminal to verify setup:

```bash
cd "/Users/mordechailevi/Desktop/Manual Library/MoonCommerce/Dev Projects/command_center"

# Check if .env.local has required vars
grep "NEXT_PUBLIC_APP_URL" .env.local || echo "❌ Missing NEXT_PUBLIC_APP_URL"

# Restart dev server
npm run dev
```

## 📞 Get Help

If you've tried everything:

1. **Check API logs:** Look at terminal output when submitting
2. **Check Supabase logs:** Auth section in dashboard
3. **Try different email:** Test with multiple addresses
4. **Verify email service:** Make sure Supabase emails are working

---

**Last Updated:** October 29, 2025
**Status:** Troubleshooting in progress

