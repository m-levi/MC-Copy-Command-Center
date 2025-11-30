import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { gateway, MODELS } from '@/lib/ai-providers';

export const runtime = 'edge';

interface ExtractedBrandInfo {
  name: string;
  brand_details: string;
  brand_guidelines: string;
  copywriting_style_guide: string;
  website_url?: string;
}

// Helper function to scrape website content
async function scrapeWebsite(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandExtractor/1.0)',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Basic HTML text extraction (removing scripts, styles, etc.)
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Limit to first 8000 characters to avoid token limits
    return textContent.substring(0, 8000);
  } catch (error) {
    console.error('Error scraping website:', error);
    throw new Error('Failed to fetch website content. Please check the URL and try again.');
  }
}

// Helper function to extract text from uploaded files
function extractTextFromFile(file: { name: string; content: string; type: string }): string {
  // For now, we'll handle plain text and assume base64 encoded content
  try {
    // If it's already text, return it
    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      return file.content;
    }
    
    // For other types, we'll decode from base64 if needed
    try {
      const decoded = atob(file.content);
      return decoded;
    } catch {
      return file.content;
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return '';
  }
}

// AI prompt for extracting brand information
const EXTRACTION_SYSTEM_PROMPT = `You are a brand strategist expert who analyzes websites, documents, and other materials to extract comprehensive brand information.

Your task is to analyze the provided content and extract:

1. **Brand Name**: The official name of the brand/company
2. **Brand Details**: A comprehensive 2-3 paragraph description including:
   - What the brand does/sells
   - Target audience and market positioning
   - Unique value propositions
   - Mission and vision
   - Key products or services
   - Brand personality and culture

3. **Brand Guidelines**: Voice, tone, and personality guidelines including:
   - Brand voice characteristics (e.g., professional, friendly, authoritative)
   - Tone preferences (e.g., warm, direct, playful)
   - Core values and principles
   - Things to emphasize
   - Things to avoid
   - Personality traits

4. **Copywriting Style Guide**: Specific writing guidelines including:
   - Writing style preferences (e.g., concise, detailed, storytelling)
   - Language patterns and vocabulary
   - Formatting preferences
   - Example phrases or expressions commonly used
   - Do's and don'ts for copywriting
   - Any specific industry terminology or jargon to use/avoid

If the content doesn't explicitly provide all this information, make intelligent inferences based on:
- How the brand presents itself
- The language and tone used
- The target audience implied
- The industry and competitive context

Respond ONLY with a valid JSON object in this exact format:
{
  "name": "Brand Name Here",
  "brand_details": "Detailed 2-3 paragraph brand description...",
  "brand_guidelines": "Voice, tone, and personality guidelines...",
  "copywriting_style_guide": "Specific writing and style guidelines...",
  "website_url": "URL if provided in the content"
}

Be thorough and specific. This information will be used to generate brand-aligned marketing copy.`;

async function extractBrandInfoWithAI(
  content: string,
  websiteUrl?: string
): Promise<ExtractedBrandInfo> {
  const userPrompt = `
${websiteUrl ? `Website URL: ${websiteUrl}\n\n` : ''}
Content to analyze:

${content}

Extract comprehensive brand information from this content and return it in the specified JSON format.`;

  // Use Vercel AI SDK via AI Gateway
  const { text } = await generateText({
    model: gateway.languageModel(MODELS.CLAUDE_SONNET),
    system: EXTRACTION_SYSTEM_PROMPT,
    prompt: userPrompt,
    maxRetries: 2,
  });

  if (!text) {
    throw new Error('No response from AI');
  }

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```\n?/g, '');
  }

  const extracted: ExtractedBrandInfo = JSON.parse(jsonStr);
  
  // If website_url was provided but not in response, add it
  if (websiteUrl && !extracted.website_url) {
    extracted.website_url = websiteUrl;
  }

  return extracted;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, files } = body;

    if (!url && (!files || files.length === 0)) {
      return NextResponse.json(
        { error: 'Please provide either a URL or upload files' },
        { status: 400 }
      );
    }

    let combinedContent = '';

    // Scrape URL if provided
    if (url) {
      try {
        const websiteContent = await scrapeWebsite(url);
        combinedContent += `\n\n=== WEBSITE CONTENT ===\n${websiteContent}\n`;
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to fetch URL' },
          { status: 400 }
        );
      }
    }

    // Extract text from uploaded files
    if (files && files.length > 0) {
      for (const file of files) {
        const fileContent = extractTextFromFile(file);
        if (fileContent) {
          combinedContent += `\n\n=== FILE: ${file.name} ===\n${fileContent}\n`;
        }
      }
    }

    if (!combinedContent.trim()) {
      return NextResponse.json(
        { error: 'No content could be extracted from the provided sources' },
        { status: 400 }
      );
    }

    // Use AI to extract structured brand information
    const extractedInfo = await extractBrandInfoWithAI(combinedContent, url);

    return NextResponse.json({
      success: true,
      brandInfo: extractedInfo,
    });
  } catch (error) {
    console.error('Brand extraction error:', error);
    return NextResponse.json(
      {
        error: 'Failed to extract brand information',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
