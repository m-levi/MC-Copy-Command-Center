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

const EMAIL_START_PATTERNS = [
  /\*\*HERO SECTION:\*\*/i,
  /HERO SECTION:/i,
  /\*\*Section Title:\*\*/i,
  /Section Title:/i,
  /\*\*FINAL CTA SECTION:\*\*/i,
  /FINAL CTA SECTION:/i,
  /\*\*EMAIL SUBJECT LINE:\*\*/i,
  /EMAIL SUBJECT LINE:/i,
  /\*\*Sub-headline:\*\*/i,
  /\*\*Headline:\*\*/i,
  /\*\*Call to Action Button:\*\*/i,
  /<clarification_request>/i,
  /<email_copy>/i,
  /<non_copy_response>/i,
] as const;

const ANALYSIS_LEAK_PATTERNS = [
  /\*\*A\./i,
  /\*\*B\./i,
  /\*\*C\./i,
  /\*\*BRAND (?:VOICE|DEEP DIVE)/i,
  /\bstrategic analysis\b/i,
  /\bmy analysis\b/i,
] as const;

function findEmailStartIndex(text: string): number {
  let earliest = -1;

  for (const pattern of EMAIL_START_PATTERNS) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      if (earliest === -1 || match.index < earliest) {
        earliest = match.index;
      }
    }
  }

  if (earliest === -1) {
    return -1;
  }

  let start = earliest;
  const beforeSlice = text.substring(0, start);
  const lastDoubleNewline = beforeSlice.lastIndexOf('\n\n');
  if (lastDoubleNewline !== -1) {
    start = lastDoubleNewline + 2;
  } else {
    const lastNewline = beforeSlice.lastIndexOf('\n');
    if (lastNewline !== -1) {
      start = lastNewline + 1;
    }
  }

  return start;
}

function containsAnalysisLeak(text: string): boolean {
  return ANALYSIS_LEAK_PATTERNS.some(pattern => pattern.test(text));
}

function containsClarificationRequest(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('<clarification_request>') ||
    normalized.includes('need more information') ||
    normalized.includes('missing required') ||
    normalized.includes('required information') ||
    normalized.includes('please provide') ||
    normalized.includes('can you clarify') ||
    normalized.includes('what is this email') ||
    /\?\s*$/.test(normalized.slice(-120)) || // question near end
    (normalized.includes('campaign type') && normalized.includes('products')) ||
    normalized.includes('primary goal') ||
    normalized.includes('offer/urgency')
  );
}

type ResponseWrapper = 'email_copy' | 'clarification_request' | 'non_copy_response';

function hasWrapper(text: string, wrapper: ResponseWrapper): boolean {
  const regex = new RegExp(`<${wrapper}[> ]`, 'i');
  return regex.test(text);
}

function hasClosingWrapper(text: string, wrapper: ResponseWrapper): boolean {
  const regex = new RegExp(`</${wrapper}>`, 'i');
  return regex.test(text);
}

