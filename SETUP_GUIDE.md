# Setup Guide

This guide will walk you through setting up the Email Copywriter AI application from scratch.

## Step 1: Prerequisites

Before you begin, make sure you have:

- [ ] Node.js 18+ installed
- [ ] npm or yarn package manager
- [ ] A Supabase account (sign up at [supabase.com](https://supabase.com))
- [ ] An OpenAI API key (get one at [platform.openai.com](https://platform.openai.com))
- [ ] An Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Set Up Supabase

### 3.1 Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: Email Copywriter AI (or your preferred name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project" and wait for it to initialize

### 3.2 Create Database Schema

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the entire SQL script from the README.md (under "Set up Supabase" section)
4. Click "Run" or press Cmd/Ctrl + Enter
5. Verify all tables were created:
   - Go to **Table Editor**
   - You should see: profiles, brands, conversations, messages, automation_outlines, automation_emails

### 3.3 Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Project Settings** (gear icon)
2. Go to **API** section
3. Copy the following:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (the long JWT token under "Project API keys")

## Step 4: Get AI API Keys

### 4.1 OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign in or create an account
3. Go to **API Keys** section
4. Click "Create new secret key"
5. Give it a name (e.g., "Email Copywriter AI")
6. Copy the key (you won't be able to see it again!)
7. Make sure you have credits/billing set up

### 4.2 Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Go to **API Keys** section
4. Click "Create Key"
5. Give it a name (e.g., "Email Copywriter AI")
6. Copy the key
7. Make sure you have credits/billing set up

## Step 5: Configure Environment Variables

1. Copy the example environment file:

```bash
cp env.example .env.local
```

2. Open `.env.local` and fill in your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI API Keys (Server-side only)
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
```

3. Save the file

## Step 6: Run the Application

```bash
npm run dev
```

The app should now be running at [http://localhost:3000](http://localhost:3000)

## Step 7: Test the Application

1. Open [http://localhost:3000](http://localhost:3000)
2. You should be redirected to `/login`
3. Click "Sign up" to create a new account
4. Enter your email and password
5. You'll be redirected to the home page
6. Click "Create New Brand" to add your first brand
7. Fill in the brand details and click "Create Brand"
8. Click on the brand card to open the chat interface
9. Click "New Conversation" to start chatting
10. Type a message and test the AI response!

## Step 8: Deploy to Vercel (Optional)

### 8.1 Push to GitHub

1. Initialize git (if not already done):

```bash
git init
git add .
git commit -m "Initial commit"
```

2. Create a new GitHub repository
3. Push your code:

```bash
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### 8.2 Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your repository
5. Configure environment variables:
   - Add all variables from your `.env.local` file
   - Make sure to add them exactly as they appear in your local file
6. Click "Deploy"
7. Wait for deployment to complete
8. Visit your live site!

## Step 9: Enable Background Processing (Optional)

Background processing allows AI messages to be queued and processed by a cron job instead of streaming directly. This is useful for:
- High-volume scenarios with rate limiting
- Better error recovery and retry logic
- Decoupling requests from AI processing

### 9.1 Requirements

⚠️ **Vercel Cron Jobs require a Pro plan or higher**. If you're on the Hobby (free) plan, the cron will not run.

### 9.2 Run Database Migration

First, apply the async message queue migration:

1. Go to your Supabase project's **SQL Editor**
2. Create a new query
3. Copy and paste the contents of `docs/database-migrations/020_async_message_queue.sql`
4. Run the query

This creates:
- `message_jobs` table for queue persistence
- `get_next_job()` function for workers
- Status tracking columns on the `messages` table

### 9.3 Set Environment Variables

Add these to your Vercel project (or `.env.local` for local testing):

```env
# Generate a secure secret: openssl rand -hex 32
CRON_SECRET=your-random-secret-here

# Enable background queue mode
ENABLE_MESSAGE_QUEUE=true
```

### 9.4 How It Works

When `ENABLE_MESSAGE_QUEUE=true`:

1. User sends a message → API creates a placeholder message and queues the job
2. API returns immediately with `{ queued: true, messageId, streamUrl }`
3. Client polls `/api/messages/{id}/stream` for updates via Server-Sent Events
4. Cron job (`/api/cron/process-queue`) runs every 10 minutes and processes queued jobs
5. Worker calls AI, saves response, and notifies user

### 9.5 Verify Cron is Running

1. Go to your Vercel project dashboard
2. Click on the **Cron Jobs** tab (in the sidebar)
3. You should see `/api/cron/process-queue` scheduled for `*/10 * * * *`
4. Check the logs to verify it's running

### 9.6 Disable Background Processing

To revert to direct streaming (better real-time UX):

```env
ENABLE_MESSAGE_QUEUE=false
```

Or simply remove the environment variable.

## Troubleshooting

### Issue: "Invalid API key" errors

**Solution**: Double-check that you've copied the API keys correctly in `.env.local`. Make sure there are no extra spaces or quotes.

### Issue: "Failed to load brands" or database errors

**Solution**: 
1. Verify your Supabase credentials are correct
2. Make sure you ran the SQL script to create all tables
3. Check that Row Level Security (RLS) policies are enabled

### Issue: Database tables not found

**Solution**: Run the SQL script again in Supabase SQL Editor. Make sure all tables are created in the "Table Editor" view.

### Issue: Can't sign up

**Solution**: 
1. Check Supabase Auth settings (Project Settings > Authentication)
2. Make sure email confirmations are disabled for development (or check your email)
3. Check the browser console for errors

### Issue: AI not responding

**Solution**:
1. Check that your API keys are valid and have credits
2. Check the browser console and terminal for error messages
3. Make sure the `/api/chat` route is working (check Network tab)

### Issue: Vercel deployment fails with cron errors

**Solution**:
1. Vercel Cron Jobs require a **Pro plan** or higher. The Hobby (free) plan does not support crons.
2. If you don't need background processing, remove `vercel.json` or set `ENABLE_MESSAGE_QUEUE=false`
3. If upgrading to Pro, make sure `CRON_SECRET` is set in your environment variables

### Issue: Background jobs not processing

**Solution**:
1. Check that the `020_async_message_queue.sql` migration has been applied
2. Verify `CRON_SECRET` is set correctly in Vercel environment variables
3. Check the Vercel Cron Jobs logs for errors
4. Ensure `ENABLE_MESSAGE_QUEUE=true` is set

## Next Steps

- Customize the brand grid layout
- Add more AI models
- Implement email templates
- Build the automation flows feature (future enhancement)
- Add team collaboration features

## Support

If you encounter any issues not covered in this guide, please:
1. Check the browser console for errors
2. Check the terminal/server logs
3. Review the Supabase logs in your project dashboard
4. Open an issue on GitHub with details about the error

Happy copywriting! 🚀


