#!/usr/bin/env node

/**
 * Test script to verify content separation between thinking and email copy
 * Tests the API endpoint directly to see markers and content flow
 */

const TEST_BRAND_ID = '3da5110b-39a9-46de-9b16-3d7c41740b29'; // Melissa Lovys
const API_URL = 'http://localhost:3000/api/chat';

// Simple test request
const testRequest = {
  messages: [
    {
      role: 'user',
      content: 'Create a promotional email about our best-selling jewelry pieces'
    }
  ],
  modelId: 'claude-4.5-sonnet',
  conversationMode: 'email_copy',
  emailType: 'standard',
  brandContext: {
    id: TEST_BRAND_ID,
    name: 'Melissa Lovys',
    brand_details: 'Costume jewelry brand',
    brand_guidelines: 'Elegant, feminine, sophisticated',
    copywriting_style_guide: 'Conversational yet elegant',
    website_url: 'https://melissalovys.com'
  }
};

async function testContentSeparation() {
  console.log('🧪 Testing Content Separation via API\n');
  console.log('📤 Sending request to:', API_URL);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let thinkingContent = '';
    let emailContent = '';
    let rawStream = '';
    let isInThinkingBlock = false;
    let statusUpdates = [];
    let toolUsage = [];

    console.log('📥 Reading stream...\n');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      rawStream += chunk;

      // Parse markers
      if (chunk.includes('[THINKING:START]')) {
        isInThinkingBlock = true;
        console.log('🧠 [MARKER] Thinking block started');
        continue;
      }

      if (chunk.includes('[THINKING:END]')) {
        isInThinkingBlock = false;
        console.log('🧠 [MARKER] Thinking block ended');
        continue;
      }

      // Capture thinking chunks
      const thinkingMatch = chunk.match(/\[THINKING:CHUNK\]([\s\S]*?)(?=\[|$)/);
      if (thinkingMatch) {
        thinkingContent += thinkingMatch[1];
        console.log('🧠 [THINKING] Captured chunk:', thinkingMatch[1].substring(0, 50) + '...');
        continue;
      }

      // Capture status updates
      const statusMatch = chunk.match(/\[STATUS:(\w+)\]/);
      if (statusMatch) {
        statusUpdates.push(statusMatch[1]);
        console.log('📊 [STATUS]', statusMatch[1]);
        continue;
      }

      // Capture tool usage
      const toolMatch = chunk.match(/\[TOOL:(\w+):(\w+)\]/);
      if (toolMatch) {
        toolUsage.push({ tool: toolMatch[1], action: toolMatch[2] });
        console.log(`🔧 [TOOL] ${toolMatch[1]} - ${toolMatch[2]}`);
        continue;
      }

      // Everything else is email content (unless we're in thinking block)
      if (!isInThinkingBlock && !chunk.includes('[') && chunk.trim()) {
        emailContent += chunk;
      }
    }

    // Analysis
    console.log('\n' + '='.repeat(80));
    console.log('📊 CONTENT SEPARATION ANALYSIS');
    console.log('='.repeat(80) + '\n');

    console.log('🧠 THINKING CONTENT:');
    console.log(`   Length: ${thinkingContent.length} characters`);
    console.log(`   Preview: ${thinkingContent.substring(0, 200)}...\n`);

    console.log('✉️  EMAIL CONTENT:');
    console.log(`   Length: ${emailContent.length} characters`);
    console.log(`   Preview: ${emailContent.substring(0, 200)}...\n`);

    console.log('📊 STATUS UPDATES:', statusUpdates.join(' → '));
    console.log('🔧 TOOL USAGE:', toolUsage.map(t => `${t.tool}:${t.action}`).join(', '));

    // Verify separation
    console.log('\n' + '='.repeat(80));
    console.log('✅ VERIFICATION');
    console.log('='.repeat(80) + '\n');

    const hasThinking = thinkingContent.length > 0;
    const hasEmail = emailContent.length > 0;
    const emailStartsCorrectly = emailContent.trim().startsWith('HERO SECTION:') || 
                                  emailContent.trim().startsWith('SUBJECT LINE:');

    console.log(`✓ Thinking captured: ${hasThinking ? '✅ YES' : '❌ NO'} (${thinkingContent.length} chars)`);
    console.log(`✓ Email captured: ${hasEmail ? '✅ YES' : '❌ NO'} (${emailContent.length} chars)`);
    console.log(`✓ Email starts correctly: ${emailStartsCorrectly ? '✅ YES' : '❌ NO'}`);
    console.log(`✓ Strategy in thinking: ${thinkingContent.includes('Strategy') || thinkingContent.includes('Analysis') ? '✅ YES' : '❌ NO'}`);
    console.log(`✓ No strategy in email: ${!emailContent.includes('**Context Analysis:**') && !emailContent.includes('**Strategy:**') ? '✅ YES' : '❌ NO'}`);

    // Check for leakage
    console.log('\n🔍 LEAKAGE CHECK:');
    const strategyHeaders = [
      'Context Analysis:', 'Brief Analysis:', 'Brand Analysis:',
      'Audience Psychology:', 'Product Listing:', 'Hero Strategy:',
      'Structure Planning:', 'CTA Strategy:', 'Objection Handling:'
    ];

    let foundLeaks = [];
    for (const header of strategyHeaders) {
      if (emailContent.includes(header)) {
        foundLeaks.push(header);
      }
    }

    if (foundLeaks.length > 0) {
      console.log(`❌ LEAK DETECTED: ${foundLeaks.join(', ')}`);
    } else {
      console.log('✅ NO LEAKAGE - All strategy content properly in thinking toggle');
    }

    // Final score
    console.log('\n' + '='.repeat(80));
    const allChecks = hasThinking && hasEmail && emailStartsCorrectly && foundLeaks.length === 0;
    console.log(allChecks ? '✅ PERFECT SEPARATION!' : '⚠️  ISSUES DETECTED');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testContentSeparation().then(() => {
  console.log('✅ Test completed');
  process.exit(0);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

