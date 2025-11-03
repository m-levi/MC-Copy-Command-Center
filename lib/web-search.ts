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
 * Looks for product names in quotes, after "shop for", capitalized terms, etc.
 */
export function extractProductMentions(text: string): string[] {
  const products: string[] = [];
  
  // Pattern 1: Products in quotes (primary method)
  const quotedProducts = text.match(/"([^"]+)"/g);
  if (quotedProducts) {
    products.push(...quotedProducts.map(p => p.replace(/"/g, '').trim()));
  }
  
  // Pattern 2: Products in single quotes
  const singleQuotedProducts = text.match(/'([^']+)'/g);
  if (singleQuotedProducts) {
    products.push(...singleQuotedProducts.map(p => p.replace(/'/g, '').trim()));
  }
  
  // Pattern 3: After action keywords like "Shop", "Get", "Buy", "Try"
  const actionPatterns = [
    /(?:shop|get|buy|grab|snag|explore|try|discover)\s+(?:our|the|your)?\s*([A-Z][a-zA-Z0-9\s&-]+?)(?:\s+(?:today|now|here|collection|line|range)|\.|,|!)/gi,
    /(?:check out|introducing|featuring)\s+(?:our|the)?\s*([A-Z][a-zA-Z0-9\s&-]+?)(?:\s+(?:collection|line|range)|\.|,|!)/gi,
  ];
  
  for (const pattern of actionPatterns) {
    const matches = [...text.matchAll(pattern)];
    products.push(...matches.map(m => m[1].trim()));
  }
  
  // Pattern 4: Products after "our" or "the" (capitalized)
  const ourProducts = text.match(/(?:our|the)\s+([A-Z][a-zA-Z0-9\s&-]+?)(?:\s+(?:product|line|collection|series|blend|roast|coffee|tea))/gi);
  if (ourProducts) {
    products.push(...ourProducts.map(p => p.replace(/^(?:our|the)\s+/i, '').trim()));
  }
  
  console.log('[ProductExtraction] Raw products found:', products);
  
  // Return unique products, filter out common false positives
  const filtered = [...new Set(products)]
    .map(p => p.trim())
    .filter(p => {
      // Length check
      if (p.length < 3 || p.length > 60) return false;
      
      // Filter out common false positives
      const lowerP = p.toLowerCase();
      const falsePositives = [
        'email', 'subject', 'click', 'shop', 'buy', 'get', 'today', 'now',
        'collection', 'line', 'range', 'products', 'items', 'website',
        'customers', 'order', 'cart', 'checkout', 'free shipping'
      ];
      if (falsePositives.includes(lowerP)) return false;
      
      // Must contain at least one letter
      if (!/[a-zA-Z]/.test(p)) return false;
      
      return true;
    });
  
  console.log('[ProductExtraction] Filtered products:', filtered);
  return filtered;
}

