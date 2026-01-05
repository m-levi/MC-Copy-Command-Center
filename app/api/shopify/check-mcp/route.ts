/**
 * Shopify MCP Connection Check API
 * 
 * Verifies that a Shopify store's MCP endpoint is accessible
 * and returns the connection status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { normalizeShopifyDomain } from '@/lib/tools/shopify-mcp-tool';
import { logger } from '@/lib/logger';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain parameter is required', connected: false },
        { status: 400 }
      );
    }

    // Normalize the domain
    const normalizedDomain = normalizeShopifyDomain(domain);
    if (!normalizedDomain) {
      return NextResponse.json(
        { error: 'Invalid domain format', connected: false },
        { status: 400 }
      );
    }

    // Try to access the MCP endpoint
    const mcpUrl = `https://${normalizedDomain}/api/mcp`;
    
    logger.info('[Shopify MCP Check] Checking:', mcpUrl);

    try {
      // Try GET request to the MCP endpoint
      // A working MCP endpoint should respond with SSE headers or 200
      const response = await fetch(mcpUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      // Check for valid MCP endpoint responses:
      // - 200 OK with SSE content type = working MCP
      // - 405 Method Not Allowed = endpoint exists but needs different method
      // - 401/403 = endpoint exists but needs auth
      // - 404 = endpoint does NOT exist (most common case for standard Shopify stores)
      const contentType = response.headers.get('content-type') || '';
      const isSSE = contentType.includes('text/event-stream');
      const isMCPEndpoint = response.ok && isSSE;
      const endpointExists = response.status !== 404 && response.status < 500;

      logger.info('[Shopify MCP Check] Result:', {
        domain: normalizedDomain,
        status: response.status,
        contentType,
        isSSE,
        isMCPEndpoint,
        endpointExists,
      });

      if (response.status === 404) {
        return NextResponse.json({
          connected: false,
          domain: normalizedDomain,
          endpoint: mcpUrl,
          status: response.status,
          error: 'MCP endpoint not found. Your Shopify store needs an MCP server installed.',
        });
      }

      return NextResponse.json({
        connected: isMCPEndpoint || endpointExists,
        domain: normalizedDomain,
        endpoint: mcpUrl,
        status: response.status,
        isSSE,
        ...(isMCPEndpoint ? {} : { warning: 'Endpoint exists but may not be a valid MCP server' }),
      });
    } catch (fetchError) {
      // Network error or timeout - endpoint not accessible
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      logger.warn('[Shopify MCP Check] Connection failed:', {
        domain: normalizedDomain,
        error: errorMessage,
      });

      return NextResponse.json({
        connected: false,
        domain: normalizedDomain,
        endpoint: mcpUrl,
        error: `MCP endpoint not accessible: ${errorMessage}`,
      });
    }
  } catch (error) {
    logger.error('[Shopify MCP Check] Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', connected: false },
      { status: 500 }
    );
  }
}















