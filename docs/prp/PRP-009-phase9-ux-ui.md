# PRP-009 -- Phase 9: Enhance UX/UI

> **Phase goal:** Re-skin every user-facing page of HabitFlow AI to match the "Tropical Punch" design reference (warm off-white background, pill-shaped sidebar, Plus Jakarta Sans / Be Vietnam Pro typography, bento-grid habit cards, time-slot calendar, rounded chat bubbles) at ~85% fidelity without changing any application logic, data hooks, or API contracts.

---

## Background & Context

Phases 1-8 built a fully functional app: auth (including Google OAuth), habit CRUD, dashboard with stats, premium AI Coach with streaming chat, calendar grid with create/edit modals, Google Calendar sync, and an admin panel. The current UI is a dark theme (`bg-gray-950`, gray-900 cards, ad-hoc `#FF8243` accent) that was adequate for functional iteration but does not match the design the team has now approved.

The user provided five HTML design examples under `example/` (dashboard, habit planner, calendar, AI coach, and shared layout). Those files encode a light, warm "Tropical Punch" aesthetic built on:

- Warm off-white background `#FFF9F5`
- Primary orange `#FF8243`, secondary pink `#FFC0CB`, tertiary teal `#069494`, accent yellow `#FCE883`
- Plus Jakarta Sans (headlines, italic brand) + Be Vietnam Pro (body) + Material Symbols icons
- Pill-shaped active nav items, dashed "Create Ritual" cards, teal AI insight panels, tl/tr-none chat bubbles

Phase 9's scope in `PHASES.md` enumerates the UX polish items (loading skeletons, empty states, toasts, animations, responsive layout, focus states, dark mode, micro-interactions). This PRP narrows those items to the specific surfaces identified in the design reference and explicitly sequences work so that global changes (fonts, color tokens, layout chrome) happen first and per-page changes follow.

### Key decisions

1. **Tailwind v4 theme tokens via `@theme`, not `tailwind.config.ts`.** The frontend already uses Tailwind v4 (`@import "tailwindcss"` in `globals.css`, no `tailwind.config.*` file). Color + font tokens will be added to `src/app/globals.css` inside the existing `@theme inline` block. There is no `tailwind.config.ts` to edit -- do not create one.
2. **Fonts via `next/font/google`, not `@fontsource/*`.** `src/app/layout.tsx` already uses `next/font/google` for Geist. Swap Geist for `Plus_Jakarta_Sans` and `Be_Vietnam_Pro` using the same pattern. This keeps fonts self-hosted, preloaded, and FOUT-free. Do not `npm install @fontsource/*`.
3. **No `tailwind.config.ts` to edit.** The design doc suggested editing a `tailwind.config.ts`, but this project does not have one. All token changes go in `globals.css` instead.
4. **Material Symbols loaded via `<link>` in root layout.** Rather than adopting an icon library, load Material Symbols (Outlined + Rounded) from Google Fonts in a `<head>` link tag, exactly as the example HTML does. Most existing inline SVG icons will be retained where they already exist; new ones introduced to match the design (e.g., `local_fire_department`, `auto_awesome`) will use `<span className="material-symbols-outlined">...</span>`.
5. **Light theme only -- no dark mode in Phase 9.** `PHASES.md` lists dark mode in the checklist, but the design reference is explicitly a light theme and introducing dark-mode variants alongside a full re-skin doubles the scope. Dark mode is deferred to a future phase and explicitly marked out of scope below. This is a deliberate deviation from `PHASES.md` for Phase 9 focus.
6. **Dashboard redesign replaces `StatsCards` + `WeeklyChart` layout.** The design puts a large streak card and a progress-rings card side-by-side at the top, not a row of four stat cards. The existing `StatsCards` component will be kept (still used elsewhere) but the dashboard page will compose new primitives for the hero row.
7. **Toasts via a minimal in-house context provider, not a new dependency.** `react-hot-toast` / `sonner` are fine libraries, but the toast requirements here (3-4 surfaces) are small enough to justify a 60-line `ToastProvider` + `useToast` hook using Framer Motion (already installed). This avoids adding a dependency mid-phase.
8. **Do NOT rewrite data hooks, API calls, or types.** This phase is visual/layout only. `useHabits`, `useDashboard`, `useCalendar`, `useAICoach`, `useGoogleCalendar`, `lib/api.ts`, and all `types/*.ts` files are frozen. If a component's props need to change, only adjust the component and its call sites -- do not touch the hooks.
9. **Keep existing route structure and file names.** All current pages stay at their current paths. New shared UI primitives go under `components/ui/`; feature-specific new components go under the matching `components/features/<feature>/` folder.

---

## Scope

All tasks in this phase are frontend-only. No backend changes, no DB migrations, no API contract changes.

