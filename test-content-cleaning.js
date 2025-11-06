/**
 * Test content cleaning functions
 * This simulates the exact leaked content the user reported
 */

// Simulate the cleaning function
function cleanEmailContentFinal(content) {
  let cleaned = content;
  
  // Approach 1: Extract everything after email_strategy closing tag
  const afterStrategyMatch = cleaned.match(/<\/email_strategy>\s*([\s\S]*)/i);
  if (afterStrategyMatch && afterStrategyMatch[1].trim()) {
    cleaned = afterStrategyMatch[1].trim();
  }
  
  // Approach 2: Remove email_strategy blocks
  cleaned = cleaned.replace(/<email_strategy>[\s\S]*?<\/email_strategy>/gi, '');
  cleaned = cleaned.replace(/<email_strategy>[\s\S]*/gi, '');
  
  // Approach 3: Extract only content starting with email structure markers
  const emailStartMatch = cleaned.match(/(HERO SECTION:|EMAIL SUBJECT LINE:|SUBJECT LINE:)[\s\S]*/i);
  if (emailStartMatch) {
    cleaned = emailStartMatch[0];
  }
  
  // Approach 4: Remove ALL strategy headers
  const allStrategyPatterns = [
    /\*\*Context Analysis:\*\*/gi,
    /\*\*Brief Analysis:\*\*/gi,
    /\*\*Brand Analysis:\*\*/gi,
    /\*\*Audience Psychology:\*\*/gi,
    /\*\*Product Listing:\*\*/gi,
    /\*\*Hero Strategy:\*\*/gi,
    /\*\*Structure Planning:\*\*/gi,
    /\*\*CTA Strategy:\*\*/gi,
    /\*\*Objection Handling:\*\*/gi,
    /\*\*Product Integration:\*\*/gi,
  ];
  
  allStrategyPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Approach 5: Remove bullet lists that describe strategy
  cleaned = cleaned.replace(/^-\s+Section \d+:[^\n]*(?:\([^)]*\))?[^\n]*$/gim, '');
  cleaned = cleaned.replace(/^-\s+Final CTA:[^\n]*$/gim, '');
  cleaned = cleaned.replace(/^-\s+Hero CTA:[^\n]*$/gim, '');
  cleaned = cleaned.replace(/^-\s+Section \d+ CTA:[^\n]*$/gim, '');
  
  // Remove entire paragraphs that list CTAs or sections
  cleaned = cleaned.replace(/^\*\*CTA Strategy:\*\*[\s\S]*?(?=\n\n\*\*|HERO SECTION|$)/gim, '');
  cleaned = cleaned.replace(/^\*\*Structure Planning:\*\*[\s\S]*?(?=\n\n\*\*|HERO SECTION|$)/gim, '');
  
  // Approach 6: Remove numbered strategy lists
  cleaned = cleaned.replace(/^\d+\.\s+\*\*[^:]+:\*\*[\s\S]*?(?=\n\n---|\n\nHERO|$)/gim, '');
  cleaned = cleaned.replace(/^\d+\.\s+[A-Z][^-]*?\s*-\s*addressed[\s\S]*?(?=\n\n|HERO SECTION|$)/gim, '');
  cleaned = cleaned.replace(/^\d+\.\s+[A-Za-z\s]+ concerns[\s\S]*?(?=\n\n|HERO SECTION|$)/gim, '');
  
  // Approach 7: Remove meta-commentary patterns
  const metaPatterns = [
    /^I (need to|will|should|must|can)[\s\S]*?(?=HERO SECTION|EMAIL SUBJECT|SUBJECT LINE)/i,
    /^Let me[\s\S]*?(?=HERO SECTION|EMAIL SUBJECT|SUBJECT LINE)/i,
    /^Based on[\s\S]*?(?=HERO SECTION|EMAIL SUBJECT|SUBJECT LINE)/i,
    /^First[\s\S]*?(?=HERO SECTION|EMAIL SUBJECT|SUBJECT LINE)/i,
    /^Here's[\s\S]*?(?=HERO SECTION|EMAIL SUBJECT|SUBJECT LINE)/i,
    /^Now[\s\S]*?(?=HERO SECTION|EMAIL SUBJECT|SUBJECT LINE)/i,
    /^Since[\s\S]*?(?=HERO SECTION|EMAIL SUBJECT|SUBJECT LINE)/i,
  ];
  
  metaPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Approach 8: Remove [STRATEGY:END] markers
  cleaned = cleaned.replace(/\[STRATEGY:END\]/gi, '');
  cleaned = cleaned.replace(/\[STRATEGY:START\]/gi, '');
  
  // Approach 9: Remove any text before the first email marker
  const finalMarkerMatch = cleaned.match(/(HERO SECTION:|EMAIL SUBJECT LINE:|SUBJECT LINE:)/i);
  if (finalMarkerMatch && finalMarkerMatch.index !== undefined && finalMarkerMatch.index > 0) {
    cleaned = cleaned.substring(finalMarkerMatch.index);
  }
  
  // Approach 10: Filter lines with multiple strategy keywords
  const lines = cleaned.split('\n');
  cleaned = lines.filter(line => {
    const strategyKeywordCount = [
      'CTA Strategy', 'Objection Handling', 'Structure Planning',
      'Product Integration', 'Hero Strategy', 'addressed through'
    ].filter(keyword => line.includes(keyword)).length;
    
    return strategyKeywordCount < 2 || 
           line.match(/^(HERO SECTION|SECTION \d+|CALL-TO-ACTION|Headline:|Accent:|Subhead:|CTA:|Content:|---)/);
  }).join('\n');
  
  // Final cleanup
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+$/gm, '')
    .trim();
  
  return cleaned;
}

