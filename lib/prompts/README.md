# AI Prompt Templates

This directory contains all AI prompt templates used in the Command Center application. Each prompt has been separated into its own file for easier editing and maintenance in the backend.

## 📁 File Structure

```
lib/prompts/
├── README.md                           # This file
├── index.ts                           # Exports all prompts
├── planning-mode.prompt.ts            # Planning/brainstorming mode
├── letter-email.prompt.ts             # Short, personal letter emails
├── standard-email.prompt.ts           # Structured design emails
├── section-regeneration.prompt.ts     # Email section regeneration
├── flow-outline.prompt.ts             # Multi-email flow outlines
├── flow-best-practices.ts             # Best practices per flow type
└── flow-email.prompt.ts               # Individual flow emails
```

## 🎯 Prompt Types

### Chat/Email Generation Prompts

#### **1. Planning Mode** (`planning-mode.prompt.ts`)
- **Purpose**: Flexible conversation space for strategy, questions, and brainstorming
- **Use Case**: When users want to explore ideas, ask questions, or plan campaigns (not write copy)
- **Features**: 
  - Web search integration
  - Memory system
  - Strategic guidance
  - Natural conversation flow

#### **2. Letter Email** (`letter-email.prompt.ts`)
- **Purpose**: Short, personal, direct response emails (3-5 paragraphs)
- **Use Case**: Personal communication, founder updates, relationship-building
- **Features**:
  - Conversational tone
  - Personal signature
  - Authentic voice
  - Simple structure

#### **3. Standard Email** (`standard-email.prompt.ts`)
- **Purpose**: Structured, high-converting design emails
- **Use Case**: Marketing campaigns, promotions, product launches
- **Features**:
  - Hero section format
  - Multiple body sections
  - Scannability focus
  - CTA optimization
  - Strict length limits

#### **4. Section Regeneration** (`section-regeneration.prompt.ts`)
- **Purpose**: Regenerate specific parts of an email
- **Types**: Subject line, hero, body sections, CTA
- **Use Case**: Quick edits without regenerating entire email

### Flow/Automation Prompts

#### **5. Flow Outline** (`flow-outline.prompt.ts`)
- **Purpose**: Create multi-email automation sequence outlines
- **Use Case**: Welcome series, abandoned cart, post-purchase, etc.
- **Process**:
  1. Ask clarifying questions
  2. Build structured outline
  3. Get user approval
  4. Trigger email generation

#### **6. Flow Best Practices** (`flow-best-practices.ts`)
- **Purpose**: Research-backed guidelines for each flow type
- **Includes**: Timing, metrics, conversion rates, proven strategies
- **Flow Types**:
  - Welcome Series
  - Abandoned Cart
  - Post-Purchase
  - Win-back
  - Product Launch
  - Educational Series

#### **7. Flow Email** (`flow-email.prompt.ts`)
- **Purpose**: Generate individual emails within a flow
- **Variants**: Design and Letter styles
- **Context**: Understands position in sequence (first, middle, last)

## 🔧 How to Edit Prompts

### Template Variables

All prompts use double curly braces for variables: `{{VARIABLE_NAME}}`

Common variables:
- `{{BRAND_INFO}}` - Brand context and guidelines
- `{{RAG_CONTEXT}}` - Retrieved document context
- `{{CONTEXT_INFO}}` - Conversation-specific context
- `{{MEMORY_CONTEXT}}` - Saved memories from conversation
- `{{WEBSITE_URL}}` - Brand website URL
- `{{EMAIL_BRIEF}}` - User's email request

### Editing Guidelines

1. **Keep Structure**: Don't remove section headers or key instructions
2. **Test Changes**: Use TypeScript compilation to verify syntax
3. **Maintain Variables**: Ensure all `{{VARIABLES}}` are properly replaced in code
4. **Document Changes**: Update this README if you add new prompts

### Example Edit

To change the planning mode greeting:

```typescript
// In planning-mode.prompt.ts
export const PLANNING_MODE_PROMPT = `You are an expert email marketing strategist...

// Change this section:
## YOUR ROLE IN PLANNING MODE

You are in **PLANNING MODE**...
```

## 🔄 How Prompts Are Used

### In Code

```typescript
import { buildSystemPrompt } from '@/lib/chat-prompts';

// The builder functions handle variable replacement
const prompt = buildSystemPrompt(brandContext, ragContext, {
  conversationMode: 'planning',
  memoryContext: memories,
});
```

### Variable Replacement

The `chat-prompts.ts` and `flow-prompts.ts` files contain helper functions that:
1. Import the raw prompt templates
2. Replace `{{VARIABLES}}` with actual values
3. Return the final prompt string

## 📊 Prompt Performance

When editing prompts, consider:
- **Token Length**: Longer prompts = higher API costs
- **Clarity**: Clear instructions = better AI output
- **Examples**: Include good/bad examples for complex behaviors
- **Constraints**: Explicit limits (word counts, structure) improve consistency

## 🧪 Testing Prompts

After editing a prompt:

1. **Type Check**: `npx tsc --noEmit`
2. **Lint Check**: `npm run lint`
3. **Manual Test**: Create a test conversation in the app
4. **Compare Output**: Check if changes improved AI behavior

## 📚 Related Files

- `lib/chat-prompts.ts` - Chat prompt builders and variable replacement
- `lib/flow-prompts.ts` - Flow prompt builders
- `lib/prompt-templates.ts` - User-facing prompt suggestions
- `app/api/chat/route.ts` - API route using chat prompts
- `app/api/flows/generate-emails/route.ts` - API route using flow prompts

## 🎨 Best Practices

### Writing Effective Prompts

1. **Be Specific**: Clear, detailed instructions work best
2. **Use Examples**: Show good/bad examples for complex tasks
3. **Set Constraints**: Explicit limits (length, format) improve output
4. **Test Iteratively**: Make small changes, test, refine
5. **Document Intent**: Comment why certain instructions exist

### Common Pitfalls

❌ **Don't**: Make prompts too long (wastes tokens)
✅ **Do**: Focus on essential instructions

❌ **Don't**: Use vague language ("make it good")
✅ **Do**: Specify exactly what "good" means

❌ **Don't**: Forget to test edge cases
✅ **Do**: Test with various user inputs

❌ **Don't**: Remove variable placeholders
✅ **Do**: Keep all `{{VARIABLES}}` intact

## 🔐 Security Notes

- Prompts are **server-side only** (not exposed to client)
- Never include API keys or secrets in prompts
- User input is sanitized before being inserted into prompts
- Memory system has category-based access control

## 📝 Version History

- **v1.0** (Nov 2025): Initial separation into individual files
  - Separated from monolithic prompt files
  - Added comprehensive documentation
  - Improved maintainability for backend editing

---

For questions or issues with prompts, refer to:
- `CHAT_DEBUG_GUIDE.md` - Debugging AI responses
- `ARCHITECTURE_OVERVIEW.md` - System architecture
- `START_HERE.md` - Project overview




