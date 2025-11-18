import { FlowOutlineData, FlowOutlineEmail } from '@/types';

/**
 * Generates Mermaid flowchart syntax from FlowOutlineData
 * Creates a visual representation of the email flow sequence
 */
export function generateMermaidChart(outline: FlowOutlineData): string {
  if (!outline.emails || outline.emails.length === 0) {
    return '';
  }

  // Start building the Mermaid flowchart
  const lines: string[] = [];
  
  // Flowchart type and direction (top to bottom)
  lines.push('flowchart TD');
  
  // Start node
  const startNodeId = 'Start';
  const startLabel = `🎯 ${outline.flowName} Start`;
  lines.push(`    ${startNodeId}([${startLabel}])`);
  
  // Style start node
  lines.push(`    style ${startNodeId} fill:#10b981,stroke:#059669,stroke-width:3px,color:#fff`);
  
  // Process each email in sequence
  let previousNodeId = startNodeId;
  
  outline.emails.forEach((email: FlowOutlineEmail, index: number) => {
    const emailNodeId = `E${email.sequence}`;
    const emailLabel = `Email ${email.sequence}: ${escapeMermaidText(email.title)}`;
    
    // Determine node style based on email type
    const nodeShape = email.emailType === 'design' ? '[' : '([';
    const nodeShapeClose = email.emailType === 'design' ? ']' : '])';
    
    // Create node
    lines.push(`    ${emailNodeId}${nodeShape}${emailLabel}${nodeShapeClose}`);
    
    // Style node based on email type
    if (email.emailType === 'design') {
      lines.push(`    style ${emailNodeId} fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff`);
    } else {
      lines.push(`    style ${emailNodeId} fill:#a855f7,stroke:#9333ea,stroke-width:2px,color:#fff`);
    }
    
    // Create connection from previous node
    // Use quotes around timing text to avoid parsing issues
    const timing = sanitizeForMermaid(email.timing);
    lines.push(`    ${previousNodeId} -->|"${timing}"| ${emailNodeId}`);
    
    previousNodeId = emailNodeId;
  });
  
  // End node
  const endNodeId = 'End';
  const endLabel = '✓ Flow Complete';
  lines.push(`    ${endNodeId}([${endLabel}])`);
  lines.push(`    ${previousNodeId} --> ${endNodeId}`);
  lines.push(`    style ${endNodeId} fill:#10b981,stroke:#059669,stroke-width:3px,color:#fff`);
  
  return lines.join('\n');
}

/**
 * Escapes special characters in Mermaid text to prevent syntax errors
 */
function escapeMermaidText(text: string): string {
  if (!text) return '';
  
  // For node labels, use basic HTML entities
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .trim();
}

/**
 * Sanitizes text for use in quoted Mermaid edge labels
 * Removes problematic characters while keeping text readable
 */
function sanitizeForMermaid(text: string): string {
  if (!text) return '';
  
  // For edge labels (used in quotes), just escape quotes and keep it simple
  return text
    .replace(/"/g, "'")  // Replace double quotes with single quotes
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\r/g, '')  // Remove carriage returns
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

