# HabitFlow AI

A web app where users describe their week in plain text → AI Coach builds a realistic habit plan → auto-fills a visual calendar.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (React + TypeScript) |
| Styling | Tailwind CSS |
| Animations | Framer Motion + GSAP |
| Backend | Go + Gin |
| ORM | GORM |
| Database | Supabase (Postgres) |
| Cache | Redis |
| AI | Google Gemini API |
| CI/CD | GitHub Actions |
| Hosting | Railway |

---

## Getting Started

### Prerequisites

- Go 1.25+
- Node.js 18+
- Docker + Docker Compose
- A [Supabase](https://supabase.com) project
- A [Gemini API key](https://aistudio.google.com)

---

### 1. Clone the repo

```bash
git clone <repo-url>
cd HabitFlow
```

### 2. Set up backend environment

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in:

| Variable | How to get it |
|---|---|
| `PORT` | Leave as `8080` |
| `SUPABASE_DB_URL` | Supabase Dashboard → Settings → Database → Connection string (URI) |
| `JWT_SECRET` | Run `openssl rand -base64 32` and paste the output |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API key |
| `REDIS_URL` | `redis://localhost:6379` for local dev |

### 3. Set up frontend environment

```bash
cp frontend/.env.local.example frontend/.env.local
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1`

### 4. Start with Docker (recommended)

```bash
docker compose up --build
```

Backend available at: `http://localhost:8080`
Health check: `http://localhost:8080/api/v1/health`

### 5. Or run locally without Docker

**Backend:**
```bash
cd backend
go run ./cmd/server
```

**Frontend (in a new terminal):**
```bash
cd frontend
npm install
npm run dev
```

Frontend available at: `http://localhost:3000`

---

## Project Structure

```
habitflow/
├── backend/
│   ├── cmd/server/        ← main entrypoint
│   ├── internal/          ← domain logic (handler, service, repository, model)
│   ├── pkg/               ← shared packages (config, database, response)
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── app/           ← Next.js App Router pages
│       ├── components/    ← UI components
│       ├── lib/           ← API client, hooks
│       └── types/         ← TypeScript interfaces
├── docs/
│   ├── context/           ← AI agent context files
│   ├── adr/               ← Architecture Decision Records
│   └── prp/               ← Phase Requirements Plans
├── docker-compose.yml
└── README.md
```

---

## Running Tests

### Backend

```bash
cd backend

# Run all tests
go test ./...

# Run with coverage report
go test ./internal/domain/habit/... ./internal/domain/user/... -cover

# Run verbose with race detector
go test -race -v ./...
```

Coverage targets: habit service ≥ 70%, user service ≥ 70%.

---

### Frontend

```bash
cd frontend

# Run Jest unit + component tests (44 tests)
npm test

# Watch mode
npm run test:watch
```

Tests cover:
- Hooks: `useHabits`, `useAuth`, `useCalendar`
- Components: `HabitCard`, `CalendarEventCard`, `ChatInput`

---

### E2E (Playwright)

Requires a running backend (`localhost:8080`) and valid `.env.local`.

```bash
cd frontend

# Install Playwright browsers (first time only)
npx playwright install --with-deps chromium

# Run smoke test (spawns next dev automatically)
npm run test:e2e
```

The smoke spec registers a new user, creates a habit, logs completion, and verifies the streak on the dashboard.

---

## Development Phases

See [docs/context/PHASES.md](docs/context/PHASES.md) for the full roadmap.

| Phase | Description | Status |
|---|---|---|
| 1 | Project Setup | Done |
| 2 | Authentication | Done |
| 3 | Habits CRUD | Done |
| 4 | Dashboard & Streaks | Done |
| 5 | Admin Panel | Done |
| 6 | Calendar & AI Coach | Done |
| 7 | Google Calendar Sync | Done |
| 8 | Google OAuth (Sign in with Google) | Done |
| 9 | Enhance UX/UI | Done |
| 10 | Testing | Done |
| 11 | DevSecOps Pipeline | Pending |
| 12 | Polish & Submission | Pending |
