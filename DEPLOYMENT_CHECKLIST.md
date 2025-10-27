# Deployment Checklist

Use this checklist to ensure a smooth deployment to Vercel.

## Pre-Deployment

- [ ] All code is committed to Git
- [ ] Repository is pushed to GitHub
- [ ] Local build succeeds (`npm run build`)
- [ ] All environment variables are documented in `env.example`

## Supabase Setup

- [ ] Supabase project is created
- [ ] Database schema is set up (run SQL from README)
- [ ] Row Level Security (RLS) policies are enabled
- [ ] Supabase URL and anon key are copied
- [ ] Email confirmation is configured (or disabled for development)

## API Keys

- [ ] OpenAI API key is obtained
- [ ] OpenAI account has credits/billing set up
- [ ] Anthropic API key is obtained
- [ ] Anthropic account has credits/billing set up

## Vercel Deployment

### 1. Connect Repository

- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Sign in with GitHub
- [ ] Click "New Project"
- [ ] Import your repository

### 2. Configure Project

- [ ] Framework Preset: Next.js (should be auto-detected)
- [ ] Root Directory: `./` (default)
- [ ] Build Command: `npm run build` (default)
- [ ] Output Directory: `.next` (default)

### 3. Add Environment Variables

Add the following environment variables in Vercel project settings:

#### Public Variables (Available to browser)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Secret Variables (Server-side only)
```
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

**Important:** 
- Copy these exactly from your local `.env.local` file
- No quotes needed in Vercel dashboard
- Click "Add" after entering each variable

### 4. Deploy

- [ ] Click "Deploy"
- [ ] Wait for deployment to complete (2-3 minutes)
- [ ] Check deployment logs for any errors

## Post-Deployment

### 1. Test the Application

- [ ] Visit your deployed URL
- [ ] Test signup flow
- [ ] Create a test brand
- [ ] Create a test conversation
- [ ] Send a test message
- [ ] Verify AI responds correctly
- [ ] Test with different AI models
- [ ] Test edit/delete brand functionality
- [ ] Test delete conversation functionality

### 2. Configure Domain (Optional)

- [ ] Go to Vercel project settings → Domains
- [ ] Add your custom domain
- [ ] Update DNS records as instructed
- [ ] Wait for SSL certificate to provision

### 3. Set Up Monitoring

- [ ] Check Vercel Analytics (built-in)
- [ ] Monitor Supabase dashboard for usage
- [ ] Monitor OpenAI usage dashboard
- [ ] Monitor Anthropic usage dashboard
- [ ] Set up budget alerts for AI APIs

## Troubleshooting

### Build Fails

**Error: Missing environment variables**
- Solution: Ensure all required environment variables are added in Vercel dashboard

**Error: TypeScript errors**
- Solution: Run `npm run build` locally first to catch any errors

### Runtime Errors

**Error: "Failed to load brands"**
- Check Supabase credentials are correct
- Verify RLS policies are set up
- Check Vercel deployment logs

**Error: AI not responding**
- Verify AI API keys are correct
- Check API key has credits
- Check Vercel function logs

**Error: Authentication not working**
- Check Supabase Auth settings
- Verify redirect URLs in Supabase dashboard
- Add deployment URL to allowed redirect URLs

## Security Checklist

- [ ] Environment variables are not committed to Git
- [ ] `.env.local` is in `.gitignore`
- [ ] API keys are only in Vercel environment variables
- [ ] Supabase RLS policies are enabled
- [ ] Only server-side API keys (OpenAI, Anthropic) are kept secret

## Performance Optimization

- [ ] Enable Vercel Edge Network
- [ ] Monitor cold start times
- [ ] Check Supabase query performance
- [ ] Monitor AI API response times
- [ ] Consider implementing caching for repeated queries (future enhancement)

## Maintenance

### Regular Tasks

- [ ] Monitor API usage and costs
- [ ] Check for Next.js updates
- [ ] Update dependencies monthly
- [ ] Review Supabase storage usage
- [ ] Backup database regularly

### As Needed

- [ ] Scale Supabase plan based on usage
- [ ] Adjust Vercel function timeout if needed
- [ ] Update AI model versions
- [ ] Add new AI models as they become available

## Rollback Plan

If deployment fails or has critical issues:

1. Go to Vercel project → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"
4. Fix issues locally
5. Redeploy when ready

## Success Criteria

Deployment is successful when:

- [ ] All pages load without errors
- [ ] Authentication works (signup/login/logout)
- [ ] Brands can be created, edited, and deleted
- [ ] Conversations can be created and deleted
- [ ] AI responds to messages from all available models
- [ ] Streaming responses work correctly
- [ ] No console errors in browser
- [ ] No errors in Vercel function logs

---

**Deployment Date:** ________________

**Deployed By:** ________________

**Production URL:** ________________

**Notes:**


