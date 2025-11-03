# Brand Auto-Fill Testing Guide

## 🧪 Complete Testing Checklist

This guide helps you thoroughly test the Brand Auto-Fill feature.

---

## ✅ Prerequisites

Before testing, ensure:

- [ ] Development server is running
- [ ] Environment variables are set:
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
- [ ] You're logged into the application
- [ ] You have access to test files (TXT, MD, PDF)
- [ ] You have test URLs ready

---

## 🎯 Test Scenarios

### Scenario 1: Manual Entry (Control Test)

**Purpose:** Verify the traditional workflow still works.

**Steps:**
1. Click "Create Brand"
2. Select "Manual Entry" mode
3. Fill out all fields:
   - Brand Name: "Test Brand Manual"
   - Website URL: "https://example.com"
   - Brand Details: (2-3 paragraphs)
   - Brand Guidelines: (1-2 paragraphs)
   - Copywriting Style Guide: (1-2 paragraphs)
4. Click "Create Brand"

**Expected Results:**
- [ ] Form accepts all input
- [ ] Validation works (brand name required)
- [ ] Brand is created successfully
- [ ] Redirected to brand list/chat

**Status:** _______________

---

### Scenario 2: File Upload Only

**Purpose:** Test file-only extraction without URL.

**Steps:**
1. Click "Create Brand"
2. Select "Upload Files" or "AI Extract" mode
3. Upload 2-3 test files (TXT, MD)
4. Do NOT enter a URL
5. Click "Extract Brand Information with AI"
6. Wait for processing
7. Review extracted information
8. Edit if needed
9. Click "Create Brand"

**Expected Results:**
- [ ] Files upload successfully
- [ ] File list displays with sizes
- [ ] Can remove files (× button)
- [ ] Extract button becomes enabled
- [ ] Extraction completes in 5-15 seconds
- [ ] Form switches to manual mode
- [ ] Fields are pre-filled
- [ ] Can edit extracted info
- [ ] Brand saves successfully

**Test Files:**
- `brand-guidelines.txt` (sample brand guidelines)
- `style-guide.md` (copywriting style)
- `about.txt` (brand story)

**Status:** _______________

---

### Scenario 3: URL Only

**Purpose:** Test URL-only extraction without files.

**Steps:**
1. Click "Create Brand"
2. Select "AI Extract" mode
3. Enter test URL: "https://www.example.com"
4. Do NOT upload files
5. Click "Extract Brand Information with AI"
6. Wait for processing
7. Review extracted information
8. Click "Create Brand"

**Expected Results:**
- [ ] URL input accepts valid URLs
- [ ] Extract button enables with URL only
- [ ] Website is scraped successfully
- [ ] Extraction completes
- [ ] Form is pre-filled with website content
- [ ] Brand saves successfully

**Test URLs:**
- Successful: `https://www.shopify.com`
- Successful: `https://stripe.com/about`
- 404 Error: `https://example.com/nonexistent`
- Invalid: `not-a-url`

**Status:** _______________

---

### Scenario 4: URL + Files (Optimal)

**Purpose:** Test combined extraction (best results).

**Steps:**
1. Click "Create Brand"
2. Select "AI Extract" mode
3. Enter URL: "https://www.example.com"
4. Upload 2-3 supporting documents
5. Click "Extract Brand Information with AI"
6. Wait for processing
7. Review combined extraction
8. Edit if needed
9. Save brand

**Expected Results:**
- [ ] Both URL and files are processed
- [ ] Extraction combines both sources
- [ ] Results are more comprehensive
- [ ] Quality is higher than single source
- [ ] Brand saves successfully

**Status:** _______________

---

### Scenario 5: Multiple File Upload

**Purpose:** Test uploading many files at once.

**Steps:**
1. Click "Create Brand"
2. Select "AI Extract" or "Upload Files"
3. Upload 5-6 files in one action
4. Verify all files appear in list
5. Remove 2-3 files using × button
6. Add 1-2 more files
7. Extract with AI
8. Save brand

