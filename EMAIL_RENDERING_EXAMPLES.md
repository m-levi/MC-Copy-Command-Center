# Email Rendering Examples

This document shows examples of how different email content will be rendered with the new EmailRenderer component.

## Example 1: Basic Email Structure

### Input (What AI generates):
```markdown
EMAIL SUBJECT LINE: 🎉 Flash Sale: 50% Off Everything!

PREVIEW TEXT: Limited time offer - Don't miss out on our biggest sale of the year

HERO SECTION:
**FLASH SALE**
# 50% Off Sitewide
Use code: FLASH50 at checkout
Ends midnight tonight!

SECTION 1: Featured Products
Check out our best-selling items, now at half price:
- Premium Wireless Headphones
- Smart Home Bundle
- Fitness Tracker Pro

**Button: Shop Now**

SECTION 2: Why Shop With Us
✓ Free shipping on orders over $50
✓ 30-day money-back guarantee
✓ 24/7 customer support

CALL-TO-ACTION SECTION:
Don't wait! Sale ends in:
**6 hours**

**CTA: Claim Your Discount**

[Design Note: Use brand's primary color for CTA button]
```

### Output Appearance:
```
╔═══════════════════════════════════════════════╗
║ 📧  Flash Sale: 50% Off Everything!          ║
║     Limited time offer - Don't miss out...   ║
╠═══════════════════════════════════════════════╣
║                                               ║
║ 📌 HERO SECTION                               ║
║   FLASH SALE                                  ║
║   50% Off Sitewide                            ║
║   Use code: FLASH50 at checkout               ║
║   Ends midnight tonight!                      ║
║                                               ║
║ ─────────────────────────────────────────────║
║                                               ║
║ 📌 SECTION 1                                  ║
║   Featured Products                           ║
║   Check out our best-selling items...        ║
║   • Premium Wireless Headphones               ║
║   • Smart Home Bundle                         ║
║   • Fitness Tracker Pro                       ║
║                                               ║
║        ┌──────────────┐                       ║
║        │   Shop Now   │                       ║
║        └──────────────┘                       ║
║                                               ║
║ ─────────────────────────────────────────────║
║                                               ║
║ 📌 SECTION 2                                  ║
║   Why Shop With Us                            ║
║   ✓ Free shipping on orders over $50         ║
║   ✓ 30-day money-back guarantee              ║
║   ✓ 24/7 customer support                    ║
║                                               ║
║ ─────────────────────────────────────────────║
║                                               ║
║ 📌 CALL-TO-ACTION SECTION                     ║
║   Don't wait! Sale ends in:                   ║
║   6 hours                                     ║
║                                               ║
║        ┌─────────────────────┐               ║
║        │ Claim Your Discount │               ║
║        └─────────────────────┘               ║
║                                               ║
║ ⚠️  Use brand's primary color for CTA button ║
║                                               ║
╠═══════════════════════════════════════════════╣
║         End of Email Preview                  ║
╚═══════════════════════════════════════════════╝
```

## Example 2: Newsletter Format

### Input:
```markdown
EMAIL SUBJECT LINE: Your Weekly Tech Digest 📱

PREVIEW TEXT: Top stories, latest releases, and exclusive deals

HERO SECTION:
# This Week in Tech
Your curated selection of the best technology news

SECTION 1: Featured Story
## The Rise of AI Assistants
Artificial intelligence is transforming how we work...
[Read more →](https://example.com)

SECTION 2: Quick Bites
- Apple announces new product line
- Tesla's latest software update
- Microsoft partners with OpenAI

SECTION 3: Exclusive Offer
Get 20% off our premium membership
**Button: Upgrade Now**
```

### Visual Features:
- **Header**: Clean email client look with subject and preview
- **Sections**: Each section has a badge icon and clear separator
- **Links**: Blue, underlined on hover
- **CTAs**: Styled as prominent buttons with gradient
- **Design notes**: Yellow highlighted boxes

## Example 3: Sections View

When users click "Sections" button, emails are broken into collapsible cards:

```
┌─────────────────────────────────────┐
│ 📌 Subject Line              ⋁ 📋 🔄│
├─────────────────────────────────────┤
│ Flash Sale: 50% Off Everything!    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📌 Preview Text              ⋁ 📋 🔄│
├─────────────────────────────────────┤
│ Limited time offer...               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📌 Hero Section              ⋁ 📋 🔄│
├─────────────────────────────────────┤
│ FLASH SALE                          │
│ 50% Off Sitewide...                 │
└─────────────────────────────────────┘
```

Each section card:
- ✅ Can be collapsed/expanded individually
- ✅ Has its own copy button
- ✅ Can be regenerated independently
- ✅ Styled with gradient header and icons

## Styling Features

### Color Scheme
- **Primary Blue** (#3B82F6): Icons, section headers, links, CTAs
- **Success Green** (#10B981): Copy confirmation
- **Warning Yellow** (#F59E0B): Design notes, annotations
- **Neutral Gray**: Borders, backgrounds, text

### Typography
- **Headers**: Bold, hierarchical sizing (h1 > h2 > h3)
- **Body Text**: Comfortable line-height (1.5-1.7)
- **Code**: Monospace, pink highlight
- **Links**: Blue, no underline (underline on hover)

### Interactive Elements
- **Hover Effects**: Scale animations, color changes
- **Transitions**: Smooth 200ms animations
- **Focus States**: Keyboard navigation support
- **Dark Mode**: Full support with adjusted colors

## Toggle Views

### Email Preview (Default)
- Styled like an actual email
- Visual hierarchy with icons and gradients
- Professional, client-ready appearance

### Raw Markdown
- Traditional markdown rendering
- Easier for copying/editing
- Shows the actual AI output structure

### Sections View
- Collapsible cards per section
- Individual regeneration and copying
- Best for iterating on specific parts

## Best Practices

### For AI Prompt Writers
1. Always include `EMAIL SUBJECT LINE:` and `PREVIEW TEXT:`
2. Use section markers: `HERO SECTION:`, `SECTION 1:`, etc.
3. Mark CTAs with `**Button: [text]**` or `**CTA: [text]**`
4. Add design notes in square brackets: `[Note: Use brand colors]`

### For Users
1. Use **Email Preview** for final review and presentation
2. Switch to **Raw Markdown** when you need to copy text
3. Use **Sections View** to regenerate specific parts
4. Check design notes (yellow boxes) for implementation hints

## Responsive Behavior

The email renderer is fully responsive:
- **Desktop**: Full-width with generous padding
- **Tablet**: Adapts to narrower screens
- **Mobile**: Stack elements vertically, readable text size

## Accessibility

- ✅ Semantic HTML structure
- ✅ Proper heading hierarchy (h1 → h2 → h3)
- ✅ ARIA labels on interactive elements
- ✅ High contrast in both light and dark modes
- ✅ Keyboard navigation support
- ✅ Screen reader friendly

---

**Quick Reference**: Toggle between views using the buttons at the top of each AI message.

