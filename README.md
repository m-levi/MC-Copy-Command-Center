# Email Copywriter AI

An AI-powered email copywriting tool specifically designed for e-commerce brands. Write compelling email copy with the help of advanced AI models like GPT-4 and Claude Sonnet 4.5.

## Features

- 🎨 **Brand Management**: Store and manage multiple brands with detailed brand information, guidelines, and copywriting style guides
- 💬 **AI Chat Interface**: Modern chat interface similar to ChatGPT and Cursor for seamless interaction
- 🤖 **Multiple AI Models**: Choose from GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo, Claude Sonnet 4.5, and Claude Opus 3.5
- 📝 **Conversation History**: Keep track of all your email copywriting conversations per brand
- 🔐 **Secure Authentication**: Built with Supabase authentication
- 🎯 **Context-Aware**: AI automatically uses your brand details, guidelines, and style guide for consistent copy

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Edge Runtime)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: OpenAI API, Anthropic API
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account
- OpenAI API key
- Anthropic API key

### Setup

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd command_center
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up Supabase**

   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Run the following SQL in the Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brands table
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand_details TEXT,
  brand_guidelines TEXT,
  copywriting_style_guide TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  model TEXT NOT NULL,
  conversation_type TEXT NOT NULL DEFAULT 'email',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Future automation tables (not yet implemented)
CREATE TABLE automation_outlines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  outline_data JSONB,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE automation_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES automation_outlines(id) ON DELETE CASCADE,
  sequence_order INT NOT NULL,
  email_copy TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for brands
CREATE POLICY "Users can view own brands" ON brands
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brands" ON brands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brands" ON brands
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brands" ON brands
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for conversations
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages from own conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own conversations" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from own conversations" ON messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- RLS Policies for automation_outlines
CREATE POLICY "Users can view own automation outlines" ON automation_outlines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = automation_outlines.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own automation outlines" ON automation_outlines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = automation_outlines.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- RLS Policies for automation_emails
CREATE POLICY "Users can view own automation emails" ON automation_emails
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM automation_outlines
      JOIN conversations ON conversations.id = automation_outlines.conversation_id
      WHERE automation_outlines.id = automation_emails.automation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own automation emails" ON automation_emails
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM automation_outlines
      JOIN conversations ON conversations.id = automation_outlines.conversation_id
      WHERE automation_outlines.id = automation_emails.automation_id
      AND conversations.user_id = auth.uid()
    )
  );
```

4. **Configure environment variables**

   - Copy `env.example` to `.env.local`
   - Fill in your credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI API Keys (Server-side only)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

5. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Usage

1. **Sign Up**: Create an account using email and password
2. **Create a Brand**: Add your brand details, guidelines, and copywriting style guide
3. **Start Writing**: Click on a brand to open the chat interface
4. **Choose AI Model**: Select your preferred AI model from the dropdown
5. **Chat**: Start a conversation and let the AI help you write amazing email copy!

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy!

## Future Enhancements

- **Email Automation Flows**: Multi-step agentic AI process for creating email automation sequences
- **Email Templates**: Save and reuse successful email copy
- **Analytics**: Track email performance metrics
- **Collaboration**: Share brands and conversations with team members
- **Export**: Export email copy in various formats

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
