/**
 * Style Guide Wizard - Question Engine
 * Manages questions, categories, and context-aware logic
 */

export type QuestionType = 'multiple-choice' | 'scale' | 'text' | 'multi-select';
export type QuestionCategory = 'identity' | 'audience' | 'voice' | 'preferences' | 'guidelines';

export interface WizardQuestion {
  id: string;
  category: QuestionCategory;
  type: QuestionType;
  question: string;
  description?: string;
  options?: string[];
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  placeholder?: string;
  required?: boolean;
  dependsOn?: {
    questionId: string;
    answer: any;
  };
}

export interface WizardAnswers {
  [questionId: string]: any;
}

export interface StyleGuideSection {
  title: string;
  content: string;
}

export interface GeneratedStyleGuide {
  sections: StyleGuideSection[];
  fullText: string;
}

// Question library
export const WIZARD_QUESTIONS: WizardQuestion[] = [
  // Brand Identity
  {
    id: 'brand_personality',
    category: 'identity',
    type: 'multi-select',
    question: 'Which personality traits best describe your brand?',
    description: 'Select all that apply',
    options: [
      'Professional',
      'Friendly',
      'Innovative',
      'Trustworthy',
      'Playful',
      'Sophisticated',
      'Authentic',
      'Bold',
      'Caring',
      'Expert',
    ],
    required: true,
  },
  {
    id: 'brand_values',
    category: 'identity',
    type: 'text',
    question: 'What are your core brand values?',
    description: 'List 3-5 values that guide your brand (e.g., sustainability, innovation, transparency)',
    placeholder: 'Quality, Sustainability, Customer-first...',
    required: true,
  },
  {
    id: 'customer_feeling',
    category: 'identity',
    type: 'text',
    question: 'How do you want customers to feel when they interact with your brand?',
    description: 'Describe the emotional response you aim for',
    placeholder: 'Inspired, confident, supported...',
    required: true,
  },
  
  // Audience
  {
    id: 'target_audience',
    category: 'audience',
    type: 'text',
    question: 'Who is your target audience?',
    description: 'Describe demographics, interests, and characteristics',
    placeholder: 'Young professionals aged 25-40 who value sustainability...',
    required: true,
  },
  {
    id: 'audience_pain_points',
    category: 'audience',
    type: 'text',
    question: 'What are your audience\'s main pain points or challenges?',
    description: 'What problems do they face that your brand solves?',
    placeholder: 'Lack of time, overwhelmed by options, seeking authentic brands...',
    required: true,
  },
  {
    id: 'audience_goals',
    category: 'audience',
    type: 'text',
    question: 'What motivates your audience to buy?',
    description: 'What goals or desires drive their purchasing decisions?',
    placeholder: 'Looking for quality, want to support ethical brands, seeking status...',
    required: false,
  },
  
  // Voice Characteristics
  {
    id: 'formality_level',
    category: 'voice',
    type: 'scale',
    question: 'How formal should your brand voice be?',
    min: 1,
    max: 5,
    minLabel: 'Very Casual',
    maxLabel: 'Very Formal',
    required: true,
  },
  {
    id: 'technical_level',
    category: 'voice',
    type: 'scale',
    question: 'How technical should your language be?',
    min: 1,
    max: 5,
    minLabel: 'Simple & Accessible',
    maxLabel: 'Technical & Detailed',
    required: true,
  },
  {
    id: 'sentence_length',
    category: 'voice',
    type: 'multiple-choice',
    question: 'What sentence length do you prefer?',
    options: [
      'Short and punchy (5-10 words)',
      'Medium length (10-20 words)',
      'Varied (mix of short and long)',
      'Longer, flowing sentences (20+ words)',
    ],
    required: true,
  },
  {
    id: 'use_of_humor',
    category: 'voice',
    type: 'multiple-choice',
    question: 'Should your emails include humor?',
    options: [
      'Yes, frequently - it\'s part of our brand',
      'Occasionally, when appropriate',
      'Rarely - keep it professional',
      'Never - we\'re strictly professional',
    ],
    required: true,
  },
  {
    id: 'use_of_emojis',
    category: 'voice',
    type: 'multiple-choice',
    question: 'How should emojis be used?',
    options: [
      'Frequently - they add personality',
      'Sparingly - only for emphasis',
      'Very rarely - only in casual contexts',
      'Never - not our style',
    ],
    required: true,
  },
  
  // Writing Preferences
  {
    id: 'call_to_action_style',
    category: 'preferences',
    type: 'multiple-choice',
    question: 'What style of call-to-action do you prefer?',
    options: [
      'Direct and action-oriented (Shop Now, Buy Today)',
      'Soft and inviting (Explore Our Collection, Learn More)',
      'Benefit-focused (Start Saving Today, Transform Your Space)',
      'Curiosity-driven (See What\'s New, Discover Your Perfect Match)',
    ],
    required: true,
  },
  {
    id: 'punctuation_style',
    category: 'preferences',
    type: 'multiple-choice',
    question: 'What punctuation style fits your brand?',
    options: [
      'Exclamation points for excitement!',
      'Question marks to engage?',
      'Period for professionalism.',
      'Ellipsis for intrigue...',
      'Mix based on context',
    ],
    required: true,
  },
  {
    id: 'formatting_preferences',
    category: 'preferences',
    type: 'multi-select',
    question: 'What formatting elements should be used?',
    description: 'Select all that apply',
    options: [
      'Bold for emphasis',
      'ALL CAPS for urgency',
      'Italics for subtle emphasis',
      'Bullet points for lists',
      'Numbers for steps',
      'Headers and sections',
    ],
    required: false,
  },
  
  // Guidelines
  {
    id: 'words_to_avoid',
    category: 'guidelines',
    type: 'text',
    question: 'Are there any words or phrases to avoid?',
    description: 'List words that don\'t fit your brand or might be off-brand',
    placeholder: 'Cheap, deal, limited time only, spam-like phrases...',
    required: false,
  },
  {
    id: 'preferred_phrases',
    category: 'guidelines',
    type: 'text',
    question: 'Are there specific phrases or taglines you use frequently?',
    description: 'Brand-specific phrases that should be incorporated',
    placeholder: 'Our signature phrases, taglines, or expressions...',
    required: false,
  },
];

