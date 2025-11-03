/**
 * URL Extractor Service
 * Extracts and validates URLs from various sources (messages, web search, AI responses)
 */

import { ProductLink } from '@/types';

export interface ExtractedURL {
  url: string;
  title?: string;
  description?: string;
  source: 'user_message' | 'ai_response' | 'web_search';
}

/**
 * Extract all URLs from text content
 */
export function extractURLsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const matches = text.match(urlRegex) || [];
  
  // Clean and validate URLs
  return matches
    .map(url => {
      // Remove trailing punctuation
      return url.replace(/[.,;:!?)\]]+$/, '');
    })
    .filter(url => {
      try {
        const parsed = new URL(url);
        // Only keep http/https URLs
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    })
    .filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates
}

/**
 * Extract product-like URLs from text
 * These are URLs that likely point to products, articles, or relevant content
 */
export function extractProductURLs(text: string, websiteUrl?: string): ExtractedURL[] {
  const urls = extractURLsFromText(text);
  const websiteDomain = websiteUrl ? new URL(websiteUrl).hostname.replace('www.', '') : null;
  
  return urls
    .filter(url => {
      try {
        const parsed = new URL(url);
        const path = parsed.pathname.toLowerCase();
        
        // If we have a website URL, prioritize links from that domain
        if (websiteDomain && parsed.hostname.replace('www.', '').includes(websiteDomain)) {
          return true;
        }
        
        // Look for product-like paths
        const productPatterns = [
          '/product', '/products', '/item', '/items',
          '/shop', '/store', '/buy',
          '/collection', '/collections',
          '/p/', // Short product URLs
          '/article', '/articles', '/blog',
          '/page', '/pages'
        ];
        
        return productPatterns.some(pattern => path.includes(pattern));
      } catch {
        return false;
      }
    })
    .map(url => ({
      url,
      source: 'ai_response' as const,
    }));
}

/**
 * Extract product links with context from markdown-style links
 * Format: [Product Name](url) or [title](url "description")
 */
export function extractMarkdownLinks(text: string): ExtractedURL[] {
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)"]+)(?:\s+"([^"]+)")?\)/g;
  const links: ExtractedURL[] = [];
  
  let match;
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    const [, title, url, description] = match;
    
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        links.push({
          url: url.trim(),
          title: title.trim(),
          description: description?.trim(),
          source: 'ai_response',
        });
      }
    } catch {
      // Invalid URL, skip
    }
  }
  
  return links;
}

/**
 * Extract product name and URL pairs from common patterns in AI responses
 * Examples:
 * - "Check out our Premium Coffee at https://..."
 * - "Shop the Winter Collection: https://..."
 */
export function extractProductMentionsWithURLs(text: string): ProductLink[] {
  const products: ProductLink[] = [];
  
  // Pattern: Product name followed by URL
  // Matches: "Product Name at/on https://..." or "Product Name: https://..."
  const productUrlPattern = /["']([^"']+)["']\s*(?:at|on|:|–|-|—)\s*(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
  
  let match;
  while ((match = productUrlPattern.exec(text)) !== null) {
    const [, name, url] = match;
    products.push({
      name: name.trim(),
      url: url.replace(/[.,;:!?)\]]+$/, ''), // Remove trailing punctuation
      description: `Product page for ${name.trim()}`,
    });
  }
  
  return products;
}

/**
 * Parse web search results from Anthropic/OpenAI
 * The AI models return search results in their response, we need to capture those
 */
export function extractURLsFromSearchContext(searchContent: string, websiteUrl?: string): ExtractedURL[] {
  // Extract all URLs from the search context
  const urls = extractProductURLs(searchContent, websiteUrl);
  
  // Mark these as coming from web search
  return urls.map(item => ({
    ...item,
    source: 'web_search' as const,
  }));
}

/**
 * Convert extracted URLs to ProductLink format
 */
export function convertToProductLinks(
  extractedUrls: ExtractedURL[],
  websiteUrl?: string
): ProductLink[] {
  const websiteDomain = websiteUrl ? new URL(websiteUrl).hostname.replace('www.', '') : null;
  
  return extractedUrls.map(item => {
    try {
      const parsed = new URL(item.url);
      
      // Try to extract a nice title from the URL if not provided
      let name = item.title;
      if (!name) {
        // Get the last meaningful path segment
        const pathParts = parsed.pathname.split('/').filter(p => p.length > 0);
        const lastPart = pathParts[pathParts.length - 1] || '';
        
        // Convert slug to title (e.g., "winter-collection" -> "Winter Collection")
        name = lastPart
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .trim();
        
        // Fallback to domain if no good path
        if (!name || name.length < 3) {
          name = parsed.hostname.replace('www.', '');
        }
      }
      
      return {
        name,
        url: item.url,
        description: item.description || `View ${name}`,
      };
    } catch {
      return {
        name: item.title || 'Link',
        url: item.url,
        description: item.description,
      };
    }
  });
}

/**
 * Smart product link extraction - combines multiple strategies
 * ONLY returns real URLs found in content - no fake URL construction
 */
export function smartExtractProductLinks(
  aiResponse: string,
  userMessages: string[],
  websiteUrl?: string
): ProductLink[] {
  const allLinks: ProductLink[] = [];
  
  console.log('[SmartExtract] Starting extraction...');
  console.log('[SmartExtract] AI response length:', aiResponse.length);
  console.log('[SmartExtract] User messages:', userMessages.length);
  
  // Strategy 1: Extract markdown-style links from AI response
  const markdownLinks = extractMarkdownLinks(aiResponse);
  console.log('[SmartExtract] Markdown links:', markdownLinks.length);
  allLinks.push(...convertToProductLinks(markdownLinks, websiteUrl));
  
  // Strategy 2: Extract product name + URL pairs
  const namedProducts = extractProductMentionsWithURLs(aiResponse);
  console.log('[SmartExtract] Named products with URLs:', namedProducts.length);
  allLinks.push(...namedProducts);
  
  // Strategy 3: Extract product URLs from AI response
  const aiUrls = extractProductURLs(aiResponse, websiteUrl);
  console.log('[SmartExtract] AI response URLs:', aiUrls.length);
  allLinks.push(...convertToProductLinks(aiUrls, websiteUrl));
  
  // Strategy 4: Extract URLs from user messages (they might have pasted product links)
  const userText = userMessages.join(' ');
  const userUrls = extractProductURLs(userText, websiteUrl);
  console.log('[SmartExtract] User message URLs:', userUrls.length);
  allLinks.push(...convertToProductLinks(
    userUrls.map(u => ({ ...u, source: 'user_message' as const })),
    websiteUrl
  ));
  
  // Remove duplicates based on URL
  const uniqueLinks = allLinks.filter((link, index, self) => 
    index === self.findIndex(l => l.url === link.url)
  );
  
  console.log('[SmartExtract] Final count:', uniqueLinks.length, 'unique product links');
  
  // IMPORTANT: Only return links if we actually found real URLs
  // If no URLs found, return empty array (box will be hidden in UI)
  if (uniqueLinks.length === 0) {
    console.log('[SmartExtract] No real URLs found - Products Mentioned will be hidden');
  }
  
  return uniqueLinks;
}

