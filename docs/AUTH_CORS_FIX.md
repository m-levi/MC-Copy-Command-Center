# Authentication CORS Fix

## Problem
Users cannot log in on production deployment (`https://copy.mooncommerce.net`) due to CORS errors:
```
Access to fetch at 'https://swmijewkwwsbbccfzexe.supabase.co/auth/v1/token?grant_type=password' 
from origin 'https://copy.mooncommerce.net' has been blocked by CORS policy
```

## Root Cause
The production domain is not configured in Supabase's allowed origins list.

## Solution

### Step 1: Configure Supabase Auth URLs (CRITICAL)

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/swmijewkwwsbbccfzexe/auth/url-configuration

2. **Set Site URL:**
   ```
   https://copy.mooncommerce.net
   ```

3. **Add Redirect URLs** (click "Add URL" for each):
   ```
   https://copy.mooncommerce.net/**
   http://localhost:3000/**
   ```

4. Click **Save** at the bottom

### Step 2: Verify Environment Variables in Vercel

1. Go to your Vercel project settings: Settings → Environment Variables

2. Confirm these variables exist:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://swmijewkwwsbbccfzexe.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = [your anon key]
   - `SUPABASE_SERVICE_ROLE_KEY` = [your service role key]
   - `OPENAI_API_KEY` = [your OpenAI key]
   - `ANTHROPIC_API_KEY` = [your Anthropic key]

3. If any are missing or incorrect, update them and redeploy

### Step 3: Test Authentication

After making the changes:

1. Wait 1-2 minutes for Supabase config to propagate
2. Clear browser cache or use incognito window
3. Go to: https://copy.mooncommerce.net/login
4. Try logging in with your credentials
5. Check browser console (F12) - should see no CORS errors

## Verification Checklist

- [ ] Site URL is set to `https://copy.mooncommerce.net` in Supabase
- [ ] Redirect URLs include `https://copy.mooncommerce.net/**`
- [ ] All environment variables are set in Vercel
- [ ] Login works without CORS errors
- [ ] Can create new conversations
- [ ] Can send messages to AI
- [ ] Sessions persist after page refresh

## Additional Auth Settings to Review

While in Supabase Auth Settings, verify:

### Email Auth
- **Enable Email Confirmations**: ON (for production security)
- **Double Confirm Email Changes**: ON (recommended)
- **Secure Email Change**: ON (recommended)

### Password Requirements
- **Minimum password length**: 8+ characters (recommended)
- **Password strength**: Enable (optional)

### Security
- **JWT Expiry**: 3600 seconds (1 hour) - default is fine
- **Refresh Token Rotation**: Enabled (recommended)
- **Refresh Token Reuse Interval**: 10 seconds (default)

### Rate Limiting
- **Rate Limit for Auth Requests**: Enabled (recommended)
  - Prevents brute force attacks
  - Default settings are usually fine

## Troubleshooting

### Still Getting CORS Errors?

1. **Check browser console** for exact error message
2. **Clear browser cache completely** or use incognito
3. **Verify Supabase URL** in environment variables matches project
4. **Check Vercel deployment logs** for any build errors
5. **Wait a few minutes** - DNS/config changes can take time

### Login Works But Session Doesn't Persist?

- Check that cookies are enabled in browser
- Verify domain settings allow cookies from Supabase
- Check middleware configuration in `middleware.ts`

### Users Can't Sign Up?

- Check if email confirmations are enabled
- Verify email templates are configured in Supabase
- Check SMTP settings if using custom email provider

## Testing After Fix

```bash
# Test authentication endpoint directly
curl -X POST https://copy.mooncommerce.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

Should return success (after logging in via UI first).

## Prevention

Update `DEPLOYMENT_CHECKLIST.md` to include:
- [ ] Add production domain to Supabase Auth URL Configuration
- [ ] Test login on production before considering deployment complete
- [ ] Verify CORS headers in browser network tab

## Reference

- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- Supabase URL Configuration: https://supabase.com/docs/guides/auth/redirect-urls
- Next.js Supabase Integration: https://supabase.com/docs/guides/auth/server-side/nextjs

---

**Fixed By:** [Your Name]
**Date:** [Date]
**Status:** ✅ Ready to Deploy

