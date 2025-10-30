# 🎨 Sidebar V2 - Visual Guide

Quick visual reference for all features with ASCII art diagrams!

---

## 🎯 Complete Sidebar Layout

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Brand Name         [📋][⬜][🔍]   ┃ 1. Header with view controls
┃ Email Copywriter                  ┃
┃ 47 conversations • 3 active       ┃ 2. Live statistics
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ [➕ New Conversation]             ┃ 3. Create button
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ [All Team ▾] [Recent ▾] [☰]      ┃ 4. Filter, Sort, Bulk
┃ [🔍 Search...] [⚙️ 3]             ┃ 5. Search + Advanced
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 📌 PINNED (3)              [▼]   ┃ 6. Sticky pinned section
┃ ┌──────────────────────────────┐ ┃
┃ │ ✨ Holiday Campaign           │ ┃
┃ │ [Campaign] [Urgent] [Draft]   │ ┃ 7. Tags
┃ │ 💬 12  📄 3.2k  🟢 5m ago     │ ┃ 8. Analytics
┃ │ Sarah • Dec 15                │ ┃
┃ ├──────────────────────────────┤ ┃
┃ │ 🎯 Product Launch             │ ┃
┃ │ [Campaign] [Review]           │ ┃
┃ │ 💬 8   📄 1.8k  🔵 2h ago     │ ┃
┃ │ Mike • Dec 14                 │ ┃
┃ ├──────────────────────────────┤ ┃
┃ │ 📧 Weekly Newsletter          │ ┃
┃ │ [Template]                    │ ┃
┃ │ 💬 5   📄 850   🟡 1d ago     │ ┃
┃ │ You • Dec 13                  │ ┃
┃ └──────────────────────────────┘ ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 💬 All Conversations              ┃ 9. Regular conversations
┃ ┌──────────────────────────────┐ ┃
┃ │ Flash Sale Email              │ ┃
┃ │ [Campaign] [Approved]         │ ┃
┃ │ 💬 10  📄 2.1k  ⚪ 3d ago     │ ┃
┃ ├──────────────────────────────┤ ┃
┃ │ Welcome Series                │ ┃
┃ │ [Template] [Scheduled]        │ ┃
┃ │ ... (virtualized scroll)      │ ┃
┃ └──────────────────────────────┘ ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ [← All Brands]                    ┃ 10. Navigation
┃ Press ESC to go back              ┃ 11. Keyboard hint
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 📍 Feature 1: Sticky Pinned Section

### Normal State
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📌 PINNED (3)           [▼] ┃ ← Collapsible header
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ • Campaign 1                 ┃
┃ • Campaign 2                 ┃
┃ • Campaign 3                 ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫ ← Visual separator
┃ All Conversations            ┃
┃ • Regular 1                  ┃
┃ • Regular 2                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Collapsed State
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📌 PINNED (3)           [▶] ┃ ← Collapsed
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ All Conversations            ┃
┃ • Regular 1                  ┃
┃ • Regular 2                  ┃
┃ • Regular 3                  ┃
┃ • Regular 4                  ┃ ← More space!
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Key Points**:
- Yellow border for visibility
- Always at top, never scrolls
- Max height 264px with internal scroll
- Click header to toggle

---

## 🔍 Feature 2: Advanced Search

