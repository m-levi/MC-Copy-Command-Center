#!/usr/bin/env node

/**
 * Comprehensive test of content separation
 * Tests API response AND frontend cleaning logic
 */

const TEST_BRAND_ID = '3da5110b-39a9-46de-9b16-3d7c41740b29';
const API_URL = 'http://localhost:3000/api/chat';

const testRequest = {
  messages: [
    {
      role: 'user',
      content: 'Write a promotional email about our jewelry collection'
    }
  ],
  modelId: 'claude-4.5-sonnet',
  conversationMode: 'email_copy',
  emailType: 'standard',
  brandContext: {
    id: TEST_BRAND_ID,
    name: 'Melissa Lovys',
    brand_details: 'Costume jewelry brand',
    website_url: 'https://melissalovys.com'
  }
};

// Frontend cleaning logic (from content-cleaner.ts)
function cleanEmailContent(content) {
  // Strategy 1: Remove email_strategy XML tags
  let cleaned = content.replace(/<email_strategy>[\s\S]*?<\/email_strategy>/gi, '');
  
  // Strategy 2: Remove strategy headers at start
  const strategyHeaders = [
    'Context Analysis:', 'Brief Analysis:', 'Brand Analysis:', 
    'Audience Psychology:', 'Product Listing:', 'Hero Strategy:',
    'Structure Planning:', 'CTA Strategy:', 'Objection Handling:'
  ];
  
  strategyHeaders.forEach(header => {
    const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(`^[\\s\\S]*?\\*\\*${escapedHeader}\\*\\*[^\\n]*\\n`, 'i'), '');
  });
  
  // Strategy 3: Cut everything before first email marker (THE KEY SAFETY)
  const emailMarkers = ['HERO SECTION:', 'EMAIL SUBJECT LINE:', 'SUBJECT LINE:', 'SUBJECT:'];
  let firstMarkerIndex = -1;
  
  for (const marker of emailMarkers) {
    const markerIndex = cleaned.indexOf(marker);
    if (markerIndex >= 0 && (firstMarkerIndex === -1 || markerIndex < firstMarkerIndex)) {
      firstMarkerIndex = markerIndex;
    }
  }
  
  if (firstMarkerIndex > 0) {
    console.log(`🔪 [CLEANING] Cutting ${firstMarkerIndex} characters before first email marker`);
    cleaned = cleaned.substring(firstMarkerIndex);
  }
  
  return cleaned.trim();
}

async function testFullSeparation() {
  console.log('🧪 COMPREHENSIVE CONTENT SEPARATION TEST\n');
  console.log('=' .repeat(80));
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testRequest),
    });

    if (!response.ok) {
      throw new Error(`API failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let thinkingContent = '';
    let rawContent = '';
    let isInThinkingBlock = false;
    let hasToolUsage = false;

    console.log('📥 Processing stream...\n');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // Track thinking blocks
      if (chunk.includes('[THINKING:START]')) {
        isInThinkingBlock = true;
        console.log('🧠 Thinking block STARTED');
      }
      
      if (chunk.includes('[THINKING:END]')) {
        isInThinkingBlock = false;
        console.log('🧠 Thinking block ENDED');
      }

      // Capture thinking chunks
      const thinkingMatch = chunk.match(/\[THINKING:CHUNK\]([\s\S]*?)(?=\[|$)/);
      if (thinkingMatch) {
        thinkingContent += thinkingMatch[1];
      }

      // Track tool usage
      if (chunk.includes('[TOOL:')) {
        hasToolUsage = true;
      }

      // Capture raw content (non-thinking, non-marker)
      if (!isInThinkingBlock && !chunk.includes('[THINKING') && !chunk.includes('[STATUS') && !chunk.includes('[TOOL') && !chunk.includes('[PRODUCTS')) {
        rawContent += chunk;
      }
    }

    // Apply frontend cleaning
    const cleanedContent = cleanEmailContent(rawContent);

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTS');
    console.log('='.repeat(80) + '\n');

    console.log('1️⃣  RAW CONTENT (before cleaning):');
    console.log(`   Length: ${rawContent.length} chars`);
    console.log(`   First 300 chars:\n   ${rawContent.substring(0, 300).replace(/\n/g, '\n   ')}\n`);

    console.log('2️⃣  CLEANED EMAIL CONTENT (after cleaning):');
    console.log(`   Length: ${cleanedContent.length} chars`);
    console.log(`   First 300 chars:\n   ${cleanedContent.substring(0, 300).replace(/\n/g, '\n   ')}\n`);

    console.log('3️⃣  THINKING CONTENT:');
    console.log(`   Length: ${thinkingContent.length} chars`);
    console.log(`   First 300 chars:\n   ${thinkingContent.substring(0, 300).replace(/\n/g, '\n   ')}\n`);

    // Verification
    console.log('=' .repeat(80));
    console.log('✅ VERIFICATION RESULTS');
    console.log('=' .repeat(80) + '\n');

    const checks = {
      'Thinking captured': thinkingContent.length > 0,
      'Email content captured': cleanedContent.length > 0,
      'Email starts with marker': cleanedContent.startsWith('HERO SECTION:') || cleanedContent.startsWith('SUBJECT'),
      'Tool usage detected': hasToolUsage,
      'Content was cleaned': rawContent.length !== cleanedContent.length
    };

    for (const [check, passed] of Object.entries(checks)) {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
    }

    // Check for strategy headers in cleaned email
    const strategyHeaders = ['Context Analysis:', 'Brief Analysis:', 'Brand Analysis:', 'Strategy:', 'Planning:'];
    const foundInEmail = strategyHeaders.filter(h => cleanedContent.includes(h));
    const foundInThinking = strategyHeaders.filter(h => thinkingContent.includes(h));

    console.log('\n📋 STRATEGY CONTENT LOCATION:');
    console.log(`   In Email: ${foundInEmail.length > 0 ? '❌ ' + foundInEmail.join(', ') : '✅ NONE'}`);
    console.log(`   In Thinking: ${foundInThinking.length > 0 ? '✅ ' + foundInThinking.join(', ') : '❌ NONE'}`);

    const perfect = Object.values(checks).every(v => v) && foundInEmail.length === 0;
    
    console.log('\n' + '=' .repeat(80));
    console.log(perfect ? '🎉 PERFECT SEPARATION!' : '⚠️  NEEDS ATTENTION');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testFullSeparation();

