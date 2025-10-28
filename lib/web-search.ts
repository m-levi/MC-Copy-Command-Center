/**
 * Web Search Service for Product Information
 * 
 * This service provides product information from brand websites.
 * Uses AI native search capabilities (Claude/OpenAI) for accurate results.
 */

export interface ProductSearchResult {
  productName: string;
  url: string;
  description?: string;
}

/**
 * Product search is now handled by AI models (Claude/OpenAI) with native web search.
 * The AI can search the web directly and find accurate product information.
 * This module now focuses on URL construction and product mention extraction.
 */

/**
 * Alternative: Simple product URL constructor
 * Falls back to constructing URLs based on common patterns when search is unavailable
 */
export function constructProductUrl(
  websiteUrl: string,
  productName: string
): ProductSearchResult {
  // Clean the website URL
  const baseUrl = websiteUrl.replace(/\/$/, '');
  
  // Create a slug from product name
  const slug = productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Try common product URL patterns
  const possibleUrls = [
    `${baseUrl}/products/${slug}`,
    `${baseUrl}/shop/${slug}`,
    `${baseUrl}/product/${slug}`,
  ];

  return {
    productName,
    url: possibleUrls[0], // Use the most common pattern
    description: `Product page for ${productName}`,
  };
}

/**
 * Extracts product mentions from AI response text
 * Looks for product names in quotes, after "shop for", etc.
 */
export function extractProductMentions(text: string): string[] {
  const products: string[] = [];
  
  // Pattern 1: Products in quotes
  const quotedProducts = text.match(/"([^"]+)"/g);
  if (quotedProducts) {
    products.push(...quotedProducts.map(p => p.replace(/"/g, '')));
  }
  
  // Pattern 2: After keywords like "Shop", "Get", "Buy"
  const shopPatterns = [
    /(?:shop|get|buy|grab|snag|explore)\s+(?:our|the|your)?\s*([A-Z][a-zA-Z0-9\s]+?)(?:\s+(?:today|now|here))/gi,
    /(?:check out|discover)\s+(?:our|the)?\s*([A-Z][a-zA-Z0-9\s]+?)(?:\s+(?:collection|line|range))/gi,
  ];
  
  for (const pattern of shopPatterns) {
    const matches = [...text.matchAll(pattern)];
    products.push(...matches.map(m => m[1].trim()));
  }
  
  // Return unique products
  return [...new Set(products)].filter(p => p.length > 3 && p.length < 50);
}

