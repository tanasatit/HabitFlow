# PHASES.md — Implementation Roadmap

> Update CLAUDE.md "Current Phase" section each time you move to a new phase.

---

## Phase 1 — Project Setup ✅
**Goal:** Running skeleton with nothing broken

### Backend
- [x] Init Go module (`go mod init github.com/habitflow/api`)
- [x] Install dependencies: Gin, GORM, postgres driver, jwt/v5, uuid, godotenv, go-redis
- [x] Create folder structure (`internal/domain`, `internal/middleware`, `pkg/`)
- [x] `pkg/config/config.go` — load `.env` variables with validation
- [x] `pkg/database/supabase.go` — connect to Supabase via GORM with connection pooling
- [x] `cmd/server/main.go` — start server on port 8080, `/api/v1/health` endpoint, graceful shutdown
- [x] Create `.env.example` (never commit `.env`)

### Frontend
- [x] `npx create-next-app@latest frontend --typescript --tailwind --app`
- [x] Install dependencies: `framer-motion`, `gsap`
- [x] Set up `.env.local.example` with `NEXT_PUBLIC_API_URL`
- [x] Create `components/ui/` and `components/layout/` folder structure
- [x] Create `lib/api.ts` base fetch wrapper
- [x] Create stub pages: login, register, dashboard
- [x] Set up `middleware.ts` for route protection

### DevOps
- [x] `docker-compose.yml` with Go backend + Redis (Supabase is remote)
- [x] `.gitignore` — exclude `.env`, `node_modules`, Go binaries
- [x] `backend/Dockerfile` — multi-stage Go build

---

## Phase 2 — Authentication
**Goal:** Users can register, login, logout. JWT working.

### Backend
- [x] `model/user.go` — User GORM model
- [x] `model/subscription.go` — Subscription model
- [x] Run `AutoMigrate` for User + Subscription tables
- [x] `repository/user_repository.go` — FindByEmail, FindByID, Create
- [x] `service/auth_service.go` — Register (hash password), Login (verify + issue JWT)
- [x] `handler/auth_handler.go` — POST /register, POST /login, POST /logout, GET /me
- [x] `middleware/auth.go` — JWT validation middleware
- [x] Test all auth endpoints with Postman/curl

### Frontend
- [x] `lib/auth.ts` — register(), login(), logout(), token storage (httpOnly cookie)
- [x] `lib/hooks/useAuth.ts` — auth state hook
- [x] `middleware.ts` — redirect to /login if no token
- [x] `app/(auth)/login/page.tsx` — login page
- [x] `app/(auth)/register/page.tsx` — register page
- [x] `app/(app)/layout.tsx` — server-side auth check wrapper
- [x] Wire up routes, test login flow end-to-end

---

## Phase 3 — Habits CRUD ✅
**Goal:** Users can create, view, edit, delete habits.

### Backend
- [x] `model/habit.go` — Habit GORM model
- [x] `model/habit_log.go` — HabitLog GORM model
- [x] Run `AutoMigrate` for new tables
- [x] `repository/habit_repository.go` — CRUD
- [x] `service/habit_service.go` — full CRUD
- [x] `handler/habit_handler.go` — all habit endpoints
- [x] `middleware/rbac.go` — RequirePremium(), RequireRole()
- [x] Apply auth middleware to habit routes
- [x] POST /habits/:id/log — mark habit complete today

### Frontend
- [x] `types/habit.ts` — IHabit, IHabitLog interfaces
- [x] `lib/hooks/useHabits.ts` — getAll, create, update, delete, logComplete
- [x] `components/ui/HabitCard.tsx` — reusable card with completion checkbox
- [x] `components/ui/StreakBadge.tsx` — streak counter display
- [x] `app/(app)/habits/page.tsx` — list of user's habits
- [x] `components/features/habits/HabitCreateForm.tsx` — form to create new habit
- [x] `app/(app)/habits/[id]/page.tsx` — edit existing habit
- [x] Add satisfying checkmark animation on completion (Framer Motion)

