/**
 * Unified stream handler for both OpenAI and Anthropic
 * Reduces code duplication from ~500 lines to single implementation
 */

// Dynamic imports for AI clients to reduce bundle size
import type OpenAI from 'openai';
import type Anthropic from '@anthropic-ai/sdk';
import { Message } from '@/types';
import { parseMemoryInstructions, saveMemory } from '@/lib/conversation-memory-store';
import { extractProductMentions, constructProductUrl } from '@/lib/web-search';
import { smartExtractProductLinks, extractURLsFromSearchContext, convertToProductLinks } from '@/lib/url-extractor';
import { cleanWithLogging } from '@/lib/content-cleaner';

export type AIProvider = 'openai' | 'anthropic';

export interface StreamOptions {
  messages: Message[];
  modelId: string;
  systemPrompt: string;
  provider: AIProvider;
  websiteUrl?: string;
  conversationId?: string;
}

export interface ProductLink {
  name: string;
  url: string;
  description?: string;
}

/**
 * Status markers for tracking AI generation progress
 * These are smart thresholds that detect actual content being written
 */
const STATUS_SEQUENCE = [
  { threshold: 0, status: 'crafting_subject', keywords: ['SUBJECT', 'EMAIL SUBJECT'] },
  { threshold: 10, status: 'writing_hero', keywords: ['HERO SECTION', 'ACCENT:', 'HEADLINE:'] },
  { threshold: 30, status: 'developing_body', keywords: ['SECTION 2:', 'SECTION 3:', 'BODY'] },
  { threshold: 60, status: 'creating_cta', keywords: ['CALL-TO-ACTION', 'CTA SECTION'] },
  { threshold: 90, status: 'finalizing', keywords: [] },
] as const;

/**
 * Create AI client based on provider (with dynamic imports)
 */
async function getClient(provider: AIProvider) {
  if (provider === 'openai') {
    const OpenAI = (await import('openai')).default;
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  } else {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    return new Anthropic({ 
      apiKey: process.env.ANTHROPIC_API_KEY!,
      // Add beta headers for web search and memory tools
      defaultHeaders: {
        'anthropic-beta': 'web-search-2025-03-05,context-management-2025-06-27'
      }
    });
  }
}

/**
 * Format messages for the specific provider
 */
function formatMessages(
  messages: Message[],
  systemPrompt: string,
  modelId: string,
  provider: AIProvider
) {
  if (provider === 'openai') {
    const isO1Model = modelId.startsWith('o1');
    
    if (isO1Model) {
      // O1 models don't support system messages - prepend to first user message
      const userMessages = messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
      
      if (userMessages.length > 0 && userMessages[0].role === 'user') {
        userMessages[0] = {
          ...userMessages[0],
          content: `${systemPrompt}\n\n---\n\n${userMessages[0].content}`,
        };
      }
      return { formatted: userMessages, system: null };
    } else {
      const formatted = messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
      return { formatted, system: systemPrompt };
    }
  } else {
    // Anthropic
    const formatted = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
    return { formatted, system: systemPrompt };
  }
}

/**
 * Get model name for provider
 */
function getProviderModelName(modelId: string, provider: AIProvider): string {
  if (provider === 'anthropic') {
    const modelMap: Record<string, string> = {
      'claude-4.5-sonnet': 'claude-sonnet-4-20250514',
      'claude-opus-3.5': 'claude-opus-4-20250514',
    };
    return modelMap[modelId] || 'claude-sonnet-4-20250514';
  }
  return modelId; // OpenAI uses direct model IDs
}

/**
 * Create streaming request
 */
