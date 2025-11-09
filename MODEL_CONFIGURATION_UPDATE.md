# Model Configuration Update

## Summary

Updated the application to use **Claude Sonnet 4.5** exclusively for writing/email generation, while keeping **GPT-5** available for planning mode.

---

## Changes Made

### 1. ChatInput Component (`components/ChatInput.tsx`)

**Model Picker Logic:**
- **Writing Mode (email_copy):** Only shows Claude Sonnet 4.5
- **Planning Mode:** Shows both GPT-5 and Claude Sonnet 4.5

```typescript
// For writing mode (email_copy), only show Claude Sonnet 4.5
// For planning mode, show both GPT-5 and Claude Sonnet 4.5
const models = mode === 'planning' 
  ? [
      { id: 'gpt-5', name: 'GPT-5' },
      { id: 'claude-4.5-sonnet', name: 'SONNET 4.5' },
    ]
  : [
      { id: 'claude-4.5-sonnet', name: 'SONNET 4.5' },
    ];
```

**Auto-Switch Logic:**
- When switching from planning mode to writing mode, automatically switches to Claude Sonnet 4.5 if GPT-5 was selected

```typescript
// Auto-switch to Claude Sonnet 4.5 when switching from planning to writing mode
useEffect(() => {
  if (mode === 'email_copy' && selectedModel === 'gpt-5') {
    onModelChange?.('claude-4.5-sonnet');
  }
}, [mode, selectedModel, onModelChange]);
```

**UI Improvement:**
- Model picker dropdown is now hidden when only one model is available (in writing mode)

```typescript
{/* Model Selector Dropdown - Only show if multiple models available */}
{models.length > 1 && (
  <div className="relative hidden sm:block" ref={modelPickerRef}>
    {/* ... model picker UI ... */}
  </div>
)}
```

### 2. Flow Email Generation API (`app/api/flows/generate-emails/route.ts`)

**Simplified to Claude-Only:**
- Removed GPT-5 option from flow email generation
- Always uses Claude Sonnet 4.5 for writing emails in flows

```typescript
// Always use Claude Sonnet 4.5 for writing emails in flows
// (Planning can use GPT-5, but writing should be Claude-only)
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4000,
  thinking: {
    type: 'enabled',
    budget_tokens: 2000
  },
  messages: [{
    role: 'user',
    content: prompt
  }]
});
```

---

## User Experience Changes

### Before:
- **Planning Mode:** GPT-5 or Claude Sonnet 4.5
- **Writing Mode:** GPT-5 or Claude Sonnet 4.5
- **Flow Generation:** GPT-5 or Claude Sonnet 4.5

### After:
- **Planning Mode:** GPT-5 or Claude Sonnet 4.5 (unchanged)
- **Writing Mode:** Claude Sonnet 4.5 only
- **Flow Generation:** Claude Sonnet 4.5 only

### Behavior:
1. When in **Planning Mode**, users can choose between GPT-5 and Claude Sonnet 4.5
2. When switching to **Writing Mode**, if GPT-5 was selected, it automatically switches to Claude Sonnet 4.5
3. In **Writing Mode**, the model picker is hidden (since there's only one option)
4. When generating **Flow Emails**, Claude Sonnet 4.5 is always used regardless of the model parameter

---

## Rationale

### Why Claude Sonnet 4.5 for Writing?

1. **Consistency:** All email content is generated with the same model
2. **Quality:** Claude Sonnet 4.5 has proven excellent for copywriting
3. **Extended Thinking:** Claude's thinking feature helps with creative writing
4. **Simplicity:** Reduces decision fatigue for users

### Why Keep GPT-5 for Planning?

1. **Reasoning:** GPT-5's reasoning capabilities are excellent for strategic planning
2. **Variety:** Gives users choice for brainstorming and strategy
3. **Flexibility:** Different models can offer different perspectives during planning

---

## Technical Details

### Model Mapping:

**Claude Sonnet 4.5:**
- Display Name: "SONNET 4.5"
- Model ID: `claude-4.5-sonnet`
- API Model: `claude-sonnet-4-20250514`
- Provider: Anthropic

**GPT-5:**
- Display Name: "GPT-5"
- Model ID: `gpt-5`
- API Model: `gpt-5-preview`
- Provider: OpenAI

### Files Modified:

1. ✅ `components/ChatInput.tsx`
   - Conditional model list based on mode
   - Auto-switch logic
   - Conditional model picker visibility

2. ✅ `app/api/flows/generate-emails/route.ts`
   - Removed GPT-5 option
   - Simplified to Claude-only

### Files NOT Modified:

- `lib/ai-models.ts` - Still defines both models (used for planning)
- `types/index.ts` - Still includes both models in type definitions
- `app/api/chat/route.ts` - Still supports both models (for planning mode)

---

## Testing Checklist

### Writing Mode:
- [x] Model picker is hidden in writing mode
- [x] Only Claude Sonnet 4.5 is available
- [x] Email generation works correctly

### Planning Mode:
- [x] Model picker is visible in planning mode
- [x] Both GPT-5 and Claude Sonnet 4.5 are available
- [x] Can switch between models

### Mode Switching:
- [x] Switching from planning to writing auto-switches to Claude if GPT-5 was selected
- [x] Model picker visibility updates correctly

### Flow Generation:
- [x] Flow emails are generated with Claude Sonnet 4.5
- [x] No errors in flow generation

---

## Migration Notes

### For Users:
- No action required
- Existing conversations will continue to work
- New conversations in writing mode will default to Claude Sonnet 4.5

### For Developers:
- No database migrations required
- No environment variable changes required
- No breaking changes to API

---

## Future Considerations

### Potential Enhancements:

1. **Model Presets:**
   - Could add "presets" that bundle model + settings
   - E.g., "Creative Writing" preset with specific Claude settings

2. **A/B Testing:**
   - Could track performance metrics by model
   - Compare email performance across models

3. **Custom Model Selection:**
   - Could allow advanced users to override model choice
   - Add "Advanced Settings" toggle

4. **Model-Specific Features:**
   - Leverage Claude's extended thinking more prominently
   - Add model-specific UI hints/tips

---

## Conclusion

✅ **Changes Complete**

The application now uses Claude Sonnet 4.5 exclusively for all writing/email generation tasks, while maintaining GPT-5 as an option for planning and strategy work. This provides a more focused, consistent experience for users while maintaining flexibility where it matters most.

### Key Benefits:
- ✅ Simplified user experience in writing mode
- ✅ Consistent email quality across all generations
- ✅ Maintained flexibility in planning mode
- ✅ Cleaner, less cluttered UI
- ✅ No breaking changes or migrations required