| # | Task | Status |
|---|---|---|
| F1 | Add Plus Jakarta Sans + Be Vietnam Pro via `next/font/google` in `src/app/layout.tsx` | done |
| F2 | Load Material Symbols stylesheet via `<link>` in `src/app/layout.tsx` | done |
| F3 | Replace color tokens + add font tokens in `src/app/globals.css` `@theme` block | done |
| F4 | Update `<body>` base styles (background, text color, font-family) in `globals.css` | done |
| F5 | Redesign `(app)/layout.tsx` shell: warm-white bg, `w-72` sidebar, italic brand, settings at bottom, Upgrade promo card, mobile bottom-nav slot | done |
| F6 | Rewrite `components/features/AppNav.tsx` with pill-shaped active state, Material icons, `UpgradePromo` card, `SettingsNavItem` at bottom | done |
| F7 | Create `components/layout/MobileBottomNav.tsx` (4-item bottom nav for `md:hidden`) | done |
| F8 | Create `components/ui/UpgradePromo.tsx` (sidebar promo card used by `AppNav` and dashboard) | done |
| F9 | Create `components/ui/Toast.tsx` + `lib/hooks/useToast.tsx` (context provider + hook) and mount provider in `src/app/layout.tsx` | done |
| F10 | Create `components/ui/Skeleton.tsx` (primitive) + page-specific skeletons (`DashboardSkeleton`, `HabitsGridSkeleton`, `CalendarSkeleton`, `ChatSkeleton`) | done |
| F11 | Create `components/ui/EmptyState.tsx` (shared empty-state primitive: icon slot, title, description, CTA) | done |
| F12 | Create `components/ui/PageTransition.tsx` wrapper (Framer Motion `AnimatePresence` + fade/slide) and apply in `(app)/layout.tsx` | done |
| F13 | Redesign `(app)/dashboard/page.tsx`: hero greeting, streak + rings row, "Today's Rituals" list, AI insight + Upgrade promo sidebar column | done |
| F14 | Create `components/features/dashboard/HeroGreeting.tsx` | done |
| F15 | Create `components/features/dashboard/StreakCard.tsx` (flame icon + big streak number, primary gradient) | done |
| F16 | Create `components/features/dashboard/ProgressRingsCard.tsx` (two SVG rings: daily habits + weekly goal) | done |
| F17 | Create `components/features/dashboard/TodayRitualsList.tsx` (habit row with colored icon square + checkbox + streak number) | done |
| F18 | Create `components/features/dashboard/AIInsightCard.tsx` (`bg-accent` yellow callout with CTA to AI Coach) | done |
| F19 | Redesign `(app)/habits/page.tsx`: "Your Oasis." headline, bento grid, AI insight column card | done |
| F20 | Create `components/features/habits/HabitBentoCard.tsx` (icon square, category pill, title, desc, streak, completion %, bottom progress bar) | done |
| F21 | Create `components/features/habits/CreateRitualCard.tsx` (dashed-border add card used as bento cell) | done |
| F22 | Create `components/features/habits/HabitAIInsightCard.tsx` (teal `bg-tertiary` card with insight + CTA) | done |
| F23 | Redesign `(app)/calendar/page.tsx`: "Weekly Momentum" italic title, time-slot grid, FAB add button, stats row below | done |
| F24 | Restyle `components/features/calendar/CalendarGrid.tsx` with hour markers on left, colored event blocks, rounded-2xl | done |
| F25 | Restyle `components/features/calendar/CalendarEventCard.tsx` with source-based color (teal / primary / secondary) and hover scale | done |
| F26 | Create `components/features/calendar/CalendarStatsRow.tsx` (3 cards with colored left accent bar) | done |
| F27 | Create `components/features/calendar/AddEventFAB.tsx` (fixed bottom-right circular primary button) | done |
| F28 | Redesign `(app)/ai-coach/page.tsx`: split layout (sessions sidebar + chat area) with Pro Max Active badge | done |
| F29 | Restyle `components/features/ai-coach/ChatBubble.tsx`: teal avatar for assistant, tl-none / tr-none rounded-2xl bubbles, primary-orange user bubble | done |
| F30 | Restyle `components/features/ai-coach/ChatInput.tsx`: rounded-2xl, mic icon, primary SEND button | done |
| F31 | Create `components/features/ai-coach/TypingIndicator.tsx` (3 dots with opacity gradient) | done |
| F32 | Create `components/features/ai-coach/SuggestionChips.tsx` (horizontally scrollable pill row) | done |
| F33 | Create `components/features/ai-coach/AIActionCard.tsx` ("Calendar Updated" with teal "View Plan" button) | done |
| F34 | Create `components/features/ai-coach/SessionsSidebar.tsx` (sessions list + Pro Max Active badge) | done |
| F35 | Wire toast notifications on: habit created / updated / deleted, calendar event created / saved / deleted, login failed, Google connected / disconnected | done |
| F36 | Wire skeletons on dashboard, habits, calendar, ai-coach pages to replace existing loading spinners | done |
| F37 | Wire empty states on habits (no habits), calendar (no events this week), ai-coach (no messages) | done |
| F38 | Add habit-completion animation (scale + color flash) and streak flame pulse (Framer Motion) | done |
| F39 | Restyle `(app)/settings/page.tsx` and `components/features/settings/*` with new palette (no layout redesign, just tokens) | done |
| F40 | Restyle `(app)/admin/users/page.tsx` and `(app)/admin/analytics/page.tsx` with new palette (no layout redesign) | done |
| F41 | Restyle `(auth)/login/page.tsx` and `(auth)/register/page.tsx` with new palette + fonts (keep existing layout) | done |
| F42 | Mobile responsive sweep: verify sidebar hides on `<md`, bottom nav appears, dashboard/habits/calendar reflow to single column | done |
| F43 | Focus states pass: verify every interactive element has visible `focus-visible:ring-2 focus-visible:ring-primary` | done |

---

## Technical Design

### Design Tokens (globals.css)

Replace the current `@theme inline` block in `src/app/globals.css` with the Tropical Punch token set. Tailwind v4 exposes every `--color-*` variable under `@theme` as a utility class automatically (e.g., `--color-primary` -> `bg-primary`, `text-primary`, `border-primary`).

```css
@import "tailwindcss";

@theme inline {
  /* Brand palette */
  --color-primary: #FF8243;          /* orange -- CTA, active nav, streak */
  --color-secondary: #FFC0CB;        /* pink -- completed, accents */
  --color-tertiary: #069494;         /* teal -- AI, progress, tags */
  --color-accent: #FCE883;           /* yellow -- insight card bg */

  /* Surfaces */
  --color-background: #FFF9F5;       /* warm off-white page bg */
  --color-surface: #ffffff;          /* card bg */
  --color-surface-variant: #f4f1ef;  /* muted surface */

  /* Text */
  --color-on-background: #302e2c;    /* near-black text */
  --color-on-surface-variant: #5e5b58; /* muted text */

  /* Structural */
  --color-outline: #e0dad6;          /* borders */

  /* Fonts (wired to next/font CSS variables) */
  --font-sans: var(--font-be-vietnam-pro);
  --font-headline: var(--font-plus-jakarta-sans);
  --font-mono: var(--font-geist-mono); /* keep or remove -- no usages */
}

body {
  background: var(--color-background);
  color: var(--color-on-background);
  font-family: var(--font-sans), -apple-system, system-ui, sans-serif;
}
```