function sanitizeClarificationContent(content: string): string {
  const withLineBreaks = content.replace(/<\/?clarification_request>/gi, '').trim();

  const fieldChecks: Array<{ label: string; regexes: RegExp[] }> = [
    {
      label: 'Campaign type or goal',
      regexes: [/campaign type/i, /goal/i, /purpose/i],
    },
    {
      label: 'Product or category to feature',
      regexes: [/product/i, /collection/i, /category/i],
    },
    {
      label: 'Offer or promotion',
      regexes: [/offer/i, /promotion/i, /discount/i, /free shipping/i],
    },
    {
      label: 'Audience segment',
      regexes: [/audience/i, /segment/i, /customers/i, /subscribers/i],
    },
    {
      label: 'Timing or urgency',
      regexes: [/timing/i, /urgency/i, /deadline/i, /season/i],
    },
  ];

  const detected: string[] = [];

  for (const field of fieldChecks) {
    const found = field.regexes.some((regex) => regex.test(withLineBreaks));
    if (found) {
      detected.push(field.label);
    }
  }

  const requiredFields =
    detected.length > 0 ? detected : fieldChecks.map((field) => field.label);

  const opener = 'Need a quick clarification before I write the email:';
  const bullets = requiredFields
    .map((field) => `• ${field}`)
    .join('\n');

  return `${opener}\n\n${bullets}`;
}

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
      // Add beta headers for web search tool
      defaultHeaders: {
        'anthropic-beta': 'web-search-2025-03-05'
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
      'claude-4.5-sonnet': 'claude-sonnet-4-5-20250929', // Updated to new model for standard design emails
      'claude-opus-3.5': 'claude-opus-4-20250514',
    };
    return modelMap[modelId] || 'claude-sonnet-4-5-20250929';
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
    
    // DISABLED: Native memory tool causes stream to stop without generating response
    // TODO: Re-enable once Anthropic fixes the tool_use/tool_result handling
    // const memoryTool: any = {
    //   type: 'memory_20250818',
    //   name: 'memory',
    // };
    // tools.push(memoryTool);
    // console.log(`[${provider.toUpperCase()}] Native memory tool enabled`);
    
    return await client.messages.create({
      model: providerModel,
      max_tokens: 20000, // Increased for comprehensive email copy generation
      temperature: 1, // Higher temperature for more creative, varied output
      system: systemPrompt || undefined,
      messages: formattedMessages,
      stream: true,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000, // Increased for deeper strategic analysis
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
  toolUseInput?: any;
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
    
    // Add server_tool_use detection (web search)
    if (chunk.type === 'content_block_start' && chunk.content_block?.type === 'server_tool_use') {
      const toolName = chunk.content_block.name;
      const toolInput = chunk.content_block.input;
      return { toolUse: toolName, toolUseInput: toolInput };
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
        let emailContentStarted = false;
        let preEmailBuffer = '';
        let trimmedAnalysisChars = 0;
        let activeWrapper: ResponseWrapper | null = null;
        let wrapperOpenedManually = false;
        let stopContentStreaming = false;

        const openWrapper = (type: ResponseWrapper) => {
          if (!activeWrapper) {
            activeWrapper = type;
            wrapperOpenedManually = true;
            const tag = `<${type}>`;
            controller.enqueue(encoder.encode(tag));
            fullResponse += tag;
            emailContentStarted = true;
            console.log(`[${provider.toUpperCase()}] Opened wrapper: ${type}`);
          }
        };

        const ensureWrapperClosed = () => {
          if (activeWrapper && !hasClosingWrapper(fullResponse, activeWrapper)) {
            const closingTag = `</${activeWrapper}>`;
            controller.enqueue(encoder.encode(closingTag));
            fullResponse += closingTag;
            console.log(`[${provider.toUpperCase()}] Closed wrapper: ${activeWrapper}`);
          }
          activeWrapper = null;
        };
        
        for await (const chunk of stream) {
          // Log chunk type for debugging (Anthropic only)
          if (provider === 'anthropic' && chunk.type) {
            if (chunk.type !== 'content_block_delta' && chunk.type !== 'message_delta') {
              console.log(`[${provider.toUpperCase()}] Chunk type: ${chunk.type}${chunk.content_block?.type ? ` | content_block.type: ${chunk.content_block.type}` : ''}`);
            }
          }
          
          const parsed = parseChunk(chunk, provider);

          if (stopContentStreaming) {
            if (parsed.thinkingEnd) {
              // still forward status transitions to close thinking blocks
              controller.enqueue(encoder.encode('[THINKING:END]'));
            }
            continue;
          }
          
          // Handle tool usage
          if (parsed.toolUse) {
            console.log(`[${provider.toUpperCase()}] Tool use started: ${parsed.toolUse}`);
            
            controller.enqueue(encoder.encode(`[TOOL:${parsed.toolUse}:START]`));
            
            // Only show "searching_web" status for web search
            if (parsed.toolUse === 'web_search') {
              controller.enqueue(encoder.encode('[STATUS:searching_web]'));
            }
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
            let chunkText = parsed.content;

            if (!emailContentStarted) {
              preEmailBuffer += chunkText;

              // Prevent unbounded growth—keep most recent portion
              if (preEmailBuffer.length > 12000) {
                preEmailBuffer = preEmailBuffer.slice(preEmailBuffer.length - 12000);
              }

              if (containsClarificationRequest(preEmailBuffer)) {
                const bufferLength = preEmailBuffer.length;
                const tagIndex = preEmailBuffer.search(/<clarification_request>/i);

                if (tagIndex >= 0) {
                  trimmedAnalysisChars += tagIndex;
                  const stripped = preEmailBuffer
                    .substring(tagIndex)
                    .replace(/<\/?clarification_request>/gi, '');
                  chunkText = sanitizeClarificationContent(stripped);
                  preEmailBuffer = '';
                  if (!hasWrapper(chunkText, 'clarification_request')) {
                    openWrapper('clarification_request');
                  } else {
                    activeWrapper = 'clarification_request';
                  }
                } else {
                  const trimmed = preEmailBuffer.trimStart();
                  trimmedAnalysisChars += bufferLength - trimmed.length;
                  openWrapper('clarification_request');
                  chunkText = sanitizeClarificationContent(trimmed);
                  preEmailBuffer = '';
                }

                emailContentStarted = true;
                console.log(`[${provider.toUpperCase()}] Detected clarification request – streaming without trimming`);

                if (chunkText) {
                  controller.enqueue(encoder.encode(chunkText));
                  fullResponse += chunkText;
                }

                ensureWrapperClosed();
                stopContentStreaming = true;
                continue;
              } else {
                const startIndex = findEmailStartIndex(preEmailBuffer);
                if (startIndex === -1) {
                  continue; // Still capturing analysis/preamble
                }

                emailContentStarted = true;
                const tagIndex = preEmailBuffer.search(/<email_copy>/i);

                if (tagIndex >= 0 && tagIndex <= startIndex) {
                  trimmedAnalysisChars += tagIndex;
                  chunkText = preEmailBuffer.substring(tagIndex).trimStart();
                  preEmailBuffer = '';
                  activeWrapper = 'email_copy';
                } else {
                  trimmedAnalysisChars += startIndex;
                  chunkText = preEmailBuffer.substring(startIndex).trimStart();
                  preEmailBuffer = '';
                  if (!hasWrapper(chunkText, 'email_copy')) {
                    openWrapper('email_copy');
                  } else {
                    activeWrapper = 'email_copy';
                  }
                }

                if (trimmedAnalysisChars > 0) {
                  console.log(`[${provider.toUpperCase()}] Trimmed ${trimmedAnalysisChars} chars of analysis before email content`);
                }
              }
            }

            if (!emailContentStarted) {
              continue;
            }

            fullResponse += chunkText;
            
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
            
            controller.enqueue(encoder.encode(chunkText));
            chunkCount++;
            
            if (chunkCount % 10 === 0) {
              console.log(`[${provider.toUpperCase()}] Processed ${chunkCount} chunks, ${fullResponse.length} chars`);
            }
          }
        }
        
        console.log(`[${provider.toUpperCase()}] Stream complete. Total: ${chunkCount} chunks, ${fullResponse.length} chars, ${thinkingContent.length} thinking chars`);

        if (!emailContentStarted) {
          console.warn(`[${provider.toUpperCase()}] WARNING: Email markers not detected in streamed content. Applying fallback clean.`);
          if (preEmailBuffer) {
            let fallbackContent = cleanWithLogging(preEmailBuffer).trim();
            if (fallbackContent) {
              const wrapperType: ResponseWrapper = containsClarificationRequest(fallbackContent)
                ? 'clarification_request'
                : 'non_copy_response';

              if (!hasWrapper(fallbackContent, wrapperType)) {
                openWrapper(wrapperType);
                const body =
                  wrapperType === 'clarification_request'
                    ? sanitizeClarificationContent(fallbackContent)
                    : fallbackContent;
                controller.enqueue(encoder.encode(body));
                fullResponse += body;
              } else {
                activeWrapper = wrapperType;
                const body =
                  wrapperType === 'clarification_request'
                    ? sanitizeClarificationContent(fallbackContent.replace(/<\/?clarification_request>/gi, ''))
                    : fallbackContent;
                controller.enqueue(encoder.encode(body));
                fullResponse += body;
              }

              emailContentStarted = true;
              console.log(`[${provider.toUpperCase()}] Fallback content delivered (${fallbackContent.length} chars)`);
            }
          }
        } else if (containsAnalysisLeak(fullResponse.slice(0, 400))) {
          console.warn(`[${provider.toUpperCase()}] WARNING: Potential analysis leakage detected in final output (conversation ${conversationId || 'N/A'})`);
        }

        ensureWrapperClosed();
        
        // Log final content lengths for debugging
        console.log(`[${provider.toUpperCase()}] Final content breakdown:`, {
          textContent: fullResponse.length,
          thinkingContent: thinkingContent.length,
          webSearchContent: webSearchContent.length,
          totalChunks: chunkCount
        });
        
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

