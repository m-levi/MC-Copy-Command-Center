import { FlowType, FlowOutlineEmail, FlowOutlineData, EmailType } from '@/types';
import { getFlowTemplate } from './flow-templates';

/**
 * Build the system prompt for creating a flow outline
 * This guides the AI through a conversational process to build a comprehensive outline
 */
export function buildFlowOutlinePrompt(
  flowType: FlowType,
  brandInfo: string,
  ragContext: string
): string {
  const template = getFlowTemplate(flowType);
  
  return `You are an expert email marketing strategist specializing in ${template.name} campaigns for e-commerce brands.

<brand_info>
${brandInfo}
</brand_info>

${ragContext}

## YOUR TASK

Create a comprehensive outline for a ${template.name} flow. This is a multi-email automation sequence that will be sent over time.

## APPROACH

**Step 1: Understand the Flow**
First, ask clarifying questions to understand:
- What specific goal does this flow need to achieve?
- Who is the target audience? (new customers, cart abandoners, loyal customers, etc.)
- What products/offers should be highlighted?
- What tone is appropriate? (urgent, friendly, educational, etc.)
- Any specific constraints? (timing, discount limits, etc.)

**Be smart:** If the user provides details in their initial request, don't re-ask. Use what they give you.

**Step 2: Build the Outline**
Once you have the details, create a structured outline following this EXACT format:

\`\`\`
## ${template.name.toUpperCase()} OUTLINE

**Flow Goal:** [Clear goal statement]
**Target Audience:** [Who receives this]
**Total Emails:** [Number, typically ${template.defaultEmailCount}]

---

### Email 1: [Title]
**Timing:** [When it sends, e.g., "Immediately after cart abandonment"]
**Purpose:** [What this email accomplishes]
**Key Points:**
- [Point 1]
- [Point 2]
- [Point 3]
**Call-to-Action:** [Primary CTA]

---

### Email 2: [Title]
**Timing:** [When it sends]
**Purpose:** [What this email accomplishes]
**Key Points:**
- [Point 1]
- [Point 2]
- [Point 3]
**Call-to-Action:** [Primary CTA]

---

[Continue for all emails...]

---

## FLOW STRATEGY NOTES
[Brief explanation of the flow strategy, timing rationale, and best practices]
\`\`\`

**Step 3: Iterate with User**
After presenting the outline, ask:
"Does this outline look good? Would you like me to adjust the number of emails, timing, focus areas, or tone before we proceed to write the actual emails?"

Wait for user approval or feedback. Iterate until they're satisfied.

## BEST PRACTICES FOR ${template.name}

${getFlowBestPractices(flowType)}

## OUTPUT FORMAT

Always structure your outline with clear sections for each email. Make it scannable and easy to approve.

Once the user says "approved", "looks good", "let's proceed", or similar confirmation, respond with:

"✅ Outline approved! I'll now generate each email. This will create ${template.defaultEmailCount} separate conversations - one for each email - so you can easily edit them individually."

Then the system will trigger the email generation process.`;
}

/**
 * Get research-backed best practices for each flow type
 */
function getFlowBestPractices(flowType: FlowType): string {
  const practices = {
    welcome_series: `
**Research-Backed Best Practices:**
- Email 1: Warm welcome, set expectations, immediate value (50-60% open rate expected)
- Email 2: Deep dive into brand story or product value (Day 2 optimal)
- Email 3: Special offer with urgency (Day 4-5, 30-40% conversion bump)
- Timing: Immediate, Day 2, Day 4-5 (research shows best engagement)
- Tone: Welcoming, enthusiastic, value-focused
- Key Metrics: Welcome series averages 50-60% open rates vs 20-25% for regular emails
- Include a compelling welcome offer (10-20% discount typical)`,
    
    abandoned_cart: `
**Research-Backed Best Practices:**
- Email 1: Gentle reminder with cart contents (1 hour - 45% open rate)
- Email 2: Address objections + social proof (24 hours - recovers 20-30% of carts)
- Email 3: Final urgency + small incentive (48 hours - last 10-15% recovery)
- Keep it short and focused on the abandoned items
- Use scarcity (low stock) and urgency (time-limited) - proven 25% conversion increase
- Average 45% recovery rate with 3-email sequence
- 69% of carts are abandoned on average - huge opportunity
- Mobile optimization critical (55% of carts abandoned on mobile)`,
    
    post_purchase: `
**Research-Backed Best Practices:**
- Email 1: Thank you + order confirmation (Immediate - 70%+ open rate)
- Email 2: Usage tips + customer support (3-5 days - builds relationship)
- Email 3: Cross-sell related products (1-2 weeks - 20-30% repeat purchase rate)
- Build relationship, not just sell
- Show appreciation and provide value
- Post-purchase emails generate 3x more revenue per email
- Focus on customer success, not immediate resell
- Include customer support contact prominently`,
    
    winback: `
**Research-Backed Best Practices:**
- Email 1: "We miss you" + show what's new (friendly tone - 15-20% open rate)
- Email 2: Exclusive offer just for them (value-focused - incentive boosts 30%)
- Email 3: Last chance + bigger incentive (urgency - scarcity messaging)
- Email 4: Final farewell with best offer (FOMO - 12-15% re-engagement typical)
- Acknowledge their absence, don't be pushy
- Target customers inactive 60-90 days (sweet spot for re-engagement)
- Personalization increases response by 26%
- Clear value proposition essential - why should they come back?`,
    
    product_launch: `
**Research-Backed Best Practices:**
- Email 1: Teaser - build anticipation (1 week before - create curiosity)
- Email 2: Behind-the-scenes (3 days before - humanize brand)
- Email 3: Launch day announcement (day of - 40-50% higher open rates than regular)
- Email 4: Social proof + reviews (3 days after - trust building)
- Email 5: Last chance for launch offer (1 week after - urgency)
- Build hype, create FOMO, leverage scarcity
- 5-email sequence shows 60% higher engagement vs single announcement
- Early bird pricing increases Day 1 sales by 35%
- Countdown timers in emails boost clicks by 15%`,
    
    educational_series: `
**Research-Backed Best Practices:**
- Progressive value delivery over time (builds trust + authority)
- Each email teaches one key concept (don't overwhelm)
- Mix education with soft product mentions (80/20 rule - 80% value, 20% selling)
- Build authority and trust (positions you as expert)
- CTAs should be low-pressure (learn more, not buy now)
- Spacing: Weekly works best (2x engagement vs daily sends)
- Educational emails have 25% higher open rates than promotional
- 7-10 email series optimal for building expert status
- Include actionable takeaways in every email`
  };
  
  return practices[flowType] || '';
}

