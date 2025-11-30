/**
 * Test suite for email-copy-parser
 * Verifies the parser is truly dynamic and bulletproof
 */

import { 
  parseEmailCopy, 
  isStructuredEmailCopy,
  isHeadlineField,
  isSubheadField,
  isBodyField,
  isCtaField,
} from '../email-copy-parser';

describe('isStructuredEmailCopy', () => {
  test('detects UPPERCASE section markers', () => {
    expect(isStructuredEmailCopy('[HERO]')).toBe(true);
    expect(isStructuredEmailCopy('[TEXT]')).toBe(true);
    expect(isStructuredEmailCopy('[PRODUCT CARD]')).toBe(true);
    expect(isStructuredEmailCopy('[CTA BLOCK]')).toBe(true);
    expect(isStructuredEmailCopy('[CUSTOM_SECTION]')).toBe(true);
    expect(isStructuredEmailCopy('[NEW-SECTION-TYPE]')).toBe(true);
  });

  test('ignores mixed-case placeholders', () => {
    expect(isStructuredEmailCopy('[Price]')).toBe(false);
    expect(isStructuredEmailCopy('[Name]')).toBe(false);
    expect(isStructuredEmailCopy('[placeholder]')).toBe(false);
  });

  test('handles null/empty content', () => {
    expect(isStructuredEmailCopy('')).toBe(false);
    expect(isStructuredEmailCopy(null as any)).toBe(false);
    expect(isStructuredEmailCopy(undefined as any)).toBe(false);
  });
});

describe('parseEmailCopy', () => {
  test('parses standard email structure', () => {
    const content = `
Approach: A bold and direct approach.

[HERO]
Headline: Welcome to our store
Subhead: The best products await
CTA: Shop Now

---

[TEXT]
Body: This is our story.

---

Design notes: Keep it simple.
`;
    
    const result = parseEmailCopy(content);
    
    expect(result).not.toBeNull();
    expect(result!.preamble).toContain('Approach');
    expect(result!.sections.length).toBe(2);
    expect(result!.sections[0].name).toBe('HERO');
    expect(result!.sections[0].fields.length).toBe(3);
    expect(result!.sections[1].name).toBe('TEXT');
    expect(result!.postamble).toContain('Design notes');
  });

  test('handles unknown section types gracefully', () => {
    const content = `
[COMPLETELY NEW SECTION TYPE]
Custom Field: Some value
Another Field: Another value
`;
    
    const result = parseEmailCopy(content);
    
    expect(result).not.toBeNull();
    expect(result!.sections[0].name).toBe('COMPLETELY NEW SECTION TYPE');
    expect(result!.sections[0].fields.length).toBe(2);
  });

  test('captures unknown field labels', () => {
    const content = `
[HERO]
Product Name: Widget Pro
Price: $99.99
SKU: WP-001
Custom Rating: 5 stars
`;
    
    const result = parseEmailCopy(content);
    
    expect(result).not.toBeNull();
    expect(result!.sections[0].fields.length).toBe(4);
    expect(result!.sections[0].fields.map(f => f.label)).toEqual([
      'Product Name', 'Price', 'SKU', 'Custom Rating'
    ]);
  });

  test('captures bullet lists', () => {
    const content = `
[BULLETS]
Headline: Key Features
- Fast shipping
- Easy returns
- 24/7 support
`;
    
    const result = parseEmailCopy(content);
    
    expect(result).not.toBeNull();
    expect(result!.sections[0].bullets).toEqual([
      'Fast shipping', 'Easy returns', '24/7 support'
    ]);
  });

  test('captures unlabeled content (lines without Label: format)', () => {
    const content = `
[TEXT]
This is a line without a label
Headline: Actual headline
Another line without label
`;
    
    const result = parseEmailCopy(content);
    
    expect(result).not.toBeNull();
    expect(result!.sections[0].unlabeledContent).toContain('This is a line without a label');
    expect(result!.sections[0].unlabeledContent).toContain('Another line without label');
    expect(result!.sections[0].fields.length).toBe(1);
  });

  test('does NOT parse [Price] as a section marker', () => {
    const content = `
[PRODUCT CARD]
Product Name: Widget
Price: [Price]
One-liner: Best widget ever
CTA: Buy Now
`;
    
    const result = parseEmailCopy(content);
    
    expect(result).not.toBeNull();
    expect(result!.sections.length).toBe(1);
    expect(result!.sections[0].name).toBe('PRODUCT CARD');
    expect(result!.sections[0].fields.find(f => f.label === 'Price')?.value).toBe('[Price]');
  });

  test('handles colons in field values', () => {
    const content = `
[HERO]
Headline: Time: Now is the moment
Body: The ratio is 1:2:3 for best results
`;
    
    const result = parseEmailCopy(content);
    
    expect(result).not.toBeNull();
    expect(result!.sections[0].fields.find(f => f.label === 'Headline')?.value).toBe('Time: Now is the moment');
    expect(result!.sections[0].fields.find(f => f.label === 'Body')?.value).toBe('The ratio is 1:2:3 for best results');
  });

  test('preserves raw content for fallback', () => {
    const content = `
[HERO]
Headline: Test
Body: Some text
`;
    
    const result = parseEmailCopy(content);
    
    expect(result).not.toBeNull();
    expect(result!.sections[0].rawContent).toContain('Headline: Test');
    expect(result!.sections[0].rawContent).toContain('Body: Some text');
  });

  test('handles multiple bullet formats', () => {
    const content = `
[BULLETS]
- Dash bullet
• Unicode bullet
* Asterisk bullet
`;
    
    const result = parseEmailCopy(content);
    
    expect(result).not.toBeNull();
    expect(result!.sections[0].bullets.length).toBe(3);
  });
});

describe('field type detection', () => {
  test('isHeadlineField handles variations', () => {
    expect(isHeadlineField('Headline')).toBe(true);
    expect(isHeadlineField('headline')).toBe(true);
    expect(isHeadlineField('Title')).toBe(true);
    expect(isHeadlineField('Header')).toBe(true);
    expect(isHeadlineField('Random')).toBe(false);
  });

  test('isSubheadField handles variations including One-liner', () => {
    expect(isSubheadField('Subhead')).toBe(true);
    expect(isSubheadField('One-liner')).toBe(true);
    expect(isSubheadField('One liner')).toBe(true);
    expect(isSubheadField('Tagline')).toBe(true);
    expect(isSubheadField('Random')).toBe(false);
  });

  test('isBodyField handles variations', () => {
    expect(isBodyField('Body')).toBe(true);
    expect(isBodyField('Copy')).toBe(true);
    expect(isBodyField('Description')).toBe(true);
    expect(isBodyField('Random')).toBe(false);
  });

  test('isCtaField handles variations', () => {
    expect(isCtaField('CTA')).toBe(true);
    expect(isCtaField('Button')).toBe(true);
    expect(isCtaField('Call to Action')).toBe(true);
    expect(isCtaField('Random')).toBe(false);
  });
});

