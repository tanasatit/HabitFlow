# PRP-001 -- Phase 1: Project Setup

**Phase Goal:** Create a running skeleton for both backend (Go + Gin) and frontend (Next.js 14) with database connectivity, proper folder structure, Docker setup, and zero broken builds.

**Status:** Planning
**Date:** 2026-03-23
**Depends on:** Nothing (this is the first phase)

---

## 1. Backend Agent Tasks

### 1.1 Initialize Go Module

**File:** `backend/go.mod` (generated)

```bash
cd backend && go mod init habitflow
```

**Dependencies to install:**
| Package | Purpose |
|---|---|
| `github.com/gin-gonic/gin` | HTTP router |
| `gorm.io/gorm` | ORM |
| `gorm.io/driver/postgres` | Postgres driver for GORM |
| `github.com/golang-jwt/jwt/v5` | JWT token handling |
| `github.com/google/uuid` | UUID generation |
| `github.com/joho/godotenv` | Load .env files |
| `github.com/go-redis/redis/v8` | Redis client |

### 1.2 Create Folder Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── handler/
│   │   └── .gitkeep
│   ├── service/
│   │   └── .gitkeep
│   ├── repository/
│   │   └── .gitkeep
│   ├── model/
│   │   └── .gitkeep
│   ├── middleware/
│   │   └── .gitkeep
│   └── ai/
│       └── .gitkeep
├── pkg/
│   ├── config/
│   │   └── config.go
│   └── database/
│       └── supabase.go
├── .env              (never committed)
├── .env.example
└── go.mod
```

### 1.3 Config Loader

**File:** `backend/pkg/config/config.go`

```
package config

type Config struct
    Port              string
    Env               string
    SupabaseDBURL     string
    RedisURL          string
    JWTSecret         string
    JWTExpiryHours    int
    GeminiAPIKey      string
    GeminiModel       string
    OpenRouterAPIKey  string
    OpenRouterModel   string

func Load() (*Config, error)
    - Uses godotenv.Load() to read .env
    - Reads each var from os.Getenv()
    - Returns error if required vars (Port, SupabaseDBURL, JWTSecret) are missing
    - Defaults: Port="8080", Env="development", JWTExpiryHours=24
```

### 1.4 Database Connection

**File:** `backend/pkg/database/supabase.go`

```
package database

func Connect(dsn string) (*gorm.DB, error)
    - Opens GORM connection with postgres.Open(dsn)
    - Returns wrapped error on failure: "database.Connect: %w"

func AutoMigrate(db *gorm.DB) error
    - Empty for Phase 1 (no models yet)
    - Will be populated in Phase 2
```

### 1.5 Main Entry Point

**File:** `backend/cmd/server/main.go`

```
package main

func main()
    1. Load config via config.Load()
    2. Connect to Supabase via database.Connect(cfg.SupabaseDBURL)
    3. Log "Database connected successfully"
    4. Create Gin engine with gin.Default()
    5. Register health check route: GET /api/v1/health -> returns {"status": "ok"}
    6. Start server on cfg.Port
    7. Fatal log on any startup error
```

**Health Check API Contract:**

| Field | Value |
|---|---|
| Endpoint | `GET /api/v1/health` |
| Auth | None |
| Request Body | None |
| Response 200 | `{"data": {"status": "ok"}, "message": "success"}` |

### 1.6 Environment File

**File:** `backend/.env.example` (committed)

```env
# App
PORT=8080
ENV=development

# Supabase
SUPABASE_DB_URL=postgresql://postgres:password@host:5432/postgres

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-secret-here
JWT_EXPIRY_HOURS=24

