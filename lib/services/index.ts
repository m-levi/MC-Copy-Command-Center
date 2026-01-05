/**
 * Service Layer Index
 *
 * This module exports all services for the application.
 * Services encapsulate business logic and data access patterns.
 *
 * Benefits:
 * - Separation of concerns
 * - Reusable business logic
 * - Easier testing
 * - Type-safe operations
 */

// RAG Service - Document retrieval and AI context building
export * from './rag.service';

// Brand Service - Brand CRUD and management
export * from './brand.service';

// Conversation Service - Chat conversations and messages (namespaced to avoid conflicts)
export * as ConversationService from './conversation.service';

// Artifact Service - Email artifacts and versions (namespaced to avoid conflicts)
export * as ArtifactService from './artifact.service';
