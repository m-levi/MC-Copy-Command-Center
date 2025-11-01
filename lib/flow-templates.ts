import { FlowTemplate, FlowType } from '@/types';

/**
 * FLOW TEMPLATES - Research-Backed Email Automation Sequences
 * 
 * Research Summary (2025):
 * - Welcome Series: Average open rates 50-60%, Best timing: Immediate, Day 2, Day 4-5
 * - Abandoned Cart: 45% recovery rate with 3-email sequence, Optimal timing: 1hr, 24hr, 48hr
 * - Post-Purchase: 20-30% repeat purchase rate, Timing: Immediate, 5-7 days, 2 weeks
 * - Win-back: 12-15% re-engagement rate, Intervals: 60 days, 90 days, 120 days, 150 days
 * - Product Launch: 5-email sequence shows 60% higher engagement, Timing: Weekly buildups
 * - Educational: Weekly drip campaigns show 2x engagement vs daily sends
 */

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'welcome_series',
    name: 'Welcome Series',
    description: 'Onboard new subscribers with 3-5 emails',
    icon: '👋',
    defaultEmailCount: 3,
    category: 'transactional'
  },
  {
    id: 'abandoned_cart',
    name: 'Abandoned Cart',
    description: 'Recover lost sales with 3 strategic emails',
    icon: '🛒',
    defaultEmailCount: 3,
    category: 'transactional'
  },
  {
    id: 'post_purchase',
    name: 'Post-Purchase',
    description: 'Thank customers and encourage repeat purchases',
    icon: '💝',
    defaultEmailCount: 3,
    category: 'transactional'
  },
  {
    id: 'winback',
    name: 'Win-back Series',
    description: 'Re-engage inactive customers with 4 emails',
    icon: '💌',
    defaultEmailCount: 4,
    category: 'nurture'
  },
  {
    id: 'product_launch',
    name: 'Product Launch',
    description: 'Build hype and drive sales for new products',
    icon: '🚀',
    defaultEmailCount: 5,
    category: 'promotional'
  },
  {
    id: 'educational_series',
    name: 'Educational Series',
    description: 'Educate and nurture leads over time',
    icon: '📚',
    defaultEmailCount: 5,
    category: 'nurture'
  }
];

/**
 * Get flow template by type
 */
export function getFlowTemplate(flowType: FlowType): FlowTemplate {
  const template = FLOW_TEMPLATES.find(t => t.id === flowType);
  if (!template) {
    throw new Error(`Flow template not found: ${flowType}`);
  }
  return template;
}

/**
 * Get all flow templates by category
 */
export function getFlowTemplatesByCategory(category: 'transactional' | 'promotional' | 'nurture'): FlowTemplate[] {
  return FLOW_TEMPLATES.filter(t => t.category === category);
}