---

## Phase 4 — Dashboard & Streaks ✅
**Goal:** Users see progress. Streak counter works correctly.

### Backend
- [x] Streak calculation logic in `habit_service.go`
- [x] GET /api/v1/dashboard — returns user stats (streak, completion rate, weekly summary)
- [x] GET /api/v1/habits/:id/stats — per-habit stats

### Frontend
- [x] `components/ui/ProgressRing.tsx` — animated SVG ring (Framer Motion)
- [x] `app/(app)/dashboard/page.tsx` — main dashboard page
- [x] Streak flame animation (GSAP)
- [x] Weekly completion chart (simple bar chart)
- [x] Wire dashboard to real API data

---

## Phase 5 — Admin Panel ✅
**Goal:** Admin can manage users and subscriptions.

### Backend
- [x] `handler/admin_handler.go` — ListUsers, UpdateUser, DeleteUser, Analytics
- [x] `service/admin_service.go` — business logic
- [x] Apply admin route group with RequireRole("admin") middleware
- [x] Seed one admin user directly in Supabase

### Frontend
- [x] Admin route protection in `middleware.ts` (check role === 'admin')
- [x] `app/(app)/admin/users/page.tsx` — table of all users
- [x] `app/(app)/admin/users/[id]/page.tsx` — view + edit subscription tier
- [x] `app/(app)/admin/analytics/page.tsx` — simple stats: total users, premium count, DAU
- [x] Admin nav sidebar component

---

## Phase 6 — Calendar & AI Coach ✅
**Goal:** Premium users chat with AI, plan auto-fills calendar.

### Backend
- [x] `model/calendar_event.go` — CalendarEvent GORM model
- [x] `model/ai_conversation.go` — AIConversation model
- [x] `internal/ai/client.go` — Gemini API client setup (OpenRouter fallback)
- [x] `internal/ai/tools.go` — MCP tool definitions (read/write calendar, get habits, get stats)
- [x] `service/ai_service.go` — orchestrate Gemini API call with tools + SSE streaming
- [x] `handler/ai_handler.go` — POST /ai/chat (SSE endpoint)
- [x] `repository/calendar_repository.go` — CRUD for calendar events
- [x] `handler/calendar_handler.go` — GET /calendar, POST /calendar
- [x] Apply RequirePremium() to all AI + calendar routes

### Frontend
- [x] `lib/hooks/useSSE.ts` — EventSource hook for SSE streaming
- [x] `app/(app)/ai-coach/page.tsx` + `components/features/ai-coach/` — chat bubble UI
- [x] Real-time streaming response display (Framer Motion for tokens)
- [x] `app/(app)/calendar/page.tsx` — 7-day grid calendar
- [x] Calendar animates as AI fills in events
- [x] AI Coach shows lock modal for free users (premium gate)
- [x] Users can manually create their own calendar events

---

## Phase 7 — Google Calendar Sync (MCP) ✅
**Goal:** AI reads and writes Google Calendar for premium users.

### Backend
- [x] Set up Google OAuth2 (GoogleClientID, GoogleClientSecret, GoogleRedirectURL in config)
- [x] `google_tokens` table + GORM model in `internal/domain/googlecal/`
- [x] `google_event_id` column added to `calendar_events` via AutoMigrate
- [x] `internal/domain/googlecal/` package: model, repository, service, handler
- [x] OAuth2 flow: `GET /api/v1/google/auth` + `GET /api/v1/google/callback`
- [x] Google Calendar read: `GET /api/v1/google/events`
- [x] Google Calendar write: `POST /api/v1/google/events`
- [x] Status endpoint: `GET /api/v1/google/status`
- [x] Disconnect endpoint: `DELETE /api/v1/google/disconnect`
- [x] AI tools: `read_google_calendar` + `write_google_calendar` in `internal/ai/tools.go`
- [x] Wired in `aicoach/service.go` — conditional tool availability + system prompt update
- [x] Routes registered in `main.go` under premium middleware