# AI (not needed until Phase 6)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemini-flash-1.5
```

**File:** `backend/.env` (never committed -- developer creates manually from .env.example)

---

## 2. Frontend Agent Tasks

### 2.1 Create Next.js App

```bash
npx create-next-app@latest frontend --typescript --tailwind --app --eslint --src-dir=false --import-alias="@/*"
```

**Post-scaffold dependencies to install:**
| Package | Purpose |
|---|---|
| `framer-motion` | Animations (checkmarks, progress rings) |
| `gsap` | Advanced animations (streak flame, leaderboard) |

### 2.2 Folder Structure to Create

After scaffolding, create these additional directories and files:

```
frontend/
├── app/
│   ├── layout.tsx           (scaffolded -- keep as-is)
│   ├── page.tsx             (scaffolded -- replace with redirect or landing stub)
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx     (placeholder: "Login Page")
│   │   └── register/
│   │       └── page.tsx     (placeholder: "Register Page")
│   └── (app)/
│       ├── layout.tsx       (protected route group layout -- stub)
│       └── dashboard/
│           └── page.tsx     (placeholder: "Dashboard")
├── components/
│   ├── ui/
│   │   └── .gitkeep
│   └── features/
│       └── .gitkeep
├── lib/
│   ├── api.ts
│   └── hooks/
│       └── .gitkeep
├── types/
│   └── api.ts
├── middleware.ts
└── .env.local               (never committed)
```

### 2.3 Base Fetch Wrapper

**File:** `frontend/lib/api.ts`

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T>
    - Prepends API_BASE_URL to path
    - Attaches Content-Type: application/json header
    - (Token attachment will be added in Phase 2)
    - Throws error with response text on non-ok status
    - Returns parsed JSON as T
```

### 2.4 API Response Types

**File:** `frontend/types/api.ts`

```typescript
export interface IApiResponse<T> {
    data: T;
    message: string;
}

export interface IApiError {
    error: string;
    code: string;
}

export interface IApiListResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}
```

### 2.5 Protected Route Layout (Stub)

**File:** `frontend/app/(app)/layout.tsx`

```typescript
// Server component -- stub for Phase 1
// In Phase 2, this will check auth token and redirect if missing
export default function AppLayout({ children }: { children: React.ReactNode })
    - Returns children wrapped in a basic layout div
    - Comment: "TODO Phase 2: Add auth check"
```

### 2.6 Middleware (Stub)

**File:** `frontend/middleware.ts`

```typescript
export function middleware(request: NextRequest)
    - Phase 1: pass-through (return NextResponse.next())
    - Comment: "TODO Phase 2: Check token for protected routes"

export const config = {
    matcher: ["/(app)/:path*"]
}
```

### 2.7 Environment File

**File:** `frontend/.env.local` (never committed, developer creates)
**File:** `frontend/.env.example` (committed)

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### 2.8 Placeholder Pages

All placeholder pages should be minimal -- just a div with the page name as text. They exist to confirm the routing structure works.

| File | Content |
|---|---|
| `app/page.tsx` | Landing stub or redirect to /login |
| `app/(auth)/login/page.tsx` | "Login" heading |
| `app/(auth)/register/page.tsx` | "Register" heading |
| `app/(app)/dashboard/page.tsx` | "Dashboard" heading |

---

## 3. DevOps Agent Tasks

### 3.1 Docker Compose

**File:** `docker-compose.yml` (project root)

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    env_file:
      - ./backend/.env
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

Notes:
- Supabase is remote -- no Postgres container needed
- Frontend runs via `npm run dev` locally during development (not containerized in Phase 1)

### 3.2 Backend Dockerfile

