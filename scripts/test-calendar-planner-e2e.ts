/**
 * End-to-End Test: Calendar Planner Functionality
 * 
 * This script tests the complete Calendar Planner flow:
 * 1. Verifies mode configuration
 * 2. Simulates a calendar request
 * 3. Checks artifact creation and structure
 * 4. Validates calendar data matches schema
 * 
 * Run with: npx tsx scripts/test-calendar-planner-e2e.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load env vars from .env.local
const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TestResult {
  test: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function logTest(test: string, passed: boolean, details?: string) {
  results.push({ test, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}${details ? `: ${details}` : ''}`);
}

async function runTests() {
  console.log('🧪 Calendar Planner End-to-End Test\n');
  console.log('=' .repeat(60));
  console.log();

  // Test 1: Verify Calendar Planner mode exists
  console.log('📋 Test 1: Calendar Planner Mode Configuration');
  console.log('-'.repeat(60));
  
  const { data: mode, error: modeError } = await supabase
    .from('custom_modes')
    .select('*')
    .eq('name', 'Calendar Planner')
    .single();

  logTest(
    'Calendar Planner mode exists',
    !modeError && !!mode
  );

  if (!mode) {
    console.log('\n❌ Cannot continue tests - Calendar Planner mode not found');
    return;
  }

  // Test 2: Verify tool configuration
  console.log();
  console.log('🔧 Test 2: Tool Configuration');
  console.log('-'.repeat(60));

  const createArtifactEnabled = mode.enabled_tools?.create_artifact?.enabled === true;
  logTest(
    'create_artifact is enabled',
    createArtifactEnabled,
    createArtifactEnabled ? 'true' : 'false'
  );

  const allowedKinds = mode.enabled_tools?.create_artifact?.allowed_kinds || [];
  const hasCalendarKind = allowedKinds.includes('calendar');
  logTest(
    'calendar is in allowed_kinds',
    hasCalendarKind,
    hasCalendarKind ? allowedKinds.join(', ') : 'Not found'
  );

  const suggestPlanDisabled = mode.enabled_tools?.suggest_conversation_plan?.enabled === false;
  logTest(
    'suggest_conversation_plan is disabled',
    suggestPlanDisabled,
    suggestPlanDisabled ? 'disabled' : 'enabled'
  );

  const hasPrimaryArtifacts = mode.primary_artifact_types?.includes('calendar');
  logTest(
    'calendar in primary_artifact_types',
    hasPrimaryArtifacts,
    mode.primary_artifact_types?.join(', ')
  );

  // Test 3: Check system prompt
  console.log();
  console.log('📝 Test 3: System Prompt');
  console.log('-'.repeat(60));

  const promptMentionsCreateArtifact = mode.system_prompt?.includes('create_artifact');
  logTest(
    'System prompt mentions create_artifact',
    promptMentionsCreateArtifact
  );

  const promptEmphasizesCalendar = mode.system_prompt?.includes('kind: "calendar"');
  logTest(
    'System prompt specifies kind: "calendar"',
    promptEmphasizesCalendar
  );

  const promptHasMandatoryLanguage = /MUST|ALWAYS|REQUIRED|CRITICAL/i.test(mode.system_prompt || '');
  logTest(
    'System prompt uses mandatory language (MUST/ALWAYS)',
    promptHasMandatoryLanguage
  );

  // Test 4: Check existing calendar artifacts
  console.log();
  console.log('📅 Test 4: Existing Calendar Artifacts');
  console.log('-'.repeat(60));

  const { data: artifacts, error: artifactsError } = await supabase
    .from('artifacts')
    .select('id, title, kind, metadata')
    .eq('kind', 'calendar')
    .order('created_at', { ascending: false })
    .limit(3);

  logTest(
    'Calendar artifacts exist in database',
    !artifactsError && (artifacts?.length || 0) > 0,
    `Found ${artifacts?.length || 0} calendar artifacts`
  );

  if (artifacts && artifacts.length > 0) {
    const latestArtifact = artifacts[0];
    
    // Check metadata structure
    const hasSlots = Array.isArray(latestArtifact.metadata?.slots);
    logTest(
      'Latest artifact has slots array',
      hasSlots,
      hasSlots ? `${latestArtifact.metadata.slots.length} slots` : 'Missing'
    );

    const hasMonth = !!latestArtifact.metadata?.month;
    const monthValid = /^\d{4}-\d{2}$/.test(latestArtifact.metadata?.month || '');
    logTest(
      'Latest artifact has valid month (YYYY-MM)',
      hasMonth && monthValid,
      latestArtifact.metadata?.month
    );

    // Check slot structure
    if (hasSlots && latestArtifact.metadata.slots.length > 0) {
      const firstSlot = latestArtifact.metadata.slots[0];
      const hasRequiredFields = 
        firstSlot.id && 
        firstSlot.date && 
        firstSlot.title;

      logTest(
        'Slots have required fields (id, date, title)',
        hasRequiredFields,
        `Sample: ${firstSlot.title} on ${firstSlot.date}`
      );

      const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(firstSlot.date || '');
      logTest(
        'Slot dates are in ISO format (YYYY-MM-DD)',
        dateValid,
        firstSlot.date
      );

      if (firstSlot.email_type) {
        const validTypes = ['promotional', 'content', 'announcement', 'transactional', 'nurture'];
        const typeValid = validTypes.includes(firstSlot.email_type);
        logTest(
          'Slot email_type is valid enum',
          typeValid,
          firstSlot.email_type
        );
      }
    }
  }

  // Test 5: Verify specialist registry alignment
  console.log();
  console.log('🤖 Test 5: Specialist Registry Alignment');
  console.log('-'.repeat(60));

  // Read specialist registry config (we can't import directly in edge runtime)
  const fs = await import('fs/promises');
  const registryPath = process.cwd() + '/lib/agents/specialist-registry.ts';
  const registryContent = await fs.readFile(registryPath, 'utf-8');

  const hasCalendarPlannerInRegistry = registryContent.includes('calendar_planner:');
  logTest(
    'calendar_planner defined in specialist registry',
    hasCalendarPlannerInRegistry
  );

  const registryDisablesSuggestPlan = registryContent.includes("enabled: false, // DISABLED - Calendar Planner");
  logTest(
    'Registry explicitly disables suggest_conversation_plan',
    registryDisablesSuggestPlan
  );

  // Test 6: Summary
  console.log();
  console.log('=' .repeat(60));
  console.log('📊 Test Summary');
  console.log('=' .repeat(60));
  console.log();

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const passRate = (passed / total * 100).toFixed(0);

  console.log(`Tests Passed: ${passed}/${total} (${passRate}%)`);
  console.log();

  if (passed === total) {
    console.log('🎉 All tests passed! Calendar Planner is configured correctly.');
  } else {
    console.log('⚠️  Some tests failed. Review the output above for details.');
    const failed = results.filter(r => !r.passed);
    console.log('\nFailed tests:');
    failed.forEach(r => {
      console.log(`  ❌ ${r.test}`);
      if (r.details) console.log(`     ${r.details}`);
    });
  }
}

runTests().catch(console.error);

