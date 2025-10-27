# Enhanced Chat Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │  Chat Sidebar    │  │  Chat Messages   │  │  Chat Input      │ │
│  │                  │  │                  │  │                  │ │
│  │  - Conversations │  │  - Message Editor│  │  - Slash Cmds    │ │
│  │  - New/Delete    │  │  - Sections View │  │  - Draft Save    │ │
│  │  - Brand Info    │  │  - Reactions     │  │  - Autocomplete  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ Prompt Suggest.  │  │  Quick Actions   │  │  Stats Display   │ │
│  │                  │  │                  │  │                  │ │
│  │  - 11 Templates  │  │  - 6 Actions     │  │  - Word Count    │ │
│  │  - Categories    │  │  - Transform     │  │  - Read Time     │ │
│  │  - Preview       │  │  - One-click     │  │  - Sections      │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        STATE MANAGEMENT LAYER                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │  React State     │  │  Custom Hooks    │  │  Local Storage   │ │
│  │                  │  │                  │  │                  │ │
│  │  - Messages      │  │  - useDraftSave  │  │  - Drafts        │ │
│  │  - Conversations │  │  - useOfflineQ   │  │  - Queue         │ │
│  │  - UI State      │  │  - Auto-save     │  │  - Cache         │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BUSINESS LOGIC LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   Conversation Memory                         │  │
│  │                                                                │  │
│  │  extractConversationContext() → { campaignType, tone, goals } │  │
│  │  buildMessageContext() → optimized message list               │  │
│  │  shouldCreateSummary() → trigger summarization                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                        RAG Service                             │  │
│  │                                                                │  │
│  │  generateEmbedding() → OpenAI embedding                       │  │
│  │  searchRelevantDocuments() → vector similarity search         │  │
│  │  buildRAGContext() → context string for prompt                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      Prompt Templates                          │  │
│  │                                                                │  │
│  │  PROMPT_TEMPLATES[] → 11 pre-built templates                  │  │
│  │  QUICK_ACTION_PROMPTS{} → 6 transformation prompts            │  │
│  │  fillTemplate() → replace placeholders                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                       Retry Utils                              │  │
│  │                                                                │  │
│  │  retryWithBackoff() → exponential backoff retry               │  │
│  │  isRetryableError() → determine if should retry               │  │
│  │  Timeout handling, error classification                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   /api/chat (Main AI Endpoint)                 │  │
│  │                                                                │  │
│  │  1. Extract conversation context                              │  │
│  │  2. Search RAG documents (if available)                       │  │
│  │  3. Build enhanced system prompt                              │  │
│  │  4. Try primary model with retry                              │  │
│  │  5. Fallback to alternative provider if fails                 │  │
│  │  6. Stream response with status markers                       │  │
│  │                                                                │  │
│  │  Supports:                                                     │  │
│  │  - Section regeneration (regenerateSection param)             │  │
│  │  - Conversation context injection                             │  │
│  │  - RAG context injection                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               /api/embeddings (Document Upload)                │  │
│  │                                                                │  │
│  │  1. Validate user access to brand                             │  │
│  │  2. Generate embedding using OpenAI                           │  │
│  │  3. Store document with embedding in database                 │  │
│  │  4. Return created document                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AI PROVIDER LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────┐      ┌────────────────────────────┐    │
│  │      OpenAI API        │      │     Anthropic API          │    │
│  │                        │      │                            │    │
│  │  - GPT-5 (primary)     │◄────►│  - Claude 4.5 Sonnet      │    │
│  │  - O1                  │ auto │  - Claude Opus 3.5        │    │
│  │  - Embeddings          │fallbk│                           │    │
│  │  - Streaming support   │      │  - Streaming support      │    │
│  └────────────────────────┘      └────────────────────────────┘    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      Supabase PostgreSQL                       │  │
│  │                                                                │  │
│  │  Core Tables:                                                  │  │
│  │  - brands → Brand information & guidelines                     │  │
│  │  - conversations → Chat conversations                          │  │
│  │  - messages → Individual messages (with metadata)             │  │
│  │                                                                │  │
│  │  Enhanced Tables:                                              │  │
│  │  - brand_documents → RAG knowledge base (with embeddings)     │  │
│  │  - conversation_summaries → Periodic summaries                │  │
│  │                                                                │  │
│  │  Indexes:                                                      │  │
│  │  - IVFFlat vector index (for similarity search)               │  │
│  │  - B-tree indexes (for queries)                               │  │
│  │                                                                │  │
│  │  Functions:                                                    │  │
│  │  - match_documents() → Vector similarity search               │  │
│  │  - update_updated_at_column() → Auto timestamp updates        │  │
│  │                                                                │  │
│  │  Security:                                                     │  │
│  │  - Row Level Security (RLS) enabled                           │  │
│  │  - User isolation enforced                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Message Send Flow

