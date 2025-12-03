import { FlowOutlineData, FlowOutlineEmail, FlowType } from '@/types';

/**
 * Parse a markdown table row into its cells
 */
function parseTableRow(row: string): string[] {
  return row
    .split('|')
    .map(cell => cell.trim())
    .filter(cell => cell.length > 0);
}

/**
 * Parse a markdown table outline from AI response
 * Expected format:
 * 
 * ## Welcome Series Flow Outline
 * 
 * **Goal:** Convert new subscribers...
 * **Target Audience:** New email subscribers
 * 
 * | # | Email Title | Timing | Purpose | Type | CTA |
 * |---|-------------|--------|---------|------|-----|
 * | 1 | Welcome! | Immediate | First impression | design | Shop Now |
 * 
 * **Key Points for Each Email:**
 * **Email 1: Welcome!**
 * - Key point 1
 * - Key point 2
 */
export function parseMarkdownTableOutline(message: string, flowType: FlowType): FlowOutlineData | null {
  try {
    // Check for outline markers - must have a table with | characters
    const hasTable = message.includes('| # |') || message.includes('|---|');
    const hasGoal = message.includes('**Goal:**') || message.includes('Goal:');
    
    if (!hasTable) {
      console.log('[Flow Parser] No markdown table found');
      return null;
    }

    // Extract flow name from header
    const nameMatch = message.match(/##\s*(.+?)\s*(?:Flow\s*)?Outline/i);
    const flowName = nameMatch?.[1]?.replace(/Flow$/i, '').trim() || flowType.replace(/_/g, ' ');

    // Extract goal
    const goalMatch = message.match(/\*\*Goal:\*\*\s*(.+?)(?=\n|$)/i) ||
                      message.match(/Goal:\s*(.+?)(?=\n|$)/i);
    const goal = goalMatch?.[1]?.trim() || '';

    // Extract target audience
    const audienceMatch = message.match(/\*\*Target Audience:\*\*\s*(.+?)(?=\n|$)/i) ||
                          message.match(/Target Audience:\s*(.+?)(?=\n|$)/i);
    const targetAudience = audienceMatch?.[1]?.trim() || '';

    // Find and parse the table
    const lines = message.split('\n');
    let headerRowIndex = -1;
    let separatorRowIndex = -1;
    
    // Find header row (contains # and Email Title)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if ((line.includes('| # |') || line.includes('| #|')) && line.includes('Email Title')) {
        headerRowIndex = i;
      }
      if (headerRowIndex > -1 && line.match(/^\|[\s\-:]+\|/)) {
        separatorRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1 || separatorRowIndex === -1) {
      console.log('[Flow Parser] Could not find table header/separator');
      return null;
    }

    // Parse header to get column indices
    const headerCells = parseTableRow(lines[headerRowIndex]);
    const columnMap: Record<string, number> = {};
    
    headerCells.forEach((cell, index) => {
      const lowerCell = cell.toLowerCase();
      if (lowerCell === '#' || lowerCell === 'seq' || lowerCell === 'sequence') {
        columnMap['sequence'] = index;
      } else if (lowerCell.includes('title') || lowerCell.includes('name')) {
        columnMap['title'] = index;
      } else if (lowerCell.includes('timing') || lowerCell.includes('when') || lowerCell.includes('delay')) {
        columnMap['timing'] = index;
      } else if (lowerCell.includes('purpose') || lowerCell.includes('goal')) {
        columnMap['purpose'] = index;
      } else if (lowerCell === 'type' || lowerCell.includes('email type')) {
        columnMap['type'] = index;
      } else if (lowerCell === 'cta' || lowerCell.includes('call to action') || lowerCell.includes('action')) {
        columnMap['cta'] = index;
      }
    });

    // Parse data rows
    const emails: FlowOutlineEmail[] = [];
    
    for (let i = separatorRowIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Stop at empty line or non-table content
      if (!line.startsWith('|') || line.match(/^\|[\s\-:]+\|$/)) {
        continue;
      }
      
      // Stop if we hit the key points section
      if (line.includes('Key Points') || line.includes('**Email')) {
        break;
      }

      const cells = parseTableRow(line);
      
      if (cells.length < 4) continue;

      const sequence = parseInt(cells[columnMap['sequence'] ?? 0], 10);
      const title = cells[columnMap['title'] ?? 1];
      const timing = cells[columnMap['timing'] ?? 2];
      const purpose = cells[columnMap['purpose'] ?? 3];
      const emailType = (cells[columnMap['type'] ?? 4] || 'design').toLowerCase() as 'design' | 'letter';
      const cta = cells[columnMap['cta'] ?? 5] || '';

      if (isNaN(sequence) || !title) continue;

      emails.push({
        sequence,
        title,
        timing,
        purpose,
        emailType: emailType === 'letter' ? 'letter' : 'design',
        cta,
        keyPoints: [] // Will be populated below
      });
    }

    // Parse key points for each email
    const keyPointsSection = message.match(/\*\*Key Points.*?\*\*[\s\S]*$/i)?.[0] || '';
    
    emails.forEach(email => {
      // Try to find key points section for this email
      const emailKeyPointsMatch = keyPointsSection.match(
        new RegExp(`\\*\\*Email\\s*${email.sequence}[:\\s]*${email.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*([\\s\\S]*?)(?=\\*\\*Email\\s*\\d|$)`, 'i')
      );
      
      if (emailKeyPointsMatch) {
        const keyPointsText = emailKeyPointsMatch[1];
        const keyPoints = keyPointsText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('-') || line.startsWith('•'))
          .map(line => line.replace(/^[-•]\s*/, '').trim())
          .filter(point => point.length > 0);
        
        email.keyPoints = keyPoints;
      }
      
      // If no key points found, generate default based on purpose
      if (email.keyPoints.length === 0) {
        email.keyPoints = [
          `Communicate: ${email.purpose}`,
          `Drive action: ${email.cta || 'Engage with content'}`
        ];
      }
    });

    if (emails.length === 0) {
      console.log('[Flow Parser] No emails parsed from table');
      return null;
    }

    console.log(`[Flow Parser] Successfully parsed ${emails.length} emails from markdown table`);
    
    return {
      flowType,
      flowName,
      goal,
      targetAudience,
      emails: emails.sort((a, b) => a.sequence - b.sequence)
    };
  } catch (error) {
    console.error('[Flow Parser] Error parsing markdown table:', error);
    return null;
  }
}

/**
 * Legacy parser for the old format (kept for backward compatibility)
 */
function parseLegacyOutline(message: string, flowType: FlowType): FlowOutlineData | null {
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
      return null;
    }

    console.log(`[Flow Parser] Successfully parsed ${emails.length} emails (legacy format)`);
    
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
 * Detects if AI response contains a flow outline and parses it
 * Tries markdown table format first, then falls back to legacy format
 */
export function detectFlowOutline(message: string, flowType: FlowType): FlowOutlineData | null {
  // Try markdown table format first (new format)
  const tableResult = parseMarkdownTableOutline(message, flowType);
  if (tableResult && tableResult.emails.length > 0) {
    return tableResult;
  }
  
  // Fall back to legacy format
  const legacyResult = parseLegacyOutline(message, flowType);
  if (legacyResult && legacyResult.emails.length > 0) {
    return legacyResult;
  }
  
  console.log('[Flow Parser] No outline detected in message');
  return null;
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
