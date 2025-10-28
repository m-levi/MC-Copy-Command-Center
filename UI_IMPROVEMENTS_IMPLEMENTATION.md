# UI Improvements Implementation Plan

## Completed ✅
1. ✅ **Hover states on mode toggle** - Added scale effects and better hover backgrounds
2. ✅ **Emoji icons on toggle** - Added 💡 for PLAN and ✉️ for WRITE

## In Progress 🔄

### 1. **Mode-Based Chat UI** 
**Files**: `ChatMessage.tsx`, `app/brands/[brandId]/chat/page.tsx`

**Changes**:
- Email Preview only shows in `email_copy` mode
- Planning mode shows simple chat interface
- Pass `mode` prop to ChatMessage component
- Conditional rendering of email features

### 2. **Copy Buttons Top & Bottom**
**File**: `ChatMessage.tsx`

**Changes**:
- Add copy button at top (existing) ✅
- Add copy button at bottom of AI response (NEW)
- Make both prominent and accessible

### 3. **Reaction Feedback**
**File**: `ChatMessage.tsx`

**Current**: Buttons change color but unclear what they do
**Improve**:
- Add tooltip/label text (Good/Helpful vs Needs Improvement)
- Show confirmation toast after reaction
- Better visual state (filled vs outlined)
- Persist reaction from metadata

### 4. **Starred Emails Visual**
**File**: `ChatMessage.tsx`, `EmailPreview.tsx`

**Changes**:
- Show star status more prominently
- Add star badge/indicator on starred messages
- Better visual feedback when starring

### 5. **Sidebar Improvements**
**File**: `ChatSidebar.tsx`

**Changes**:
- Redesign "New Conversation" button (more on-brand)
- Add brand switcher dropdown
- Better back navigation
- Cleaner spacing and organization

### 6. **Planning Mode Optimization**
**File**: `app/brands/[brandId]/chat/page.tsx`

**Logic Changes**:
- "Transfer Plan" button shows only after substantial planning
- Check for multiple back-and-forth messages
- Verify planning content (questions, strategies, etc.)
- Don't show immediately after first AI response

### 7. **Voice-to-Text (Whisper API)**
**File**: New component `VoiceInput.tsx`, integrate in `ChatInput.tsx`

**Implementation**:
- Add microphone button
- Record audio
- Send to Whisper API
- Insert transcribed text into input

## API Requirements

### Whisper API Integration
```typescript
// POST /api/transcribe
{
  audio: File, // WAV or MP3
  language: 'en'
}

Response:
{
  text: string,
  confidence: number
}
```

## Component Props Updates

### ChatMessage
```typescript
interface ChatMessageProps {
  message: Message;
  brandId?: string;
  mode?: ConversationMode; // NEW
  onRegenerate?: () => void;
  onRegenerateSection?: (sectionType: string, sectionTitle: string) => void;
  onEdit?: (newContent: string) => void;
  onReaction?: (reaction: 'thumbs_up' | 'thumbs_down') => void;
  isRegenerating?: boolean;
}
```

### ChatSidebar
```typescript
interface ChatSidebarProps {
  brandName: string;
  brandId: string; // NEW - for brand switcher
  availableBrands: Brand[]; // NEW - for brand switcher
  conversations: Conversation[];
  currentConversationId: string | null;
  teamMembers: OrganizationMember[];
  currentFilter: FilterType;
  selectedPersonId: string | null;
  onFilterChange: (filter: FilterType, personId?: string) => void;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, newTitle: string) => void;
  onBrandSwitch: (brandId: string) => void; // NEW
}
```

## Timeline

1. Mode-based UI (30 min) ⏱️
2. Copy buttons & reactions (20 min) ⏱️
3. Starred email visuals (15 min) ⏱️
4. Sidebar improvements (45 min) ⏱️
5. Planning mode logic (30 min) ⏱️
6. Voice-to-text (60-90 min) ⏱️

**Total estimated time**: 3-4 hours

## Priority Order
1. 🔴 Mode-based UI
2. 🔴 Copy buttons & reaction feedback
3. 🔴 Sidebar improvements
4. 🟡 Planning mode optimization
5. 🟡 Starred emails visual
6. 🟢 Voice-to-text (nice to have)

Let's implement these in order!

