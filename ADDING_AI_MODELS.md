# Adding New AI Models

This guide explains how to add new AI models to the Email Copywriter AI application.

## Overview

The application currently supports:
- OpenAI models (GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo)
- Anthropic models (Claude Sonnet 4.5, Claude Opus 3.5)

You can easily add more models from these providers or add entirely new providers.

## Adding a New Model from Existing Providers

### Step 1: Update Type Definitions

Edit `types/index.ts` and add the new model to the `AIModel` type:

```typescript
export type AIModel = 
  | 'gpt-4o'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  | 'claude-sonnet-4-5'
  | 'claude-opus-3-5'
  | 'your-new-model-id';  // Add this line
```

### Step 2: Add Model Configuration

Edit `lib/ai-models.ts` and add the model to the `AI_MODELS` array:

```typescript
export const AI_MODELS: AIModelOption[] = [
  // ... existing models ...
  {
    id: 'your-new-model-id',
    name: 'Your Model Display Name',
    provider: 'openai', // or 'anthropic'
  },
];
```

### Step 3: Update API Route (if needed)

If using a new Anthropic model, update the model mapping in `app/api/chat/route.ts`:

```typescript
const modelMap: Record<string, string> = {
  'claude-sonnet-4-5': 'claude-sonnet-4-20250514',
  'claude-opus-3-5': 'claude-opus-4-20250514',
  'your-new-model-id': 'actual-anthropic-model-name',  // Add this
};
```

For OpenAI models, no changes are needed as the model ID is passed directly.

### Step 4: Test

1. Restart the development server
2. Go to a conversation
3. Select the new model from the dropdown
4. Send a test message
5. Verify the AI responds correctly

## Adding a New AI Provider

If you want to add a completely new provider (e.g., Google Gemini, Cohere, etc.), follow these steps:

### Step 1: Install Provider SDK

```bash
npm install provider-sdk-package
```

### Step 2: Update Types

Add the new provider to `types/index.ts`:

```typescript
export interface AIModelOption {
  id: AIModel;
  name: string;
  provider: 'openai' | 'anthropic' | 'your-new-provider';
}
```

### Step 3: Add Provider Client

In `app/api/chat/route.ts`, add a function to get the provider client:

```typescript
import YourProvider from 'provider-sdk';

function getYourProviderClient() {
  return new YourProvider({
    apiKey: process.env.YOUR_PROVIDER_API_KEY!,
  });
}
```

### Step 4: Implement Handler Function

Add a handler function for your provider:

```typescript
async function handleYourProvider(
  messages: Message[],
  modelId: string,
  systemPrompt: string
) {
  const client = getYourProviderClient();
  
  // Format messages according to provider's requirements
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  ];

  // Create streaming request
  const stream = await client.chat.stream({
    model: modelId,
    messages: formattedMessages,
  });

  // Stream response back to client
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const content = chunk.content || '';
        if (content) {
          controller.enqueue(encoder.encode(content));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### Step 5: Update POST Handler

In the `POST` function, add handling for your new provider:

```typescript
export async function POST(req: Request) {
  try {
    const { messages, modelId, brandContext } = await req.json();

    const model = getModelById(modelId);
    if (!model) {
      return new Response('Invalid model', { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(brandContext);

    if (model.provider === 'openai') {
      return handleOpenAI(messages, modelId, systemPrompt);
    } else if (model.provider === 'anthropic') {
      return handleAnthropic(messages, modelId, systemPrompt);
    } else if (model.provider === 'your-new-provider') {
      return handleYourProvider(messages, modelId, systemPrompt);
    }

    return new Response('Unsupported provider', { status: 400 });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
```

### Step 6: Add Models

Add your provider's models to `lib/ai-models.ts`:

```typescript
export const AI_MODELS: AIModelOption[] = [
  // ... existing models ...
  {
    id: 'your-model-1',
    name: 'Your Model 1',
    provider: 'your-new-provider',
  },
  {
    id: 'your-model-2',
    name: 'Your Model 2',
    provider: 'your-new-provider',
  },
];
```

### Step 7: Add Environment Variables

1. Add to `env.example`:
```
YOUR_PROVIDER_API_KEY=your_api_key_here
```

2. Add to your local `.env.local`

3. Add to Vercel environment variables

### Step 8: Test

1. Restart the development server
2. Test the new models
3. Verify streaming works correctly
4. Check error handling

## Model-Specific Considerations

### Token Limits

If your model has specific token limits, you may want to add validation:

```typescript
const MAX_TOKENS: Record<string, number> = {
  'gpt-4o': 128000,
  'your-model': 32000,
};
```

### Response Formatting

Some providers may return responses in different formats. Adjust the streaming logic accordingly:

```typescript
// Example: If provider returns JSON chunks instead of text
for await (const chunk of stream) {
  const parsed = JSON.parse(chunk);
  const content = parsed.choices[0].delta.content || '';
  controller.enqueue(encoder.encode(content));
}
```

### Error Handling

Add provider-specific error handling:

```typescript
try {
  const stream = await client.chat.stream({ /* ... */ });
  // ...
} catch (error) {
  if (error.code === 'rate_limit_exceeded') {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  throw error;
}
```

## Best Practices

1. **Test Thoroughly**: Test with various message lengths and conversation contexts
2. **Handle Errors**: Implement proper error handling for network issues, rate limits, etc.
3. **Monitor Costs**: Different models have different pricing - document this for users
4. **Document**: Update README with new models and any special requirements
5. **Performance**: Some models are faster than others - consider adding loading indicators
6. **Fallbacks**: Consider implementing fallback models if primary model fails

## Troubleshooting

### Model Not Appearing in Dropdown

- Check that you've added it to `AI_MODELS` array
- Verify the TypeScript types are correct
- Restart the development server

### Streaming Not Working

- Verify the provider SDK supports streaming
- Check that you're properly encoding the response chunks
- Test the streaming endpoint directly with curl

### Authentication Errors

- Verify API key is set in environment variables
- Check that the API key has the correct permissions
- Ensure the key is being loaded correctly (server-side only for security)

## Future Enhancements

Consider adding:
- Model-specific temperature/parameter controls
- Cost estimation per message
- Model performance metrics
- A/B testing between models
- Automatic model selection based on message type

---

For questions or issues, please open a GitHub issue.


