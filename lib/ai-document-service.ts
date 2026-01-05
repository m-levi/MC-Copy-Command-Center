import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { DocumentCategory } from '@/types';
import { logger } from '@/lib/logger';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface DocumentAnalysis {
  category: DocumentCategory;
  tags: string[];
  summary: string;
  confidence: number;
}

/**
 * Analyzes document content and automatically generates category, tags, and summary
 */
export async function analyzeDocument(
  title: string,
  content: string,
  brandContext?: string
): Promise<DocumentAnalysis> {
  try {
    const prompt = `You are an expert document analyzer. Analyze the following document and provide categorization and metadata.

Document Title: ${title}

Document Content:
${content.substring(0, 5000)} ${content.length > 5000 ? '... (truncated)' : ''}

${brandContext ? `Brand Context: ${brandContext}` : ''}

Based on the document, provide:
1. The most appropriate category from this list:
   - general: General documents and miscellaneous content
   - brand_guidelines: Brand identity, logo guidelines, brand standards
   - style_guide: Writing style, voice, tone guidelines
   - product_info: Product specifications, features, descriptions
   - marketing: Marketing campaigns, strategies, promotional content
   - research: Market research, competitor analysis, industry reports
   - competitor: Competitor information and analysis
   - testimonial: Customer testimonials, reviews, case studies
   - reference: Reference materials, documentation, resources
   - template: Reusable templates and frameworks

2. 3-7 relevant tags (single words or short phrases, lowercase)
3. A concise 1-2 sentence summary
4. Your confidence level (0-1) in this categorization

Respond in this exact JSON format:
{
  "category": "category_name",
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "Brief summary here",
  "confidence": 0.95
}`;

    const { text } = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      prompt,
      temperature: 0.3,
      maxOutputTokens: 500,
    });

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const analysis: DocumentAnalysis = JSON.parse(jsonMatch[0]);

    // Validate and sanitize
    const validCategories: DocumentCategory[] = [
      'general',
      'brand_guidelines',
      'style_guide',
      'product_info',
      'marketing',
      'research',
      'competitor',
      'testimonial',
      'reference',
      'template',
    ];

    if (!validCategories.includes(analysis.category)) {
      analysis.category = 'general';
    }

    // Ensure tags are lowercase and deduplicated
    analysis.tags = [...new Set(analysis.tags.map(tag => tag.toLowerCase()))];

    // Ensure confidence is between 0 and 1
    analysis.confidence = Math.max(0, Math.min(1, analysis.confidence));

    logger.info('Document analyzed successfully', {
      category: analysis.category,
      tags: analysis.tags,
      confidence: analysis.confidence,
    });

    return analysis;
  } catch (error) {
    logger.error('Error analyzing document:', error);
    
    // Return fallback analysis
    return {
      category: 'general',
      tags: ['document'],
      summary: 'Document analysis unavailable',
      confidence: 0,
    };
  }
}

/**
 * Analyzes link content and generates metadata
 */