### Frontend
- [x] Settings page at `app/(app)/settings/page.tsx`
- [x] "Settings" nav link added to `AppNav.tsx`
- [x] `GoogleCalendarConnect` component in `components/features/settings/`
- [x] `useGoogleCalendar` hook in `lib/hooks/useGoogleCalendar.ts`
- [x] Google Calendar connected badge shown on calendar page
- [x] Google-sourced events have distinct visual styling

---

## Phase 8 — Google OAuth (Sign in with Google) ✅
**Goal:** Users can register and log in using their Google account.

### Backend
- [x] `google_id` (nullable, uniqueIndex) + `avatar_url` columns added to `users` table
- [x] `PasswordHash` made nullable to support Google-only accounts
- [x] Shared OAuth client: `GOOGLE_IDENTITY_CLIENT_ID` / `GOOGLE_IDENTITY_CLIENT_SECRET` used for both calendar (Phase 7) and identity (Phase 8)
- [x] `internal/domain/googleauth/` package: service (state CSRF, OAuth2 flow, UpsertUser, cleanup goroutine with stop channel) + handler
- [x] `GET /auth/google` — generates state token, redirects to Google consent
- [x] `GET /auth/google/callback` — validates state, exchanges code, fetches profile, upserts user, sets JWT cookie, redirects to `/dashboard`
- [x] `FindByGoogleID` + `UpdateGoogleID` + `UpdateNameAndAvatar` added to user repository
- [x] Account linking: existing user by email gets `google_id` set; returning Google user updates name/avatar
- [x] New user: auto-created with free tier, no password
- [x] `ErrGoogleOnlyAccount` blocks local login for password-less accounts (HTTP 400)
- [x] Routes registered in `main.go` under public `auth` group (no auth middleware)
- [x] `googleAuthSvc.Stop()` called on graceful shutdown

### Frontend
- [x] `GoogleSignInButton` component in `components/features/auth/` (Google "G" SVG, full browser nav)
- [x] "Continue with Google" button on login page + OAuth `?error=` query param handling
- [x] "Sign up with Google" button on register page
- [x] OAuth callback handled entirely by backend — no frontend callback page
- [x] Settings page shows Google-linked status: avatar, email, Connected badge, or Link button
- [x] `IUser` updated with optional `google_id?` and `avatar_url?`

---

## Phase 9 — Enhance UX/UI ✅
**Goal:** Polish the user experience and visual design across all pages.