**File:** `backend/Dockerfile`

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o server ./cmd/server

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]
```

### 3.3 Gitignore

**File:** `.gitignore` (project root)

Must exclude:
- `.env` / `.env.local` (all env files except .env.example)
- `node_modules/`
- `.next/`
- Go binaries (`backend/server`, `backend/tmp/`)
- OS files (`.DS_Store`)
- IDE files (`.idea/`, `.vscode/settings.json`)
- `redis_data/`

### 3.4 Backend .gitignore

**File:** `backend/.gitignore`

Must exclude:
- `.env`
- Binary outputs
- `tmp/` (hot reload artifacts)

---

## 4. Decisions and Trade-offs

| Decision | Rationale |
|---|---|
| Supabase is remote, not in Docker | Per ARCHITECTURE.md -- Supabase is a managed service. Only Redis is local. |
| Frontend not containerized in Phase 1 | Faster dev iteration. Docker for frontend added in Phase 9. |
| `.gitkeep` in empty directories | Git does not track empty dirs. `.gitkeep` preserves the folder structure in the repo. |
| AutoMigrate left empty in Phase 1 | No models are defined yet. Phase 2 introduces User and Subscription models. |
| Health check follows API response format from RULES.md | Consistent response shape from day one: `{"data": ..., "message": "..."}` |
| Config loader validates required vars | Fail fast at startup rather than crashing mid-request on missing config. |
| Middleware is a stub in Phase 1 | Route protection depends on JWT which is Phase 2 work. |

---

## 5. Conflicts / Observations

1. **ROLES.md references Angular** -- The code examples in ROLES.md include an Angular route guard section (`app.routes.ts`, `canActivate`). The project uses Next.js 14, not Angular. This section should be ignored. The Next.js middleware pattern from RULES.md is the correct approach.

2. **PRD.md references "Angular Animations"** -- Line 93 mentions "Angular Animations + GSAP". This conflicts with the tech stack (Next.js + Framer Motion + GSAP). Use Framer Motion + GSAP as specified in CLAUDE.md and PHASES.md.

3. **PRD.md filename has trailing spaces** -- The file `PRD.md    ` has 4 trailing spaces in its name. This should be fixed to avoid tooling issues.

---

## 6. Dependency Order (What Must Be Done Before What)

```
1. DevOps: Create .gitignore                      (no deps)
2. Backend: Init Go module                         (no deps)
3. Backend: Create folder structure                (after #2)
4. Backend: Write config.go                        (after #3)
5. Backend: Write supabase.go                      (after #3)
6. Backend: Write main.go                          (after #4, #5)
7. Backend: Create .env.example                    (after #3)
8. DevOps: Create backend/Dockerfile               (after #6)
9. DevOps: Create docker-compose.yml               (after #8)
10. Frontend: Scaffold Next.js app                 (no deps)
11. Frontend: Install framer-motion, gsap          (after #10)
12. Frontend: Create folder structure              (after #10)
13. Frontend: Write lib/api.ts                     (after #12)
14. Frontend: Write types/api.ts                   (after #12)
15. Frontend: Write middleware.ts stub              (after #12)
16. Frontend: Write (app)/layout.tsx stub           (after #12)
17. Frontend: Write placeholder pages              (after #12)
18. Frontend: Create .env.example                  (after #12)
19. Frontend: Verify npm run dev works             (after #11-#18)
20. Backend: Verify go run cmd/server/main.go      (after #6, needs .env with real Supabase URL)
```

Backend and Frontend tracks (#2-#9 and #10-#19) can proceed in parallel.

---

## 7. Testing Checklist (Phase 1 Complete When All Pass)

### Backend
- [ ] `go build ./...` compiles with zero errors
- [ ] `go run cmd/server/main.go` starts on port 8080 (with valid .env)
- [ ] `curl http://localhost:8080/api/v1/health` returns `{"data":{"status":"ok"},"message":"success"}`
- [ ] Database connection logs "Database connected successfully" on startup
- [ ] Server exits with clear error message if SUPABASE_DB_URL is missing

### Frontend
- [ ] `npm run dev` starts without errors on port 3000
- [ ] `http://localhost:3000` renders the landing/root page
- [ ] `http://localhost:3000/login` renders the login placeholder
- [ ] `http://localhost:3000/register` renders the register placeholder
- [ ] `http://localhost:3000/dashboard` renders the dashboard placeholder
- [ ] `npm run build` completes with zero errors
- [ ] `npm run lint` passes

### DevOps
- [ ] `.gitignore` excludes `.env`, `node_modules`, `.next`, Go binaries
- [ ] `docker compose build` succeeds for backend service
- [ ] `docker compose up redis` starts Redis on port 6379
- [ ] No secrets or `.env` files are tracked by git

### Integration
- [ ] Frontend can reach backend health endpoint (CORS not required yet -- just verify the endpoint exists)