export async function analyzeLinkContent(
  title: string,
  url: string,
  description?: string,
  brandContext?: string
): Promise<DocumentAnalysis> {
  try {
    const prompt = `You are an expert content analyzer. Analyze the following link/URL and provide categorization.

Title: ${title}
URL: ${url}
${description ? `Description: ${description}` : ''}
${brandContext ? `Brand Context: ${brandContext}` : ''}

Based on the URL and available information, provide:
1. The most appropriate category from this list:
   - general: General links and miscellaneous content
   - brand_guidelines: Brand resources, logo usage, brand portals
   - style_guide: Writing guides, content standards
   - product_info: Product pages, documentation, specs
   - marketing: Marketing resources, campaigns, analytics
   - research: Research articles, reports, data sources
   - competitor: Competitor websites and resources
   - testimonial: Reviews, testimonials, case studies
   - reference: Reference materials, documentation, tools
   - template: Template libraries, design systems

2. 3-7 relevant tags (single words or short phrases, lowercase)
3. A concise 1-2 sentence summary
4. Your confidence level (0-1) in this categorization

Respond in this exact JSON format:
{
  "category": "category_name",
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "Brief summary here",
  "confidence": 0.85
}`;

    const { text } = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      prompt,
      temperature: 0.3,
      maxOutputTokens: 500,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const analysis: DocumentAnalysis = JSON.parse(jsonMatch[0]);

    // Validate
    const validCategories: DocumentCategory[] = [
      'general',
      'brand_guidelines',
      'style_guide',
      'product_info',
      'marketing',
      'research',
      'competitor',
      'testimonial',
      'reference',
      'template',
    ];

    if (!validCategories.includes(analysis.category)) {
      analysis.category = 'general';
    }

    analysis.tags = [...new Set(analysis.tags.map(tag => tag.toLowerCase()))];
    analysis.confidence = Math.max(0, Math.min(1, analysis.confidence));

    logger.info('Link analyzed successfully', {
      url,
      category: analysis.category,
      tags: analysis.tags,
    });

    return analysis;
  } catch (error) {
    logger.error('Error analyzing link:', error);
    
    return {
      category: 'general',
      tags: ['link'],
      summary: 'Link analysis unavailable',
      confidence: 0,
    };
  }
}

/**
 * Suggests tags based on existing document content
 */
export async function suggestTags(
  content: string,
  existingTags: string[] = []
): Promise<string[]> {
  try {
    const prompt = `Based on this document content, suggest 3-5 relevant tags (single words or short phrases, lowercase).

Content:
${content.substring(0, 2000)}

${existingTags.length > 0 ? `Existing tags to consider: ${existingTags.join(', ')}` : ''}

Respond with ONLY a JSON array of tags, like: ["tag1", "tag2", "tag3"]`;

    const { text } = await generateText({
      model: anthropic('claude-3-haiku-20240307'),
      prompt,
      temperature: 0.5,
      maxOutputTokens: 100,
    });

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const tags: string[] = JSON.parse(jsonMatch[0]);
    return [...new Set(tags.map(tag => tag.toLowerCase()))];
  } catch (error) {
    logger.error('Error suggesting tags:', error);
    return [];
  }
}

/**
 * Generates a smart folder criteria based on description
 */
export async function generateSmartFolderCriteria(
  folderName: string,
  description: string
): Promise<{
  keywords: string[];
  categories: DocumentCategory[];
  confidence_threshold: number;
}> {
  try {
    const prompt = `Based on this smart folder description, generate matching criteria:

Folder Name: ${folderName}
Description: ${description}

Generate criteria including:
1. Keywords that documents should contain (3-7 keywords)
2. Relevant categories from: general, brand_guidelines, style_guide, product_info, marketing, research, competitor, testimonial, reference, template
3. A confidence threshold (0-1) for how closely documents must match

Respond in this JSON format:
{
  "keywords": ["keyword1", "keyword2"],
  "categories": ["category1", "category2"],
  "confidence_threshold": 0.7
}`;

    const { text } = await generateText({
      model: anthropic('claude-3-haiku-20240307'),
      prompt,
      temperature: 0.3,
      maxOutputTokens: 300,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const criteria = JSON.parse(jsonMatch[0]);
    
    // Validate categories
    const validCategories: DocumentCategory[] = [
      'general',
      'brand_guidelines',
      'style_guide',
      'product_info',
      'marketing',
      'research',
      'competitor',
      'testimonial',
      'reference',
      'template',
    ];
    
    criteria.categories = criteria.categories.filter((cat: DocumentCategory) =>
      validCategories.includes(cat)
    );

    return criteria;
  } catch (error) {
    logger.error('Error generating smart folder criteria:', error);
    return {
      keywords: [],
      categories: ['general'],
      confidence_threshold: 0.5,
    };
  }
}

















