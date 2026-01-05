/**
 * Artifact Export Utilities
 * Export artifacts to various formats: PDF, HTML, Markdown
 */

import { EmailArtifactWithContent, ArtifactVariant, ArtifactKind } from '@/types/artifacts';
import toast from 'react-hot-toast';

// =====================================================
// CONTENT HELPERS
// =====================================================

/**
 * Get the content for a specific variant
 */
function getVariantContent(artifact: EmailArtifactWithContent, variant: ArtifactVariant): string {
  switch (variant) {
    case 'a':
      return artifact.version_a_content || artifact.content || '';
    case 'b':
      return artifact.version_b_content || '';
    case 'c':
      return artifact.version_c_content || '';
    default:
      return artifact.content || '';
  }
}

/**
 * Get the approach for a specific variant
 */
function getVariantApproach(artifact: EmailArtifactWithContent, variant: ArtifactVariant): string | undefined {
  switch (variant) {
    case 'a':
      return artifact.version_a_approach;
    case 'b':
      return artifact.version_b_approach;
    case 'c':
      return artifact.version_c_approach;
    default:
      return undefined;
  }
}

/**
 * Clean content for export - remove markdown formatting artifacts
 */
function cleanContent(content: string): string {
  return content
    .replace(/^\*\*Approach:\*\*\s*.+?\n*/gim, '')
    .replace(/^```\n?/gm, '')
    .replace(/\n?```$/gm, '')
    .trim();
}

/**
 * Get file-safe name from title
 */
function getFileName(title: string, extension: string): string {
  const safeName = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '');
  const date = new Date().toISOString().split('T')[0];
  return `${safeName}-${date}.${extension}`;
}

// =====================================================
// MARKDOWN EXPORT
// =====================================================

/**
 * Export artifact as Markdown
 */
export async function exportAsMarkdown(
  artifact: EmailArtifactWithContent,
  selectedVariant: ArtifactVariant,
  includeAllVariants: boolean = false
): Promise<void> {
  try {
    let markdown = `# ${artifact.title}\n\n`;
    markdown += `**Type:** ${getKindLabel(artifact.kind)}\n`;
    markdown += `**Created:** ${new Date(artifact.created_at).toLocaleString()}\n`;
    if (artifact.version_count && artifact.version_count > 1) {
      markdown += `**Version:** ${artifact.version_count}\n`;
    }
    markdown += `\n---\n\n`;

    if (includeAllVariants) {
      // Export all available variants
      const variants: ArtifactVariant[] = ['a', 'b', 'c'];
      for (const variant of variants) {
        const content = getVariantContent(artifact, variant);
        if (content) {
          markdown += `## Version ${variant.toUpperCase()}\n\n`;
          const approach = getVariantApproach(artifact, variant);
          if (approach) {
            markdown += `> **Approach:** ${approach}\n\n`;
          }
          markdown += cleanContent(content);
          markdown += '\n\n---\n\n';
        }
      }
    } else {
      // Export only selected variant
      const content = getVariantContent(artifact, selectedVariant);
      const approach = getVariantApproach(artifact, selectedVariant);

      if (approach) {
        markdown += `> **Approach:** ${approach}\n\n`;
      }
      markdown += cleanContent(content);
    }

    // Create and trigger download
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, getFileName(artifact.title, 'md'));
    toast.success('Exported as Markdown');
  } catch (error) {
    console.error('Error exporting as Markdown:', error);
    toast.error('Failed to export as Markdown');
  }
}

// =====================================================
// HTML EXPORT
// =====================================================

/**
 * Convert simple markdown-like content to HTML
 */
function contentToHtml(content: string): string {
  const cleaned = cleanContent(content);

  // Parse the content into sections and fields
  const lines = cleaned.split('\n');
  let html = '';
  let inSection = false;

  const knownLabels = ['Headline', 'Subhead', 'Subheadline', 'Body', 'CTA', 'Accent', 'Quote', 'Attribution', 'Product Name', 'Price', 'One-liner', 'Code', 'Message', 'Expiry'];
  const labelPattern = new RegExp(`^(${knownLabels.join('|')}):`, 'i');

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (inSection) {
        html += '<br>';
      }
      continue;
    }

    // Section headers like **HERO**
    const blockMatch = trimmed.match(/^\*\*([A-Z][A-Z0-9 _-]*)\*\*$/);
    if (blockMatch) {
      if (inSection) html += '</div>';
      html += `<div class="section"><h3 class="section-header">${blockMatch[1]}</h3>`;
      inSection = true;
      continue;
    }

    // Field labels like "Headline: text"
    const fieldMatch = trimmed.match(labelPattern);
    if (fieldMatch) {
      const colonIndex = trimmed.indexOf(':');
      const label = trimmed.slice(0, colonIndex);
      const value = trimmed.slice(colonIndex + 1).trim();
      html += `<div class="field"><span class="label">${escapeHtml(label)}:</span> <span class="value">${escapeHtml(value)}</span></div>`;
      continue;
    }

    // Bullet points
    if (/^[•\-\*]\s+/.test(trimmed)) {
      html += `<div class="bullet">&bull; ${escapeHtml(trimmed.replace(/^[•\-\*]\s+/, ''))}</div>`;
      continue;
    }

    // Regular text
    html += `<p>${escapeHtml(trimmed)}</p>`;
  }

  if (inSection) html += '</div>';

  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Export artifact as HTML
 */