**Expected Results:**
- [ ] Multiple files upload simultaneously
- [ ] All files display in list
- [ ] File sizes shown correctly
- [ ] Can remove individual files
- [ ] Can add more files after initial upload
- [ ] All remaining files used in extraction
- [ ] Brand saves successfully

**Status:** _______________

---

### Scenario 6: Mode Switching

**Purpose:** Verify users can switch between modes.

**Steps:**
1. Click "Create Brand"
2. Select "Manual Entry"
3. Start typing in Brand Name field
4. Switch to "AI Extract" mode
5. Enter URL and upload files
6. Switch back to "Manual Entry"
7. Verify field content

**Expected Results:**
- [ ] Can switch modes freely
- [ ] Field content is NOT lost when switching
- [ ] UI updates correctly for each mode
- [ ] No errors occur during switching

**Status:** _______________

---

### Scenario 7: Edit After Extraction

**Purpose:** Verify users can edit AI-generated content.

**Steps:**
1. Create brand using AI Extract
2. After extraction, edit all fields:
   - Change brand name
   - Modify brand details
   - Update guidelines
   - Change style guide
3. Save brand
4. Load brand for editing
5. Verify saved content matches edits

**Expected Results:**
- [ ] All fields are editable after extraction
- [ ] Changes are preserved
- [ ] Saved content matches user edits
- [ ] No AI content overwrites user changes

**Status:** _______________

---

## ❌ Error Testing

### Error 1: Empty Form Submission

**Steps:**
1. Select "AI Extract" mode
2. Leave URL empty
3. Don't upload files
4. Try to click Extract button

**Expected Results:**
- [ ] Extract button is disabled
- [ ] OR: Error message shown
- [ ] Clear guidance on what's needed

**Status:** _______________

---

### Error 2: File Too Large

**Steps:**
1. Select "Upload Files" mode
2. Try to upload a file > 5MB
3. Check error message

**Expected Results:**
- [ ] Error message: "File [name] is too large. Maximum size is 5MB."
- [ ] File is NOT added to list
- [ ] User can try with smaller file

**Status:** _______________

---

### Error 3: Invalid URL

**Steps:**
1. Select "AI Extract" mode
2. Enter invalid URL: "not a url"
3. Click Extract

**Expected Results:**
- [ ] Browser validation catches invalid URL
- [ ] OR: API returns clear error
- [ ] User can correct and retry

**Status:** _______________

---

### Error 4: URL Not Accessible

**Steps:**
1. Select "AI Extract" mode
2. Enter URL that returns 404: "https://example.com/nonexistent"
3. Click Extract

**Expected Results:**
- [ ] Error message: "Failed to fetch website content..."
- [ ] User can try different URL
- [ ] OR: Switch to file upload
- [ ] OR: Use manual entry

**Status:** _______________

---

### Error 5: Unsupported File Type

**Steps:**
1. Try to upload `.exe`, `.zip`, or other unsupported file
2. Check error handling

**Expected Results:**
- [ ] File type validation occurs
- [ ] Clear error message
- [ ] Supported types are listed

**Status:** _______________

---

### Error 6: AI Extraction Failure

**Steps:**
1. Upload file with minimal content (e.g., "test")
2. Click Extract
3. API may fail due to insufficient content

**Expected Results:**
- [ ] Error message displayed
- [ ] User can try again
- [ ] OR: Add more content
- [ ] OR: Use manual entry

**Status:** _______________

---

### Error 7: Network Timeout

**Steps:**
1. Throttle network to slow 3G
2. Upload large files or scrape large website
3. Wait for timeout

**Expected Results:**
- [ ] Timeout is handled gracefully
- [ ] Error message shown
- [ ] User can retry
- [ ] No app crash

**Status:** _______________

---

## 🎨 UI/UX Testing

### UI Test 1: Mode Selection Cards