```
User Input → Draft Save → Offline Check → Database Save → API Call
                 │              │                            │
                 ▼              ▼                            ▼
          LocalStorage    Queue Message              Context Builder
                                                             │
                                                             ▼
                                                      RAG Search ─┐
                                                             │    │
                                                             ▼    ▼
                                                      Build Prompt
                                                             │
                                                             ▼
                                                      Try Primary Model
                                                             │
                                                    ┌────────┴────────┐
                                                    │                 │
                                                Success            Failure
                                                    │                 │
                                                    ▼                 ▼
                                              Stream Response    Retry Logic
                                                    │                 │
                                                    │           ┌─────┴─────┐
                                                    │           │           │
                                                    │        Success    Fallback
                                                    │           │        Model
                                                    │           │           │
                                                    └───────────┴───────────┘
                                                                │
                                                                ▼
                                                         Update UI
                                                                │
                                                                ▼
                                                        Save to Database
```

### 2. RAG Search Flow

```
User Message → Extract Query → Generate Embedding → Vector Search
                                        │                   │
                                        │                   ▼
                                  OpenAI API          pgvector search
                                                            │
                                                            ▼
                                                   Top 3 Documents
                                                            │
                                                            ▼
                                                   Build Context String
                                                            │
                                                            ▼
                                                   Inject into Prompt
```

### 3. Message Edit Flow

```
Click Edit → Inline Editor → Save Changes → Update DB
                │                             │
                ▼                             ▼
         Auto-focus input              Delete After Messages
                │                             │
                ▼                             ▼
         Keyboard shortcuts             Update Local State
                │                             │
                └─────────────┬───────────────┘
                              ▼
                     Auto-regenerate Response
```

### 4. Offline Mode Flow

```
User Types → Auto-save Draft (every 2s) → LocalStorage
                     │
                     ▼
            Send Message Attempt
                     │
            ┌────────┴────────┐
            │                 │
         Online            Offline
            │                 │
            ▼                 ▼
      Normal Flow      Add to Queue
                            │
                            ▼
                    Show Offline Indicator
                            │
                            ▼
                    Wait for Connection
                            │
                            ▼
                    Auto-send Queued Messages
```

## Component Hierarchy

```
ChatPage (Main Container)
│
├─ ChatSidebar
│  ├─ Brand Info
│  ├─ New Conversation Button
│  └─ Conversation List
│     └─ Conversation Item (with delete)
│
├─ Header Bar
│  ├─ Conversation Title
│  ├─ Message Count
│  ├─ Theme Toggle
│  └─ Model Selector
│
├─ Message Area
│  │
│  ├─ Empty State / Template Suggestions
│  │  └─ PromptSuggestions
│  │     ├─ Category Filters
│  │     └─ Template Grid
│  │
│  ├─ Conversation Stats
│  │  └─ ConversationStats (word count, read time, sections)
│  │
│  └─ Message List
│     └─ ChatMessage (foreach message)
│        ├─ User Message
│        │  ├─ Content Display
│        │  ├─ Edit Button (on hover)
│        │  └─ MessageEditor (when editing)
│        │
│        └─ AI Message
│           ├─ Action Toolbar
│           │  ├─ Timestamp
│           │  ├─ Toggle View (Markdown/Sections)
│           │  ├─ Copy Button
│           │  ├─ Regenerate Button
│           │  ├─ Thumbs Up/Down
│           │
│           ├─ Content (Markdown View)
│           │  └─ ReactMarkdown
│           │
│           └─ Content (Sections View)
│              └─ EmailSectionCard (foreach section)
│                 ├─ Section Header
│                 ├─ Section Content
│                 ├─ Copy Section Button
│                 └─ Regenerate Section Button
│
├─ Quick Actions Bar (after AI response)
│  └─ QuickActions
│     └─ Action Buttons (6 transformations)
│
├─ Chat Input Area
│  └─ ChatInput
│     ├─ Slash Command Dropdown
│     ├─ Textarea (auto-expanding)
│     ├─ Character Counter
│     ├─ Send/Stop Button
│     └─ Keyboard Shortcuts Hint
│
└─ Floating Elements
   ├─ AI Status Indicator
   ├─ Offline Indicator
   └─ Toast Notifications
```

## File Structure

