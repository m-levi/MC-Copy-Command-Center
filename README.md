# Email Copywriter AI - Command Center

A modern, AI-powered email copywriting platform built with Next.js 16, React 19, TypeScript, and Supabase.

## 🎯 Overview

Command Center is an enterprise-grade application that helps teams create compelling email copy using state-of-the-art AI models (GPT-5, Claude 4.5). It features:

- **Multi-brand management** - Manage multiple brands with unique voice and style
- **AI-powered copywriting** - Generate emails using latest AI models
- **Flow builder** - Create multi-email sequences and campaigns
- **Team collaboration** - Organization-based access with role management
- **Real-time streaming** - See AI responses as they're generated
- **Conversation memory** - AI learns and remembers context
- **Document RAG** - Upload brand documents for better context
- **Product linking** - Automatically link products in emails
- **Dark mode** - Full dark mode support
- **Mobile responsive** - Works on all devices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- OpenAI API key
- Anthropic API key (optional)

### Installation

1. **Clone the repository**
```bash
git clone <repo-url>
cd command_center
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp env.example .env.local
```

Edit `.env.local` with your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

4. **Run database migrations**

Execute the SQL files in `docs/database-migrations/` in your Supabase SQL editor in this order:
1. `DATABASE_MIGRATION.sql`
2. `ORGANIZATION_MIGRATION.sql`
3. `CONVERSATION_MEMORY_MIGRATION.sql`
4. `FLOW_DATABASE_MIGRATION.sql`
5. `THINKING_CONTENT_MIGRATION.sql`
6. `USER_PREFERENCES_MIGRATION.sql`
7. `PLANNING_MODE_MIGRATION.sql`
8. `PRODUCT_SEARCH_MIGRATION.sql`
9. `PERFORMANCE_OPTIMIZATION_INDEXES.sql`
10. `AUTH_SECURITY_IMPROVEMENTS.sql`
11. `SUPABASE_PERFORMANCE_OPTIMIZATIONS.sql`
12. `FIX_MESSAGES_RLS_POLICY.sql`

5. **Start development server**
```bash
npm run dev
```

6. **Open in browser**
```
http://localhost:3000
```

## 📚 Documentation

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup instructions
- **[ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** - System architecture
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Deployment guide
- **[TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)** - Common issues
- **[FINAL_REPORT.md](FINAL_REPORT.md)** - Comprehensive code review

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, TailwindCSS 4
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: OpenAI (GPT-5), Anthropic (Claude 4.5)
- **State**: React hooks, Context API
- **Styling**: TailwindCSS with dark mode
- **Icons**: Heroicons, Lucide React

### Project Structure

```
command_center/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── brands/            # Brand management
│   ├── admin/             # Admin dashboard
│   ├── settings/          # User settings
│   └── page.tsx           # Homepage
│
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── *.tsx             # Feature components
│
├── lib/                   # Utilities and services
│   ├── supabase/         # Supabase clients
│   ├── ai-models.ts      # AI model configurations
│   ├── api-error.ts      # Error handling
│   └── *.ts              # Other utilities
│
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript types
├── docs/                  # Documentation
│   ├── archive/          # Archived docs
│   └── database-migrations/  # SQL migrations
│
└── public/               # Static assets
```

## 🎨 Features

### Brand Management
- Create and manage multiple brands
- Define brand voice, tone, and guidelines
- Upload brand documents for context
- Extract brand info from websites

### AI Copywriting
- Support for multiple AI models (GPT-5, Claude 4.5)
- Real-time streaming responses
- Thinking process visualization
- Conversation memory and context
- Product linking and search
- Email type templates (promotional, transactional, etc.)

### Flow Builder
- Create multi-email sequences
- Plan and outline entire campaigns
- Generate all emails at once
- Navigate between related emails
- Approve outlines before generation

### Team Collaboration
- Organization-based access control
- Role management (admin, brand_manager, member)
- Team member invitations
- Activity tracking

### Performance
- Virtual scrolling for large lists
- Optimistic UI updates
- Request caching
- Offline support with queue
- Code splitting and lazy loading

## 🔒 Security

- Row Level Security (RLS) policies
- API keys server-side only
- Input validation and sanitization
- XSS protection with DOMPurify
- CSRF protection
- Secure session management

## 🧪 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Code Quality

- **TypeScript strict mode** enabled
- **ESLint** configured
- **Prettier** formatting (recommended)
- **Git hooks** for pre-commit checks (optional)

### Testing

Manual testing checklist in `FINAL_REPORT.md`.

For automated testing (recommended):
- Unit tests: Jest + React Testing Library
- Integration tests: Jest
- E2E tests: Playwright

## 📊 Performance

- **Lighthouse Score**: Aim for 90+ on all metrics
- **Bundle Size**: Optimized with code splitting
- **Database**: Indexed queries, RLS enabled
- **Caching**: Response cache, browser cache
- **CDN**: Vercel Edge Network (when deployed)

## 🚢 Deployment

### Vercel (Recommended)

1. Connect GitHub repository to Vercel
2. Add environment variables
3. Deploy

### Docker (Alternative)

```bash
npm run build
docker build -t command-center .
docker run -p 3000:3000 command-center
```

See **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** for full guide.

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and tests
4. Submit a pull request

## 📝 License

Proprietary - All rights reserved

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Supabase for backend infrastructure
- OpenAI and Anthropic for AI models
- Vercel for hosting

## 📞 Support

For issues and questions:
- Check **[TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)**
- Review **[FINAL_REPORT.md](FINAL_REPORT.md)**
- Contact the development team

---

**Version**: 1.0.0  
**Last Updated**: November 3, 2025  
**Status**: Production Ready ✅
