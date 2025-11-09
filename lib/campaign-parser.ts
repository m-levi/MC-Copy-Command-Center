/**
 * Campaign Parser
 * 
 * Utilities for detecting and parsing campaign ideas from AI responses in Planning mode
 */

export interface CampaignIdea {
  title: string;
  brief: string;
  fullText: string; // The complete campaign text including tags
}

/**
 * Detects if a message contains campaign idea XML tags
 */
export function hasCampaignIdea(content: string): boolean {
  return /<campaign_idea>/i.test(content);
}

/**
 * Extracts campaign idea from XML tags in message content
 */
export function extractCampaignIdea(content: string): CampaignIdea | null {
  const campaignMatch = content.match(/<campaign_idea>([\s\S]*?)<\/campaign_idea>/i);
  
  if (!campaignMatch) {
    return null;
  }

  const campaignContent = campaignMatch[1];
  
  // Extract title
  const titleMatch = campaignContent.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled Campaign';
  
  // Extract brief
  const briefMatch = campaignContent.match(/<brief>([\s\S]*?)<\/brief>/i);
  const brief = briefMatch ? briefMatch[1].trim() : '';
  
  if (!brief) {
    return null; // Brief is required
  }

  return {
    title,
    brief,
    fullText: campaignMatch[0]
  };
}

/**
 * Removes campaign idea tags from content for clean display
 */
export function stripCampaignTags(content: string): string {
  // Replace campaign_idea tags but keep the content inside (except title/brief tags)
  return content.replace(/<campaign_idea>([\s\S]*?)<\/campaign_idea>/gi, (match, innerContent) => {
    // Remove title and brief tags but keep other content
    let cleaned = innerContent
      .replace(/<title>.*?<\/title>/gi, '')
      .replace(/<brief>[\s\S]*?<\/brief>/gi, '')
      .trim();
    
    // If there's remaining content, return it; otherwise return empty string
    return cleaned || '';
  }).trim();
}

