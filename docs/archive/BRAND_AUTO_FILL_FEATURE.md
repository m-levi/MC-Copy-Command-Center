# Brand Auto-Fill Feature

## Overview

The Brand Auto-Fill feature allows users to create brands in three flexible ways:

1. **Manual Entry** - Traditional form-based input
2. **Upload Files** - Upload brand documents (TXT, MD, PDF, DOCX)
3. **AI Extract** - Use AI to automatically extract brand information from URLs and/or uploaded files

## Features

### 1. Manual Entry Mode
- Fill out brand information field by field
- Full control over all brand attributes
- Traditional workflow for users who prefer manual input

### 2. Upload Files Mode
- Upload multiple documents containing brand information
- Supported formats: `.txt`, `.md`, `.pdf`, `.doc`, `.docx`
- Maximum file size: 5MB per file
- Files are analyzed by AI to extract structured brand information

### 3. AI Extract Mode
- Provide a website URL to scrape brand information
- Upload supporting documents for additional context
- AI analyzes all provided content and automatically fills:
  - Brand Name
  - Brand Details
  - Brand Guidelines
  - Copywriting Style Guide
  - Website URL

## User Interface

### Mode Selection
When creating a new brand, users see three options:
- ✍️ **Manual Entry** - Fill out each field
- 📄 **Upload Files** - Brand docs, PDFs
- 🤖 **AI Extract** - From URL & files

### AI Extract Interface
1. **Website URL Input**
   - Optional URL field to scrape brand information
   - Accepts any valid URL format

2. **File Upload Area**
   - Drag-and-drop or click to upload
   - Multiple file support
   - File preview with size display
   - Remove files individually

3. **Extract Button**
   - Validates input (requires URL or files)
   - Shows loading state during extraction
   - Displays errors if extraction fails

4. **Auto-Fill Results**
   - After successful extraction, form switches to manual mode
   - All fields are pre-filled with extracted information
   - Users can review and edit before saving

## Technical Implementation

### API Endpoint
**Route:** `/api/brands/extract`  
**Method:** `POST`

**Request Body:**
```json
{
  "url": "https://example.com",
  "files": [
    {
      "name": "brand-guide.txt",
      "content": "...",
      "type": "text/plain",
      "size": 1024
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "brandInfo": {
    "name": "Brand Name",
    "brand_details": "Comprehensive brand description...",
    "brand_guidelines": "Voice, tone, and personality...",
    "copywriting_style_guide": "Writing style preferences...",
    "website_url": "https://example.com"
  }
}
```

### AI Processing

1. **Content Extraction**
   - Website scraping (basic HTML text extraction)
   - File parsing (text extraction from various formats)
   - Content sanitization and formatting

2. **AI Analysis**
   - Primary: Claude Sonnet 4 (better at content analysis)
   - Fallback: GPT-4o (if Claude fails)
   - Structured JSON output with brand information

3. **Smart Extraction**
   - Analyzes content for brand identity
   - Infers missing information from context
   - Creates comprehensive brand profiles

### File Parsing

The `lib/file-parser.ts` utility handles:
- File validation (size, type)
- Text extraction from supported formats
- Content sanitization
- Format conversion for AI processing

**Supported File Types:**
- `.txt` - Plain text files ✅
- `.md`, `.markdown` - Markdown files ✅
- `.pdf` - PDF documents (basic support)
- `.doc`, `.docx` - Microsoft Word documents (basic support)

## Usage Examples

### Example 1: URL-Based Extraction
```typescript
// User provides only a URL
{
  url: "https://www.example.com",
  files: []
}

// AI extracts:
// - Brand name from page title/headers
// - Brand details from about page content
// - Guidelines from tone/voice analysis
// - Style guide from content patterns
```

### Example 2: File-Based Extraction
```typescript
// User uploads brand guideline documents
{
  url: "",
  files: [
    { name: "brand-guidelines.txt", content: "..." },
    { name: "voice-and-tone.md", content: "..." }
  ]
}

// AI analyzes documents and structures information
```

### Example 3: Combined Approach
```typescript
// User provides both URL and files
{
  url: "https://www.example.com",
  files: [
    { name: "internal-style-guide.txt", content: "..." }
  ]
}

// AI combines website info with document details
// for comprehensive brand profile
```

## Error Handling

### URL Scraping Errors
- Invalid URL format
- Website not accessible (404, timeout)
- Content extraction failure

