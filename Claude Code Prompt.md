# Overdue — Full UI Redesign Prompt for Claude Code

I have a working Next.js + Appwrite app called **Overdue** (student assignment tracker). I want you to completely rebuild the UI to match the attached design mockup (`Overdue Redesign — Bundled.html`). **Open that file in a browser to see the full interactive reference.**

Keep ALL existing backend logic, Appwrite integration, Gradescope sync, Moodle sync, Google Calendar sync, Zustand stores, and API routes exactly as they are. Only replace the UI layer.

---

## 1. DESIGN SYSTEM — implement these FIRST

### Fonts
Add to `layout.tsx` head:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

### CSS Custom Properties
Add to `globals.css`:
```css
:root {
  --bg:   #090909;
  --bg2:  #0f0f0f;
  --bg3:  #141414;
  --bg4:  #1a1a1a;
  --border:  #1d1d1d;
  --border2: #252525;
  --text:    #e0e0e6;
  --text2:   #9494a4;
  --text3:   #484858;
  --ah: 265; /* accent hue — user-adjustable */
  --accent:        oklch(0.62 0.18 var(--ah));
  --accent-glow:   oklch(0.62 0.18 var(--ah) / 0.11);
  --accent-border: oklch(0.62 0.18 var(--ah) / 0.26);
  --red:    oklch(0.63 0.22 25);
  --yellow: oklch(0.80 0.17 85);
  --green:  oklch(0.73 0.18 145);
  --mono: 'JetBrains Mono', monospace;
}
```

Replace existing Tailwind color references with these CSS vars. Keep Tailwind for layout utilities but use CSS vars for all colors.

### Keyframe Animations (add to globals.css)
```css
@keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
@keyframes tabEnter { from { opacity:0; transform:translateY(7px); } to { opacity:1; transform:translateY(0); } }
@keyframes rowEnter { 0%{opacity:0;transform:translateX(-16px);} 65%{opacity:1;transform:translateX(3px);} 100%{opacity:1;transform:translateX(0);} }
@keyframes rowComplete { 0%{opacity:1;max-height:64px;} 45%{background:oklch(0.73 0.18 145 / 0.07);} 100%{opacity:0;max-height:0;padding:0;overflow:hidden;} }
@keyframes checkDraw { from{stroke-dashoffset:16;} to{stroke-dashoffset:0;} }
@keyframes dotPulse { 0%,100%{opacity:0.25;transform:scale(0.75);} 50%{opacity:1;transform:scale(1.15);} }
@keyframes shimmer { 0%{background-position:-600px 0;} 100%{background-position:600px 0;} }
@keyframes sidebarIn { from{opacity:0;transform:translateX(-10px);} to{opacity:1;transform:translateX(0);} }
@keyframes flamePulse { 0%,100%{transform:scale(1) rotate(-2deg);} 50%{transform:scale(1.07) rotate(2deg);} }
@keyframes nlpSpin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
```

---

## 2. OVERALL LAYOUT

Replace the current dashboard layout with a **3-column flex layout** at `app/dashboard/layout.tsx`:

```
[Left Sidebar 168px fixed] [Main content flex-1 scrollable] [Right Sidebar 252px — dashboard only]
```

- `html, body { height: 100%; overflow: hidden; }`
- The whole app is `display: flex; height: 100vh; overflow: hidden`
- Main content area has `overflow-y: auto`
- Right sidebar only renders on the dashboard tab

---

## 3. LEFT SIDEBAR (replaces current Navigation + Header)

Create `components/layout/Sidebar.tsx`:

**Structure (top to bottom):**
1. **Logo area** — the text `overdue` in `var(--accent)` color, font-weight 800, letter-spacing -0.04em, with a 5px pulsing dot beside it (`animation: dotPulse 2.4s ease-in-out infinite`)
2. **Nav items** — Dashboard, Assignments, Calendar, Courses, Statistics
3. **Settings button** near bottom
4. **User section** at very bottom — avatar circle with initials, name, email

