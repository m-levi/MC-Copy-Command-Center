# Quick Start Guide

Get the Email Copywriter AI running in under 10 minutes!

## Prerequisites

- Node.js 18+ installed
- npm installed
- A Supabase account
- OpenAI API key
- Anthropic API key

## Step 1: Clone and Install (2 minutes)

```bash
# Navigate to project directory
cd command_center

# Install dependencies
npm install
```

## Step 2: Set Up Supabase (3 minutes)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for project to initialize
3. Go to **SQL Editor** and run the SQL script from `README.md`
4. Go to **Project Settings** → **API** and copy:
   - Project URL
   - Anon/Public Key

## Step 3: Configure Environment (1 minute)

```bash
# Copy example file
cp env.example .env.local

# Edit .env.local with your credentials
# (Use your favorite editor)
```

Add your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Step 4: Run the App (1 minute)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 5: Test It Out (3 minutes)

1. Click "Sign up" and create an account
2. Click "Create New Brand"
3. Fill in brand details (tip: use ChatGPT to generate sample brand info!)
4. Click on the brand card
5. Click "New Conversation"
6. Send a message like: "Write me a welcome email for new customers"
7. Watch the AI generate copy in real-time!

## Common Issues

### "Failed to load brands"
→ Check your Supabase credentials in `.env.local`

### "Invalid API key"
→ Verify your OpenAI/Anthropic API keys are correct

### Build errors
→ Make sure you ran `npm install` successfully

## Next Steps

- Read `SETUP_GUIDE.md` for detailed setup instructions
- Read `DEPLOYMENT_CHECKLIST.md` before deploying to production
- Check `ADDING_AI_MODELS.md` to add more AI models
- Review `PROJECT_SUMMARY.md` for architecture overview

## Development Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server (after build)
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## Project Structure Overview

```
command_center/
├── app/              # Pages and API routes
├── components/       # React components
├── lib/              # Utility functions and configs
├── types/            # TypeScript definitions
└── middleware.ts     # Authentication middleware
```

## Key Files to Know

- `app/page.tsx` - Brand grid home page
- `app/brands/[brandId]/chat/page.tsx` - Main chat interface
- `app/api/chat/route.ts` - AI streaming endpoint
- `lib/ai-models.ts` - AI model configurations
- `middleware.ts` - Authentication protection

## Pro Tips

1. **Sample Brand Data**: Use AI to generate realistic brand information for testing
2. **Multiple Brands**: Create 2-3 brands to test the grid layout
3. **Long Conversations**: Test with 10+ messages to see conversation flow
4. **Model Switching**: Try different models to compare responses
5. **Mobile Testing**: Open on your phone to test responsive design

## Getting Help

- **Setup Issues**: See `SETUP_GUIDE.md`
- **Deployment**: See `DEPLOYMENT_CHECKLIST.md`
- **Architecture**: See `PROJECT_SUMMARY.md`
- **Bugs**: Open an issue on GitHub

Happy coding! 🚀

