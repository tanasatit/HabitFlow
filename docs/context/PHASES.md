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
- [ ] `model/user.go` — User GORM model
- [ ] `model/subscription.go` — Subscription model
- [ ] Run `AutoMigrate` for User + Subscription tables
- [ ] `repository/user_repository.go` — FindByEmail, FindByID, Create
- [ ] `service/auth_service.go` — Register (hash password), Login (verify + issue JWT)
- [ ] `handler/auth_handler.go` — POST /register, POST /login, POST /logout, GET /me
- [ ] `middleware/auth.go` — JWT validation middleware
- [ ] Test all auth endpoints with Postman/curl

### Frontend
- [ ] `lib/auth.ts` — register(), login(), logout(), token storage (httpOnly cookie)
- [ ] `lib/hooks/useAuth.ts` — auth state hook
- [ ] `middleware.ts` — redirect to /login if no token
- [ ] `app/(auth)/login/page.tsx` — login page
- [ ] `app/(auth)/register/page.tsx` — register page
- [ ] `app/(app)/layout.tsx` — server-side auth check wrapper
- [ ] Wire up routes, test login flow end-to-end

---

## Phase 3 — Habits CRUD ✅
**Goal:** Users can create, view, edit, delete habits. Free tier limit enforced.

### Backend
- [x] `model/habit.go` — Habit GORM model
- [x] `model/habit_log.go` — HabitLog GORM model
- [x] Run `AutoMigrate` for new tables
- [x] `repository/habit_repository.go` — CRUD + CountByUserID
- [x] `service/habit_service.go` — full CRUD + free tier limit check (max 3)
- [x] `handler/habit_handler.go` — all habit endpoints
- [x] `middleware/rbac.go` — RequirePremium(), RequireRole()
- [x] Apply auth middleware to habit routes
- [x] POST /habits/:id/log — mark habit complete today
- [x] Test free tier limit enforced correctly

### Frontend
- [x] `types/habit.ts` — IHabit, IHabitLog interfaces
- [x] `lib/hooks/useHabits.ts` — getAll, create, update, delete, logComplete
- [x] `components/ui/HabitCard.tsx` — reusable card with completion checkbox
- [x] `components/ui/StreakBadge.tsx` — streak counter display
- [x] `app/(app)/habits/page.tsx` — list of user's habits
- [x] `components/features/habits/HabitCreateForm.tsx` — form to create new habit
- [x] `app/(app)/habits/[id]/page.tsx` — edit existing habit
- [x] Show upgrade prompt when free user hits 3 habit limit
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

## Phase 5 — Admin Panel
**Goal:** Admin can manage users and subscriptions.

### Backend
- [ ] `handler/admin_handler.go` — ListUsers, UpdateUser, DeleteUser, Analytics
- [ ] `service/admin_service.go` — business logic
- [ ] Apply admin route group with RequireRole("admin") middleware
- [ ] Seed one admin user directly in Supabase

### Frontend
- [ ] Admin route protection in `middleware.ts` (check role === 'admin')
- [ ] `app/(app)/admin/users/page.tsx` — table of all users
- [ ] `app/(app)/admin/users/[id]/page.tsx` — view + edit subscription tier
- [ ] `app/(app)/admin/analytics/page.tsx` — simple stats: total users, premium count, DAU
- [ ] Admin nav sidebar component

---

## Phase 6 — Calendar & AI Coach
**Goal:** Premium users chat with AI, plan auto-fills calendar.

### Backend
- [ ] `model/calendar_event.go` — CalendarEvent GORM model
- [ ] `model/ai_conversation.go` — AIConversation model
- [ ] `internal/ai/client.go` — Gemini API client setup (OpenRouter fallback)
- [ ] `internal/ai/tools.go` — MCP tool definitions (read/write calendar, get habits, get stats)
- [ ] `service/ai_service.go` — orchestrate Gemini API call with tools + SSE streaming
- [ ] `handler/ai_handler.go` — POST /ai/chat (SSE endpoint)
- [ ] `repository/calendar_repository.go` — CRUD for calendar events
- [ ] `handler/calendar_handler.go` — GET /calendar, POST /calendar
- [ ] Apply RequirePremium() to all AI + calendar routes
- [ ] Test AI generates plan and saves to DB

### Frontend
- [ ] `lib/hooks/useSSE.ts` — EventSource hook for SSE streaming
- [ ] `app/(app)/ai-coach/page.tsx` + `components/features/ai-coach/` — chat bubble UI
- [ ] Real-time streaming response display (Framer Motion for tokens)
- [ ] `app/(app)/calendar/page.tsx` — 7-day grid calendar
- [ ] Calendar animates as AI fills in events
- [ ] Show lock icon + upgrade prompt for free users

---

## Phase 7 — Leaderboard
**Goal:** Premium users see weekly ranking.

### Backend
- [ ] Leaderboard query in `repository/` (see DATABASE.md for SQL)
- [ ] GET /api/v1/leaderboard — top 20 premium users by weekly points
- [ ] Cache result in Redis (refresh every 5 minutes)

### Frontend
- [ ] `components/ui/LeaderboardRow.tsx` — single row with rank, name, points
- [ ] `app/(app)/leaderboard/page.tsx` — full leaderboard page
- [ ] Smooth rank change animations (GSAP / Framer Motion)
- [ ] Show lock + upgrade prompt for free users

---

## Phase 8 — Google Calendar Sync (MCP)
**Goal:** AI reads and writes Google Calendar for premium users.

### Backend
- [ ] Set up Google OAuth2 in Supabase or manually
- [ ] Store Google tokens per user in DB
- [ ] Connect MCP Google Calendar server in AI tools
- [ ] Test AI reads real Google Calendar events
- [ ] Test AI writes habit plan back to Google Calendar

### Frontend
- [ ] "Connect Google Calendar" button in settings
- [ ] OAuth flow redirect
- [ ] Show sync status in calendar view

---

## Phase 9 — DevSecOps Pipeline
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

## Phase 10 — Polish & Submission
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