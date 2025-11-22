import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Exports a rendered Mermaid chart element to PDF
 * @param elementId - The ID of the DOM element containing the rendered Mermaid chart
 * @param fileName - The filename for the PDF (without extension)
 */
export async function exportChartToPDF(
  elementId: string,
  fileName: string
): Promise<void> {
  try {
    const element = document.getElementById(elementId);
    
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    // Get the SVG element (Mermaid renders as SVG)
    // The SVG might be directly in the element or nested
    const svgElement = element.querySelector('svg') || element.querySelector('div svg');
    
    if (!svgElement) {
      throw new Error('Mermaid chart SVG not found. Chart may not be rendered yet.');
    }

    // Calculate dimensions
    const svgRect = svgElement.getBoundingClientRect();
    const width = svgRect.width;
    const height = svgRect.height;

    // Add padding around the chart
    const padding = 40;
    const pdfWidth = width + (padding * 2);
    const pdfHeight = height + (padding * 2) + 60; // Extra space for title

    // Create PDF
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [pdfWidth, pdfHeight]
    });

    // Set background color (white)
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

    // Add title at the top
    pdf.setFontSize(18);
    pdf.setTextColor(0, 0, 0);
    pdf.text(fileName, padding, padding - 10);

    // Add date below title
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    pdf.text(`Generated on ${dateStr}`, padding, padding + 10);

    // Convert SVG to canvas
    const canvas = await html2canvas(element, {
      background: '#ffffff',
      useCORS: true,
      logging: false,
      width: width,
      height: height
    } as any);

    // Convert canvas to image data
    const imgData = canvas.toDataURL('image/png');

    // Calculate image dimensions for PDF (maintain aspect ratio)
    const imgWidth = width;
    const imgHeight = height;
    const maxWidth = pdfWidth - (padding * 2);
    const maxHeight = pdfHeight - (padding * 2) - 40; // Account for title space

    let finalWidth = imgWidth;
    let finalHeight = imgHeight;

    // Scale if needed to fit
    if (finalWidth > maxWidth) {
      const ratio = maxWidth / finalWidth;
      finalWidth = maxWidth;
      finalHeight = finalHeight * ratio;
    }

    if (finalHeight > maxHeight) {
      const ratio = maxHeight / finalHeight;
      finalHeight = maxHeight;
      finalWidth = finalWidth * ratio;
    }

    // Center the image
    const xPos = (pdfWidth - finalWidth) / 2;
    const yPos = padding + 40; // Below title

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', xPos, yPos, finalWidth, finalHeight);

    // Generate filename with date
    const sanitizedFileName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().split('T')[0];
    const finalFileName = `${sanitizedFileName}_flowchart_${timestamp}.pdf`;

    // Save PDF
    pdf.save(finalFileName);
  } catch (error) {
    console.error('Error exporting chart to PDF:', error);
    throw error;
  }
}

