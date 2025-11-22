import { FlowOutlineData, FlowOutlineEmail, FlowType } from '@/types';

/**
 * Detects if AI response contains a flow outline
 * Parses it into structured FlowOutlineData
 */
export function detectFlowOutline(message: string, flowType: FlowType): FlowOutlineData | null {
  // Look for outline structure markers (more flexible)
  const hasOutlineMarkers = (message.includes('OUTLINE') || message.includes('Outline')) && 
                           (message.includes('Flow Goal:') || message.includes('Goal:')) && 
                           (message.includes('Target Audience:') || message.includes('Audience:'));
  
  if (!hasOutlineMarkers) {
    return null;
  }

  try {
    // Extract flow goal (more flexible matching)
    const goalMatch = message.match(/\*\*(?:Flow )?Goal:\*\*\s*(.+?)(?=\n\*\*|\n\n|$)/s) || 
                      message.match(/(?:Flow )?Goal:\s*(.+?)(?=\n\*\*|\n\n|$)/s);
    const goal = goalMatch?.[1]?.trim() || '';

    // Extract target audience (more flexible matching)
    const audienceMatch = message.match(/\*\*Target Audience:\*\*\s*(.+?)(?=\n\*\*|\n\n|$)/s) ||
                          message.match(/Target Audience:\s*(.+?)(?=\n\*\*|\n\n|$)/s);
    const targetAudience = audienceMatch?.[1]?.trim() || '';

    // Extract flow name (from the outline header, more flexible)
    const nameMatch = message.match(/##\s*(.+?)\s*(?:OUTLINE|Outline)/i);
    const flowName = nameMatch?.[1]?.trim() || '';

    // Extract emails - more flexible regex that handles variations
    const emails: FlowOutlineEmail[] = [];
    
    // Split by email sections
    const emailSections = message.split(/###\s*Email\s*(\d+):\s*(.+?)(?=\n)/i);
    
    // Process each email section (skip first empty element)
    for (let i = 1; i < emailSections.length; i += 3) {
      const sequence = parseInt(emailSections[i], 10);
      const title = emailSections[i + 1]?.trim();
      const content = emailSections[i + 2] || '';
      
      if (!content) continue;
      
      // Extract fields more flexibly
      const emailTypeMatch = content.match(/\*\*Email Type:\*\*\s*(design|letter)/i);
      const timingMatch = content.match(/\*\*Timing:\*\*\s*(.+?)(?=\n\*\*|\n\n|$)/s);
      const purposeMatch = content.match(/\*\*Purpose:\*\*\s*(.+?)(?=\n\*\*|\n\n|$)/s);
      const ctaMatch = content.match(/\*\*Call-to-Action:\*\*\s*(.+?)(?=\n\*\*|\n---|$)/s);
      
      // Extract key points
      const keyPointsMatch = content.match(/\*\*Key Points:\*\*\s*\n([\s\S]*?)(?=\n\*\*Call-to-Action|\n---|$)/);
      const keyPointsText = keyPointsMatch?.[1] || '';
      const keyPoints = keyPointsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-'))
        .map(line => line.substring(1).trim())
        .filter(point => point.length > 0);
      
      // Only add email if we have the minimum required fields
      const emailType = emailTypeMatch?.[1]?.toLowerCase();
      const purpose = purposeMatch?.[1]?.trim();
      const timing = timingMatch?.[1]?.trim();
      const cta = ctaMatch?.[1]?.trim();
      
      if (emailType && timing && purpose && cta && title) {
        emails.push({
          sequence,
          title: title,
          emailType: emailType as 'design' | 'letter',
          purpose: purpose,
          timing: timing,
          keyPoints,
          cta: cta
        });
      }
    }

    // Only return if we successfully parsed emails
    if (emails.length === 0) {
      console.log('[Flow Parser] No emails parsed. Message length:', message.length);
      console.log('[Flow Parser] Message preview:', message.substring(0, 500));
      return null;
    }

    console.log(`[Flow Parser] Successfully parsed ${emails.length} emails`);
    
    return {
      flowType,
      flowName: flowName || flowType.replace('_', ' '),
      goal,
      targetAudience,
      emails: emails.sort((a, b) => a.sequence - b.sequence)
    };
  } catch (error) {
    console.error('Error parsing flow outline:', error);
    return null;
  }
}

/**
 * Check if user message indicates approval of the outline
 */
export function isOutlineApprovalMessage(message: string): boolean {
  const approvalPhrases = [
    'approved',
    'approve',
    'looks good',
    'look good',
    'let\'s proceed',
    'lets proceed',
    'generate the emails',
    'start creating',
    'go ahead',
    'perfect',
    'great',
    'yes',
    'yep',
    'yeah',
    'proceed',
    'continue',
    'let\'s go',
    'lets go',
    'do it',
    'make them',
    'create them'
  ];
  
  const lowerMessage = message.toLowerCase().trim();
  
  // Check for direct approval phrases
  const hasApprovalPhrase = approvalPhrases.some(phrase => 
    lowerMessage.includes(phrase)
  );
  
  // Check for negations that would invalidate approval
  const hasNegation = lowerMessage.includes('not ') || 
                      lowerMessage.includes('don\'t') ||
                      lowerMessage.includes('wait') ||
                      lowerMessage.includes('hold') ||
                      lowerMessage.includes('change') ||
                      lowerMessage.includes('modify') ||
                      lowerMessage.includes('adjust') ||
                      lowerMessage.includes('edit') ||
                      lowerMessage.includes('update');
  
  return hasApprovalPhrase && !hasNegation;
}

/**
 * Validates that a flow outline is complete and properly structured
 */
export function validateFlowOutline(outline: FlowOutlineData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!outline.flowName) {
    errors.push('Flow name is required');
  }

  if (!outline.goal) {
    errors.push('Flow goal is required');
  }

  if (!outline.targetAudience) {
    errors.push('Target audience is required');
  }

  if (!outline.emails || outline.emails.length === 0) {
    errors.push('At least one email is required');
  }

  outline.emails.forEach((email, index) => {
    if (email.sequence !== index + 1) {
      errors.push(`Email ${index + 1} has incorrect sequence number`);
    }

    if (!email.title) {
      errors.push(`Email ${email.sequence} is missing a title`);
    }

    if (!email.emailType || (email.emailType !== 'design' && email.emailType !== 'letter')) {
      errors.push(`Email ${email.sequence} is missing a valid email type (must be 'design' or 'letter')`);
    }

    if (!email.purpose) {
      errors.push(`Email ${email.sequence} is missing a purpose`);
    }

    if (!email.timing) {
      errors.push(`Email ${email.sequence} is missing timing information`);
    }

    if (!email.keyPoints || email.keyPoints.length === 0) {
      errors.push(`Email ${email.sequence} is missing key points`);
    }

    if (!email.cta) {
      errors.push(`Email ${email.sequence} is missing a CTA`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}


