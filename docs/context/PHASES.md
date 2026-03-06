# PHASES.md — Implementation Roadmap

> Update CLAUDE.md "Current Phase" section each time you move to a new phase.

---

## Phase 1 — Project Setup
**Goal:** Running skeleton with nothing broken

### Backend
- [ ] Init Go module (`go mod init habitflow`)
- [ ] Install dependencies: Gin, GORM, postgres driver, jwt-go, uuid, godotenv
- [ ] Create folder structure (`internal/handler`, `service`, `repository`, `model`, `middleware`, `ai`)
- [ ] `pkg/config/config.go` — load `.env` variables
- [ ] `pkg/database/supabase.go` — connect to Supabase via GORM
- [ ] `cmd/server/main.go` — start server on port 8080, test DB connection
- [ ] Create `.env` file (never commit this)

### Frontend
- [ ] `ng new frontend --routing --style=scss`
- [ ] Install dependencies: `@angular/animations`, `gsap`
- [ ] Set up `environments/environment.ts` with `apiUrl`
- [ ] Create `core/` folder structure
- [ ] Create `features/` folder with empty modules
- [ ] Verify `ng serve` runs

### DevOps
- [ ] `docker-compose.yml` with Go backend + Redis (Supabase is remote)
- [ ] `.gitignore` — exclude `.env`, `node_modules`, Go binaries
- [ ] Initial commit: `"Initial Commit"` (required by professor)

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
- [ ] `core/services/auth.service.ts` — register(), login(), logout(), currentUser signal
- [ ] `core/interceptors/auth.interceptor.ts` — attach Bearer token to requests
- [ ] `core/guards/auth.guard.ts` — redirect to /login if not authenticated
- [ ] `core/guards/role.guard.ts` — redirect based on role/tier
- [ ] `features/auth/login/` — login page component
- [ ] `features/auth/register/` — register page component
- [ ] Wire up routes, test login flow end-to-end

---

## Phase 3 — Habits CRUD
**Goal:** Users can create, view, edit, delete habits. Free tier limit enforced.

### Backend
- [ ] `model/habit.go` — Habit GORM model
- [ ] `model/habit_log.go` — HabitLog GORM model
- [ ] Run `AutoMigrate` for new tables
- [ ] `repository/habit_repository.go` — CRUD + CountByUserID
- [ ] `service/habit_service.go` — full CRUD + free tier limit check (max 3)
- [ ] `handler/habit_handler.go` — all habit endpoints
- [ ] `middleware/rbac.go` — RequirePremium(), RequireRole()
- [ ] Apply auth middleware to habit routes
- [ ] POST /habits/:id/log — mark habit complete today
- [ ] Test free tier limit enforced correctly

### Frontend
- [ ] `models/habit.interface.ts` — IHabit, IHabitLog
- [ ] `core/services/habit.service.ts` — getAll, create, update, delete, logComplete
- [ ] `shared/components/habit-card/` — reusable card with completion checkbox
- [ ] `shared/components/streak-badge/` — streak counter display
- [ ] `features/habits/habit-list/` — list of user's habits
- [ ] `features/habits/habit-create/` — form to create new habit
- [ ] `features/habits/habit-edit/` — edit existing habit
- [ ] Show upgrade prompt when free user hits 3 habit limit
- [ ] Add satisfying checkmark animation on completion (Angular Animations)

---

## Phase 4 — Dashboard & Streaks
**Goal:** Users see progress. Streak counter works correctly.

### Backend
- [ ] Streak calculation logic in `habit_service.go`
- [ ] GET /api/v1/dashboard — returns user stats (streak, completion rate, weekly summary)
- [ ] GET /api/v1/habits/:id/stats — per-habit stats

### Frontend
- [ ] `shared/components/progress-ring/` — animated SVG ring
- [ ] `features/habits/dashboard/` — main dashboard page
- [ ] Streak flame 🔥 animation (GSAP)
- [ ] Weekly completion chart (simple bar chart)
- [ ] Wire dashboard to real API data

---

## Phase 5 — Admin Panel
**Goal:** Admin can manage users and subscriptions.

### Backend
- [ ] `handler/admin_handler.go` — ListUsers, UpdateUser, DeleteUser, Analytics
- [ ] `service/admin_service.go` — business logic
- [ ] Apply admin route group with RequireRole("admin") middleware
- [ ] Seed one admin user directly in Supabase

### Frontend
- [ ] `core/guards/admin.guard.ts`
- [ ] `features/admin/user-list/` — table of all users
- [ ] `features/admin/user-detail/` — view + edit subscription tier
- [ ] `features/admin/analytics/` — simple stats: total users, premium count, DAU
- [ ] Admin nav sidebar

---

## Phase 6 — Calendar & AI Coach
**Goal:** Premium users chat with AI, plan auto-fills calendar.

### Backend
- [ ] `model/calendar_event.go` — CalendarEvent GORM model
- [ ] `model/ai_conversation.go` — AIConversation model
- [ ] `internal/ai/client.go` — Claude API client setup
- [ ] `internal/ai/tools.go` — MCP tool definitions (read/write calendar, get habits, get stats)
- [ ] `service/ai_service.go` — orchestrate Claude API call with tools + SSE streaming
- [ ] `handler/ai_handler.go` — POST /ai/chat (SSE endpoint)
- [ ] `repository/calendar_repository.go` — CRUD for calendar events
- [ ] `handler/calendar_handler.go` — GET /calendar, POST /calendar
- [ ] Apply RequirePremium() to all AI + calendar routes
- [ ] Test AI generates plan and saves to DB

### Frontend
- [ ] `core/services/ai.service.ts` — sendMessage() using EventSource (SSE)
- [ ] `features/ai-coach/chat/` — chat bubble UI
- [ ] Real-time streaming response display
- [ ] `features/calendar/weekly-view/` — 7-day grid calendar
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
- [ ] `shared/components/leaderboard-row/` — single row with rank, name, points
- [ ] `features/leaderboard/` — full leaderboard page
- [ ] Smooth rank change animations (GSAP)
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

- [ ] `.github/workflows/ci.yml` — on every push: run Go tests, Angular lint, Semgrep security scan
- [ ] `.github/workflows/deploy.yml` — on push to main: build Docker image, deploy to Railway
- [ ] `Dockerfile` for Go backend
- [ ] `Dockerfile` for Angular frontend (nginx)
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