**Steps:**
1. Open brand creation modal
2. Hover over each mode card
3. Click each mode
4. Observe visual feedback

**Expected Results:**
- [ ] Hover states are clear
- [ ] Selected state is obvious (blue border)
- [ ] Icons are appropriate
- [ ] Text is readable
- [ ] Cards are aligned properly

**Status:** _______________

---

### UI Test 2: File Upload Area

**Steps:**
1. Select Upload/AI mode
2. Click upload area
3. Drag file over area
4. Drop file
5. Remove file

**Expected Results:**
- [ ] Click opens file picker
- [ ] Drag-and-drop works
- [ ] Hover state on drag-over
- [ ] File list updates immediately
- [ ] Remove button (×) works

**Status:** _______________

---

### UI Test 3: Loading States

**Steps:**
1. Trigger AI extraction
2. Observe loading state
3. Wait for completion

**Expected Results:**
- [ ] Extract button shows loading state
- [ ] Loading icon animates (spinning gear)
- [ ] Button text changes to "Extracting..."
- [ ] Button is disabled during processing
- [ ] Clear when processing is done

**Status:** _______________

---

### UI Test 4: Dark Mode

**Steps:**
1. Toggle to dark mode (if available)
2. Open brand creation modal
3. Test all modes and states

**Expected Results:**
- [ ] All text is readable
- [ ] Contrast is sufficient
- [ ] Colors are appropriate
- [ ] No white boxes on dark background
- [ ] Consistent styling

**Status:** _______________

---

### UI Test 5: Mobile Responsive

**Steps:**
1. Open on mobile device or resize to mobile
2. Test brand creation
3. Test file upload
4. Test all modes

**Expected Results:**
- [ ] Modal fits on screen
- [ ] Mode cards stack vertically
- [ ] Form fields are full-width
- [ ] Buttons are touch-friendly
- [ ] Text is readable at mobile size

**Status:** _______________

---

### UI Test 6: Keyboard Navigation

**Steps:**
1. Open modal
2. Use Tab to navigate
3. Use Enter to select
4. Use Escape to close

**Expected Results:**
- [ ] Tab order is logical
- [ ] Focus indicators are clear
- [ ] Can select mode with keyboard
- [ ] Can navigate form fields
- [ ] Can close modal with Escape

**Status:** _______________

---

### UI Test 7: Screen Reader

**Steps:**
1. Enable screen reader
2. Navigate brand creation
3. Listen to announcements

**Expected Results:**
- [ ] Labels are announced
- [ ] Buttons are identified
- [ ] Errors are announced
- [ ] Loading states are announced
- [ ] File uploads are announced

**Status:** _______________

---

## 🚀 Performance Testing

### Performance 1: File Upload Speed

**Steps:**
1. Upload 5 files (1-2MB each)
2. Measure time

**Expected Results:**
- [ ] Upload completes in < 5 seconds
- [ ] No UI freezing
- [ ] Files appear progressively

**Status:** _______________

**Time Measured:** _____

---

### Performance 2: AI Extraction Speed

**Steps:**
1. Upload 3 files + URL
2. Click Extract
3. Measure time to completion

**Expected Results:**
- [ ] Completes in 5-15 seconds
- [ ] No timeout errors
- [ ] UI remains responsive

**Status:** _______________

**Time Measured:** _____

---

### Performance 3: Form Pre-fill Speed

**Steps:**
1. After extraction completes
2. Measure time for form to populate

**Expected Results:**
- [ ] Form populates instantly (< 100ms)
- [ ] No visible delay
- [ ] Smooth transition to manual mode

**Status:** _______________

---

## 🔒 Security Testing

### Security 1: File Content Sanitization

**Steps:**
1. Upload file with HTML/script tags
2. Verify content is sanitized
3. Check rendered output

**Expected Results:**
- [ ] HTML tags are escaped or removed
- [ ] No script execution
- [ ] Content is safe to display

