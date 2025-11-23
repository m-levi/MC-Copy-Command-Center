'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import BrandArchitectWizard from '@/components/brand-architect/BrandArchitectWizard';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

export default function BrandArchitectPage({ params }: { params: Promise<{ brandId: string }> }) {
  const resolvedParams = use(params);
  const brandId = resolvedParams.brandId;
  const router = useRouter();
  const supabase = createClient();

  const handleComplete = async (profile: any) => {
    try {
      // Construct the intelligent filling logic here
      const brandDetailsUpdate = {
        copywriting_style_guide: JSON.stringify(profile, null, 2),
        updated_at: new Date().toISOString(),
        // Map profile fields to other brand columns if they exist or concatenate into brand_details
        // For example, if we wanted to update the main brand description:
        brand_details: `
**Archetype:** ${profile.identity.archetype}
**Core Vibe:** ${profile.identity.core_vibe}
**Mission:** ${profile.identity.mission_statement}

**Tone:**
- Formality: ${profile.tonal_settings.formality}/10
- Enthusiasm: ${profile.tonal_settings.enthusiasm}/10
- Empathy: ${profile.tonal_settings.empathy}/10
- Humor: ${profile.tonal_settings.humor}/10
        `.trim(),
        
        brand_guidelines: `
**Do's:**
${profile.linguistics.do_list.map((i: string) => `- ${i}`).join('\n')}

**Don'ts:**
${profile.linguistics.dont_list.map((i: string) => `- ${i}`).join('\n')}

**Vocabulary:**
- Preferred: ${profile.linguistics.vocabulary_allow.join(', ')}
- Avoid: ${profile.linguistics.vocabulary_ban.join(', ')}

**Syntax:**
${profile.linguistics.syntax_rules}
        `.trim()
      };

      const { error } = await supabase
        .from('brands')
        .update(brandDetailsUpdate)
        .eq('id', brandId);

      if (error) throw error;

      toast.success('Brand Voice Profile saved and applied!');
      router.push(`/brands/${brandId}`);
    } catch (error) {
      logger.error('Error saving brand profile:', error);
      toast.error('Failed to save profile');
    }
  };

  const handleClose = () => {
    if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
      router.push(`/brands/${brandId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <BrandArchitectWizard
        isOpen={true}
        onClose={handleClose}
        onComplete={handleComplete}
        isPage={true}
      />
    </div>
  );
}
