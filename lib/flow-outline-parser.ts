import { FlowOutlineData, FlowOutlineEmail, FlowType } from '@/types';

/**
 * Detects if AI response contains a flow outline
 * Parses it into structured FlowOutlineData
 */
export function detectFlowOutline(message: string, flowType: FlowType): FlowOutlineData | null {
  // Look for outline structure markers
  const hasOutlineMarkers = message.includes('OUTLINE') && 
                           message.includes('Flow Goal:') && 
                           message.includes('Target Audience:');
  
  if (!hasOutlineMarkers) {
    return null;
  }

  try {
    // Extract flow goal
    const goalMatch = message.match(/\*\*Flow Goal:\*\*\s*(.+?)(?=\n|$)/);
    const goal = goalMatch ? goalMatch[1].trim() : '';

    // Extract target audience
    const audienceMatch = message.match(/\*\*Target Audience:\*\*\s*(.+?)(?=\n|$)/);
    const targetAudience = audienceMatch ? audienceMatch[1].trim() : '';

    // Extract flow name (from the outline header)
    const nameMatch = message.match(/##\s*(.+?)\s*OUTLINE/);
    const flowName = nameMatch ? nameMatch[1].trim() : '';

    // Extract emails
    const emails: FlowOutlineEmail[] = [];
    const emailRegex = /###\s*Email\s*(\d+):\s*(.+?)\n[\s\S]*?\*\*Timing:\*\*\s*(.+?)\n[\s\S]*?\*\*Purpose:\*\*\s*(.+?)\n[\s\S]*?\*\*Key Points:\*\*\n([\s\S]*?)\*\*Call-to-Action:\*\*\s*(.+?)(?=\n\n|---)/g;
    
    let match;
    while ((match = emailRegex.exec(message)) !== null) {
      const [, sequence, title, timing, purpose, keyPointsText, cta] = match;
      
      // Parse key points
      const keyPoints = keyPointsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-'))
        .map(line => line.substring(1).trim())
        .filter(point => point.length > 0);

      emails.push({
        sequence: parseInt(sequence, 10),
        title: title.trim(),
        purpose: purpose.trim(),
        timing: timing.trim(),
        keyPoints,
        cta: cta.trim()
      });
    }

    // Only return if we successfully parsed emails
    if (emails.length === 0) {
      return null;
    }

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


