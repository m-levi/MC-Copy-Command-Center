# Panel Size Persistence - Testing Guide

## Quick Test Steps

### Test 1: Sidebar Width Persistence
1. Open the chat page in your browser
2. Drag the sidebar resize handle (between sidebar and main chat) to make it wider (e.g., ~40% of screen)
3. Refresh the page (Cmd+R or F5)
4. **Expected**: Sidebar should be the same width you set (not the default 25%)

### Test 2: Comments Panel Width Persistence
1. Open a conversation with messages
2. Click the comments icon in the header to open the comments panel
3. Drag the comments panel resize handle to make it narrower or wider
4. Refresh the page
5. **Expected**: Comments panel should remember its width

### Test 3: Both Panels Together
1. Resize both the sidebar and comments panel to custom sizes
2. Close and reopen your browser
3. Navigate back to the chat page
4. **Expected**: Both panels should be at your custom sizes

### Test 4: Collapse State + Size Persistence
1. Resize the sidebar to a custom width (e.g., 35%)
2. Collapse the sidebar using the collapse button
3. Refresh the page
4. **Expected**: Sidebar should be collapsed
5. Expand the sidebar
6. **Expected**: Sidebar should return to your custom 35% width (not the default 25%)

### Test 5: Clear and Reset
1. Open browser DevTools (F12)
2. Go to Application/Storage > Local Storage
3. Find the key: `react-resizable-panels:chat-layout-panels`
4. Delete this key
5. Refresh the page
6. **Expected**: Panels should return to default sizes (sidebar: 25%, comments: 25%)

## What to Look For

### ✅ Success Indicators
- Panel widths are remembered after page refresh
- Panel widths are remembered after closing/reopening browser
- Collapse state and panel size work together correctly
- Smooth animations when resizing
- No console errors

### ❌ Failure Indicators
- Panels reset to default size on refresh
- Console errors about localStorage
- Panels jump/flicker on page load
- Resize handle doesn't work smoothly

## Debugging

### Check localStorage
Open DevTools Console and run:
```javascript
localStorage.getItem('react-resizable-panels:chat-layout-panels')
```

Should return something like:
```json
"[0.2,0.6,0.2]"
```
(Array of percentages for each panel)

### Clear Cache
If panels aren't persisting:
1. Clear browser cache
2. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
3. Check if localStorage is enabled in browser

### Known Limitations
- **Private/Incognito Mode**: localStorage may not persist after closing browser
- **Different Browsers**: Sizes are stored per-browser (Chrome settings won't transfer to Firefox)
- **Mobile**: Persistence only works on desktop (mobile uses overlay, not panels)

## Additional Tests

### Edge Cases

**Test: Multiple Brands**
1. Resize panels in Brand A
2. Switch to Brand B
3. **Current Behavior**: Same panel sizes apply to all brands
4. **Future Enhancement**: Could make panel sizes per-brand

**Test: Mobile View**
1. Resize browser window to mobile size (< 1024px)
2. **Expected**: Mobile overlay mode (no panels, no persistence needed)
3. Resize back to desktop
4. **Expected**: Desktop panel sizes are restored

**Test: Extreme Sizes**
1. Try resizing sidebar to minimum (5%)
2. Refresh
3. **Expected**: Should remember minimum size
4. Try resizing to maximum (40%)
5. Refresh
6. **Expected**: Should remember maximum size

## Performance Check

### Load Time
- Panel restoration should be instant (no delay)
- No visible "jump" or layout shift on page load
- Smooth transitions when expanding/collapsing

### Memory
- Check DevTools Memory tab
- localStorage usage should be minimal (< 1KB for panel sizes)
- No memory leaks after multiple resizes

## Reporting Issues

If you find any issues, please note:
1. Browser and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Console errors (if any)
5. localStorage value (from debugging section above)

