import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { STANDARD_EMAIL_SYSTEM_PROMPT, STANDARD_EMAIL_USER_PROMPT } from '@/lib/prompts/standard-email.prompt';
import { LETTER_EMAIL_PROMPT } from '@/lib/prompts/letter-email.prompt';
import { FLOW_EMAIL_PROMPT_DESIGN, FLOW_EMAIL_PROMPT_LETTER } from '@/lib/prompts/flow-email.prompt';

/**
 * GET /api/debug/prompts/defaults
 * 
 * Returns the built-in default prompts for reference.
 * Users can copy these as starting points for custom prompts.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Return the default prompts organized by type
    const defaults = {
      design_email: {
        system: STANDARD_EMAIL_SYSTEM_PROMPT,
        user: STANDARD_EMAIL_USER_PROMPT,
      },
      letter_email: {
        // Letter email uses a combined prompt
        system: '',
        user: LETTER_EMAIL_PROMPT,
      },
      flow_email: {
        // Flow emails have design and letter variants
        system: '',
        user: FLOW_EMAIL_PROMPT_DESIGN,
      },
    };

    return NextResponse.json(defaults);
  } catch (error: any) {
    console.error('Error fetching default prompts:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch defaults' }, { status: 500 });
  }
}

