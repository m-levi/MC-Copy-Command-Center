# Testing AI-Powered Suggested Prompts

## Prerequisites

1. **OpenAI API Key**
   - Ensure `OPENAI_API_KEY` is set in `.env.local`
   - Verify key has access to GPT-4o Mini model

2. **Running Development Server**
   ```bash
   npm run dev
   ```

3. **Test Brand Data**
   - At least one brand created with name, details, and guidelines
   - Optional: Upload brand documents for richer context

## Test Scenarios

### Scenario 1: Planning Mode Suggestions

**Steps:**
1. Navigate to a brand's chat page
2. Create a new conversation (or use empty conversation)
3. Switch to "Planning" mode (💬 icon)
4. Observe the "Quick Questions" suggestions

**Expected Results:**
- 3 contextual questions appear below the mode selector
- Questions are relevant to the brand's industry/audience
- Questions encourage strategic thinking
- Each has a relevant emoji icon

**Example (for skincare brand):**
- 💡 "What messaging resonates with eco-conscious skincare buyers?"
- 🎯 "How can I position our organic ingredients?"
- 📈 "What email frequency works best for beauty products?"

### Scenario 2: Write Mode (Design Email) Suggestions

**Steps:**
1. Switch to "Write" mode (✍️ icon)
2. Select "Design Email" type
3. Observe the "Suggested Prompts"

**Expected Results:**
- 3 concrete email campaign ideas
- Ideas are specific to the brand's products/services
- Ideas are actionable and ready to create
- Each has a relevant emoji icon

**Example (for e-commerce brand):**
- 🎉 "Write a flash sale email for your bestsellers"
- 🚀 "Create a new collection launch announcement"
- 💌 "Draft a customer appreciation newsletter"

### Scenario 3: Flow Mode Suggestions

**Steps:**
1. Stay in "Write" mode
2. Select "Flow" email type
3. Observe updated suggestions

**Expected Results:**
- 3 automation sequence ideas
- Focus on multi-email journeys
- Relevant to brand's customer lifecycle
- Each has a relevant emoji icon

**Example (for SaaS brand):**
- 👋 "Create a new user onboarding sequence"
- 🔄 "Build a trial expiration reminder flow"
- 💎 "Design an upgrade promotion series"

### Scenario 4: Mode Switching

**Steps:**
1. Start in Planning mode, note suggestions
2. Switch to Write mode, note suggestions change
3. Switch back to Planning mode

**Expected Results:**
- Suggestions update immediately when mode changes
- New suggestions are contextually appropriate for each mode
- No loading delays or errors

### Scenario 5: Fallback to Static Suggestions

**Test API Failure:**

**Steps:**
1. Temporarily break the API (invalid OpenAI key or network issue)
2. Reload the page and observe suggestions

**Expected Results:**
- Static fallback suggestions appear
- No error messages visible to user
- Suggestions are still relevant to the mode (just not brand-specific)

**Planning Mode Fallbacks:**
- 💡 "What makes a good email subject line?"
- 🎯 "Help me understand our target audience"
- 📈 "How can I improve engagement rates?"

**Write Mode Fallbacks:**
- 🎉 "Write a promotional email for a sale"
- 🚀 "Create a product launch announcement"
- 📧 "Draft a newsletter update"

**Flow Mode Fallbacks:**
- 👋 "Create a welcome email sequence"
- 🔄 "Build a re-engagement campaign"
- 🛒 "Design an abandoned cart flow"

### Scenario 6: Suggestions Disappear with Messages

**Steps:**
1. See suggestions in empty conversation
2. Click a suggestion or type a message
3. Send the message
4. Observe suggestions disappear

**Expected Results:**
- Suggestions only show for empty conversations
- After first message, suggestions are hidden
- Input area expands to full size

### Scenario 7: Brand with Rich Context

**Steps:**
1. Select a brand with:
   - Detailed brand description
   - Complete brand guidelines
   - Multiple uploaded documents
2. Create new conversation
3. Observe suggestions

