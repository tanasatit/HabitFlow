# ARCHITECTURE.md — System Design

---

## Style: Layered Monolith

Single deployable Go backend with strictly separated internal layers. Chosen because:
- Solo developer, semester deadline
- Delivers all architectural principles without microservices overhead
- AI service is isolated enough to extract later if needed

---

## System Overview

```
┌─────────────────────────────────────┐
│     Next.js 14 Frontend             │
│  (App Router + Server Components)   │
│  (React + TypeScript + Tailwind)    │
└────────────────┬────────────────────┘
                 │ HTTP REST / SSE
┌────────────────▼────────────────────┐
│         Go + Gin Backend            │
│                                     │
│  JWT Middleware → RBAC Middleware   │
│         ↓                           │
│      Handler Layer                  │
│      Service Layer                  │
│      Repository Layer               │
│         ↓                           │
│      GORM → Supabase (Postgres)     │
│      Redis (cache/leaderboard)      │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│         AI Service                  │
│                                     │
│  Google Gemini API (free tier)      │
│  Fallback: OpenRouter               │
│  MCP Tools:                         │
│   - read_google_calendar            │
│   - write_habit_plan                │
│   - get_user_habits                 │
│   - get_user_stats                  │
└─────────────────────────────────────┘
```

---

## Backend Layer Rules

Every request must flow in this exact order. No skipping.

```
Request → Middleware → Handler → Service → Repository → Database
```

| Layer | Job | What It Must NOT Do |
|---|---|---|
| Handler | Receive request, validate input, call service, return response | No business logic, no DB access |
| Service | All business logic, orchestrate calls | No direct DB queries, no HTTP logic |
| Repository | All GORM/DB queries | No business logic |
| Model | Struct definitions only | No methods with business logic |

---

## Frontend Project Structure (Next.js 14 App Router)

```
frontend/
├── app/                          ← Next.js App Router (pages + layouts)
│   ├── layout.tsx                ← root layout
│   ├── page.tsx                  ← landing / redirect
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/                    ← protected route group
│   │   ├── layout.tsx            ← auth check wrapper
│   │   ├── dashboard/page.tsx
│   │   ├── habits/page.tsx
│   │   ├── habits/[id]/page.tsx
│   │   ├── ai-coach/page.tsx     ← premium only
│   │   ├── calendar/page.tsx     ← premium only
│   │   ├── leaderboard/page.tsx  ← premium only
│   │   └── admin/                ← admin only
│   │       ├── users/page.tsx
│   │       └── analytics/page.tsx
│
├── components/
│   ├── ui/                       ← generic reusable (no business logic)
│   │   ├── HabitCard.tsx
│   │   ├── ProgressRing.tsx
│   │   ├── StreakBadge.tsx
│   │   └── LeaderboardRow.tsx
│   └── features/                 ← feature-specific components
│       ├── auth/
│       ├── habits/
│       ├── ai-coach/
│       └── calendar/
│
├── lib/
│   ├── api.ts                    ← base fetch wrapper (attaches JWT)
│   ├── auth.ts                   ← auth helpers + token storage
│   └── hooks/
│       ├── useAuth.ts
│       ├── useHabits.ts
│       └── useSSE.ts             ← SSE streaming hook for AI chat
│
├── types/
│   ├── habit.ts                  ← IHabit, IHabitLog
│   ├── user.ts                   ← IUser
│   └── api.ts                    ← API response shapes
│
└── middleware.ts                 ← Next.js middleware for route protection
```

---

## Backend Package Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go
└── internal/
    ├── handler/
    │   ├── auth_handler.go
    │   ├── habit_handler.go
    │   ├── ai_handler.go
    │   ├── calendar_handler.go
    │   ├── leaderboard_handler.go
    │   └── admin_handler.go
    ├── service/
    │   ├── auth_service.go
    │   ├── habit_service.go
    │   ├── ai_service.go
    │   └── admin_service.go
    ├── repository/
    │   ├── user_repository.go
    │   ├── habit_repository.go
    │   └── calendar_repository.go
    ├── model/
    │   ├── user.go
    │   ├── habit.go
    │   ├── habit_log.go
    │   └── calendar_event.go
    ├── middleware/
    │   ├── auth.go            ← validate JWT
    │   └── rbac.go            ← check role/subscription
    └── ai/
        ├── client.go          ← Gemini API client (OpenRouter fallback)
        └── tools.go           ← MCP tool definitions
└── pkg/
    ├── database/
    │   └── supabase.go        ← GORM + Supabase connection
    └── config/
        └── config.go          ← env variable loading
```

---

## API Route Design

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

GET    /api/v1/habits               ← list user's habits
POST   /api/v1/habits               ← create habit
PUT    /api/v1/habits/:id           ← update habit
DELETE /api/v1/habits/:id           ← delete habit
POST   /api/v1/habits/:id/log       ← mark complete today

GET    /api/v1/calendar             ← get calendar events
POST   /api/v1/ai/chat              ← send message to AI Coach (SSE)
GET    /api/v1/leaderboard          ← get weekly leaderboard (premium)

GET    /api/v1/admin/users          ← list all users (admin)
PUT    /api/v1/admin/users/:id      ← update user subscription (admin)
DELETE /api/v1/admin/users/:id      ← delete user (admin)
GET    /api/v1/admin/analytics      ← platform stats (admin)
```

---

## AI Chat Flow (SSE)

```
1. Frontend sends POST /api/v1/ai/chat with user message
2. Go handler opens SSE stream back to Next.js
3. AI Service calls Google Gemini API with:
   - system prompt (AI Coach persona)
   - user message
   - available MCP tools
   (falls back to OpenRouter if Gemini quota exceeded)
4. Gemini decides which tools to call
5. Go executes tool calls (read calendar, get habits, etc.)
6. Gemini generates habit plan
7. Go saves plan to calendar_events table
8. Go streams response tokens back via SSE
9. Next.js useSSE hook renders response in real-time
```

---

## Environment Variables

```env
# Supabase
SUPABASE_DB_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Auth
JWT_SECRET=...
JWT_EXPIRY_HOURS=24

# Google Gemini AI (primary — free tier)
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-1.5-flash

# OpenRouter (fallback)
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=google/gemini-flash-1.5

# Google Calendar (MCP)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# App
PORT=8080
ENV=development
```