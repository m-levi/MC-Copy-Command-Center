import { PromptTemplate } from '@/types';

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // Promotional
  {
    id: 'flash-sale',
    title: 'Flash Sale Email',
    description: 'Create urgency with a limited-time offer',
    category: 'promotional',
    icon: '⚡',
    prompt: 'Create a flash sale email for [PRODUCT/COLLECTION]. The sale is [DISCOUNT]% off and ends in [TIMEFRAME]. Focus on creating urgency and FOMO while highlighting the value.',
  },
  {
    id: 'seasonal-promo',
    title: 'Seasonal Promotion',
    description: 'Holiday or seasonal campaign',
    category: 'promotional',
    icon: '🎉',
    prompt: 'Write a [SEASON/HOLIDAY] promotional email for [PRODUCT/COLLECTION]. Emphasize the seasonal theme and create excitement around the limited-time offer.',
  },
  {
    id: 'new-product-launch',
    title: 'Product Launch',
    description: 'Announce and build excitement for new products',
    category: 'announcement',
    icon: '🚀',
    prompt: 'Create a product launch email for [PRODUCT NAME]. Highlight what makes it unique, the problem it solves, and why customers should be excited. Include early-bird or launch-day incentives.',
  },
  {
    id: 'back-in-stock',
    title: 'Back in Stock',
    description: 'Notify customers when popular items return',
    category: 'announcement',
    icon: '📦',
    prompt: 'Write a back-in-stock email for [PRODUCT]. Create excitement that it\'s finally available again and add urgency that it might sell out quickly.',
  },
  
  // Transactional
  {
    id: 'welcome-series',
    title: 'Welcome Email',
    description: 'First email to new subscribers',
    category: 'transactional',
    icon: '👋',
    prompt: 'Create a welcome email for new subscribers. Introduce the brand, set expectations for future emails, and include a welcome offer of [DISCOUNT/GIFT]. Make them feel valued and excited.',
  },
  {
    id: 'abandoned-cart',
    title: 'Abandoned Cart',
    description: 'Recover lost sales from cart abandoners',
    category: 'transactional',
    icon: '🛒',
    prompt: 'Write an abandoned cart email reminding the customer about [ITEMS LEFT IN CART]. Use gentle persuasion, address potential objections, and consider offering a small incentive if appropriate.',
  },
  {
    id: 'post-purchase',
    title: 'Post-Purchase Follow-up',
    description: 'Thank you and product tips after purchase',
    category: 'transactional',
    icon: '💝',
    prompt: 'Create a post-purchase email thanking the customer for buying [PRODUCT]. Include usage tips, care instructions, or ways to get the most value from their purchase.',
  },
  
  // Nurture
  {
    id: 'educational-content',
    title: 'Educational Email',
    description: 'Provide value with tips and insights',
    category: 'nurture',
    icon: '📚',
    prompt: 'Write an educational email about [TOPIC]. Provide actionable tips and insights that help customers [ACHIEVE GOAL]. Include a soft CTA to relevant products.',
  },
  {
    id: 'customer-story',
    title: 'Customer Success Story',
    description: 'Share testimonials and case studies',
    category: 'nurture',
    icon: '⭐',
    prompt: 'Create an email featuring a customer success story. Highlight how [CUSTOMER] used [PRODUCT] to achieve [RESULT]. Make it relatable and inspiring.',
  },
  {
    id: 're-engagement',
    title: 'Re-engagement Email',
    description: 'Win back inactive subscribers',
    category: 'nurture',
    icon: '💌',
    prompt: "Write a re-engagement email for subscribers who haven't opened emails in [TIMEFRAME]. Be friendly, acknowledge their absence, show what they've missed, and offer an incentive to come back.",
  },
  {
    id: 'vip-exclusive',
    title: 'VIP/Loyalty Email',
    description: 'Reward your best customers',
    category: 'nurture',
    icon: '👑',
    prompt: 'Create a VIP/loyalty email offering exclusive early access or special perks to top customers. Make them feel valued and appreciated for their loyalty.',
  },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: PromptTemplate['category']
): PromptTemplate[] {
  return PROMPT_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find(t => t.id === id);
}

/**
 * Replace placeholders in template
 */
export function fillTemplate(template: PromptTemplate, values: Record<string, string>): string {
  let filledPrompt = template.prompt;
  
  Object.entries(values).forEach(([key, value]) => {
    const regex = new RegExp(`\\[${key}\\]`, 'gi');
    filledPrompt = filledPrompt.replace(regex, value);
  });
  
  return filledPrompt;
}

/**
 * Quick action prompts
 */
export const QUICK_ACTION_PROMPTS = {
  make_shorter: 'Rewrite the previous email to be 30% shorter while keeping the key message and CTA.',
  add_urgency: 'Add more urgency and scarcity elements to the previous email without being pushy.',
  change_tone_casual: 'Rewrite the previous email in a more casual, friendly, and conversational tone.',
  change_tone_professional: 'Rewrite the previous email in a more professional and polished tone.',
  add_social_proof: 'Add social proof elements (testimonials, statistics, reviews) to the previous email.',
  improve_cta: 'Rewrite the CTAs in the previous email to be more compelling and action-oriented.',
};