async function createStream(
  client: any,
  provider: AIProvider,
  modelId: string,
  formattedMessages: any[],
  systemPrompt: string | null,
  websiteUrl?: string
): Promise<any> {
  const providerModel = getProviderModelName(modelId, provider);
  
  if (provider === 'openai') {
    const config: any = {
      model: providerModel,
      messages: systemPrompt 
        ? [{ role: 'system', content: systemPrompt }, ...formattedMessages]
        : formattedMessages,
      stream: true,
      tools: [{
        type: 'web_search',
      }],
      tool_choice: 'auto',
    };
    
    console.log(`[${provider.toUpperCase()}] Web search tool enabled:`, { 
      type: 'web_search',
      websiteContext: websiteUrl ? `Searching ${new URL(websiteUrl).hostname}` : 'No website URL' 
    });
    
    return await client.chat.completions.create(config);
  } else {
    // Anthropic
    const tools = [];
    
    // Add web search tool
    const searchTool: any = {
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: 5,
    };
    
    if (websiteUrl) {
      try {
        searchTool.allowed_domains = [
          new URL(websiteUrl).hostname,
          'shopify.com',
          'amazon.com',
          'yelp.com',
          'trustpilot.com',
        ];
        console.log(`[${provider.toUpperCase()}] Web search tool enabled with allowed domains:`, searchTool.allowed_domains);
      } catch (err) {
        console.warn(`[${provider.toUpperCase()}] Invalid website URL, web search enabled without domain filtering`);
      }
    } else {
      console.log(`[${provider.toUpperCase()}] Web search tool enabled (no domain filtering - no website URL provided)`);
    }
    
    tools.push(searchTool);
    
    return await client.messages.create({
      model: providerModel,
      max_tokens: 4096,
      system: systemPrompt || undefined,
      messages: formattedMessages,
      stream: true,
      thinking: {
        type: 'enabled',
        budget_tokens: 2000,
      },
      tools,
    });
  }
}

/**
 * Parse chunk based on provider
 */
function parseChunk(chunk: any, provider: AIProvider): {
  content?: string;
  reasoning?: string;
  thinkingStart?: boolean;
  thinkingEnd?: boolean;
  isThinking?: boolean;
  toolUse?: string;
  toolResult?: string;
  toolResultContent?: string;
} {
  if (provider === 'openai') {
    const reasoningContent = (chunk.choices[0]?.delta as any)?.reasoning_content || '';
    const content = chunk.choices[0]?.delta?.content || '';
    
    // Add tool_calls detection
    const toolCalls = chunk.choices[0]?.delta?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      return { toolUse: toolCalls[0].function?.name || 'web_search' };
    }
    
    return {
      content,
      reasoning: reasoningContent,
      isThinking: !!reasoningContent,
    };
  } else {
    // Anthropic
    if (chunk.type === 'content_block_start' && chunk.content_block?.type === 'thinking') {
      return { thinkingStart: true };
    }
    
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'thinking_delta') {
      return { reasoning: chunk.delta.thinking || '' };
    }
    
    if (chunk.type === 'content_block_stop') {
      return { thinkingEnd: true };
    }
    
    // Add server_tool_use detection
    if (chunk.type === 'content_block_start' && chunk.content_block?.type === 'server_tool_use') {
      return { toolUse: chunk.content_block.name };
    }
    
    // Add web_search_tool_result detection - capture the full result
    if (chunk.type === 'content_block_start' && chunk.content_block?.type === 'web_search_tool_result') {
      // The search results are in content_block.content (it's an array)
      const searchResults = (chunk.content_block as any);
      const content = searchResults.content;
      
      // Extract URLs from search results array
      if (Array.isArray(content)) {
        const urls = content
          .filter((r: any) => r.type === 'web_search_result' && r.url)
          .map((r: any) => `${r.title} - ${r.url}`)
          .join('\n');
        
        if (urls) {
          console.log('[Anthropic] Extracted URLs from search results:', content.length, 'results');
          console.log('[Anthropic] URLs preview:', urls.substring(0, 200));
          return { toolResult: 'web_search', toolResultContent: urls };
        }
      }
      
      return { toolResult: 'web_search' };
    }
    
    // Capture text content
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      return { content: chunk.delta.text };
    }
    
    return {};
  }
}

/**
 * Handle product link extraction - uses smart extraction for REAL URLs only
 * Now includes thinking content and web search results
 */