```
command_center/
│
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts (Main AI endpoint)
│   │   └── embeddings/
│   │       └── route.ts (Document upload)
│   │
│   └── brands/[brandId]/chat/
│       └── page.tsx (Main chat page)
│
├── components/
│   ├── AIStatusIndicator.tsx
│   ├── BrandDocumentManager.tsx (NEW)
│   ├── ChatInput.tsx (ENHANCED)
│   ├── ChatMessage.tsx (ENHANCED)
│   ├── ChatSidebar.tsx
│   ├── ConversationStats.tsx (NEW)
│   ├── EmailSectionCard.tsx
│   ├── MessageEditor.tsx (NEW)
│   ├── PromptSuggestions.tsx (NEW)
│   └── QuickActions.tsx (NEW)
│
├── lib/
│   ├── conversation-memory.ts (NEW)
│   ├── prompt-templates.ts (NEW)
│   ├── rag-service.ts (NEW)
│   └── retry-utils.ts (NEW)
│
├── hooks/
│   ├── useDraftSave.ts (NEW)
│   └── useOfflineQueue.ts (NEW)
│
├── types/
│   └── index.ts (EXTENDED)
│
└── Documentation/
    ├── DATABASE_MIGRATION.sql (NEW)
    ├── ENHANCED_CHAT_IMPLEMENTATION_GUIDE.md (NEW)
    ├── IMPLEMENTATION_SUMMARY.md (NEW)
    ├── QUICK_REFERENCE.md (NEW)
    └── ARCHITECTURE_OVERVIEW.md (NEW - this file)
```

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State**: React Hooks (useState, useEffect, useRef)
- **UI Components**: Custom React components
- **Markdown**: react-markdown + remark-gfm
- **Notifications**: react-hot-toast
- **Theme**: next-themes

### Backend
- **Runtime**: Edge Runtime
- **Database**: Supabase (PostgreSQL)
- **Vector Search**: pgvector extension
- **Auth**: Supabase Auth
- **Storage**: LocalStorage (browser)

### AI Services
- **OpenAI**: GPT-5, O1, text-embedding-3-small
- **Anthropic**: Claude 4.5 Sonnet, Claude Opus 3.5
- **Streaming**: Server-Sent Events (SSE)

### Security
- **RLS**: Row Level Security (Supabase)
- **Auth**: JWT tokens
- **API Keys**: Server-side only
- **Validation**: Input sanitization

## Performance Characteristics

### Response Times
- **Message Send**: ~1-3 seconds (streaming starts immediately)
- **Section Regeneration**: ~2-5 seconds (smaller context)
- **Quick Actions**: ~2-4 seconds (transformation)
- **Document Upload**: ~1-2 seconds (embedding generation)
- **Draft Save**: <100ms (debounced to 2s)

### Scalability
- **Messages per Conversation**: No practical limit
- **Conversations per User**: No limit
- **Documents per Brand**: Unlimited (vector search scales well)
- **Concurrent Users**: Limited by Supabase plan

### Resource Usage
- **LocalStorage**: ~5-10 KB per conversation (drafts)
- **Memory**: ~50-100 MB per active chat page
- **Database**: ~1-2 KB per message, ~5-10 KB per document

## Error Handling Strategy

```
Error Occurs
    │
    ▼
Classify Error
    │
    ├─ Network Error → Retry with backoff
    │
    ├─ Rate Limit → Retry with longer delay
    │
    ├─ Model Error → Try fallback provider
    │
    ├─ Timeout → Retry once, then fail gracefully
    │
    └─ Other → Log and show user-friendly message
```

## Security Model

```
Request
    │
    ▼
Authentication (Supabase Auth)
    │
    ├─ Unauthenticated → Return 401
    │
    └─ Authenticated
          │
          ▼
    Authorization (RLS Policies)
          │
          ├─ Not Authorized → Return 403
          │
          └─ Authorized
                │
                ▼
          Process Request
                │
                ▼
          Sanitize Output
                │
                ▼
          Return Response
```

## Monitoring & Logging

### Client-Side Logs
- Component mount/unmount
- API call initiation
- Error occurrences
- User actions (edit, regenerate, etc.)

### Server-Side Logs
- API endpoint hits
- Model calls and responses
- RAG searches
- Error stack traces

### Metrics to Track
- Average response time
- Error rate by type
- Model success rate
- Fallback usage rate
- Most used quick actions
- Most used templates
- Document upload frequency

## Future Architecture Considerations

### Scalability
- Consider Redis for session caching
- Implement CDN for static assets
- Add load balancing for API endpoints
- Database read replicas for heavy traffic

### Features
- WebSocket for real-time collaboration
- Server-Side Events for push notifications
- GraphQL for flexible data fetching
- Microservices for specialized tasks

### Performance
- Implement message virtualization
- Add service worker for better offline
- Pre-generate embeddings batch-wise
- Cache frequently accessed documents

---

**This architecture supports:**
- ✅ Real-time streaming responses
- ✅ Offline-first approach
- ✅ Automatic error recovery
- ✅ Semantic search with RAG
- ✅ Flexible prompt engineering
- ✅ Scalable document storage
- ✅ User data isolation
- ✅ Multi-provider AI support




