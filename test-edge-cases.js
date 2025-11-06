/**
 * Test edge cases for content cleaning
 */

function cleanEmailContentFinal(content) {
  let cleaned = content;
  
  const afterStrategyMatch = cleaned.match(/<\/email_strategy>\s*([\s\S]*)/i);
  if (afterStrategyMatch && afterStrategyMatch[1].trim()) {
    cleaned = afterStrategyMatch[1].trim();
  }
  
  cleaned = cleaned.replace(/<email_strategy>[\s\S]*?<\/email_strategy>/gi, '');
  cleaned = cleaned.replace(/<email_strategy>[\s\S]*/gi, '');
  
  const emailStartMatch = cleaned.match(/(HERO SECTION:|EMAIL SUBJECT LINE:|SUBJECT LINE:)[\s\S]*/i);
  if (emailStartMatch) {
    cleaned = emailStartMatch[0];
  }
  
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
  
  cleaned = cleaned.replace(/^-\s+Section \d+:[^\n]*(?:\([^)]*\))?[^\n]*$/gim, '');
  cleaned = cleaned.replace(/^-\s+Final CTA:[^\n]*$/gim, '');
  cleaned = cleaned.replace(/^-\s+Hero CTA:[^\n]*$/gim, '');
  cleaned = cleaned.replace(/^-\s+Section \d+ CTA:[^\n]*$/gim, '');
  
  cleaned = cleaned.replace(/^\*\*CTA Strategy:\*\*[\s\S]*?(?=\n\n\*\*|HERO SECTION|$)/gim, '');
  cleaned = cleaned.replace(/^\*\*Structure Planning:\*\*[\s\S]*?(?=\n\n\*\*|HERO SECTION|$)/gim, '');
  
  cleaned = cleaned.replace(/^\d+\.\s+\*\*[^:]+:\*\*[\s\S]*?(?=\n\n---|\n\nHERO|$)/gim, '');
  cleaned = cleaned.replace(/^\d+\.\s+[A-Z][^-]*?\s*-\s*addressed[\s\S]*?(?=\n\n|HERO SECTION|$)/gim, '');
  cleaned = cleaned.replace(/^\d+\.\s+[A-Za-z\s]+ concerns[\s\S]*?(?=\n\n|HERO SECTION|$)/gim, '');
  
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
  
  cleaned = cleaned.replace(/\[STRATEGY:END\]/gi, '');
  cleaned = cleaned.replace(/\[STRATEGY:START\]/gi, '');
  
  const finalMarkerMatch = cleaned.match(/(HERO SECTION:|EMAIL SUBJECT LINE:|SUBJECT LINE:)/i);
  if (finalMarkerMatch && finalMarkerMatch.index !== undefined && finalMarkerMatch.index > 0) {
    cleaned = cleaned.substring(finalMarkerMatch.index);
  }
  
  const lines = cleaned.split('\n');
  cleaned = lines.filter(line => {
    const strategyKeywordCount = [
      'CTA Strategy', 'Objection Handling', 'Structure Planning',
      'Product Integration', 'Hero Strategy', 'addressed through'
    ].filter(keyword => line.includes(keyword)).length;
    
    return strategyKeywordCount < 2 || 
           line.match(/^(HERO SECTION|SECTION \d+|CALL-TO-ACTION|Headline:|Accent:|Subhead:|CTA:|Content:|---)/);
  }).join('\n');
  
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+$/gm, '')
    .trim();
  
  return cleaned;
}

// Test Case 1: XML tags with content
const test1 = `<email_strategy>
**Context Analysis**: This is strategy
**Brand Analysis**: More strategy
</email_strategy>

HERO SECTION:
Headline: Test Email
CTA: Click Here`;

console.log('TEST 1: XML Strategy Tags');
const result1 = cleanEmailContentFinal(test1);
console.log('✓ Removed XML tags?', !result1.includes('<email_strategy>'));
console.log('✓ Starts with HERO?', result1.startsWith('HERO SECTION:'));
console.log('');

// Test Case 2: Meta-commentary before email
const test2 = `Let me create an email for you based on the requirements.

HERO SECTION:
Headline: Amazing Product
CTA: Get Started`;

console.log('TEST 2: Meta-commentary');
const result2 = cleanEmailContentFinal(test2);
console.log('✓ Removed "Let me"?', !result2.includes('Let me'));
console.log('✓ Starts with HERO?', result2.startsWith('HERO SECTION:'));
console.log('');

// Test Case 3: Unclosed XML tags
const test3 = `<email_strategy>
Strategy content that never closes

HERO SECTION:
Headline: Test
CTA: Action`;

console.log('TEST 3: Unclosed XML tags');
const result3 = cleanEmailContentFinal(test3);
console.log('✓ Removed unclosed tags?', !result3.includes('<email_strategy>'));
console.log('✓ Starts with HERO?', result3.startsWith('HERO SECTION:'));
console.log('');

// Test Case 4: Mixed strategy patterns (the user's exact case)
const test4 = `**CTA Strategy**: 
- Hero CTA: "View Collection"

**Objection Handling**: 
1. Authenticity concerns - addressed through Section 2

[STRATEGY:END]

HERO SECTION:
Headline: Clean Email
CTA: Take Action`;

console.log('TEST 4: Mixed Patterns (User Case)');
const result4 = cleanEmailContentFinal(test4);
console.log('✓ No CTA Strategy?', !result4.includes('**CTA Strategy:**'));
console.log('✓ No bullet lists?', !result4.includes('- Hero CTA:'));
console.log('✓ No numbered lists?', !result4.includes('1. Authenticity'));
console.log('✓ No [STRATEGY:END]?', !result4.includes('[STRATEGY:END]'));
console.log('✓ Starts with HERO?', result4.startsWith('HERO SECTION:'));
console.log('');

// Test Case 5: No preamble (clean input)
const test5 = `HERO SECTION:
Headline: Perfect Email
CTA: Click Now`;

console.log('TEST 5: Already Clean');
const result5 = cleanEmailContentFinal(test5);
console.log('✓ Unchanged?', result5 === test5.trim());
console.log('');

console.log('=== ALL TESTS COMPLETE ===');
const allPassed = 
  result1.startsWith('HERO SECTION:') &&
  result2.startsWith('HERO SECTION:') &&
  result3.startsWith('HERO SECTION:') &&
  result4.startsWith('HERO SECTION:') &&
  !result4.includes('**CTA Strategy:**') &&
  !result4.includes('[STRATEGY:END]');

console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');


