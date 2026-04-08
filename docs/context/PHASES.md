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

## Phase 8 — Google OAuth (Sign in with Google)
**Goal:** Users can register and log in using their Google account.

### Backend
- [ ] Add `google_id` column to `users` table (nullable, unique index)
- [ ] Register a separate OAuth2 client in Google Cloud Console for identity (not calendar scope — use `openid email profile`)
- [ ] `GET /auth/google` — initiate Google sign-in (state token, redirect to Google)
- [ ] `GET /auth/google/callback` — exchange code, fetch user profile, upsert user by `google_id` or email, issue JWT
- [ ] Handle both new user (auto-register with free tier) and existing user (link accounts by email)
- [ ] No password required for Google-linked accounts; block local login if no password hash

### Frontend
- [ ] "Continue with Google" button on login and register pages
- [ ] Handle redirect to `/auth/google` (plain browser navigation, no auth header needed)
- [ ] On callback redirect back to `/dashboard` with JWT set in cookie
- [ ] Show Google avatar/email in account settings for linked accounts

---

## Phase 9 — Enhance UX/UI
**Goal:** Polish the user experience and visual design across all pages.

- [ ] Consistent loading skeletons on all data-fetching pages (habits, dashboard, calendar, ai-coach)
- [ ] Empty states with illustrations on habits list, calendar, and ai-coach (no habits yet, no events, no chat)
- [ ] Toast notifications for success/error actions (habit created, event saved, login failed, etc.)
- [ ] Smooth page transitions using Framer Motion `AnimatePresence`
- [ ] Mobile-responsive layout for habits, dashboard, and calendar pages
- [ ] Accessible focus states and keyboard navigation on forms and buttons
- [ ] Dark mode support (Tailwind `dark:` classes, persisted in localStorage)
- [ ] Micro-interactions: button press feedback, card hover states, streak flame pulse

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