async function extractProductLinks(
  websiteUrl: string | undefined,
  content: string,
  userMessages: Message[],
  thinkingContent?: string,
  webSearchContent?: string
): Promise<ProductLink[]> {
  try {
    // Extract user message content
    const userMessageTexts = userMessages
      .filter(m => m.role === 'user')
      .map(m => m.content);
    
    // Combine all content sources for extraction
    // Web search results often contain URLs that need to be extracted
    const allContent = [
      content, // Main response
      thinkingContent || '', // Thinking content (where web search results are often mentioned)
      webSearchContent || '', // Direct web search results if captured
    ].filter(Boolean).join('\n\n');
    
    console.log('[ProductLinks] Extracting from:', {
      mainResponse: content.length,
      thinking: thinkingContent?.length || 0,
      webSearch: webSearchContent?.length || 0,
      total: allContent.length
    });
    
    // Debug: Log first 500 chars of thinking to see what's there
    if (thinkingContent && thinkingContent.length > 0) {
      console.log('[ProductLinks] Thinking content preview:', thinkingContent.substring(0, 500));
      console.log('[ProductLinks] Thinking has URLs?', /https?:\/\//.test(thinkingContent));
    }
    
    // Debug: Log first 500 chars of response
    console.log('[ProductLinks] Response preview:', content.substring(0, 500));
    console.log('[ProductLinks] Response has URLs?', /https?:\/\//.test(content));
    
    // Use smart extraction to find real URLs only
    const links = smartExtractProductLinks(allContent, userMessageTexts, websiteUrl);
    
    // Also try extracting from web search context specifically
    if (webSearchContent || thinkingContent) {
      const searchText = [webSearchContent, thinkingContent].filter(Boolean).join('\n\n');
      const searchUrls = extractURLsFromSearchContext(searchText, websiteUrl);
      if (searchUrls.length > 0) {
        const searchLinks = convertToProductLinks(searchUrls, websiteUrl);
        // Merge with existing links, avoiding duplicates
        searchLinks.forEach((link: ProductLink) => {
          if (!links.some(l => l.url === link.url)) {
            links.push(link);
          }
        });
        console.log('[ProductLinks] Added', searchLinks.length, 'links from web search context');
      }
    }
    
    console.log('[ProductLinks] Smart extraction found', links.length, 'real product links');
    
    return links;
  } catch (error) {
    console.error('[ProductLinks] Error extracting:', error);
    return [];
  }
}

/**
 * Handle memory instruction saving
 */
async function saveMemoryInstructions(
  conversationId: string,
  content: string
): Promise<void> {
  try {
    const instructions = parseMemoryInstructions(content);
    if (instructions.length === 0) return;
    
    console.log(`[Memory] Found ${instructions.length} instructions`);
    
    for (const instruction of instructions) {
      try {
        await saveMemory(
          conversationId,
          instruction.key,
          instruction.value,
          instruction.category
        );
        console.log(`[Memory] Saved: ${instruction.key} = ${instruction.value}`);
      } catch (error) {
        console.error('[Memory] Error saving:', error);
      }
    }
  } catch (error) {
    console.error('[Memory] Error processing instructions:', error);
  }
}

/**
 * Unified stream handler - works for both OpenAI and Anthropic
 */
export async function handleUnifiedStream(options: StreamOptions): Promise<Response> {
  const { messages, modelId, systemPrompt, provider, websiteUrl, conversationId } = options;
  
  console.log(`[${provider.toUpperCase()}] Starting unified stream with model:`, modelId);
  
  const client = await getClient(provider);
  const { formatted, system } = formatMessages(messages, systemPrompt, modelId, provider);
  const stream = await createStream(client, provider, modelId, formatted, system, websiteUrl);
  
  console.log(`[${provider.toUpperCase()}] Stream received, starting to read...`);
  
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Send initial status
        controller.enqueue(encoder.encode('[STATUS:analyzing_brand]'));
        
        let chunkCount = 0;
        let fullResponse = '';
        let thinkingContent = '';
        let isInThinkingBlock = false;
        let currentStatusIndex = 0;
        let webSearchContent = ''; // Track content from web searches (if directly available)
        
        for await (const chunk of stream) {
          const parsed = parseChunk(chunk, provider);
          
          // Handle tool usage
          if (parsed.toolUse) {
            console.log(`[${provider.toUpperCase()}] Tool use started: ${parsed.toolUse}`);
            controller.enqueue(encoder.encode(`[TOOL:${parsed.toolUse}:START]`));
            controller.enqueue(encoder.encode('[STATUS:searching_web]'));
            continue;
          }
          
          // Capture web search tool result content FIRST (before handling toolResult)
          if (parsed.toolResultContent) {
            webSearchContent += parsed.toolResultContent + '\n\n';
            console.log(`[${provider.toUpperCase()}] Captured web search content (${parsed.toolResultContent.length} chars)`);
            // Don't continue - also need to handle toolResult marker
          }
          
          if (parsed.toolResult) {
            console.log(`[${provider.toUpperCase()}] Tool result received: ${parsed.toolResult}`);
            controller.enqueue(encoder.encode(`[TOOL:${parsed.toolResult}:END]`));
            controller.enqueue(encoder.encode('[STATUS:analyzing_brand]'));
            
            if (parsed.toolResult === 'web_search' && webSearchContent) {
              console.log(`[${provider.toUpperCase()}] Web search completed - captured ${webSearchContent.length} chars of URLs`);
            }
            continue;
          }
          
          // Handle thinking content
          // Web search results are often mentioned in thinking content - this is where URLs are typically found
          if (parsed.thinkingStart || parsed.isThinking) {
            if (!isInThinkingBlock) {
              controller.enqueue(encoder.encode('[THINKING:START]'));
              controller.enqueue(encoder.encode('[STATUS:thinking]'));
              isInThinkingBlock = true;
            }
          }
          
          if (parsed.reasoning) {
            thinkingContent += parsed.reasoning;
            controller.enqueue(encoder.encode(`[THINKING:CHUNK]${parsed.reasoning}`));
            continue;
          }
          
          if (parsed.thinkingEnd) {
            if (isInThinkingBlock) {
              controller.enqueue(encoder.encode('[THINKING:END]'));
              controller.enqueue(encoder.encode('[STATUS:analyzing_brand]'));
              isInThinkingBlock = false;
            }
            continue;
          }
          
          // Handle regular content
          if (parsed.content) {
            fullResponse += parsed.content;
            
            // Smart status detection based on content keywords
            if (currentStatusIndex < STATUS_SEQUENCE.length) {
              const nextStatus = STATUS_SEQUENCE[currentStatusIndex];
              
              // Check if we've hit the chunk threshold first
              const hitThreshold = chunkCount >= nextStatus.threshold;
              
              // Check if content contains keywords for next stage
              const hasKeywords = nextStatus.keywords.length > 0 && 
                nextStatus.keywords.some(keyword => 
                  fullResponse.toUpperCase().includes(keyword)
                );
              
              // Advance status if threshold met OR keywords found
              if (hitThreshold || hasKeywords) {
                controller.enqueue(encoder.encode(`[STATUS:${nextStatus.status}]`));
                currentStatusIndex++;
                console.log(`[${provider.toUpperCase()}] Status: ${nextStatus.status} (chunks: ${chunkCount}, keywords: ${hasKeywords})`);
              }
            }
            
            controller.enqueue(encoder.encode(parsed.content));
            chunkCount++;
            
            if (chunkCount % 10 === 0) {
              console.log(`[${provider.toUpperCase()}] Processed ${chunkCount} chunks, ${fullResponse.length} chars`);
            }
          }
        }
        
        console.log(`[${provider.toUpperCase()}] Stream complete. Total: ${chunkCount} chunks, ${fullResponse.length} chars`);
        
        // Save memory instructions
        if (conversationId && fullResponse) {
          await saveMemoryInstructions(conversationId, fullResponse);
        }
        
        // Extract and send product links (ONLY real URLs, no fake construction)
        // Include thinking content and web search content for better URL extraction
        if (fullResponse || thinkingContent || webSearchContent) {
          console.log('[Stream] Extracting product links from:', {
            response: fullResponse.length,
            thinking: thinkingContent.length,
            webSearch: webSearchContent.length
          });
          
          const productLinks = await extractProductLinks(
            websiteUrl, 
            fullResponse, 
            messages,
            thinkingContent,
            webSearchContent
          );
          
          if (productLinks.length > 0) {
            console.log('[Stream] Sending', productLinks.length, 'product links to client');
            controller.enqueue(encoder.encode(`\n\n[PRODUCTS:${JSON.stringify(productLinks)}]`));
          } else {
            console.log('[Stream] No product links found - box will be hidden');
          }
        }
        
        controller.close();
        console.log(`[${provider.toUpperCase()}] Stream controller closed successfully`);
      } catch (error) {
        console.error(`[${provider.toUpperCase()}] Stream error:`, error);
        controller.error(error);
      }
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