### File Upload Errors
- File too large (>5MB)
- Unsupported file type
- File read failure
- Parsing errors

### AI Processing Errors
- Both AI providers fail
- Invalid response format
- Insufficient content provided

All errors display user-friendly messages with guidance on how to resolve them.

## Best Practices

### For Users

1. **Provide Multiple Sources**
   - Combine URL with documents for best results
   - More context = better extraction

2. **Use Clean Documents**
   - Well-formatted text files work best
   - Remove extraneous content

3. **Review AI Results**
   - Always review extracted information
   - Edit as needed before saving
   - AI provides a starting point, not final copy

### For Developers

1. **Fallback Strategy**
   - Claude first (better at analysis)
   - GPT-4 as backup
   - Manual entry always available

2. **Content Limits**
   - Website content limited to 8000 chars
   - Prevents token limit issues
   - Focuses on most relevant content

3. **Edge Runtime**
   - API uses Edge runtime for performance
   - Lazy-loaded AI clients
   - Optimized for serverless deployment

## Future Enhancements

### Planned Features
1. **Advanced PDF Parsing**
   - Server-side PDF text extraction
   - Layout preservation
   - Image text recognition (OCR)

2. **DOCX Processing**
   - Full Microsoft Word document parsing
   - Style and formatting preservation
   - Table and list extraction

3. **Multi-Page Scraping**
   - Crawl multiple pages (About, Products, etc.)
   - Intelligent page selection
   - Content deduplication

4. **Brand Asset Detection**
   - Extract logo URLs
   - Detect brand colors
   - Identify font families

5. **Pre-fill Templates**
   - Industry-specific templates
   - Quick start for common brands
   - Customizable templates

## Troubleshooting

### Issue: AI Extraction Takes Too Long
**Solution:** 
- Try with fewer/smaller files
- Use URL-only extraction first
- Check network connection

### Issue: Poor Extraction Quality
**Solution:**
- Provide more specific documents
- Include brand's official guidelines
- Use the website's About/Brand page

### Issue: Can't Upload Files
**Solution:**
- Check file size (<5MB)
- Verify file format is supported
- Try converting to .txt format

### Issue: Website Can't Be Scraped
**Solution:**
- Verify URL is correct and accessible
- Try uploading brand documents instead
- Use manual entry as fallback

## API Keys Required

The feature requires the following environment variables:

```bash
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

Both are used for redundancy and fallback support.

## Security Considerations

1. **File Upload Security**
   - Size limits enforced (5MB)
   - Type validation
   - Content sanitization

2. **URL Scraping Safety**
   - User-Agent headers included
   - Timeout limits
   - Error handling for malicious sites

3. **Data Privacy**
   - Uploaded files processed in memory
   - No permanent storage of uploads
   - AI requests follow provider privacy policies

## Testing

### Manual Testing Checklist

- [ ] Create brand with manual entry
- [ ] Create brand with file upload only
- [ ] Create brand with URL only
- [ ] Create brand with URL + files
- [ ] Upload multiple files
- [ ] Remove uploaded files
- [ ] Test with invalid URL
- [ ] Test with large file (>5MB)
- [ ] Test with unsupported file type
- [ ] Verify AI extraction quality
- [ ] Edit extracted information
- [ ] Save brand after extraction
- [ ] Test in light/dark mode

### Edge Cases

- Empty URL with no files
- Invalid URL format
- Website returns 404
- File read errors
- AI API failures
- Network timeouts
- Very large websites
- Minimal content websites

## Performance

- **Initial Load:** Instant (no data fetched)
- **File Upload:** <100ms per file (client-side)
- **AI Extraction:** 5-15 seconds (depending on content size)
- **URL Scraping:** 2-5 seconds
- **Form Pre-fill:** Instant

## Accessibility

- Keyboard navigation support
- Screen reader friendly labels
- ARIA attributes for dynamic content
- Focus management
- Error announcements
- Loading state indicators

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

**Runtime:**
- `openai` - OpenAI API client
- `@anthropic-ai/sdk` - Anthropic API client
- React 18+
- Next.js 14+

**Development:**
- TypeScript
- Tailwind CSS

No additional libraries required for basic file parsing. Future PDF/DOCX parsing would require:
- `pdf-parse` (server-side PDF)
- `mammoth` (DOCX parsing)