export async function exportAsHtml(
  artifact: EmailArtifactWithContent,
  selectedVariant: ArtifactVariant,
  includeAllVariants: boolean = false
): Promise<void> {
  try {
    const styles = `
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          line-height: 1.6;
          color: #1a1a1a;
        }
        h1 {
          font-size: 28px;
          margin-bottom: 8px;
          color: #111;
        }
        .meta {
          color: #666;
          font-size: 14px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e5e5e5;
        }
        .variant {
          margin-bottom: 32px;
          padding: 24px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .variant h2 {
          font-size: 18px;
          color: #374151;
          margin: 0 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        .approach {
          background: #ede9fe;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 16px;
          border-left: 3px solid #8b5cf6;
          font-size: 14px;
          color: #5b21b6;
        }
        .section {
          margin-bottom: 20px;
        }
        .section-header {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6b7280;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        .field {
          margin-bottom: 8px;
          font-family: 'SF Mono', Menlo, monospace;
          font-size: 14px;
        }
        .label {
          font-weight: 600;
          color: #4b5563;
        }
        .value {
          color: #111827;
        }
        .bullet {
          margin-left: 16px;
          margin-bottom: 4px;
          font-family: 'SF Mono', Menlo, monospace;
          font-size: 14px;
        }
        p {
          margin: 0 0 8px 0;
          font-family: 'SF Mono', Menlo, monospace;
          font-size: 14px;
        }
        .footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #e5e5e5;
          font-size: 12px;
          color: #9ca3af;
          text-align: center;
        }
      </style>
    `;

    let bodyContent = `<h1>${escapeHtml(artifact.title)}</h1>`;
    bodyContent += `<div class="meta">`;
    bodyContent += `<strong>Type:</strong> ${getKindLabel(artifact.kind)}`;
    bodyContent += ` &nbsp;|&nbsp; <strong>Created:</strong> ${new Date(artifact.created_at).toLocaleString()}`;
    if (artifact.version_count && artifact.version_count > 1) {
      bodyContent += ` &nbsp;|&nbsp; <strong>Version:</strong> ${artifact.version_count}`;
    }
    bodyContent += `</div>`;

    if (includeAllVariants) {
      const variants: ArtifactVariant[] = ['a', 'b', 'c'];
      for (const variant of variants) {
        const content = getVariantContent(artifact, variant);
        if (content) {
          bodyContent += `<div class="variant">`;
          bodyContent += `<h2>Version ${variant.toUpperCase()}</h2>`;
          const approach = getVariantApproach(artifact, variant);
          if (approach) {
            bodyContent += `<div class="approach"><strong>Approach:</strong> ${escapeHtml(approach)}</div>`;
          }
          bodyContent += contentToHtml(content);
          bodyContent += `</div>`;
        }
      }
    } else {
      const content = getVariantContent(artifact, selectedVariant);
      const approach = getVariantApproach(artifact, selectedVariant);

      bodyContent += `<div class="variant">`;
      if (approach) {
        bodyContent += `<div class="approach"><strong>Approach:</strong> ${escapeHtml(approach)}</div>`;
      }
      bodyContent += contentToHtml(content);
      bodyContent += `</div>`;
    }

    bodyContent += `<div class="footer">Exported from MoonCommerce Command Center</div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(artifact.title)}</title>
  ${styles}
</head>
<body>
  ${bodyContent}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, getFileName(artifact.title, 'html'));
    toast.success('Exported as HTML');
  } catch (error) {
    console.error('Error exporting as HTML:', error);
    toast.error('Failed to export as HTML');
  }
}

// =====================================================
// PDF EXPORT
// =====================================================

/**
 * Export artifact as PDF using browser print
 */
export async function exportAsPdf(
  artifact: EmailArtifactWithContent,
  selectedVariant: ArtifactVariant,
  includeAllVariants: boolean = false
): Promise<void> {
  try {
    // Generate HTML content first
    const styles = `
      <style>
        @page { margin: 1in; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 100%;
          margin: 0;
          padding: 0;
          line-height: 1.6;
          color: #1a1a1a;
          font-size: 12pt;
        }
        h1 {
          font-size: 22pt;
          margin-bottom: 8px;
          color: #111;
        }
        .meta {
          color: #666;
          font-size: 10pt;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #ccc;
        }
        .variant {
          margin-bottom: 24px;
          padding: 16px;
          background: #f5f5f5;
          border-radius: 4px;
          page-break-inside: avoid;
        }
        .variant h2 {
          font-size: 14pt;
          color: #333;
          margin: 0 0 12px 0;
          padding-bottom: 6px;
          border-bottom: 1px solid #ddd;
        }
        .approach {
          background: #e8e4f3;
          padding: 10px 12px;
          border-radius: 4px;
          margin-bottom: 12px;
          border-left: 3px solid #7c3aed;
          font-size: 10pt;
          color: #4c1d95;
        }
        .section {
          margin-bottom: 16px;
        }
        .section-header {
          font-size: 9pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #666;
          margin: 0 0 8px 0;
          padding-bottom: 4px;
          border-bottom: 1px solid #ddd;
        }
        .field {
          margin-bottom: 6px;
          font-family: 'Courier New', monospace;
          font-size: 10pt;
        }
        .label {
          font-weight: 600;
          color: #444;
        }
        .bullet {
          margin-left: 12px;
          margin-bottom: 3px;
          font-family: 'Courier New', monospace;
          font-size: 10pt;
        }
        p {
          margin: 0 0 6px 0;
          font-family: 'Courier New', monospace;
          font-size: 10pt;
        }
        .footer {
          margin-top: 24px;
          padding-top: 12px;
          border-top: 1px solid #ccc;
          font-size: 9pt;
          color: #999;
          text-align: center;
        }
      </style>
    `;

    let bodyContent = `<h1>${escapeHtml(artifact.title)}</h1>`;
    bodyContent += `<div class="meta">`;
    bodyContent += `<strong>Type:</strong> ${getKindLabel(artifact.kind)}`;
    bodyContent += ` | <strong>Created:</strong> ${new Date(artifact.created_at).toLocaleString()}`;
    if (artifact.version_count && artifact.version_count > 1) {
      bodyContent += ` | <strong>Version:</strong> ${artifact.version_count}`;
    }
    bodyContent += `</div>`;

    if (includeAllVariants) {
      const variants: ArtifactVariant[] = ['a', 'b', 'c'];
      for (const variant of variants) {
        const content = getVariantContent(artifact, variant);
        if (content) {
          bodyContent += `<div class="variant">`;
          bodyContent += `<h2>Version ${variant.toUpperCase()}</h2>`;
          const approach = getVariantApproach(artifact, variant);
          if (approach) {
            bodyContent += `<div class="approach"><strong>Approach:</strong> ${escapeHtml(approach)}</div>`;
          }
          bodyContent += contentToHtml(content);
          bodyContent += `</div>`;
        }
      }
    } else {
      const content = getVariantContent(artifact, selectedVariant);
      const approach = getVariantApproach(artifact, selectedVariant);

      bodyContent += `<div class="variant">`;
      if (approach) {
        bodyContent += `<div class="approach"><strong>Approach:</strong> ${escapeHtml(approach)}</div>`;
      }
      bodyContent += contentToHtml(content);
      bodyContent += `</div>`;
    }

    bodyContent += `<div class="footer">Exported from MoonCommerce Command Center</div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(artifact.title)}</title>
  ${styles}
</head>
<body>
  ${bodyContent}
</body>
</html>`;

    // Open in new window and trigger print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
        // Close window after a short delay to allow print dialog
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      };

      toast.success('Opening print dialog for PDF');
    } else {
      toast.error('Unable to open print window. Check popup blocker settings.');
    }
  } catch (error) {
    console.error('Error exporting as PDF:', error);
    toast.error('Failed to export as PDF');
  }
}

// =====================================================
// COPY TO CLIPBOARD
// =====================================================

/**
 * Copy artifact content to clipboard as plain text
 */
export async function copyToClipboard(
  artifact: EmailArtifactWithContent,
  selectedVariant: ArtifactVariant
): Promise<void> {
  try {
    const content = getVariantContent(artifact, selectedVariant);
    const cleaned = cleanContent(content);

    await navigator.clipboard.writeText(cleaned);
    toast.success('Copied to clipboard');
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    toast.error('Failed to copy to clipboard');
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get human-readable label for artifact kind
 */
function getKindLabel(kind: ArtifactKind): string {
  const labels: Record<ArtifactKind, string> = {
    email: 'Email Copy',
    flow: 'Email Flow',
    campaign: 'Campaign',
    template: 'Template',
    subject_lines: 'Subject Lines',
    content_brief: 'Content Brief',
    email_brief: 'Email Brief',
    calendar: 'Email Calendar',
    markdown: 'Document',
    spreadsheet: 'Spreadsheet',
    code: 'Code',
    checklist: 'Checklist',
  };
  return labels[kind] || kind;
}

// =====================================================
// EXPORT ALL VARIANTS
// =====================================================

/**
 * Export all variants as a zip file (for when there are multiple)
 */
export async function exportAllVariants(
  artifact: EmailArtifactWithContent,
  format: 'markdown' | 'html'
): Promise<void> {
  if (format === 'markdown') {
    await exportAsMarkdown(artifact, 'a', true);
  } else {
    await exportAsHtml(artifact, 'a', true);
  }
}
