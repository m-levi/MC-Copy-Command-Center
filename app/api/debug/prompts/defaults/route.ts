import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { DESIGN_EMAIL_V2_SYSTEM_PROMPT, DESIGN_EMAIL_V2_USER_PROMPT } from '@/lib/prompts/design-email-v2.prompt';
import { LETTER_EMAIL_PROMPT } from '@/lib/prompts/letter-email.prompt';

/**
 * GET /api/debug/prompts/defaults
 * 
 * Returns the built-in default prompts for reference.
 * Users can copy these as starting points for custom prompts.
 * 
 * NOTE: Design emails now use Design V2 as the SINGLE source of truth
 * across all contexts (chat, flows, etc.)
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Return the default prompts organized by type
    // UNIFIED: All design emails (including flow emails) now use Design V2 prompt
    const defaults = {
      design_email: {
        system: DESIGN_EMAIL_V2_SYSTEM_PROMPT,
        user: DESIGN_EMAIL_V2_USER_PROMPT,
      },
      letter_email: {
        // Letter email uses a combined prompt
        system: '',
        user: LETTER_EMAIL_PROMPT,
      },
      flow_email: {
        // Flow design emails now use the same Design V2 prompt (single source of truth)
        system: DESIGN_EMAIL_V2_SYSTEM_PROMPT,
        user: DESIGN_EMAIL_V2_USER_PROMPT,
      },
    };

    return NextResponse.json(defaults);
  } catch (error: any) {
    console.error('Error fetching default prompts:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch defaults' }, { status: 500 });
  }
}