// Get questions for a specific category
export function getQuestionsByCategory(category: QuestionCategory): WizardQuestion[] {
  return WIZARD_QUESTIONS.filter(q => q.category === category);
}

// Get next question based on current answers
export function getNextQuestion(currentAnswers: WizardAnswers): WizardQuestion | null {
  for (const question of WIZARD_QUESTIONS) {
    // Skip if already answered
    if (currentAnswers[question.id] !== undefined) {
      continue;
    }
    
    // Check dependencies
    if (question.dependsOn) {
      const dependency = currentAnswers[question.dependsOn.questionId];
      if (dependency !== question.dependsOn.answer) {
        continue; // Skip this question
      }
    }
    
    return question;
  }
  
  return null; // All questions answered
}

// Calculate wizard progress
export function calculateProgress(currentAnswers: WizardAnswers): number {
  const totalRequired = WIZARD_QUESTIONS.filter(q => q.required).length;
  const answeredRequired = WIZARD_QUESTIONS.filter(
    q => q.required && currentAnswers[q.id] !== undefined
  ).length;
  
  return Math.round((answeredRequired / totalRequired) * 100);
}

// Get category progress
export function getCategoryProgress(category: QuestionCategory, answers: WizardAnswers): {
  total: number;
  answered: number;
  percentage: number;
} {
  const questions = getQuestionsByCategory(category);
  const answered = questions.filter(q => answers[q.id] !== undefined).length;
  
  return {
    total: questions.length,
    answered,
    percentage: questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0,
  };
}

// Category metadata
export const CATEGORY_INFO: Record<QuestionCategory, { title: string; icon: string; description: string }> = {
  identity: {
    title: 'Brand Identity',
    icon: '🎯',
    description: 'Define your brand personality and values',
  },
  audience: {
    title: 'Target Audience',
    icon: '👥',
    description: 'Understand who you\'re writing for',
  },
  voice: {
    title: 'Voice Characteristics',
    icon: '🎤',
    description: 'Set your tone and communication style',
  },
  preferences: {
    title: 'Writing Preferences',
    icon: '✍️',
    description: 'Choose formatting and structure preferences',
  },
  guidelines: {
    title: 'Do\'s & Don\'ts',
    icon: '📋',
    description: 'Define what to embrace and avoid',
  },
};

