/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useChatMessages } from '@/hooks/useChatMessages';
import { createClient } from '@/lib/supabase/client';
import * as cacheManager from '@/lib/cache-manager';

// Mock dependencies
jest.mock('@/lib/supabase/client');
jest.mock('@/lib/cache-manager');
jest.mock('react-hot-toast', () => ({
  default: {
    error: jest.fn(),
  },
}));
jest.mock('@/lib/analytics', () => ({
  trackPerformance: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetCachedMessages = cacheManager.getCachedMessages as jest.MockedFunction<
  typeof cacheManager.getCachedMessages
>;
const mockCacheMessages = cacheManager.cacheMessages as jest.MockedFunction<
  typeof cacheManager.cacheMessages
>;

describe('useChatMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty messages', () => {
    const { result } = renderHook(() => useChatMessages(null));

    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should load messages from cache if available', async () => {
    const cachedMessages = [
      {
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'user',
        content: 'Hello',
        created_at: new Date().toISOString(),
      },
    ];

    mockGetCachedMessages.mockReturnValue(cachedMessages as any);

    const { result } = renderHook(() => useChatMessages('conv-1'));

    await waitFor(() => {
      expect(result.current.messages).toEqual(cachedMessages);
    });

    expect(mockGetCachedMessages).toHaveBeenCalledWith('conv-1');
  });

  it('should load messages from database when cache is empty', async () => {
    const dbMessages = [
      {
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'user',
        content: 'Hello',
        created_at: new Date().toISOString(),
      },
    ];

    mockGetCachedMessages.mockReturnValue(null);
    mockCacheMessages.mockImplementation(() => {});

    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: dbMessages,
              error: null,
            }),
          }),
        }),
      }),
    };

    mockCreateClient.mockReturnValue(mockSupabase as any);

    const { result } = renderHook(() => useChatMessages('conv-1'));

    await waitFor(() => {
      expect(result.current.messages).toEqual(dbMessages);
    });

    expect(mockCacheMessages).toHaveBeenCalledWith('conv-1', dbMessages);
  });

  it('should add message optimistically', () => {
    const { result } = renderHook(() => useChatMessages('conv-1'));

    const newMessage = {
      id: 'msg-2',
      conversation_id: 'conv-1',
      role: 'user',
      content: 'New message',
      created_at: new Date().toISOString(),
    };

    result.current.addMessage(newMessage as any);

    expect(result.current.messages).toContainEqual(newMessage);
  });

  it('should update message', () => {
    const initialMessages = [
      {
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'user',
        content: 'Hello',
        created_at: new Date().toISOString(),
      },
    ];

    mockGetCachedMessages.mockReturnValue(initialMessages as any);

    const { result } = renderHook(() => useChatMessages('conv-1'));

    waitFor(() => {
      result.current.updateMessage('msg-1', { content: 'Updated' });
    });

    waitFor(() => {
      expect(result.current.messages[0].content).toBe('Updated');
    });
  });

  it('should handle loading errors gracefully', async () => {
    mockGetCachedMessages.mockReturnValue(null);

    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error'),
            }),
          }),
        }),
      }),
    };

    mockCreateClient.mockReturnValue(mockSupabase as any);

    const { result } = renderHook(() => useChatMessages('conv-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});




