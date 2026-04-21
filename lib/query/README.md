# React Query Integration

## Installation

To enable React Query data fetching, run:

```bash
npm install @tanstack/react-query
```

## Setup

After installing, wrap your app with the QueryProvider in `app/layout.tsx`:

```tsx
import { QueryProvider } from '@/lib/query/provider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
```

## Usage

Use the pre-built hooks:

```tsx
import { useConversations, useMessages, useBrand } from '@/lib/query/hooks';

function MyComponent({ brandId, conversationId }) {
  const { data: brand, isLoading: brandLoading } = useBrand(brandId);
  const { data: conversations } = useConversations(brandId);
  const { data: messages } = useMessages(conversationId);
  
  // Data is automatically cached, deduplicated, and background refreshed
}
```

## Benefits

- Automatic caching and deduplication
- Background refetching
- Optimistic updates
- Devtools for debugging
- Suspense integration
- Better error handling