Usage in components: `bg-background`, `bg-surface`, `text-on-background`, `text-on-surface-variant`, `border-outline`, `bg-primary`, `text-tertiary`, `font-headline`, etc. The old `tropical-*` tokens can be removed -- `grep` shows they are unused in source (only the raw hex values are used, which we will migrate case-by-case per page).

### Fonts (src/app/layout.tsx)

```tsx
import { Plus_Jakarta_Sans, Be_Vietnam_Pro } from 'next/font/google'

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta-sans',
  subsets: ['latin'],
  weight: ['400', '500', '700', '800', '900'],
  style: ['normal', 'italic'],
})

const beVietnam = Be_Vietnam_Pro({
  variable: '--font-be-vietnam-pro',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})
```

Apply both variables on `<html>`: `className={`${plusJakarta.variable} ${beVietnam.variable} h-full antialiased`}`. Remove the two Geist imports.

In `<head>` (inside `<html>`, before `<body>`), add the Material Symbols link:
```tsx
<link
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
  rel="stylesheet"
/>
```
(Using Next.js's `next/head` is not needed inside the App Router root layout; a plain `<link>` inside `<html>` is the documented pattern.)

### App Shell (src/app/(app)/layout.tsx)

```tsx
<div className="min-h-screen bg-background text-on-background flex">
  <aside className="w-72 bg-surface border-r border-outline hidden md:flex flex-col sticky top-0 h-screen">
    <div className="px-8 pt-8 pb-6">
      <span className="font-headline italic font-black text-2xl text-primary">HabitFlow AI</span>
    </div>
    <AppNav />
    <div className="px-6 pb-4">
      <UpgradePromo />
    </div>
    <div className="px-6 pb-6">
      <SettingsNavItem />
    </div>
  </aside>
  <main className="flex-1 overflow-auto pb-20 md:pb-0">
    <PageTransition>{children}</PageTransition>
  </main>
  <MobileBottomNav className="md:hidden" />
</div>
```

### AppNav Rewrite

```tsx
// components/features/AppNav.tsx
interface NavLink {
  href: string
  label: string
  icon: string      // Material Symbols ligature, e.g. "dashboard"
  iconFilled: string // filled variant for active state
}

const NAV_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard', iconFilled: 'dashboard' },
  { href: '/habits',    label: 'Habits',    icon: 'checklist', iconFilled: 'checklist' },
  { href: '/ai-coach',  label: 'AI Coach',  icon: 'auto_awesome', iconFilled: 'auto_awesome' },
  { href: '/calendar',  label: 'Calendar',  icon: 'calendar_month', iconFilled: 'calendar_month' },
]

// Active: bg-primary text-white rounded-full mx-6 py-3 px-6 flex items-center gap-4
// Inactive: text-on-background/60 mx-6 py-3 px-6 flex items-center gap-4 hover:bg-surface-variant rounded-full
```

The current nav's logout button + user info moves to the bottom of the sidebar above `UpgradePromo`. Admin link stays inline (gated on `user.role === 'admin'`).

### Toast System

```tsx
// components/ui/Toast.tsx
export interface Toast {
  id: string
  variant: 'success' | 'error' | 'info'
  title: string
  description?: string
}

// lib/hooks/useToast.tsx
interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}
export const ToastProvider: React.FC<{ children: React.ReactNode }>
export function useToast(): ToastContextValue
```

Mount `ToastProvider` in `src/app/layout.tsx` wrapping `AuthProvider` (or inside it -- either works; toast does not depend on auth). Toasts render via a fixed container `bottom-6 right-6`, stack via Framer Motion `AnimatePresence`, auto-dismiss after 4s.

### Skeleton Primitive

```tsx
// components/ui/Skeleton.tsx
interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rect' | 'circle'
}
export function Skeleton(props: SkeletonProps): JSX.Element
```

Base class: `bg-surface-variant animate-pulse rounded-2xl`. Page-specific skeletons (e.g., `DashboardSkeleton`) compose `Skeleton` primitives in the shape of the real content.

### EmptyState Primitive

```tsx
// components/ui/EmptyState.tsx
interface EmptyStateProps {
  icon: string          // Material Symbol name
  title: string
  description: string
  cta?: { label: string; onClick: () => void }
}
export function EmptyState(props: EmptyStateProps): JSX.Element
```

Renders a centered column: large icon circle (`bg-surface-variant`), heading in `font-headline`, muted description, optional primary button.

### Dashboard Page

```
┌──────────────────────────────────────────────────────────────┐
│ HeroGreeting ("Welcome back, Alex!")                         │
├──────────────────────────────────┬───────────────────────────┤
│ StreakCard (span 4 of 12)        │ ProgressRingsCard (8/12)  │
├──────────────────────────────────┴───────────────────────────┤
│ "Today's Rituals" section heading                            │
├──────────────────────────────────┬───────────────────────────┤
│ TodayRitualsList (span 8)        │ AIInsightCard (span 4)    │
│                                  │ UpgradePromo (span 4)     │
└──────────────────────────────────┴───────────────────────────┘
```

`StreakCard` reads `stats.longest_streak` and `stats.current_streak` from `useDashboard`; `ProgressRingsCard` reads `stats.completion_rate` and a weekly completion fraction derived from `stats.weekly_summary`. `TodayRitualsList` reuses `useHabits().logCompletion` -- do not fork the hook.

Hero greeting:
```tsx
<h1 className="text-5xl font-headline font-extrabold text-on-background">
  Welcome back, <span className="text-primary">{firstName}</span>!
</h1>
```

StreakCard: `bg-surface border border-outline rounded-2xl p-8` with flame SVG (keep existing `StreakFlame`) + `text-6xl font-headline font-extrabold text-primary` number.

ProgressRingsCard: two SVG `<circle>` rings inside a single card; teal ring = daily habits, primary ring = weekly goal. Use existing `ProgressRing` component as the primitive.

TodayRitualsList row: icon square (`w-12 h-12 rounded-2xl bg-{category-color}/20 text-{category-color}`) + habit name + meta + streak number on the right + 1.5px teal progress bar glued to the bottom edge via `absolute bottom-0 left-0`. Completed row: `opacity-60`, `line-through`, teal checkmark circle instead of empty circle.

### Habits Page (Bento Grid)

```
┌──────────────────────────────────────────────────────────────┐
│ Headline: "Your Oasis." (italic, font-headline, text-5xl)    │
├──────────┬──────────┬──────────────────┬────────────────────┤
│ HabitCard│ HabitCard│ HabitCard        │ HabitAIInsightCard │
├──────────┼──────────┼──────────────────┤ (col-span-1)       │
│ HabitCard│ HabitCard│ CreateRitualCard │                    │
└──────────┴──────────┴──────────────────┴────────────────────┘
```

`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8`. `HabitBentoCard` replaces the existing list-style `HabitCard` usage on this page. Keep `components/ui/HabitCard.tsx` as-is for any other callers (dashboard previously used it; dashboard no longer uses it, so if nothing else imports it, leave the file but do not delete).

`HabitBentoCard` props:
```tsx
interface HabitBentoCardProps {
  habit: IHabit
  onToggleComplete: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}
```

Layout inside card: `relative p-6 bg-surface border border-outline rounded-2xl shadow-[0px_20px_40px_rgba(48,46,44,0.04)] hover:shadow-[0px_30px_60px_rgba(48,46,44,0.08)] transition-shadow`. Top: icon square + category pill (uppercase, `text-[10px] tracking-widest`). Middle: `font-headline font-bold text-xl` name + muted description. Bottom-left: large streak number. Bottom-right: completion %. Progress bar: `absolute bottom-0 left-0 h-1.5 bg-tertiary rounded-r-full` with `style={{ width: `${percent}%` }}`.

`CreateRitualCard`: dashed `border-2 border-dashed border-outline`, centered `+` icon, hover scales slightly, opens existing `HabitCreateForm` modal.

`HabitAIInsightCard`: `bg-tertiary text-white rounded-2xl p-6` with insight copy + "Get Plan" button routing to `/ai-coach`.

### Calendar Page

Header:
```tsx
<h1 className="text-5xl font-headline font-extrabold italic text-on-background">
  Weekly Momentum.
</h1>
```

`CalendarGrid` restyle: add an hour-marker column on the left (e.g. 6am -> 10pm, every 2 hours), events become `rounded-2xl` blocks colored by source:
- `source === 'ai'` -> `bg-tertiary text-white`
- `source === 'manual'` -> `bg-primary text-white`
- `source === 'google'` -> `bg-secondary text-on-background`

Below grid: `CalendarStatsRow` with three `relative pl-6 bg-surface border border-outline rounded-2xl p-6` cards, each with `absolute left-0 top-0 bottom-0 w-1.5 bg-{color}` left accent. Stats: Events This Week, Hours Scheduled, Habits Linked.

FAB: `AddEventFAB` -- `fixed bottom-10 right-10 w-16 h-16 bg-primary hover:bg-primary/90 rounded-full shadow-lg flex items-center justify-center text-white` with `+` Material Symbol. Opens `CreateEventModal`.

Keep `isPremium` gate and `UpgradePrompt` behavior exactly as-is.

### AI Coach Page

Split layout on `md+`: left `w-80` sessions sidebar (`SessionsSidebar`), right flex-1 chat area.

`SessionsSidebar`:
```tsx
<aside className="w-80 bg-surface border-r border-outline flex flex-col">
  <div className="px-6 py-4 border-b border-outline">
    <h2 className="font-headline font-bold text-lg">Sessions</h2>
    <span className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-accent text-on-background text-[10px] font-bold uppercase tracking-widest">
      Pro Max Active
    </span>
  </div>
  <ul className="flex-1 overflow-y-auto">...</ul>
</aside>
```

(Sessions list: Phase 6 did not actually ship multi-session UI -- this is rendered as a single "Today" item + placeholder "New session" button for now. Do not add session persistence -- out of scope.)

`ChatBubble` restyle:
- Assistant: flex row with `w-10 h-10 rounded-full bg-tertiary text-white` avatar + white card `rounded-2xl rounded-tl-none border border-outline p-4 max-w-[75%]`
- User: right-aligned, `bg-primary text-white rounded-2xl rounded-tr-none p-4 max-w-[75%]`

`TypingIndicator`: three `<span>` dots with staggered `animate-pulse` via Framer Motion.

`SuggestionChips`: horizontal scroll row of pill buttons (`rounded-full border border-outline bg-surface px-4 py-2 text-sm hover:bg-surface-variant`) shown above the input when `messages.length === 0`. Suggestions: "Plan my week", "Build a morning routine", "Review my progress", "Add a gym habit". Clicking a chip calls `send(suggestion)`.

`AIActionCard`: rendered inline in chat stream when an assistant message includes a tool call result -- card with `bg-surface-variant rounded-2xl p-4` showing "Calendar Updated" heading + teal "View Plan" button linking to `/calendar`. This reuses the existing `CalendarPreviewCard` slot in the message stream; restyle that component rather than adding a new one.

`ChatInput` restyle:
- Container: `rounded-2xl border border-outline bg-surface p-2 flex items-center gap-2`
- Mic icon button on left (placeholder -- does nothing yet, not in scope to wire mic)
- Text input: `flex-1 bg-transparent outline-none px-2 font-sans`
- SEND button: `bg-primary text-white font-bold uppercase tracking-widest text-xs px-5 py-2 rounded-xl`

### Toast Wiring Points

| Action | Success copy | Error copy |
|---|---|---|
| Create habit | "Habit created." | "Could not create habit." |
| Update habit | "Habit updated." | "Could not update habit." |
| Delete habit | "Habit deleted." | "Could not delete habit." |
| Log completion | -- (silent, visual animation handles it) | show `already-logged` copy from existing handler |
| Create calendar event | "Event saved." | "Could not save event." |
| Delete calendar event | "Event removed." | "Could not delete event." |
| Login failure | -- | "Invalid email or password." |
| Google Calendar connect | "Google Calendar connected." (from `?google=connected` query param on settings page) | "Google Calendar connection failed." (from `?google=error`) |
| Google Calendar disconnect | "Google Calendar disconnected." | "Could not disconnect." |

Inline error banners (e.g., the `actionError` red bar in habits page) are replaced by toasts.

### Animations

- Page transitions: `PageTransition` wraps children in `<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.2}}>`. Key on `pathname` via `usePathname()` inside `AnimatePresence mode="wait"`.
- Habit completion: on toggle, animate the checkbox circle with `scale: [1, 1.3, 1]` and flash the row background `bg-secondary/20`.
- Streak flame: existing `StreakFlame` gets a `motion.div` wrapper with looping `scale: [1, 1.05, 1]` every 2s.
- Toast enter/exit: slide from right + fade.

### Responsive Breakpoints

- `<md`: sidebar hidden, `MobileBottomNav` visible, dashboard stacks (streak/rings stacked, habit list full width), habits grid is 1 column, calendar scrolls horizontally with touch.
- `md`: sidebar `w-72` visible, dashboard 12-col grid, habits 2-col, calendar full 7-day grid.
- `lg`: habits 3-col bento, AI coach split layout with sessions sidebar.

---

## File-by-File Plan

### Modified files (existing)

#### `frontend/src/app/layout.tsx`
- Replace `Geist` / `Geist_Mono` imports with `Plus_Jakarta_Sans` and `Be_Vietnam_Pro` from `next/font/google`.
- Apply `${plusJakarta.variable} ${beVietnam.variable}` to `<html>`.
- Add `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined..." />` inside `<html>` before `<body>`.
- Wrap `{children}` with `<ToastProvider>` (inside `<AuthProvider>` so toasts can be fired from auth flows).

#### `frontend/src/app/globals.css`
- Replace `@theme inline` block contents per "Design Tokens" section above.
- Replace `body` rule: `background: var(--color-background); color: var(--color-on-background); font-family: var(--font-sans), sans-serif;`.
- Remove the `@media (prefers-color-scheme: dark)` block (light theme only in Phase 9).
- Remove unused `--color-tropical-*` tokens.

#### `frontend/src/app/(app)/layout.tsx`
- Replace dark gray shell with light-theme shell per "App Shell" section.
- Import and render `UpgradePromo`, `SettingsNavItem`, `MobileBottomNav`, `PageTransition`.
- Remove gradient text brand; use italic `font-headline text-primary`.

#### `frontend/src/components/features/AppNav.tsx`
- Rewrite per "AppNav Rewrite" section. Active state uses `usePathname()` to match current route.
- Replace inline SVG icons with Material Symbol ligatures.
- Move signed-in user block + logout to sit above the `UpgradePromo` (which the parent layout renders).
- Remove the `mt-auto` logout block since its container changes; keep logout button styling consistent with inactive nav items.

#### `frontend/src/app/(app)/dashboard/page.tsx`
- Replace dark shell + stats cards + weekly chart composition with new grid layout.
- Import new `HeroGreeting`, `StreakCard`, `ProgressRingsCard`, `TodayRitualsList`, `AIInsightCard`, `UpgradePromo`.
- Keep `useAuth`, `useHabits`, `useDashboard` usage unchanged.
- Replace loading branches with `<DashboardSkeleton />`.
- Fire `useToast().toast()` from `handleToggle` failure branch only (silent on success; animation handles it).

#### `frontend/src/app/(app)/habits/page.tsx`
- Replace dark shell + vertical list with bento grid layout per "Habits Page" section.
- Replace inline `actionError` banner with `useToast()` calls.
- Replace loading spinner with `<HabitsGridSkeleton />`.
- Replace empty state JSX with `<EmptyState>` primitive.
- Keep `HabitCreateForm` modal mounting logic and `deleteConfirmId` logic.

#### `frontend/src/app/(app)/calendar/page.tsx`
- Update headline to "Weekly Momentum." with `font-headline italic`.
- Replace loading spinner with `<CalendarSkeleton />`.
- Render `<CalendarStatsRow />` below the grid.
- Render `<AddEventFAB onClick={() => setAddEventDate(toLocalDateStr(new Date()))} />` at page root.
- Keep week navigation + modal logic unchanged.
- Wire toasts for event create/delete via existing `onCreated` / `onDelete` handlers.

#### `frontend/src/components/features/calendar/CalendarGrid.tsx`
- Restyle container + day columns + event blocks per "Calendar Page" section.
- Add left hour-marker column.
- Do not change props or event positioning logic.

#### `frontend/src/components/features/calendar/CalendarEventCard.tsx`
- Restyle: `rounded-2xl`, source-based background color, hover `scale-[1.02]`.
- No prop changes.

#### `frontend/src/components/features/calendar/CreateEventModal.tsx` + `EditEventModal.tsx`
- Restyle modal chrome only: `bg-surface`, `border-outline`, `rounded-2xl`, `font-headline` headings, `bg-primary` submit button.
- No prop or logic changes.
- Fire toast on successful save via the existing `onCreated` / `onSaved` callbacks (handled by the parent page, not the modal).

#### `frontend/src/app/(app)/ai-coach/page.tsx`
- Replace full-width layout with split: `<SessionsSidebar />` + chat area.
- Wrap empty message state with `<EmptyState>` + `<SuggestionChips>`.
- Replace loading state with `<ChatSkeleton />`.

#### `frontend/src/components/features/ai-coach/ChatBubble.tsx`
- Restyle per "AI Coach Page" section.
- Add teal avatar for assistant bubbles.
- No prop changes.

#### `frontend/src/components/features/ai-coach/ChatInput.tsx`
- Restyle per "AI Coach Page" section: rounded-2xl container, mic icon button (disabled placeholder), primary SEND button.
- No prop changes.

#### `frontend/src/components/features/ai-coach/ChatMessageList.tsx`
- Add `<TypingIndicator />` rendering when `isStreaming` and last message is from user.
- Restyle scroll container: `bg-background` (page bg shows through) + padding.

#### `frontend/src/components/features/ai-coach/CalendarPreviewCard.tsx`
- Restyle as `AIActionCard`: `bg-surface-variant rounded-2xl p-4`, teal "View Plan" button.
- Rename optional; keep existing filename to minimize churn.

#### `frontend/src/app/(app)/settings/page.tsx`
- Retheme: replace gray-scale Tailwind classes with `bg-surface`, `border-outline`, `text-on-background`, `text-on-surface-variant`, `bg-primary` buttons.
- On mount, read `?google=connected` / `?google=error` query params and fire toasts (this logic currently lives inline or in `GoogleCalendarConnect`; move it into the page component).

#### `frontend/src/components/features/settings/GoogleCalendarConnect.tsx`
- Retheme only: palette tokens, `font-headline` heading, primary/tertiary buttons.

#### `frontend/src/app/(app)/admin/users/page.tsx` + `(app)/admin/analytics/page.tsx`
- Retheme tables + cards with new tokens. No layout redesign.

#### `frontend/src/app/(auth)/login/page.tsx` + `(auth)/register/page.tsx`
- Retheme: `bg-background`, `font-headline` heading, primary CTA button, outline-styled inputs. Keep existing form structure.
- Fire `useToast().toast({ variant: 'error', ... })` on login failure instead of inline error.

#### `frontend/src/components/features/auth/GoogleSignInButton.tsx`
- Retheme: `border-outline`, `bg-surface`, hover `bg-surface-variant`. Keep Google "G" SVG.

#### `frontend/src/components/ui/Button.tsx`, `Input.tsx`, `HabitCard.tsx`, `ProgressRing.tsx`, `StreakBadge.tsx`, `StreakFlame.tsx`, `PremiumLockModal.tsx`, `UpgradePrompt.tsx`
- Retheme only: replace gray / `#FF8243` hex classes with the new token utilities (`bg-primary`, `text-on-background`, etc.).
- `ProgressRing`: parameterize color via a prop (`color: 'primary' | 'tertiary'`) if it currently hardcodes teal.
- `StreakFlame`: wrap in `motion.div` with the pulse animation described above.
- `UpgradePrompt` + `PremiumLockModal`: use `bg-accent` for callout backgrounds.

### New files

#### `frontend/src/components/layout/MobileBottomNav.tsx`
```tsx
interface MobileBottomNavProps { className?: string }
export function MobileBottomNav(props: MobileBottomNavProps): JSX.Element
```
Fixed bottom, 4 items (Dashboard, Habits, AI Coach, Calendar) with Material icons + `text-[9px] font-black uppercase tracking-widest` labels. Active state via `usePathname()`.

#### `frontend/src/components/ui/UpgradePromo.tsx`
```tsx
interface UpgradePromoProps { variant?: 'sidebar' | 'card' }
export function UpgradePromo(props: UpgradePromoProps): JSX.Element
```
- `sidebar` variant: `bg-secondary/20 border border-secondary/30 rounded-2xl p-4` with short copy.
- `card` variant: `bg-on-background text-white rounded-2xl p-6` (dashboard right column).
Only renders if `user.role === 'free'`.

#### `frontend/src/components/ui/Toast.tsx`
Presentation component used internally by `ToastProvider`. Not exported publicly.

#### `frontend/src/lib/hooks/useToast.tsx`
Exports `ToastProvider` and `useToast` per "Toast System" section. Stores toasts in state, auto-dismisses after 4000ms, renders via `createPortal` or inline fixed container.

#### `frontend/src/components/ui/Skeleton.tsx`
Primitive `Skeleton` component.

#### `frontend/src/components/features/dashboard/DashboardSkeleton.tsx`
#### `frontend/src/components/features/habits/HabitsGridSkeleton.tsx`
#### `frontend/src/components/features/calendar/CalendarSkeleton.tsx`
#### `frontend/src/components/features/ai-coach/ChatSkeleton.tsx`
Compose `Skeleton` primitives in the shape of each page's content.

#### `frontend/src/components/ui/EmptyState.tsx`
Shared empty-state primitive per "EmptyState Primitive" section.

#### `frontend/src/components/ui/PageTransition.tsx`
```tsx
'use client'
export function PageTransition({ children }: { children: React.ReactNode }): JSX.Element
```
Uses `usePathname()` + `AnimatePresence mode="wait"` + `motion.div`.

#### `frontend/src/components/features/dashboard/HeroGreeting.tsx`
```tsx
interface HeroGreetingProps { firstName: string | null }
export function HeroGreeting(props: HeroGreetingProps): JSX.Element
```

#### `frontend/src/components/features/dashboard/StreakCard.tsx`
```tsx
interface StreakCardProps { currentStreak: number; longestStreak: number }
export function StreakCard(props: StreakCardProps): JSX.Element
```

#### `frontend/src/components/features/dashboard/ProgressRingsCard.tsx`
```tsx
interface ProgressRingsCardProps {
  dailyCompletionRate: number   // 0..1
  weeklyCompletionRate: number  // 0..1
}
export function ProgressRingsCard(props: ProgressRingsCardProps): JSX.Element
```

#### `frontend/src/components/features/dashboard/TodayRitualsList.tsx`
```tsx
interface TodayRitualsListProps {
  habits: IHabit[]
  onToggle: (id: string) => Promise<void>
}
export function TodayRitualsList(props: TodayRitualsListProps): JSX.Element
```

#### `frontend/src/components/features/dashboard/AIInsightCard.tsx`
```tsx
interface AIInsightCardProps { insight?: string }
export function AIInsightCard(props: AIInsightCardProps): JSX.Element
```
Default insight copy if `insight` not provided: "Your evening routine is your strongest. Keep the momentum going tomorrow."

#### `frontend/src/components/features/habits/HabitBentoCard.tsx`
Per "Habits Page" section.

#### `frontend/src/components/features/habits/CreateRitualCard.tsx`
```tsx
interface CreateRitualCardProps { onClick: () => void }
export function CreateRitualCard(props: CreateRitualCardProps): JSX.Element
```

#### `frontend/src/components/features/habits/HabitAIInsightCard.tsx`
```tsx
export function HabitAIInsightCard(): JSX.Element
```

#### `frontend/src/components/features/calendar/CalendarStatsRow.tsx`
```tsx
interface CalendarStatsRowProps {
  eventsThisWeek: number
  hoursScheduled: number
  habitsLinked: number
}
export function CalendarStatsRow(props: CalendarStatsRowProps): JSX.Element
```
Data derived in the parent page from existing `events` array.

#### `frontend/src/components/features/calendar/AddEventFAB.tsx`
```tsx
interface AddEventFABProps { onClick: () => void }
export function AddEventFAB(props: AddEventFABProps): JSX.Element
```

#### `frontend/src/components/features/ai-coach/TypingIndicator.tsx`
#### `frontend/src/components/features/ai-coach/SuggestionChips.tsx`
```tsx
interface SuggestionChipsProps { onSelect: (prompt: string) => void }
```
#### `frontend/src/components/features/ai-coach/SessionsSidebar.tsx`
Sessions list is stubbed (single "Today" entry); do not add session persistence.

---

## Icon Inventory (Material Symbols)

| Surface | Symbol names |
|---|---|
| Sidebar nav | `dashboard`, `checklist`, `auto_awesome`, `calendar_month`, `settings`, `logout` |
| Mobile bottom nav | same as sidebar minus settings/logout |
| Dashboard streak card | `local_fire_department` |
| Dashboard AI insight | `auto_awesome` |
| Habit bento card | `self_improvement`, `fitness_center`, `menu_book`, `bedtime`, `water_drop` (pick based on category) |
| Create ritual card | `add` |
| Calendar FAB | `add` |
| AI Coach input | `mic`, `send` |
| Empty states | `inbox`, `event_busy`, `chat_bubble_outline` |
| Toast variants | `check_circle`, `error`, `info` |

---

## Out of Scope

- **Dark mode.** Listed in `PHASES.md` Phase 9 checklist but deferred -- the design reference is light-only and doubling every token pair would triple the work. Add an ADR later if deferral needs documenting.
- **Replacing or rewriting any data hook** (`useHabits`, `useDashboard`, `useCalendar`, `useAICoach`, `useGoogleCalendar`, `useAuth`). Phase 9 is visual only.
- **Adding new API endpoints or backend changes.** Zero backend work.
- **Multi-session chat history / session persistence.** `SessionsSidebar` renders a stub list; real sessions are a future phase.
- **Wiring the mic button.** Mic icon is a visual placeholder; voice input is out of scope.
- **Replacing `HabitCard` everywhere.** The existing `components/ui/HabitCard.tsx` stays; `HabitBentoCard` is a new parallel component used only on the habits page.
- **Installing a toast library** (`react-hot-toast`, `sonner`). We build a minimal in-house toast.
- **Installing `@fontsource/*` packages.** Use `next/font/google` instead.
- **New Tailwind config file.** Project uses Tailwind v4 via `@theme` in CSS; do not create `tailwind.config.ts`.
- **Animations on `(auth)` pages, admin pages, and settings page beyond the global `PageTransition` wrapper.** Those surfaces get retheming only.
- **Illustration assets for empty states.** Use Material Symbols icons inside `bg-surface-variant` circles; do not source or commission custom illustrations.
- **Keyboard navigation audit beyond focus-visible rings.** Full a11y audit is a separate effort.

---

## Dependencies (Ordering)

```
F1 (fonts) ──┐
F2 (Material icons) ├── F3 (color tokens) ── F4 (body styles)
                    │
                    └── F5 (app shell) ──┬── F6 (AppNav)
                                          ├── F7 (MobileBottomNav)
                                          ├── F8 (UpgradePromo)
                                          └── F12 (PageTransition)

F9 (Toast) -- independent, can land any time after F1-F4
F10 (Skeleton primitive) -- independent
F11 (EmptyState primitive) -- independent

Page redesigns require F1-F8 + F9 + F10 + F11 landed:
  F13-F18 (Dashboard)
  F19-F22 (Habits)
  F23-F27 (Calendar)
  F28-F34 (AI Coach)

F35 (toast wiring) requires F9 + each page's redesign done
F36 (skeleton wiring) requires F10 + each page's redesign done
F37 (empty-state wiring) requires F11 + each page's redesign done
F38 (animations) can happen in parallel with page redesigns
F39-F41 (settings/admin/auth retheme) require F3 only
F42 (responsive sweep) is last
F43 (focus states sweep) is last
```

**Critical path:** F1 -> F3 -> F4 -> F5 -> F6 -> F13 (dashboard) -> F19 (habits) -> F23 (calendar) -> F28 (ai-coach) -> F42/F43.

Recommended execution order for a single implementer:
1. F1, F2, F3, F4 (tokens land first -- everything else renders badly until they do)
2. F9, F10, F11, F12 (shared primitives)
3. F5, F6, F7, F8 (shell + nav)
4. F13-F18 (dashboard -- highest visibility)
5. F19-F22 (habits)
6. F23-F27 (calendar)
7. F28-F34 (ai coach)
8. F35, F36, F37, F38 (wiring pass)
9. F39, F40, F41 (retheme remaining surfaces)
10. F42, F43 (polish sweeps)

---

## Verification Checklist

### Tokens & Fonts
- [ ] `globals.css` has new `@theme` block with primary/secondary/tertiary/accent/background/surface/outline tokens
- [ ] Old `--color-tropical-*` tokens removed
- [ ] `npm run dev` renders pages with warm off-white background (not dark gray)
- [ ] Plus Jakarta Sans loads (verify via DevTools Network tab)
- [ ] Be Vietnam Pro loads
- [ ] Material Symbols load (verify icons render, not empty boxes)
- [ ] `font-headline` class resolves to Plus Jakarta Sans
- [ ] Default `font-sans` resolves to Be Vietnam Pro

### App Shell
- [ ] Sidebar is `w-72`, warm-white, sticky, with italic `font-headline` brand
- [ ] Active nav item is a primary-orange pill with white text
- [ ] Inactive nav items have hover background `bg-surface-variant`
- [ ] `UpgradePromo` sidebar card shows only for free users
- [ ] Settings link sits at the bottom of the sidebar
- [ ] On `<md`, sidebar hides and `MobileBottomNav` appears at the bottom

### Dashboard
- [ ] Hero greeting shows "Welcome back, {firstName}!" with name in `text-primary`
- [ ] Streak card shows flame icon + big primary number
- [ ] Progress rings card shows two SVG rings (teal daily + primary weekly)
- [ ] Today's rituals list shows colored icon squares + checkboxes + streak numbers
- [ ] Completed rows are `opacity-60` with `line-through` and teal checkmark
- [ ] AI insight card has yellow `bg-accent` background
- [ ] Upgrade promo dark card shows in right column for free users
- [ ] `DashboardSkeleton` shows during load
- [ ] Toggle animation (scale + flash) plays on habit completion

### Habits Page
- [ ] Headline is "Your Oasis." in italic `font-headline`
- [ ] Bento grid: 1 col mobile / 2 col md / 3 col lg
- [ ] Each card has icon square, category pill, title, description, streak, completion %, bottom progress bar
- [ ] "Create Ritual" dashed card is present in the grid
- [ ] AI insight teal card is present in the grid
- [ ] Empty state uses `<EmptyState>` primitive
- [ ] `HabitsGridSkeleton` shows during load
- [ ] Create/update/delete fire toasts
- [ ] `HabitCreateForm` modal still opens from the "Create Ritual" card

### Calendar Page
- [ ] Headline is "Weekly Momentum." italic
- [ ] Grid has left hour-marker column
- [ ] Events are colored by source (ai=teal, manual=primary, google=secondary)
- [ ] Events are `rounded-2xl` and scale on hover
- [ ] `CalendarStatsRow` renders below with 3 cards (colored left accent bars)
- [ ] `AddEventFAB` is fixed bottom-right and opens `CreateEventModal`
- [ ] `CalendarSkeleton` shows during load
- [ ] Create/delete event fire toasts
- [ ] Week navigation + "Today" button still work

### AI Coach Page
- [ ] Split layout: sessions sidebar + chat area on `md+`
- [ ] "Pro Max Active" badge shows in sessions sidebar
- [ ] Assistant bubbles have teal circle avatar + `rounded-2xl rounded-tl-none` white card
- [ ] User bubbles are `bg-primary text-white rounded-2xl rounded-tr-none`
- [ ] `TypingIndicator` shows while streaming
- [ ] `SuggestionChips` show when `messages.length === 0`
- [ ] Chat input is `rounded-2xl` with mic + primary SEND button
- [ ] `AIActionCard` renders inside assistant messages with tool calls
- [ ] `ChatSkeleton` shows during initial load

### Settings / Admin / Auth
- [ ] Settings page uses new palette + `font-headline` headings
- [ ] Google Calendar connect card uses new palette
- [ ] `?google=connected` / `?google=error` fire toasts on settings page
- [ ] Admin users table uses new palette
- [ ] Admin analytics uses new palette
- [ ] Login + Register pages use new palette + fonts
- [ ] Login failure fires an error toast
- [ ] Google Sign-In button uses outlined style with `border-outline`

### Toasts, Skeletons, Empty States
- [ ] `ToastProvider` mounted in root layout
- [ ] `useToast()` works from any client component
- [ ] Toasts auto-dismiss after 4s
- [ ] Success/error/info variants have distinct colors
- [ ] Skeletons match the real content layout on each page
- [ ] Empty states on habits, calendar, ai-coach use `<EmptyState>` primitive

### Animations & Responsive
- [ ] Page transitions (fade + slide) play when navigating between routes
- [ ] Streak flame pulses subtly
- [ ] Habit completion scales the checkbox and flashes the row
- [ ] Toast enter/exit animated
- [ ] `<md` breakpoint: dashboard, habits, calendar reflow to single column
- [ ] `<md` breakpoint: mobile bottom nav visible, desktop sidebar hidden
- [ ] No horizontal overflow on mobile on any page

### Focus States
- [ ] Every button, link, input has a visible `focus-visible:ring-2 focus-visible:ring-primary` ring
- [ ] Keyboard Tab traverses nav, habit cards, form fields in logical order
- [ ] Toast close button is keyboard-accessible

### Regression Guard
- [ ] `useHabits`, `useDashboard`, `useCalendar`, `useAICoach`, `useGoogleCalendar` files untouched by `git diff`
- [ ] `lib/api.ts` untouched
- [ ] `types/*.ts` untouched
- [ ] No new network calls introduced
- [ ] `next build` passes with zero type errors
- [ ] `npm run lint` passes

---

## Conflicts & Notes Flagged

1. **`PHASES.md` lists dark mode** but the design reference is light-only. This PRP defers dark mode explicitly (Out of Scope section). Surface this in the phase kickoff so the team agrees.
2. **Design doc mentions `tailwind.config.ts`** but this project uses Tailwind v4 with `@theme` in `globals.css`. Do not create a config file.
3. **Design doc mentions `@fontsource/*`** but this project uses `next/font/google`. Stick with `next/font/google`.
4. **`StatsCards` + `WeeklyChart` components become orphaned on the dashboard** after the redesign. Do not delete them -- the admin analytics page may consume similar primitives and a future phase may re-introduce them. Leave in place; they are cheap.
5. **`components/ui/HabitCard.tsx` becomes orphaned** once the dashboard and habits pages stop using it. Same guidance: leave in place, do not delete.
6. **`RULES.md` says components never call `fetch` directly.** This PRP introduces zero new fetches -- all data continues to flow through existing hooks. The only new non-visual primitive is `useToast`, which holds state and does not call any API.
7. **`RULES.md` says "default to Server Components".** The redesigned pages are already Client Components (`'use client'`) because they use hooks. That is fine and consistent with the current codebase; do not attempt to split them into RSC shells in Phase 9.