### Search Bar with Filter Badge
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [🔍 holiday sale] [⚙️ 3] 🔴 ┃ ← 3 filters active
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                           └─ Red dot indicator
```

### Advanced Filter Panel
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Advanced Search              [✕] ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                   ┃
┃ 📅 Date Range                    ┃
┃ ┌──────────┐  ┌──────────┐      ┃
┃ │2024-10-01│ to │2024-10-29│      ┃
┃ └──────────┘  └──────────┘      ┃
┃                                   ┃
┃ 🎯 Conversation Mode              ┃
┃ ┌─────────────────────┐          ┃
┃ │ Email Copy       ▾  │          ┃
┃ └─────────────────────┘          ┃
┃                                   ┃
┃ 👤 Created By                     ┃
┃ ┌─────────────────────┐          ┃
┃ │ Sarah            ▾  │          ┃
┃ └─────────────────────┘          ┃
┃                                   ┃
┃ 💬 Message Count                  ┃
┃ ┌─────┐    ┌─────┐               ┃
┃ │  5  │ to │ 50  │               ┃
┃ └─────┘    └─────┘               ┃
┃                                   ┃
┃ ☑️ Has attachments                ┃
┃                                   ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ [Reset All] [Cancel] [Apply]     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Filter Combinations**:
```
Example 1: Recent Campaigns
┌─────────────────────────┐
│ Date: Last 30 days      │
│ Tags: Campaign          │
│ Result: 12 found        │
└─────────────────────────┘

Example 2: Sarah's Drafts
┌─────────────────────────┐
│ Creator: Sarah          │
│ Tags: Draft             │
│ Result: 5 found         │
└─────────────────────────┘

Example 3: Long Conversations
┌─────────────────────────┐
│ Messages: Min 20        │
│ Mode: Email Copy        │
│ Result: 8 found         │
└─────────────────────────┘
```

---

## 📊 Feature 3: Analytics Badges

### Compact Mode (List View)
```
💬 12  📄 3.2k  ⚡ 8k  🟢 5m ago
│      │       │      └─ Activity (color-coded)
│      │       └─ Tokens used
│      └─ Word count (3,200)
└─ Message count
```

### Full Mode (Cards/Details)
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Holiday Campaign          ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 💬 12 messages            ┃
┃ 📄 3,200 words            ┃
┃ ⚡ 8,000 tokens           ┃
┃ 🟢 Active 5 minutes ago   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Activity Color Codes
```
🟢 Green  (<5min)   = Very active
🔵 Blue   (<1hr)    = Active
🟡 Yellow (<24hr)   = Recent
⚪ Gray   (>24hr)   = Older

Animation:
⚪ → ◐ → ◓ → ◑ → ◒ (pulsing)
```

### Hover Tooltip
```
┌──────────────────────────┐
│ Hover over compact badge │
└────────┬─────────────────┘
         │
    ┌────▼──────────────────────┐
    │ 12 messages • 3.2k words  │
    │ 8k tokens • Active 5m ago │
    └───────────────────────────┘
```

---

## 🏷️ Feature 4: Tags System

### Tag Display
```
[Campaign] [Urgent] [Draft] +2

└─┬─┘      └──┬──┘  └─┬─┘  └─ More tags hidden
  │           │       │
  Blue      Red    Yellow
```

### Color Palette
```
🔵 Blue    = Campaign
🟣 Purple  = Template
🩷 Pink    = Special
🟢 Green   = Approved
🟡 Yellow  = Draft
🔴 Red     = Urgent
⚪ Gray    = Archived
🔷 Indigo  = Scheduled
🔵 Cyan    = Info
🟠 Orange  = Review
```

### Tag Menu
```
Click [+ Tag]:

┌──────────────────┐
│ Add Tag          │
├──────────────────┤
│ [Campaign] 🔵    │ ← Click to add
│ [Draft]    🟡    │
│ [Review]   🟠    │
│ [Urgent]   🔴    │
│ [Approved] 🟢    │
│ [Template] 🟣    │
│ [Archived] ⚪    │
│ [Scheduled]🔷    │
└──────────────────┘
```

### Tag States
```
Normal:
[Campaign]

Hover:
[Campaign] ⓧ  ← X button appears

Remove:
Click X → Tag removed → Update saved
```

---

## ⚡ Feature 5: Bulk Operations

### Enabling Bulk Mode
```
Normal Mode:
┌────────────────────────┐
│ [📋][⬜][☰]           │
└────────────────────────┘
           └─ Click this