### Design System
- [x] Tropical Punch color tokens in `globals.css` @theme (primary #FF8243, tertiary #069494, background #FFF9F5, etc.)
- [x] Plus Jakarta Sans (headlines) + Be Vietnam Pro (body) via next/font/google
- [x] Material Symbols Outlined loaded via `<link>` in root layout

### Shared Primitives
- [x] `Skeleton.tsx` — animate-pulse loading primitive
- [x] `EmptyState.tsx` — centered icon + title + description + CTA
- [x] `UpgradePromo.tsx` — sidebar promo card
- [x] `Toast.tsx` + `useToast.tsx` — in-house Framer Motion toast system, auto-dismiss 4s
- [x] `PageTransition.tsx` — Framer Motion AnimatePresence fade+slide on pathname
- [x] `MobileBottomNav.tsx` — 4-item mobile bottom nav

### App Shell
- [x] `(app)/layout.tsx` — warm sidebar `w-72`, sticky, hidden on mobile
- [x] `AppNav.tsx` — pill-shaped active nav (bg-primary text-white rounded-full)

### Dashboard
- [x] Hero greeting ("Welcome back, Name!")
- [x] StreakCard + ProgressRingsCard (SVG circles, teal + primary)
- [x] TodayRitualsList with icon squares, checkboxes, completion animation
- [x] AIInsightCard (bg-accent yellow callout)

### Habits
- [x] "Your Oasis." headline, bento grid (3-col desktop)
- [x] HabitBentoCard with progress bar, category pill, streak number
- [x] CreateRitualCard (dashed border add card)
- [x] HabitAIInsightCard (bg-tertiary teal)

### Calendar
- [x] "Weekly Momentum." italic headline
- [x] Source-based event colors (ai=teal, manual=primary, google=secondary)
- [x] CalendarStatsRow with left accent bars
- [x] AddEventFAB (fixed bottom-right circular)

### AI Coach
- [x] Split layout with SessionsSidebar (lg+)
- [x] ChatBubble restyle (tl-none/tr-none, teal avatar)
- [x] ChatInput restyle (rounded-2xl, mic placeholder, orange SEND)
- [x] TypingIndicator (3 staggered Framer Motion dots)
- [x] SuggestionChips (scrollable pills when no messages)

### Polish
- [x] Toast notifications wired: habits CRUD, calendar events, login error, Google Calendar
- [x] Skeleton loading on all data-fetching pages
- [x] Empty states on habits, calendar, ai-coach
- [x] Habit completion animation (scale flash + bg-secondary/20)
- [x] Streak flame pulse (looping scale animation)
- [x] Auth pages (login/register) restyled with new palette
- [x] Settings + admin pages restyled with new palette
- [x] Mobile responsive: sidebar hidden, MobileBottomNav visible
- [x] Focus states: `*:focus-visible` outline-primary globally
- [ ] Dark mode — deferred to future phase

---

## Phase 10 — Testing
**Goal:** Core flows covered by automated tests; no regressions before pipeline.

### Backend
- [ ] Unit tests for habit service (streak calculation, completion logic)
- [ ] Unit tests for auth service (register, login, JWT issuance)
- [ ] Integration tests for `/api/v1/health`, `/auth/register`, `/auth/login`, `/habits` CRUD
- [ ] Table-driven tests for edge cases (duplicate email, invalid habit ID, expired token)
- [ ] `go test ./...` passing with >70% coverage on service layer

### Frontend
- [ ] Unit tests for `useHabits`, `useAuth`, `useCalendar` hooks (Jest + React Testing Library)
- [ ] Component tests for `HabitCard`, `CalendarEventCard`, `ChatInput`
- [ ] E2E smoke test: register → create habit → log completion → see dashboard streak (Playwright or Cypress)
- [ ] `npm test` passing with no failures

---

## Phase 11 — DevSecOps Pipeline
**Goal:** CI/CD working. Security scanning in pipeline.

- [ ] `.github/workflows/ci.yml` — on every push: run Go tests, Next.js lint (`next lint`), Semgrep security scan
- [ ] `.github/workflows/deploy.yml` — on push to main: build Docker images, deploy to Railway
- [ ] `Dockerfile` for Go backend
- [ ] `Dockerfile` for Next.js frontend (`next build` + `node server.js`)
- [ ] Update `docker-compose.yml` for production
- [ ] Set all secrets in GitHub Actions secrets
- [ ] Verify full pipeline runs end-to-end
- [ ] Write `docs/devops/pipeline.md`

---

## Phase 12 — Polish & Submission
**Goal:** Project complete and ready to submit.

- [ ] All animations smooth and working
- [ ] Mobile responsive layout (basic)
- [ ] Error states handled everywhere (empty states, loading spinners)
- [ ] README.md complete with screenshots
- [ ] Project report written
- [ ] Final commit: `"Final Commit"` (required by professor, before April 16)
- [ ] Submit GitHub repository link

---

## Timeline Suggestion

| Week | Phase |
|---|---|
| Week 1 (Mar 3–9) | Phase 1 + 2 (Setup + Auth) |
| Week 2 (Mar 10–16) | Phase 3 + 4 (Habits + Dashboard) |
| Week 3 (Mar 17–23) | Phase 5 (Admin) |
| Week 4 (Mar 24–30) | Phase 6 (AI Coach + Calendar) |
| Week 5 (Mar 31–Apr 6) | Phase 7 + 8 (Leaderboard + Google Calendar) |
| Week 6 (Apr 7–13) | Phase 9 + 10 (DevSecOps + Polish) |
| **Apr 16** | **Final Commit deadline** |