/**
 * Script to regenerate all Mermaid charts for existing flow outlines
 * Run this after fixing the mermaid-generator.ts to update all existing charts
 * 
 * Usage: npx tsx scripts/regenerate-mermaid-charts.ts
 */

import { createClient } from '@supabase/supabase-js';
import { generateMermaidChart } from '../lib/mermaid-generator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function regenerateAllCharts() {
  console.log('🔄 Starting Mermaid chart regeneration...\n');

  // Fetch all flow outlines
  const { data: outlines, error } = await supabase
    .from('flow_outlines')
    .select('id, outline_data, flow_type');

  if (error) {
    console.error('❌ Error fetching flow outlines:', error);
    process.exit(1);
  }

  if (!outlines || outlines.length === 0) {
    console.log('ℹ️  No flow outlines found in database.');
    return;
  }

  console.log(`📊 Found ${outlines.length} flow outline(s) to regenerate\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const outline of outlines) {
    try {
      console.log(`Processing: ${outline.flow_type} (${outline.id})`);
      
      // Generate new Mermaid chart
      const mermaidChart = generateMermaidChart(outline.outline_data);
      
      if (!mermaidChart) {
        console.log(`  ⚠️  Skipped - no chart generated (empty outline)`);
        continue;
      }

      // Update database
      const { error: updateError } = await supabase
        .from('flow_outlines')
        .update({ mermaid_chart: mermaidChart })
        .eq('id', outline.id);

      if (updateError) {
        console.log(`  ❌ Failed to update: ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ Successfully regenerated`);
        successCount++;
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Successfully regenerated: ${successCount}`);
  if (errorCount > 0) {
    console.log(`❌ Failed: ${errorCount}`);
  }
  console.log('='.repeat(50));
}

regenerateAllCharts()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
  });

