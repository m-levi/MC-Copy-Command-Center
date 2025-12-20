/**
 * Migration Script: Brand Memories to Supermemory
 * 
 * This script migrates existing brand_memories from Supabase to Supermemory.
 * 
 * IMPORTANT: Before running this script:
 * 1. Set SUPERMEMORY_API_KEY in your environment
 * 2. Set SUPABASE_SERVICE_ROLE_KEY in your environment
 * 3. Set NEXT_PUBLIC_SUPABASE_URL in your environment
 * 
 * Usage:
 *   npx ts-node scripts/migrate-brand-memories-to-supermemory.ts
 * 
 * Options:
 *   --dry-run    Preview what would be migrated without making changes
 *   --batch=N    Process N memories at a time (default: 10)
 */

import { createClient } from '@supabase/supabase-js';

// Simple logger for script
const log = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
  success: (...args: unknown[]) => console.log('[SUCCESS]', ...args),
};

interface BrandMemory {
  id: string;
  brand_id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface Brand {
  id: string;
  user_id: string;
  created_by: string;
  name: string;
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchArg = args.find(a => a.startsWith('--batch='));
const batchSize = batchArg ? parseInt(batchArg.split('=')[1]) : 10;

async function main() {
  log.info('Starting brand memories migration to Supermemory...');
  log.info(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  log.info(`Batch size: ${batchSize}`);
  console.log('');

  // Validate environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supermemoryApiKey = process.env.SUPERMEMORY_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    log.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  if (!supermemoryApiKey) {
    log.error('Missing SUPERMEMORY_API_KEY. Set it in your environment.');
    process.exit(1);
  }

  // Initialize Supabase client with service role for full access
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch all brand memories
  log.info('Fetching existing brand memories...');
  const { data: memories, error: memoriesError } = await supabase
    .from('brand_memories')
    .select('*')
    .order('created_at', { ascending: true });

  if (memoriesError) {
    log.error('Failed to fetch memories:', memoriesError.message);
    process.exit(1);
  }

  if (!memories || memories.length === 0) {
    log.info('No memories found to migrate.');
    process.exit(0);
  }

  log.info(`Found ${memories.length} memories to migrate`);
  console.log('');

  // Fetch all brands to get their creators
  const brandIds = [...new Set(memories.map((m: BrandMemory) => m.brand_id))];
  const { data: brands, error: brandsError } = await supabase
    .from('brands')
    .select('id, user_id, created_by, name')
    .in('id', brandIds);

  if (brandsError) {
    log.error('Failed to fetch brands:', brandsError.message);
    process.exit(1);
  }

  // Create a map of brand ID to creator user ID
  const brandUserMap = new Map<string, string>();
  (brands || []).forEach((brand: Brand) => {
    // Use created_by if available, otherwise fall back to user_id
    brandUserMap.set(brand.id, brand.created_by || brand.user_id);
  });

  log.info(`Found ${brands?.length || 0} brands`);
  console.log('');

  // Process memories in batches
  let migratedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < memories.length; i += batchSize) {
    const batch = memories.slice(i, i + batchSize);
    log.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(memories.length / batchSize)} (${batch.length} memories)`);

    for (const memory of batch as BrandMemory[]) {
      const userId = brandUserMap.get(memory.brand_id);

      if (!userId) {
        log.warn(`No user found for brand ${memory.brand_id}, skipping memory ${memory.id}`);
        errorCount++;
        continue;
      }

      const compositeUserId = `brand_${memory.brand_id}_user_${userId}`;
      const formattedContent = `${memory.title}: ${memory.content}`;

      if (isDryRun) {
        log.info(`Would migrate: "${memory.title}" (${memory.category}) -> ${compositeUserId}`);
        migratedCount++;
        continue;
      }

      try {
        // Add to Supermemory
        const response = await fetch('https://api.supermemory.ai/v3/add', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supermemoryApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: compositeUserId,
            content: formattedContent,
            metadata: {
              title: memory.title,
              category: memory.category,
              brandId: memory.brand_id,
              originalUserId: userId,
              migratedFrom: 'supabase_brand_memories',
              originalId: memory.id,
              originalCreatedAt: memory.created_at,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        log.success(`Migrated: "${memory.title}" -> ${result.id}`);
        migratedCount++;
      } catch (error) {
        log.error(`Failed to migrate memory ${memory.id}:`, error);
        errorCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('');
  }

  // Summary
  console.log('');
  log.info('=== Migration Summary ===');
  log.info(`Total memories: ${memories.length}`);
  log.info(`Successfully migrated: ${migratedCount}`);
  log.info(`Errors: ${errorCount}`);

  if (isDryRun) {
    console.log('');
    log.warn('This was a dry run. No changes were made.');
    log.info('Run without --dry-run to perform the actual migration.');
  } else if (migratedCount > 0 && errorCount === 0) {
    console.log('');
    log.success('Migration completed successfully!');
    log.info('You can now safely drop the brand_memories table if desired.');
  }
}

main().catch((error) => {
  log.error('Migration failed:', error);
  process.exit(1);
});