**Nav items behavior:**
- Each item: icon (SVG, 14×14) + label text + keyboard shortcut hint on the right (D, A, L, C, S)
- Active item shows keyboard shortcut hidden, inactive shows it dimly
- **Sliding pill indicator**: position a `div` absolutely behind the active item that smoothly transitions its `top` and `height` CSS properties using `cubic-bezier(0.4,0,0.2,1)` — track each button's `offsetTop` via `useEffect` + `useRef`
- Overdue badge: red pill showing overdue count on Assignments item
- Settings button shows `⌘,` hint on the right
- Animation: sidebar items stagger in with `fadeUp` animation on mount

**Icons (use these exact SVG paths):**
- Dashboard: 4 small squares (2×2 grid)
- Assignments: 3 horizontal lines with checkmarks on left
- Calendar: rectangle with date lines
- Courses: open book shape
- Statistics: 3 vertical bars of different heights
- Settings: gear/cog

---

## 4. KEYBOARD SHORTCUTS

Add a `useEffect` in the root layout or dashboard page:
```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
    if (e.metaKey || e.ctrlKey) {
      if (e.key === ',') { e.preventDefault(); openSettings(); }
      return;
    }
    if (e.altKey) return;
    switch (e.key.toLowerCase()) {
      case 'd': router.push('?tab=dashboard');   break;
      case 'a': router.push('?tab=assignments'); break;
      case 'l': router.push('?tab=calendar');    break;
      case 'c': router.push('?tab=courses');     break;
      case 's': router.push('?tab=statistics');  break;
      case 'n': openQuickAdd(); break;
      case 'escape': closeAllModals(); break;
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

---

## 5. DASHBOARD TAB

The main content area (middle column) has these sections in order:

### 5a. Greeting + Clock Header
```tsx
// Left: time-aware greeting
const hour = new Date().getHours();
const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
// Show: "Good morning, [firstName]"
// Subtitle: "X overdue — get on it!" or "You're all caught up! 🎉"

// Right: live clock
// Font: JetBrains Mono, size 26px, weight 600
// Updates every second via setInterval
// Below clock: "Monday, April 20, 2026" in text3 color
```

### 5b. AI NLP Quick-Add Input
A full-width input bar with:
- Sparkle/star SVG icon on the left in accent color
- Placeholder: `'AI quick-add — "CS homework due Friday" or "physics quiz tomorrow 9am"'`
- On Enter: calls Gemini API (using existing `useUIStore.apiKey`) with prompt:
  ```
  Parse this student assignment. Today is [date]. 
  Return ONLY JSON: {"title":"...","courseId":"...","deadline":"ISO string","category":"homework|quiz|exam|project|lab|assignment"}
  ```
- Show spinner while parsing, then add assignment to store
- Focus ring: `border: 1px solid var(--accent-border); box-shadow: 0 0 0 3px var(--accent-glow)`
- Below input: `"AI-powered · understands natural language · press Enter"` in text3

### 5c. Stats Strip (3 cards)
```
[Overdue count in red] [Due this week in yellow] [Later count in green]
```
- Count animates up from 0 on mount using `requestAnimationFrame` easing
- Card: bg2 background, border, border-radius 10px

### 5d. Search + Filter + Add row
```
[Search input (flex-1)] [This week | All pill toggle] [+ Add button]
```
- Search filters the list in real time
- "This week" shows overdue + due within 7 days; "All" shows all incomplete
- "+ Add" button in accent color opens the existing QuickAdd modal

### 5e. PENDING section
- Section header: "PENDING" uppercase label + count badge on right
- Assignment rows (see Section 7 for row design)
- Empty state: "Nothing due this week 🎉"

### 5f. COMPLETED section
- Below pending, opacity 0.65
- Same row design, strikethrough text

---

## 6. RIGHT SIDEBAR (dashboard only)

Create `components/dashboard/RightSidebar.tsx`. Width 252px, border-left, sticky top-0, height 100vh, overflow-y auto.

### 6a. Mini Calendar
- "CALENDAR" section label (uppercase, text3, letter-spacing 0.1em)
- Month/year title + prev/next arrows
- 7-column grid (S M T W T F S)
- Today highlighted with accent background circle
- Days with assignments have a 3px accent dot below the date number
- Clicking a day filters the agenda (or just highlights)

### 6b. Next Deadline Countdown
- "NEXT DEADLINE" section label
- Card showing the single most urgent incomplete assignment:
  - Assignment title (truncated)
  - Course badge
  - **Live countdown** that adapts:
    - 2+ days: big number + "days remaining"
    - 1 day: "1 day · Xh Xm left"
    - Under 24h: `HH : MM : SS` ticking every second in status color
    - Under 1h: seconds digit pulses, card gets a subtle color glow
  - Thin urgency bar at bottom (fills as deadline approaches)
- Updates every second via `setInterval`

### 6c. Course Load
- "COURSE LOAD" section label
- One row per course: course code (in course color) + animated progress bar + `done/total`
- Bars animate from 0 to their value on mount
- If any overdue: show red "X overdue" label

---

## 7. ASSIGNMENT ROW DESIGN

This is the most important UI element. Use this exact design everywhere (dashboard, assignments tab):

```tsx
// Full row structure:
[3px colored left border based on status]
  [9px filled circle dot in status color, glows if overdue/due-soon]
  [Title + badges column (flex-1)]
    [Assignment title — 13.5px, weight 500, truncated]
    [Course badge (colored pill)] [Category badge (gray pill)]
  [Deadline column (flex-shrink-0, min-width 96px, text-right, no-wrap)]
    [Primary: "Apr 18" or "11:59 PM" or "Thu, Apr 23" — in status color, mono font]
    [Secondary: "2d overdue" or "In 6h" or "In 3d" — in text3]
  [Circle checkbox (24px, border-radius 50%)]
    [Empty: border var(--border2)]
    [Checked: filled var(--green), white checkmark SVG with stroke-dashoffset animation]