Bulk Mode Active:
┌────────────────────────┐
│ [📋][⬜][☰]           │ ← Blue highlight
└────────────────────────┘
```

### Selection UI
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ☑️ Holiday Campaign          ┃ ← Selected
┃ ☑️ Product Launch            ┃ ← Selected
┃ ☐ Weekly Newsletter          ┃ ← Not selected
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 2 selected                   ┃
┃ [📌][📦][💾][🗑️] │ [All][None]┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
     │   │   │   │
     │   │   │   └─ Delete
     │   │   └─ Export
     │   └─ Archive
     └─ Pin
```

### Bulk Action Flow
```
Step 1: Enable bulk mode
   [☰] Click

Step 2: Select conversations
   ☑️ Check boxes

Step 3: Choose action
   [📦] Archive

Step 4: Confirm
   ✅ Done!

Result: All selected conversations archived
```

---

## 📂 Feature 6: Collapsible Sections

### Section Header
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📌 PINNED (3)           [▼] ┃ ← Expanded
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Click header:

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📌 PINNED (3)           [▶] ┃ ← Collapsed
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Available Sections
```
📌 Pinned      (always at top)
📂 Recent      (last 30 days)
📦 Archived    (completed)
👥 By Team     (grouped by creator)
```

### Collapse Animation
```
Expanded:           Collapsing:         Collapsed:
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Header  │         │ Header  │         │ Header  │
├─────────┤         ├─────────┤         └─────────┘
│ Item 1  │    →    │ Item 1  │    →    
│ Item 2  │         └─────────┘         
│ Item 3  │         
└─────────┘         
   200ms               100ms
```

---

## 🎯 Feature 7: Smart Sorting

### Sort Dropdown
```
[Sort by: Recent ▾]

Click to expand:

┌─────────────────────┐
│ Recent        [●]   │ ← Selected
│ Newest        [ ]   │
│ A-Z           [ ]   │
│ Messages      [ ]   │
│ Creator       [ ]   │
└─────────────────────┘
```

### Sort Results Examples

**Recent** (Last Activity):
```
1. Holiday Campaign    (5m ago)  🟢
2. Product Launch      (2h ago)  🔵
3. Welcome Series      (1d ago)  🟡
4. Flash Sale          (3d ago)  ⚪
```

**A-Z** (Alphabetical):
```
1. Flash Sale Email
2. Holiday Campaign
3. Product Launch
4. Welcome Series
```

**Messages** (Count):
```
1. Holiday Campaign    (💬 25)
2. Welcome Series      (💬 18)
3. Product Launch      (💬 12)
4. Flash Sale          (💬 8)
```

**Creator** (Alphabetical by person):
```
1. Mike
   • Product Launch
   • Flash Sale
2. Sarah
   • Holiday Campaign
   • Welcome Series
```

---

## ⌨️ Feature 8: Keyboard Shortcuts

### Main Shortcuts
```
┌─────────────────────────────┐
│ ⌘K / Ctrl+K  → Search       │
│ P            → Pin/Unpin    │
│ R            → Rename       │
│ A            → Archive      │
│ E            → Export       │
│ D            → Duplicate    │
│ Del          → Delete       │
│ Enter        → Open         │
│ Esc          → Go Back      │
│ ↑/↓          → Navigate     │
└─────────────────────────────┘
```

### Visual Hints
```
Hover over button:
┌──────────────┐
│ Pin      [P] │ ← Keyboard hint
└──────────────┘

In menu:
┌──────────────┐
│ Rename    ⌘R │ ← Shortcut shown
│ Archive   ⌘A │
│ Export    ⌘E │
└──────────────┘
```

### Usage Flow
```
Keyboard Navigation:

1. Press ⌘K
   └─ Search focuses

2. Type query
   └─ Results filter

3. Press ↓
   └─ Select first

4. Press Enter
   └─ Opens conversation

5. Press P
   └─ Pins it

6. Press Esc
   └─ Back to list

Total time: 5 seconds! ⚡
```

---

## 📈 Feature 9: Live Statistics

### Header Stats Display
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Brand Name                   ┃
┃ Email Copywriter             ┃
┃ 47 conversations • 3 active  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
   └──┬──┘           └─┬─┘
   Total            AI responding
