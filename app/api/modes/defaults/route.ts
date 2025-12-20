import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { PLANNING_MODE_PROMPT } from '@/lib/prompts/planning-mode.prompt';
import { LETTER_EMAIL_PROMPT } from '@/lib/prompts/letter-email.prompt';
import { STANDARD_EMAIL_SYSTEM_PROMPT } from '@/lib/prompts/standard-email.prompt';

/**
 * GET /api/modes/defaults
 * Get default system prompts for built-in modes
 * Useful for copying/referencing when creating custom modes
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Return the built-in default prompts
  const defaults = {
    planning: {
      name: 'Chat',
      description: 'Flexible marketing expert for questions, strategy, and brainstorming',
      icon: '💬',
      color: 'blue',
      system_prompt: PLANNING_MODE_PROMPT,
    },
    letter_email: {
      name: 'Letter',
      description: 'Short, personal, conversational emails',
      icon: '✉️',
      color: 'green',
      system_prompt: LETTER_EMAIL_PROMPT,
    },
    design_email: {
      name: 'Design',
      description: 'Structured marketing emails with hero, body, and CTA sections',
      icon: '🎨',
      color: 'purple',
      system_prompt: STANDARD_EMAIL_SYSTEM_PROMPT,
    },
  };

  return NextResponse.json(defaults);
}