// Status colors:
// overdue → var(--red)
// due within 24h → var(--yellow)  
// due within 7 days → var(--yellow)
// due later → var(--green)
// completed → var(--text3), opacity 0.55, strikethrough title

// Deadline primary format:
// overdue → "Apr 18" (date)
// within 24h → "11:59 PM" (time)
// within 7 days → "Thu, Apr 23" (weekday + date)
// later → "May 11" (date)

// Deadline secondary format:
// overdue → "2d overdue" or "6h overdue"
// within 24h → "In 6h" or "In 45m"
// within 7 days → "In 3d"
// later → "In 21d"

// On complete: animate row with rowComplete keyframe (collapses height + fades)
// New assignments: animate in with rowEnter keyframe (slides from left)
// Hover: very subtle background rgba(255,255,255,0.022)
// Delete button: hidden, reveals on row hover (opacity transition)
```

---

## 8. ASSIGNMENTS TAB

Full-width (no right sidebar). Layout:

1. **Page title**: "Assignments" (22px, weight 700) + subtitle showing active/completed counts
2. **"+ New Assignment" button** top right in accent color
3. **Search + filter row**:
   - Search input (flex-1) with magnifier icon
   - Filter pills: `Active | This Week | Overdue | Completed`
4. **Active list**: same assignment row design, staggered fade-up animation
5. **Completed list**: collapsible section (click header to toggle), opacity 0.65

---

## 9. CALENDAR TAB

Two-column: calendar grid (flex-1) + day detail panel (256px).

**Month grid:**
- 7-column, 6-row grid
- Day cells: date number + up to 2 colored event chips showing truncated title
- Today: accent color circle around date number
- Selected day: `var(--accent-glow)` background, accent border
- Event chips: `background: courseColor + '20'; color: courseColor` (use course color not status color)
- Clicking a day: updates right panel

**Day detail panel:**
- Shows selected day's full date + item count
- Lists all assignments/events for that day with status dot, title, course badge, time

---

## 10. COURSES TAB

Grid layout (`repeat(auto-fill, minmax(280px, 1fr))`), cards stagger in with `fadeUp`.

**Each course card:**
- 3px colored top bar (gradient from courseColor to courseColor at 70% opacity)
- Course code badge (colored) + course name + instructor name
- Completion percentage (large number in course color, top right)
- Animated progress bar (animates from 0 on mount, transition-delay per card)
- Mini stats: Total | Done | Pending | Overdue (each in appropriate color)
- Expand button: "▼ Show X upcoming" → reveals list of upcoming assignments with status dots

---

## 11. STATISTICS TAB

Sections in order:

### Top row (3 columns):
1. **Completion Ring** — SVG circle with `stroke-dashoffset` animation. Circle circumference = 2π×54. Animates from full-offset to calculated offset over 1.2s with cubic-bezier easing. Shows percentage in center.
2. **4 Quick-stat cards** in 2×2 grid — Total, Completed (green), Overdue (red), Due This Week (yellow). Numbers count up from 0 using `requestAnimationFrame`.
3. **Streak card** — flame emoji with `flamePulse` animation (if streak > 0), large streak number, "day streak" label.

### 7-Day Trend Chart
- 7 columns, each showing a bar for that day's assignment count
- Today's bar in accent color, others in bg4
- Green overlay inside each bar showing completed count
- Bars animate height from 0 on mount with staggered transition-delay
- Day labels below (Mon, Tue...), today label in accent color

### Course Workload
- One row per course: code label + animated horizontal bar + done/total
- Each bar uses the course's color
- Animate in with staggered `fadeUp`

### Category Breakdown
- Small cards showing count per category (Homework, Quiz, Exam, etc.)
- Cycle through accent/purple/yellow/green/red colors

---

## 12. SETTINGS MODAL

Replace the current settings modal/page with a **two-panel modal** (760px wide, 80vh tall):
- Left: nav list (180px, border-right) with section buttons
- Right: scrollable content area

**Sections:**

### Profile
- Large avatar circle (initials, accent color gradient background)
- **Inline editable name** — click to edit, onBlur/Enter saves
- Email, semester info
- Change email button (triggers verification flow)
- Password reset button (sends email)
- **Sign Out button** (red/danger) — actually calls `signOut()` from your auth provider

### Appearance
- Accent hue slider (0-360) — live preview, updates `--ah` CSS var on `:root`
- Show clock seconds toggle
- Compact rows toggle
- Theme display (Dark — light mode "coming soon")

### Gradescope
- Connection status badge (Connected/Not Connected)
- **If not connected**: email + password form with show/hide toggle, SSO note with reset password link, "Connect" button that calls existing `/api/gradescope/connect`
- **If connected**: connected email, sync schedule info, **"Sync Now" button** that calls `/api/gradescope/sync` with JWT auth and shows loading spinner then result toast
- Disconnect button
- "How it works" explainer

### Moodle
- Connection status badge
- **If not connected**: URL field + username + auth method toggle (Token vs Password), token instructions, "Connect" button calling `/api/moodle/connect`
- **If connected**: username@url display, **"Sync Now" button** calling `/api/moodle/sync`
- Disconnect button

### Google Calendar
- **If not connected**: "Connect Google Calendar" button calling `signIn('google', ...)`
- **If connected**: email display, 3 action buttons: Preview Import / Export to Calendar / Full Sync — each calling the existing calendar API endpoints
- Import preview list (if events fetched)
- Setup instructions for self-hosted

### AI / Gemini
- API key input (password type, show/hide toggle)
- Link to Google AI Studio
- Save key button — saves to `useUIStore.setApiKey()` AND calls `/api/ai/config` POST with JWT
- Remove key button (if key exists) — calls `/api/ai/config` DELETE
- "What AI enables" feature list

### Keyboard Shortcuts
- Full reference table with styled `<kbd>` elements
- D/A/L/C/S for navigation, N for new, ⌘, for settings, Esc to close

### Data & Storage
- Export button — generates JSON blob with all assignments + courses, triggers download with filename `overdue-YYYY-MM-DD.json`
- Storage backend display
- **Snow animation toggle** — actually renders canvas snowfall (see Section 13)
- **Danger zone**: "Delete All Assignments" confirmation → `deleteAllAssignments()`, "Clear All Data" → deletes assignments + courses
- Developer password gate (`HelloBye123`) — reveals Nextcloud + AI Solver sections when unlocked

### Developer (unlocked)
- Nextcloud connection form (URL, username, app password) — calls existing Nextcloud store
- Claude AI Solver session key input — calls existing solver store

---

## 13. SNOW CANVAS

Create `components/ui/SnowCanvas.tsx`:
```tsx
// Canvas-based snowfall — 110 flakes
// Each flake: x, y, radius (0.5–3px), speed, drift, opacity, wobble angle
// Animation loop with requestAnimationFrame
// Flakes wobble sinusoidally as they fall
// Canvas is position:fixed, inset:0, pointer-events:none, z-index:9997
// Resize listener updates canvas dimensions
// Cleanup: cancelAnimationFrame + removeEventListener on unmount
```

Wire the toggle in Settings to a `snowEnabled` state in `useUIStore`.

---

## 14. LOADING SKELETON

Show on initial app load for ~1.5s (or until data loads from Appwrite):
```
[Shimmer sidebar]  [Shimmer main content (greeting + 3 cards + list)]  [Shimmer right panel]
```
- Shimmer: `background: linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%); background-size: 600px; animation: shimmer 1.4s infinite`
- 3 bouncing dots at bottom center while loading

---

## 15. SIGN-OUT SCREEN

When `signOut()` is called, instead of redirecting immediately, show a centered screen:
- `overdue` logo text with pulsing dot
- "You've been signed out" + "Sign back in to access your assignments"
- "Sign Back In" button that calls the auth provider sign-in

---

## 16. TOAST NOTIFICATIONS

Replace existing toast with:
- Position: `fixed, bottom-right`
- Style: `bg: var(--bg3), border-left: 3px solid statusColor, border-radius: 8px`
- Animation: slides in from right with `toastIn` keyframe
- Auto-dismiss after 3.2 seconds
- Types: success (green border), error (red border), info (accent border)

---

## 17. TWEAKS PANEL (in-app)

A floating panel (bottom-right, 240px wide) that appears when triggered:
- Accent hue slider (live)
- Compact rows toggle
- Show seconds toggle
- All changes apply instantly to CSS vars

---

## 18. IMPLEMENTATION ORDER

1. Design tokens (CSS vars, fonts, keyframes) in `globals.css`
2. Sidebar layout + navigation component
3. Assignment row component (used everywhere)
4. Dashboard tab (greeting, NLP input, stats, list, right sidebar)
5. Settings modal (all sections wired to existing stores/APIs)
6. Assignments tab
7. Calendar tab
8. Courses tab
9. Statistics tab
10. Snow canvas, loading skeleton, sign-out screen
11. Keyboard shortcuts
12. Toast system

---

## 19. IMPORTANT NOTES

- **Do NOT change any API routes, Appwrite logic, Zustand stores, or auth**
- All existing data fetching (`loadAssignments`, `loadCourses`, etc.) stays the same
- The `useUIStore`, `useAssignmentStore`, `useCourseStore`, `useCalendarStore`, `useGradescopeStore`, `useMoodleStore` stores are unchanged
- `formatDeadline` utility: return pairs of `{primary, secondary, color}` based on how far the deadline is
- Status colors: overdue→red, within 24h→yellow, within 7 days→yellow, later→green, completed→text3
- All modals use `backdropFilter: blur(8px)` on the overlay
- The accent color is user-adjustable via `--ah` CSS variable on `:root`
- Use `clsx` for conditional classes (already installed)
- The design is **dark-mode only** — no light mode needed yet

---

Open `Overdue Redesign — Bundled.html` in a browser while implementing. Every component, animation, color, and interaction is shown there interactively. The HTML is the source of truth for the visual design.