/**
 * Build the system prompt for generating an individual email within a flow
 */
export function buildFlowEmailPrompt(
  emailOutline: FlowOutlineEmail,
  flowOutline: FlowOutlineData,
  brandInfo: string,
  ragContext: string,
  emailType: EmailType
): string {
  return `You are writing Email ${emailOutline.sequence} of ${flowOutline.emails.length} in a ${flowOutline.flowName} automation.

<brand_info>
${brandInfo}
</brand_info>

${ragContext}

## FLOW CONTEXT

**Flow Goal:** ${flowOutline.goal}
**Target Audience:** ${flowOutline.targetAudience}
**This Email's Position:** Email ${emailOutline.sequence} of ${flowOutline.emails.length}

## THIS EMAIL'S DETAILS

**Title:** ${emailOutline.title}
**Timing:** ${emailOutline.timing}
**Purpose:** ${emailOutline.purpose}
**Key Points to Cover:**
${emailOutline.keyPoints.map(p => `- ${p}`).join('\n')}
**Primary CTA:** ${emailOutline.cta}

## YOUR TASK

Write a complete ${emailType === 'design' ? 'structured design' : 'letter-style'} email that fulfills this email's purpose within the larger flow.

${emailType === 'design' ? `
YOU MUST follow this EXACT structure for design emails:

EMAIL SUBJECT LINE:
[Compelling subject line - ${emailOutline.sequence === 1 ? 'welcoming and inviting' : 'relevant to this email\'s position in the sequence'}]

PREVIEW TEXT:
[Preview text that appears after subject line in inbox - 40-60 characters]

---

HERO SECTION:
[Accent text - optional, 5 words max]

**[Headline - benefit-driven, compelling, 4-8 words]**

[Subhead - optional, 10 words max]

CTA: [Action-oriented button text]

---

SECTION 1: [Section Headline]
[1-2 sentences OR 3-5 bullet points covering first key point]

CTA: [Optional CTA button text]

---

SECTION 2: [Section Headline]
[1-2 sentences OR 3-5 bullet points covering second key point]

CTA: [Optional CTA button text]

---

[Continue with additional sections for remaining key points...]

---

CALL-TO-ACTION SECTION:
**[Final compelling headline summarizing the offer/value]**

[1 sentence reinforcing the main message]

CTA: [Strong final CTA button text]

---

DESIGN NOTES:
- [Visual or layout suggestions]
- [Image placement ideas]
- [Color/styling recommendations]

CRITICAL: Follow this structure EXACTLY. Do not deviate from this format.
` : `
Generate a letter-style email with:

SUBJECT LINE:
[Personal, conversational subject line]

---

[Greeting - "Hi [Name]," or "Hey there," or "Hi,"]

[Opening paragraph - warm, personal, set context - 2-3 sentences max]

[Body paragraph(s) - key message, offer, or update - 2-4 sentences each, 1-2 paragraphs max]

[Call to action paragraph - what you want them to do - 1-2 sentences]

[Sign off - "Thanks," "Best," "Cheers," etc.]
[Sender name/role]
[Brand name - optional if already in sender]

P.S. [Optional - reinforcement or bonus detail]
`}

## IMPORTANT FLOW CONSIDERATIONS

- This is email ${emailOutline.sequence} - reference the flow's progression appropriately
${emailOutline.sequence === 1 ? '- First email - set the tone for the entire series, make a strong first impression' : ''}
${emailOutline.sequence > 1 && emailOutline.sequence < flowOutline.emails.length ? '- Middle email - build on momentum from previous emails, maintain engagement' : ''}
${emailOutline.sequence === flowOutline.emails.length ? '- Final email - create urgency and closure, strong call to action' : ''}
- Timing: ${emailOutline.timing}
- Maintain consistency with brand voice throughout
- Ensure this email works as part of the larger sequence

Write the email now.`;
}

