#!/usr/bin/env ts-node

/**
 * Auth Configuration Verification Script
 * 
 * This script verifies that authentication is properly configured
 * for both local development and production deployment.
 * 
 * Usage:
 *   npx ts-node scripts/verify-auth-config.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  fix?: string;
}

const results: CheckResult[] = [];

function addCheck(name: string, status: 'pass' | 'fail' | 'warn', message: string, fix?: string) {
  results.push({ name, status, message, fix });
}

// Check 1: Environment variables exist
console.log('🔍 Checking environment variables...\n');

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
];

requiredEnvVars.forEach((varName) => {
  const value = process.env[varName];
  if (!value) {
    addCheck(
      `ENV: ${varName}`,
      'fail',
      `Missing: ${varName}`,
      `Add ${varName} to your .env.local file`
    );
  } else if (value.includes('your_') || value.includes('your-')) {
    addCheck(
      `ENV: ${varName}`,
      'warn',
      `Placeholder value detected: ${varName}`,
      `Replace placeholder with actual value in .env.local`
    );
  } else {
    addCheck(
      `ENV: ${varName}`,
      'pass',
      `${varName} is set (${value.substring(0, 20)}...)`
    );
  }
});

// Check 2: Supabase URL format
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  if (supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co')) {
    addCheck('URL Format', 'pass', 'Supabase URL format is valid');
  } else {
    addCheck(
      'URL Format',
      'fail',
      'Invalid Supabase URL format',
      'URL should be: https://[project-ref].supabase.co'
    );
  }
}

// Check 3: Verify Supabase files exist
const supabaseFiles = [
  'lib/supabase/client.ts',
  'lib/supabase/server.ts',
  'lib/supabase/middleware.ts',
  'middleware.ts',
];

supabaseFiles.forEach((file) => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    addCheck(`File: ${file}`, 'pass', `${file} exists`);
  } else {
    addCheck(
      `File: ${file}`,
      'fail',
      `${file} not found`,
      `Ensure file exists at: ${file}`
    );
  }
});

// Check 4: Auth pages exist
const authPages = [
  'app/login/page.tsx',
  'app/signup/page.tsx',
  'app/forgot-password/page.tsx',
  'app/reset-password/page.tsx',
];

authPages.forEach((page) => {
  const pagePath = path.join(__dirname, '..', page);
  if (fs.existsSync(pagePath)) {
    addCheck(`Page: ${page}`, 'pass', `${page} exists`);
  } else {
    addCheck(`Page: ${page}`, 'warn', `${page} not found`);
  }
});

// Check 5: Verify middleware configuration
const middlewarePath = path.join(__dirname, '..', 'middleware.ts');
if (fs.existsSync(middlewarePath)) {
  const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8');
  if (middlewareContent.includes('updateSession')) {
    addCheck('Middleware', 'pass', 'Middleware properly configured with updateSession');
  } else {
    addCheck(
      'Middleware',
      'warn',
      'Middleware may not be properly configured',
      'Ensure middleware calls updateSession from lib/supabase/middleware'
    );
  }
}

// Print results
console.log('\n' + '='.repeat(80));
console.log('📊 AUTHENTICATION CONFIGURATION REPORT');
console.log('='.repeat(80) + '\n');

const passCount = results.filter((r) => r.status === 'pass').length;
const failCount = results.filter((r) => r.status === 'fail').length;
const warnCount = results.filter((r) => r.status === 'warn').length;

// Print by status
['fail', 'warn', 'pass'].forEach((status) => {
  const items = results.filter((r) => r.status === status);
  if (items.length === 0) return;

  const icon = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';
  const title = status === 'pass' ? 'PASSED' : status === 'warn' ? 'WARNINGS' : 'FAILED';

  console.log(`\n${icon} ${title}:\n`);
  items.forEach((item) => {
    console.log(`  ${icon} ${item.name}`);
    console.log(`     ${item.message}`);
    if (item.fix) {
      console.log(`     💡 Fix: ${item.fix}`);
    }
  });
});

// Summary
console.log('\n' + '='.repeat(80));
console.log('SUMMARY:');
console.log(`  ✅ Passed: ${passCount}`);
console.log(`  ⚠️  Warnings: ${warnCount}`);
console.log(`  ❌ Failed: ${failCount}`);
console.log('='.repeat(80));

// Production deployment checklist
console.log('\n📋 PRODUCTION DEPLOYMENT CHECKLIST:\n');
console.log('  For production deployment at https://copy.mooncommerce.net:');
console.log('');
console.log('  1. ⚠️  CRITICAL: Configure Supabase Auth URLs');
console.log('     - Go to: https://supabase.com/dashboard/project/[project-id]/auth/url-configuration');
console.log('     - Set Site URL: https://copy.mooncommerce.net');
console.log('     - Add Redirect URLs: https://copy.mooncommerce.net/**');
console.log('');
console.log('  2. Add all environment variables to Vercel:');
console.log('     - NEXT_PUBLIC_SUPABASE_URL');
console.log('     - NEXT_PUBLIC_SUPABASE_ANON_KEY');
console.log('     - SUPABASE_SERVICE_ROLE_KEY');
console.log('     - OPENAI_API_KEY');
console.log('     - ANTHROPIC_API_KEY');
console.log('');
console.log('  3. Deploy to Vercel');
console.log('');
console.log('  4. Test authentication on production:');
console.log('     - Clear browser cache');
console.log('     - Try logging in');
console.log('     - Check browser console for CORS errors');
console.log('');
console.log('  📖 See docs/AUTH_CORS_FIX.md for detailed troubleshooting');
console.log('');

// Exit code
if (failCount > 0) {
  console.log('❌ Configuration has failures. Please fix the issues above.\n');
  process.exit(1);
} else if (warnCount > 0) {
  console.log('⚠️  Configuration has warnings. Review before deploying.\n');
  process.exit(0);
} else {
  console.log('✅ All checks passed! Configuration looks good.\n');
  process.exit(0);
}

