# Email Rendering Feature

## Overview
Enhanced email display in chat messages with an email-client-like appearance that makes email content more visually appealing and easier to read.

## What's New

### EmailRenderer Component
A new component (`components/EmailRenderer.tsx`) that intelligently renders email content with:

#### 1. **Email Client Preview**
- **Email Header**: Visual header with icon, subject line, and preview text
- **Styled Body**: Email-like formatting with proper typography and spacing
- **Section Dividers**: Clear visual separators between email sections
- **Footer**: Clean end-of-email marker

#### 2. **Smart Detection**
- Automatically detects if content is an email (looks for markers like "EMAIL SUBJECT LINE:", "HERO SECTION:", etc.)
- If not an email, falls back to standard markdown rendering
- No manual configuration needed

#### 3. **Enhanced Styling**
- **Subject Lines**: Prominent display in the email header with icon
- **Preview Text**: Italicized secondary text below subject
- **Section Headers**: Special styling for HERO SECTION, SECTION 1, CTA, etc. with icons and badges
- **Design Notes**: Highlighted in yellow boxes (text in square brackets)
- **Call-to-Actions**: Styled as button-like elements
- **Typography**: Email-appropriate font sizes and spacing

#### 4. **Toggle Views**
- **Email Preview** (default): Styled email client view
- **Raw Markdown**: Traditional markdown rendering for editing/copying
- Easy toggle between views with a single click

## Features

### Visual Hierarchy
```
┌─────────────────────────────────────┐
│ 📧 Subject Line                     │
│    Preview text in italics          │
├─────────────────────────────────────┤
│                                     │
│ 📌 HERO SECTION                     │
│   Email body content...             │
│                                     │
│ 📌 SECTION 1                        │
│   More content...                   │
│                                     │
│ [Design notes highlighted]          │
│                                     │
│ ┌─────────────────┐                │
│ │  Button: CTA    │                │
│ └─────────────────┘                │
│                                     │
├─────────────────────────────────────┤
│     End of Email Preview            │
└─────────────────────────────────────┘
```

### Color Coding
- **Blue**: Primary elements (icons, section headers, links)
- **Yellow**: Design notes and annotations
- **Gray**: Borders and structural elements
- **Gradient**: Email header and CTA buttons

### Dark Mode Support
All styling fully supports dark mode with appropriate color adjustments.

## Usage

The EmailRenderer is automatically used in ChatMessage components. No additional configuration is needed.

### For Developers

To use the EmailRenderer in other components:

```tsx
import EmailRenderer from '@/components/EmailRenderer';

<EmailRenderer content={emailContent} />
```

### Email Format Detection

The renderer looks for these markers to identify email content:
- `EMAIL SUBJECT LINE:`
- `PREVIEW TEXT:`
- `HERO SECTION:`
- `SECTION [number]:`
- `CALL-TO-ACTION` or `CTA`

### Special Formatting

#### Design Notes
Text in square brackets is highlighted:
```
[Note: Use brand colors here]
```

#### CTA Buttons
Strong text with "button:" or "cta:" prefix becomes a button:
```markdown
**Button: Shop Now**
```

## Benefits

1. **Improved Readability**: Email content is easier to scan and understand
2. **Professional Appearance**: Emails look polished and client-ready
3. **Better Context**: Clear visual distinction between email sections
4. **Flexible Views**: Toggle between preview and raw markdown as needed
5. **Zero Configuration**: Works automatically with existing email content

## Technical Details

### Component Structure
- **File**: `components/EmailRenderer.tsx`
- **Dependencies**: React, ReactMarkdown, remark-gfm
- **Integration**: Used in `ChatMessage.tsx` component

### Performance
- Lightweight: Only parses content once
- Conditional rendering: Falls back to standard markdown for non-email content
- No additional API calls or data fetching

### Accessibility
- Semantic HTML structure
- Proper heading hierarchy
- Color contrast meets WCAG standards
- Keyboard navigation support

## Future Enhancements

Potential improvements for future versions:
- [ ] Custom color themes per brand
- [ ] Email export functionality (HTML/PDF)
- [ ] Preview on different email clients
- [ ] Responsive design preview (mobile/desktop)
- [ ] Image placeholder support
- [ ] A/B test variant comparison view

## Support

If emails are not rendering correctly:
1. Check that content includes email structure markers
2. Use "Show Raw Markdown" to view the underlying content
3. Verify markdown syntax is correct
4. Toggle to "Sections" view for alternative display

---

**Last Updated**: October 27, 2025
**Version**: 1.0.0

