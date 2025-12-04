/**
 * Test suite for email-copy-parser
 * Verifies the parser is truly dynamic and bulletproof
 * 
 * Block format: **HERO**, **TEXT**, **BULLETS**, etc. (bold markdown)
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
  test('detects BOLD section markers (known types)', () => {
    expect(isStructuredEmailCopy('**HERO**')).toBe(true);
    expect(isStructuredEmailCopy('**TEXT**')).toBe(true);
    expect(isStructuredEmailCopy('**PRODUCT CARD**')).toBe(true);
    expect(isStructuredEmailCopy('**CTA BLOCK**')).toBe(true);
    expect(isStructuredEmailCopy('**BULLETS**')).toBe(true);
    expect(isStructuredEmailCopy('**PRODUCT GRID**')).toBe(true);
    expect(isStructuredEmailCopy('**SOCIAL PROOF**')).toBe(true);
    expect(isStructuredEmailCopy('**DISCOUNT BAR**')).toBe(true);
  });

  test('detects BOLD section markers (custom/unknown types)', () => {
    // Custom block types should also be detected to match parser capabilities
    expect(isStructuredEmailCopy('**CUSTOM_SECTION**')).toBe(true);
    expect(isStructuredEmailCopy('**MY-BLOCK**')).toBe(true);
    expect(isStructuredEmailCopy('**SPECIAL BLOCK 2**')).toBe(true);
    expect(isStructuredEmailCopy('**NEW_FEATURE_BLOCK**')).toBe(true);
  });

  test('ignores non-block patterns', () => {
    expect(isStructuredEmailCopy('[HERO]')).toBe(false);  // Old format
    expect(isStructuredEmailCopy('[Price]')).toBe(false);
    expect(isStructuredEmailCopy('[Name]')).toBe(false);
    expect(isStructuredEmailCopy('[placeholder]')).toBe(false);
    expect(isStructuredEmailCopy('**random text**')).toBe(false); // Lowercase - not a block
    expect(isStructuredEmailCopy('**Mixed Case**')).toBe(false); // Mixed case - not a block
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
**Approach:** A bold and direct approach.

**HERO**
Headline: Welcome to our store
Subhead: The best products await
CTA: Shop Now

---

**TEXT**
Body: This is our story.

---

Design notes: Keep it simple.
`;
    
    const result = parseEmailCopy(content);
    
    expect(result).not.toBeNull();
    // Approach line is stripped from preamble
    expect(result!.sections.length).toBe(2);
    expect(result!.sections[0].name).toBe('HERO');
    expect(result!.sections[0].type).toBe('hero');
    expect(result!.sections[0].fields.length).toBe(3);
    expect(result!.sections[1].name).toBe('TEXT');
    expect(result!.sections[1].type).toBe('text');
    expect(result!.postamble).toContain('Design notes');
  });

  test('handles all block types', () => {
    const content = `
**HERO**
Headline: Test Hero

**TEXT**
Body: Test Text

**BULLETS**
Headline: Features
• Feature 1
• Feature 2

**PRODUCT CARD**
Product Name: Widget
Price: $99
One-liner: Great widget
CTA: Buy Now

**PRODUCT GRID**
Headline: Our Products
Products:
**Widget A** | $49 | First product
**Widget B** | $59 | Second product
CTA: Shop All

**CTA BLOCK**
Headline: Take Action
CTA: Click Here

**SOCIAL PROOF**
Quote: "Amazing product!"
Attribution: — John D.

**DISCOUNT BAR**
Code: SAVE20
Message: Use code SAVE20 for 20% off
Expiry: Ends Sunday
`;
    
    const result = parseEmailCopy(content);
    
    expect(result).not.toBeNull();
    expect(result!.sections.length).toBe(8);
    expect(result!.sections[0].type).toBe('hero');
    expect(result!.sections[1].type).toBe('text');
    expect(result!.sections[2].type).toBe('bullets');
    expect(result!.sections[3].type).toBe('product_card');
    expect(result!.sections[4].type).toBe('product_grid');
    expect(result!.sections[5].type).toBe('cta_block');
    expect(result!.sections[6].type).toBe('social_proof');
    expect(result!.sections[7].type).toBe('discount_bar');
  });

  test('handles unknown section types gracefully', () => {
    const content = `
**COMPLETELY NEW SECTION TYPE**
Custom Field: Some value
Another Field: Another value
`;
    
    const result = parseEmailCopy(content);
    
    expect(result).not.toBeNull();
    expect(result!.sections[0].name).toBe('COMPLETELY NEW SECTION TYPE');
    expect(result!.sections[0].type).toBe('unknown');
    expect(result!.sections[0].fields.length).toBe(2);
  });

  test('captures unknown field labels', () => {
    const content = `
**HERO**
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
**BULLETS**
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
**TEXT**
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

  test('handles colons in field values', () => {
    const content = `
**HERO**
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
**HERO**
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
**BULLETS**
- Dash bullet
• Unicode bullet
* Asterisk bullet
`;
    
    const result = parseEmailCopy(content);
    
    expect(result).not.toBeNull();
    expect(result!.sections[0].bullets.length).toBe(3);
  });

  test('parses product grid products', () => {
    const content = `
**PRODUCT GRID**
Headline: Customer Favorites
Products:
**The Hudson** | $68 ~~$97~~ | Classic round, lightweight
**The Clement** | $75 ~~$107~~ | Bold square, spring hinges
CTA: Shop All
`;
    
    const result = parseEmailCopy(content);
    
    expect(result).not.toBeNull();
    expect(result!.sections[0].products.length).toBe(2);
    expect(result!.sections[0].products[0].name).toBe('The Hudson');
    expect(result!.sections[0].products[0].price).toBe('$68 ~~$97~~');
    expect(result!.sections[0].products[0].description).toBe('Classic round, lightweight');
  });

  test('strips approach line from preamble', () => {
    const content = `
**Approach:** This is the creative angle for this version.

**HERO**
Headline: Test
`;
    
    const result = parseEmailCopy(content);
    
    expect(result).not.toBeNull();
    // The approach line should be stripped since it's shown elsewhere
    expect(result!.preamble).toBe('');
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