```

### With Filters Active
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Brand Name                   ┃
┃ Email Copywriter             ┃
┃ 12 of 47 • 2 active • 3     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
   │      │    │          └─ Filters
   │      │    └─ AI active
   │      └─ Total
   └─ Filtered
```

### Real-time Updates
```
Before:  47 conversations • 3 active
         [User sends message]
After:   47 conversations • 4 active ✨
                              └─ Incremented!

Before:  47 conversations • 2 active
         [AI finishes]
After:   47 conversations • 1 active ✨
                              └─ Decremented!
```

---

## 🎨 Feature 10: Visual Polish

### Hover Effects
```
Normal:
┌────────────────┐
│ Holiday Sale   │
└────────────────┘

Hover:
┌────────────────┐
│ Holiday Sale   │ ← Slight scale up (1.02)
└────────────────┘ ← Shadow appears
  (Glows slightly)
```

### Click Animation
```
Hover → Click → Release

1.00 → 0.95 → 1.02

┌────┐   ┌───┐   ┌─────┐
│Item│ → │Itm│ → │ Item│
└────┘   └───┘   └─────┘
Normal   Press   Hover
```

### Loading States
```
Loading:
[●●●○○○○○○○] 30%

AI Responding:
[●●●●●●●●○○] 80%

Complete:
[●●●●●●●●●●] 100% ✓
```

### Color Transitions
```
Normal → Hover → Active

Gray → Blue → Dark Blue

Duration: 150ms ease-in-out
```

---

## 🎯 Complete User Flow Example

### Morning Workflow
```
8:00 AM - Open App
   ↓
Check pinned section
   ↓
See 3 active conversations
   ↓
Press ⌘K
   ↓
Type "holiday"
   ↓
Press Enter
   ↓
Continue working
   ↓
Press P to pin new one
   ↓
Press Esc to go back

Time: 30 seconds total! ⚡
```

---

## 📊 Feature Density Comparison

### Before
```
┏━━━━━━━━━━━━━━━━━━━┓
┃ Holiday Campaign   ┃ ← Title
┃ Sarah • Dec 15     ┃ ← Creator + Date
┗━━━━━━━━━━━━━━━━━━━┛

Data points: 3
```

### After
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Holiday Campaign      📌    ┃ ← Title + Pin
┃ [Campaign][Urgent][Draft]   ┃ ← Tags
┃ Creating email for Black... ┃ ← Preview
┃ 💬 12  📄 3.2k  🟢 5m ago   ┃ ← Metrics
┃ Sarah • Dec 15, 2024        ┃ ← Creator + Date
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Data points: 10+
```

---

## 🎉 Quick Reference Card

```
╔═══════════════════════════════════╗
║   SIDEBAR V2 QUICK REFERENCE      ║
╠═══════════════════════════════════╣
║ KEYBOARD SHORTCUTS                ║
║ ⌘K    Search                      ║
║ P     Pin/Unpin                   ║
║ R     Rename                      ║
║ A     Archive                     ║
║ E     Export                      ║
║ Esc   Go back                     ║
║                                   ║
║ ICONS                             ║
║ 📌    Pinned                      ║
║ 💬    Messages                    ║
║ 📄    Words                       ║
║ ⚡    Tokens                      ║
║ 🟢    Active (<5min)              ║
║ 🔵    Active (<1hr)               ║
║ 🟡    Recent (<24hr)              ║
║                                   ║
║ SECTIONS                          ║
║ 📌    Pinned (sticky)             ║
║ 💬    All conversations           ║
║ 📦    Archived                    ║
║                                   ║
║ TAGS                              ║
║ 🔵    Campaign                    ║
║ 🟡    Draft                       ║
║ 🟠    Review                      ║
║ 🔴    Urgent                      ║
║ 🟢    Approved                    ║
╚═══════════════════════════════════╝
```

---

**Save this guide for quick reference! 📚**

*Last Updated: October 29, 2025*  
*Version: 2.0.0*