// Test with the exact content the user reported
const testContent = `- Section 3: Service benefits (warranty, delivery, expert support)

- Final CTA: Bringing together trust, quality, and immediate action



**CTA Strategy**: 

- Hero CTA: "View Collection"

- Section 2 CTA: "Speak with Expert"

- Final CTA: "Schedule Consultation"



**Objection Handling**: 

1. Authenticity concerns - addressed through authentication promise in Section 2

2. Service quality doubts - addressed through Really Good Promise elements in Section 3

3. Decision paralysis - addressed through expert consultation offer



**Product Integration**: Since no specific products were identified, I'll focus on the brand promise and service quality rather than individual pieces, maintaining the premium positioning while creating promotional urgency.



[STRATEGY:END]



HERO SECTION:

Accent: Limited Time

Headline: Authenticated Luxury Timepieces Available Now

Subhead: Expert-curated collection with 12-month warranty included

CTA: View Collection



---



SECTION 2: Authentication Promise

Headline: Every Piece Verified by Specialists

Content: Each piece examined and graded by our specialists, with every watch authenticated, warrantied, and delivered with care.

CTA: Speak with Expert



---



SECTION 3: The Really Good Promise

Headline: Premium Service Included Always

Content: Twelve months' mechanical coverage, fully insured overnight delivery, and direct access via WhatsApp or phone.



---



CALL-TO-ACTION SECTION:

Headline: Your Perfect Timepiece Awaits Authentication

Content: Our guarantee of trust, quality, and service from experts who know the market inside out. Don't miss this curated selection.

CTA: Schedule Consultation`;

console.log('=== TESTING CONTENT CLEANING ===\n');
console.log('INPUT LENGTH:', testContent.length);
console.log('\n--- INPUT (first 500 chars) ---');
console.log(testContent.substring(0, 500));

const cleaned = cleanEmailContentFinal(testContent);

console.log('\n\n--- OUTPUT (cleaned) ---');
console.log(cleaned);

console.log('\n\n=== VERIFICATION ===');
console.log('✓ Starts with HERO SECTION?', cleaned.startsWith('HERO SECTION:'));
console.log('✓ No strategy headers?', !cleaned.includes('**CTA Strategy:**'));
console.log('✓ No bullet lists?', !cleaned.match(/^-\s+Section \d+:/m));
console.log('✓ No [STRATEGY:END]?', !cleaned.includes('[STRATEGY:END]'));
console.log('✓ No objection handling?', !cleaned.includes('**Objection Handling:**'));
console.log('✓ No numbered lists?', !cleaned.match(/^\d+\.\s+[A-Za-z]+ concerns/m));

const hasLeaks = 
  cleaned.includes('**CTA Strategy:**') ||
  cleaned.includes('**Objection Handling:**') ||
  cleaned.includes('[STRATEGY:END]') ||
  cleaned.match(/^-\s+Section \d+:/m) ||
  cleaned.match(/^\d+\.\s+[A-Za-z]+ concerns/m);

console.log('\n🎯 RESULT:', hasLeaks ? '❌ FAILED - Strategy leaked' : '✅ PASSED - Clean email only');
console.log('\nCleaned length:', cleaned.length);
console.log('Original length:', testContent.length);
console.log('Removed:', testContent.length - cleaned.length, 'characters');