**Expected Results:**
- Suggestions are highly specific to brand
- May reference specific products/services
- Reflects brand's unique voice/positioning
- More detailed than brands with minimal data

### Scenario 8: Brand with Minimal Data

**Steps:**
1. Create a new brand with only name
2. Navigate to chat page
3. Observe suggestions

**Expected Results:**
- Suggestions still appear
- More generic but still relevant to mode
- System doesn't break with limited context

### Scenario 9: Multiple Brands Comparison

**Steps:**
1. View suggestions for Brand A (e.g., fitness apparel)
2. Switch to Brand B (e.g., B2B software)
3. Compare suggestions

**Expected Results:**
- Suggestions are distinctly different
- Reflect each brand's unique industry/audience
- Demonstrate personalization working correctly

### Scenario 10: Clicking a Suggestion

**Steps:**
1. Click one of the suggested prompts
2. Observe input behavior

**Expected Results:**
- Suggestion text fills the input field
- Input field gains focus
- User can edit before sending
- Can still click other suggestions to replace

## Performance Testing

### API Response Time
1. Open browser DevTools → Network tab
2. Create new conversation to trigger suggestions fetch
3. Look for POST to `/api/suggestions`
4. Check response time

**Expected:** < 2 seconds

### Cost Verification
1. Send 10-20 suggestion requests
2. Check OpenAI dashboard usage
3. Calculate cost per request

**Expected:** ~$0.00009 per request (0.009 cents)

### Error Rate
1. Monitor for any failed requests in Network tab
2. Check console for errors
3. Verify fallbacks work if errors occur

**Expected:** 0% visible errors (all errors handled gracefully)

## Debugging Tips

### If Suggestions Don't Appear
1. Check browser console for errors
2. Verify `OPENAI_API_KEY` is set
3. Check Network tab for failed API calls
4. Ensure `brandId` prop is being passed to ChatInput

### If Suggestions Are Generic
1. Verify brand has details and guidelines filled in
2. Check brand documents are uploaded
3. Look at API request payload in Network tab
4. Review generated context string in server logs

### If Suggestions Don't Update on Mode Change
1. Check if `mode` and `emailType` props are changing
2. Verify useEffect dependencies are correct
3. Look for console errors
4. Check if component is re-rendering

## Manual API Testing

### Using curl:

```bash
curl -X POST http://localhost:3000/api/suggestions \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "YOUR_BRAND_ID",
    "mode": "planning",
    "emailType": "design"
  }'
```

**Expected Response:**
```json
{
  "suggestions": [
    { "text": "First suggestion...", "icon": "💡" },
    { "text": "Second suggestion...", "icon": "🎯" },
    { "text": "Third suggestion...", "icon": "✨" }
  ]
}
```

### Using Postman/Insomnia:

1. Create POST request to `http://localhost:3000/api/suggestions`
2. Set Content-Type: application/json
3. Body:
```json
{
  "brandId": "uuid-here",
  "mode": "email_copy",
  "emailType": "flow"
}
```

## Success Criteria

✅ **Feature is working if:**
- Suggestions appear for all 3 modes
- Suggestions are different for each mode
- Suggestions are personalized to brand when data available
- Fallbacks work when API fails
- No visible errors to users
- Performance is fast (< 2s)
- Cost is minimal (< 0.01 cents per request)

## Known Limitations

1. **First Load May Be Slow**
   - First suggestion request cold starts the API
   - Subsequent requests are faster

2. **No Caching Yet**
   - Fresh suggestions every time
   - Could add caching if cost becomes concern

3. **Requires OpenAI API Key**
   - Feature disabled without valid key
   - Falls back to static suggestions

4. **English Only**
   - Prompts are currently generated in English only
   - Could expand to support brand's preferred language

## Next Steps After Testing

1. Monitor OpenAI usage and costs
2. Gather user feedback on suggestion quality
3. Track suggestion click-through rates
4. Consider implementing caching if needed
5. Expand prompt variety based on user behavior
6. Add A/B testing for different prompt styles

