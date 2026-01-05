/**
 * Test Setup
 *
 * Global test configuration and mocks for Jest
 */

import '@testing-library/jest-dom';

// ============================================================================
// GLOBAL MOCKS
// ============================================================================

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock Next.js headers
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(() => []),
  }),
  headers: () => new Headers(),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    })),
    rpc: jest.fn(() => Promise.resolve({ data: [], error: null })),
  }),
}));

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    rpc: jest.fn(() => Promise.resolve({ data: [], error: null })),
  }),
}));

// Mock Edge client
jest.mock('@/lib/supabase/edge', () => ({
  createEdgeClient: () => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    rpc: jest.fn(() => Promise.resolve({ data: [], error: null })),
  }),
}));

// Mock logger to suppress output in tests
jest.mock('@/lib/logger', () => ({
  logger: {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.OPENAI_API_KEY = 'test-openai-key';

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock brand for testing
 */
export function createMockBrand(overrides = {}) {
  return {
    id: 'test-brand-id',
    name: 'Test Brand',
    organization_id: 'test-org-id',
    brand_details: 'Test brand details',
    brand_guidelines: 'Test guidelines',
    copywriting_style_guide: 'Test style guide',
    brand_voice: null,
    website_url: 'https://test.com',
    logo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock conversation for testing
 */
export function createMockConversation(overrides = {}) {
  return {
    id: 'test-conversation-id',
    user_id: 'test-user-id',
    brand_id: 'test-brand-id',
    title: 'Test Conversation',
    mode: 'email_copy',
    custom_mode_id: null,
    is_starred: false,
    share_token: null,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock message for testing
 */
export function createMockMessage(overrides = {}) {
  return {
    id: 'test-message-id',
    conversation_id: 'test-conversation-id',
    role: 'user' as const,
    content: 'Test message content',
    model_id: null,
    metadata: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Wait for next tick
 */
export function nextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Wait for a specific amount of time
 */
export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// CLEANUP
// ============================================================================

afterEach(() => {
  jest.clearAllMocks();
});