**Status:** _______________

---

### Security 2: URL Validation

**Steps:**
1. Try malicious URLs (if safe to test)
2. Try very long URLs
3. Try special characters

**Expected Results:**
- [ ] Invalid URLs rejected
- [ ] No XSS vulnerabilities
- [ ] Server handles errors gracefully

**Status:** _______________

---

### Security 3: File Size Limits

**Steps:**
1. Try to upload very large file (> 5MB)
2. Try to upload many large files

**Expected Results:**
- [ ] Size limit enforced
- [ ] No server crash
- [ ] Clear error message

**Status:** _______________

---

## 🌐 Cross-Browser Testing

Test on multiple browsers:

### Chrome
- [ ] All features work
- [ ] UI renders correctly
- [ ] File upload works
- [ ] No console errors

### Firefox
- [ ] All features work
- [ ] UI renders correctly
- [ ] File upload works
- [ ] No console errors

### Safari
- [ ] All features work
- [ ] UI renders correctly
- [ ] File upload works
- [ ] No console errors

### Edge
- [ ] All features work
- [ ] UI renders correctly
- [ ] File upload works
- [ ] No console errors

---

## 📊 Quality Assessment

### Extraction Quality Test

**Test with real brand websites:**

1. **Well-documented brand** (e.g., Shopify, Stripe)
   - Quality: ___/10
   - Notes: _______________

2. **Medium documentation** (e.g., local business site)
   - Quality: ___/10
   - Notes: _______________

3. **Minimal content** (e.g., landing page only)
   - Quality: ___/10
   - Notes: _______________

**Quality Criteria:**
- Brand name accuracy
- Details completeness
- Guidelines accuracy
- Style guide relevance
- Overall coherence

---

## 🐛 Known Issues

Document any bugs found:

### Issue 1
**Description:** _______________
**Steps to Reproduce:** _______________
**Severity:** Low / Medium / High / Critical
**Status:** _______________

### Issue 2
**Description:** _______________
**Steps to Reproduce:** _______________
**Severity:** Low / Medium / High / Critical
**Status:** _______________

---

## ✅ Final Checklist

Before considering testing complete:

### Functionality
- [ ] All three modes work
- [ ] File upload works
- [ ] URL scraping works
- [ ] AI extraction works
- [ ] Form pre-fill works
- [ ] Brand saving works
- [ ] Brand editing works

### Error Handling
- [ ] All errors show messages
- [ ] Users can recover from errors
- [ ] No app crashes
- [ ] Fallbacks work

### UI/UX
- [ ] Professional appearance
- [ ] Intuitive workflow
- [ ] Clear feedback
- [ ] Responsive design
- [ ] Dark mode works
- [ ] Accessible

### Performance
- [ ] Fast file uploads
- [ ] Reasonable extraction time
- [ ] No UI freezing
- [ ] Efficient API calls

### Security
- [ ] Input validation
- [ ] Content sanitization
- [ ] File size limits
- [ ] No XSS vulnerabilities

### Cross-Browser
- [ ] Chrome works
- [ ] Firefox works
- [ ] Safari works
- [ ] Edge works
- [ ] Mobile browsers work

---

## 📝 Test Summary

**Date Tested:** _______________
**Tester:** _______________
**Pass Rate:** ___/100 tests passed

**Overall Status:** 
- [ ] Ready for Production
- [ ] Needs Minor Fixes
- [ ] Needs Major Fixes
- [ ] Not Ready

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

---

## 🚀 Deployment Readiness

After all tests pass:

- [ ] All critical bugs fixed
- [ ] Documentation reviewed
- [ ] API keys configured in production
- [ ] Performance is acceptable
- [ ] Security validated
- [ ] Stakeholder approval obtained

**Ready to Deploy:** YES / NO / CONDITIONAL

---

**Testing Completed:** _______________
**Approved By:** _______________
**Deployment Date:** _______________

