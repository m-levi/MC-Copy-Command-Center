/**
 * File Parser Utility
 * 
 * Handles parsing of various document types for brand information extraction.
 * Currently supports: TXT, MD, and basic text extraction from other formats.
 * 
 * Future enhancements could include:
 * - PDF parsing with pdf-parse or similar
 * - DOCX parsing with mammoth
 * - CSV/Excel parsing
 */

export interface ParsedFile {
  name: string;
  content: string;
  type: string;
  size: number;
}

/**
 * Read a file and extract text content
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  const content = await extractTextFromFile(file);
  
  return {
    name: file.name,
    content,
    type: file.type,
    size: file.size,
  };
}

/**
 * Extract text content from a file
 */
async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  // Handle different file types
  switch (extension) {
    case 'txt':
    case 'md':
    case 'markdown':
      return await readAsText(file);
    
    case 'pdf':
      // For PDF, we'd need a library like pdf-parse (server-side) or pdf.js (client-side)
      // For now, return an error message or try to read as text
      return await readAsText(file, 'PDF parsing requires server-side processing. Please upload a text file or use the URL option.');
    
    case 'doc':
    case 'docx':
      // For DOCX, we'd need a library like mammoth or docx-preview
      return await readAsText(file, 'DOCX parsing requires server-side processing. Please upload a text file or use the URL option.');
    
    default:
      // Try to read as text anyway
      try {
        return await readAsText(file);
      } catch (error) {
        throw new Error(`Unsupported file type: ${extension || 'unknown'}`);
      }
  }
}

/**
 * Read file as text
 */
function readAsText(file: File, errorMessage?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (errorMessage) {
      reject(new Error(errorMessage));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Validate file before parsing
 */
export function validateFile(file: File, maxSizeMB: number = 5): { valid: boolean; error?: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File "${file.name}" is too large. Maximum size is ${maxSizeMB}MB.`,
    };
  }
  
  const extension = file.name.split('.').pop()?.toLowerCase();
  const supportedExtensions = ['txt', 'md', 'markdown', 'pdf', 'doc', 'docx'];
  
  if (!extension || !supportedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File type ".${extension}" is not supported. Supported types: ${supportedExtensions.join(', ')}`,
    };
  }
  
  return { valid: true };
}

/**
 * Extract text from base64 encoded content
 */
export function decodeBase64Content(base64Content: string): string {
  try {
    return atob(base64Content);
  } catch (error) {
    throw new Error('Failed to decode base64 content');
  }
}

/**
 * Sanitize extracted text
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\t/g, '  ') // Replace tabs with spaces
    .replace(/\s{3,}/g, '\n\n') // Replace multiple spaces with double newline
    .trim();
}

/**
 * Format multiple files' content for AI processing
 */
export function formatFilesForAI(files: ParsedFile[]): string {
  return files
    .map((file) => {
      const sanitized = sanitizeText(file.content);
      return `
=== FILE: ${file.name} ===
Type: ${file.type}
Size: ${Math.round(file.size / 1024)}KB

${sanitized}
`;
    })
    .join('\n\n---\n\n');
}

