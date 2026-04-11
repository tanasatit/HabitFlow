# PRP-010 -- Phase 10: Testing

> **Phase goal:** Lock down the core user flows with automated tests so nothing regresses before the CI/CD pipeline and final submission.

---

## Background & Context

Phases 1-9 delivered a complete, styled HabitFlow AI app (auth, habits CRUD, dashboard, admin, AI coach, calendar, Google Calendar sync, Google sign-in, UX polish). There are currently **zero** test files in either `backend/` or `frontend/`. Phase 10 introduces the first automated test suites.

### Realistic scope (6 days to April 16 deadline)

The final commit is due **April 16, 2026** -- today is **April 9, 2026**. This phase also has to share time with Phase 11 (CI/CD pipeline) and Phase 12 (polish + submission), so Phase 10 should target roughly **3 working days** of effort. That forces strict prioritization:

1. **Backend unit tests first** -- highest value per hour. Service-layer logic (streak calculation, password hashing, JWT issuance) is pure Go and easy to test without infrastructure.
2. **Backend integration tests second** -- use `httptest` + an in-memory SQLite or a throwaway test Postgres schema. The user's preference is "no mocks for integration tests," but given the 6-day budget, an **in-memory SQLite via `gorm.io/driver/sqlite`** is the pragmatic middle ground: it is a real DB engine (not a mock), is zero-setup, and exercises real GORM queries. This is acceptable for Phase 10.
3. **Frontend hook tests third** -- Jest + React Testing Library, mock `fetch` with MSW or manual mocks. Focus on `useHabits`, `useAuth`, `useCalendar`.
4. **Frontend component tests fourth** -- only 3 components: `HabitCard`, `CalendarEventCard`, `ChatInput`.
5. **One E2E smoke test last** -- Playwright, single happy-path flow: register -> create habit -> log completion -> dashboard shows streak = 1. If time runs out, this is the first thing to cut.

### Key decisions

- **Backend test DB:** Use `gorm.io/driver/sqlite` with `:memory:` DSN for integration tests. It is NOT a mock; it is a real SQL engine running in-process. This avoids the multi-hour setup cost of testcontainers while still exercising real GORM queries and migrations. Note: a handful of Postgres-specific features (e.g., `uuid_generate_v4()`, `gen_random_uuid()` defaults) will need the GORM models to generate UUIDs in `BeforeCreate` hooks rather than relying on DB defaults -- if that is already the case, SQLite "just works"; if not, the backend agent should add hooks as part of this phase.
- **Frontend runner:** Jest + `@testing-library/react` + `@testing-library/jest-dom` + `jest-environment-jsdom`. Next.js 16 + React 19 + Jest 29 works with `next/jest`.
- **E2E runner:** **Playwright** (not Cypress). Playwright has a lighter install, first-class TS support, and can drive the real Next.js dev server.
- **Coverage target:** `>70%` on the backend service layer (per PHASES.md). No hard target on frontend -- "no failures" is the bar.
- **No CI in this phase.** All test commands must pass locally via `go test ./...` and `npm test`. Wiring into GitHub Actions is Phase 11.

### Flagged conflicts / assumptions

- PHASES.md mentions a `CalendarEventCard` component test. That component exists at `frontend/src/components/features/calendar/CalendarEventCard.tsx`. Good.
- PHASES.md mentions `useCalendar` -- the actual hook is `frontend/src/lib/hooks/useCalendar.ts`. Good.
- PHASES.md mentions `HabitCard` -- this exists at `frontend/src/components/ui/HabitCard.tsx`. The newer bento UI uses `HabitBentoCard`, but the PHASES checklist explicitly names `HabitCard`, so we test `HabitCard` as written.
- RULES.md does not mandate any specific test framework. Choices above are the planner's call.

---

## Scope

### Backend

| # | Task | Status |
|---|---|---|
| B1 | Add test dependencies: `github.com/stretchr/testify`, `gorm.io/driver/sqlite`, `github.com/DATA-DOG/go-sqlmock` (optional) to `backend/go.mod` |  |
| B2 | Create `backend/internal/testutil/db.go` -- helper `NewTestDB() *gorm.DB` spinning up an in-memory SQLite with all models auto-migrated |  |
| B3 | Create `backend/internal/testutil/fixtures.go` -- factory helpers (`MakeUser`, `MakeHabit`, `MakeHabitLog`) |  |
| B4 | Ensure GORM models generate UUIDs via `BeforeCreate` hooks (audit `user`, `habit`, `habit_log`, `calendar_event`, etc.) so SQLite tests work without Postgres `gen_random_uuid()` defaults |  |
| B5 | Unit tests: `backend/internal/domain/habit/service_test.go` -- streak calculation (consecutive days, broken streak, gap of 1 day, timezone edge), completion logic (duplicate log same day, log for deleted habit), table-driven edge cases |  |
| B6 | Unit tests: `backend/internal/domain/user/service_test.go` -- Register (hashes password, rejects duplicate email), Login (verifies password, issues valid JWT, rejects wrong password, rejects Google-only accounts), JWT issuance (claims, expiry) |  |
| B7 | Integration tests: `backend/internal/domain/health/health_test.go` (or wherever `/api/v1/health` is registered) -- GET /api/v1/health returns 200 + JSON `{status:"ok"}` |  |
| B8 | Integration tests: `backend/internal/domain/user/handler_test.go` -- POST /auth/register (happy path, duplicate email 409, invalid payload 400), POST /auth/login (happy path sets cookie, wrong password 401, missing user 401), GET /auth/me (valid JWT 200, expired JWT 401, no JWT 401) |  |
| B9 | Integration tests: `backend/internal/domain/habit/handler_test.go` -- POST /habits (auth required, happy path), GET /habits (lists only caller's), GET /habits/:id (404 for invalid uuid, 404 for other user's habit), PUT /habits/:id, DELETE /habits/:id, POST /habits/:id/log |  |
| B10 | Run `go test ./... -cover` and confirm `>70%` coverage on `internal/domain/habit` and `internal/domain/user` service files |  |

### Frontend

| # | Task | Status |
|---|---|---|
| F1 | Add dev dependencies: `jest`, `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@types/jest`, `ts-node` |  |
| F2 | Create `frontend/jest.config.ts` using `next/jest`, with `setupFilesAfterEach` pointing at `jest.setup.ts` |  |
| F3 | Create `frontend/jest.setup.ts` importing `@testing-library/jest-dom` and providing a global `fetch` mock helper |  |
| F4 | Add `"test": "jest"` and `"test:watch": "jest --watch"` to `frontend/package.json` scripts |  |
| F5 | Hook test: `frontend/src/lib/hooks/__tests__/useHabits.test.tsx` -- tests `getAll`, `create`, `update`, `delete`, `logComplete` by mocking `fetch` |  |
| F6 | Hook test: `frontend/src/lib/hooks/__tests__/useAuth.test.tsx` -- tests login/logout/register state transitions, token persistence, redirect side-effects mocked |  |
| F7 | Hook test: `frontend/src/lib/hooks/__tests__/useCalendar.test.tsx` -- tests fetching events for a date range, creating an event, error propagation |  |
| F8 | Component test: `frontend/src/components/ui/__tests__/HabitCard.test.tsx` -- renders name + streak, clicking checkbox calls `onComplete`, disabled state when already logged today |  |
| F9 | Component test: `frontend/src/components/features/calendar/__tests__/CalendarEventCard.test.tsx` -- renders title + time range, correct source-based class (`ai` / `manual` / `google`), edit click fires callback |  |
| F10 | Component test: `frontend/src/components/features/ai-coach/__tests__/ChatInput.test.tsx` -- typing updates value, Enter submits, Shift+Enter inserts newline, SEND button disabled when empty |  |
| F11 | Install Playwright: `npm i -D @playwright/test && npx playwright install --with-deps chromium` |  |
| F12 | Create `frontend/playwright.config.ts` -- launches `next dev` on port 3000, baseURL, single worker, chromium only |  |
| F13 | E2E smoke: `frontend/e2e/smoke.spec.ts` -- register a new user with a randomized email, create one habit "Morning run", click to log completion, navigate to dashboard, assert streak badge shows `1` |  |
| F14 | Add `"test:e2e": "playwright test"` script to `frontend/package.json` |  |
| F15 | Run `npm test` -- confirm zero failures |  |

---

## Technical Design

### Backend

#### Test file layout

```
backend/
  internal/
    testutil/
      db.go              # NewTestDB() *gorm.DB -- sqlite :memory: + AutoMigrate(all models)
      fixtures.go        # MakeUser(db, opts...), MakeHabit(db, userID, opts...), etc.
    domain/
      habit/
        service_test.go      # unit tests -- uses NewTestDB
        handler_test.go      # integration tests -- uses NewTestDB + httptest
      user/
        service_test.go
        handler_test.go
      health/
        health_test.go       # or wherever health handler lives
```

#### `testutil/db.go` example shape

```go
package testutil

import (
    "testing"
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
    "github.com/habitflow/api/internal/domain/user"
    "github.com/habitflow/api/internal/domain/habit"
    // ... other domain packages whose models are migrated in main.go
)

func NewTestDB(t *testing.T) *gorm.DB {
    t.Helper()
    db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
    if err != nil { t.Fatalf("open sqlite: %v", err) }
    if err := db.AutoMigrate(
        &user.User{},
        &user.Subscription{},
        &habit.Habit{},
        &habit.HabitLog{},
        // ... etc
    ); err != nil { t.Fatalf("migrate: %v", err) }
    return db
}
```

#### Habit service unit-test pattern (table-driven)

```go
func TestHabitService_CalculateStreak(t *testing.T) {
    tests := []struct{
        name         string
        logs         []time.Time // dates habit was logged, newest first
        today        time.Time
        wantStreak   int
    }{
        {"no logs", nil, date(2026,4,9), 0},
        {"logged today only", []time.Time{date(2026,4,9)}, date(2026,4,9), 1},
        {"3-day streak ending today", []time.Time{date(2026,4,9), date(2026,4,8), date(2026,4,7)}, date(2026,4,9), 3},
        {"streak broken by 1-day gap", []time.Time{date(2026,4,9), date(2026,4,7)}, date(2026,4,9), 1},
        {"streak excluding today continues from yesterday", []time.Time{date(2026,4,8), date(2026,4,7)}, date(2026,4,9), 2},
    }
    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            db := testutil.NewTestDB(t)
            // seed habit + logs
            // ...
            svc := habit.NewService(habit.NewRepository(db))
            got, err := svc.CalculateStreak(ctx, habitID)
            require.NoError(t, err)
            require.Equal(t, tc.wantStreak, got)
        })
    }
}
```

#### Auth service unit-test cases

- `Register` hashes the password (verify stored hash is not the plaintext, `bcrypt.CompareHashAndPassword` succeeds)
- `Register` rejects duplicate email (expect `ErrEmailTaken` or equivalent)
- `Login` succeeds with correct password, returns JWT that parses and has correct `sub` / `email` / `exp`
- `Login` fails with wrong password (`ErrInvalidCredentials`)
- `Login` fails for Google-only accounts (`ErrGoogleOnlyAccount`)
- `Login` fails when user does not exist
- JWT expiry matches configured TTL (allow 2s tolerance)

#### Integration test pattern (handler_test.go)

```go
func setupTestRouter(t *testing.T) (*gin.Engine, *gorm.DB) {
    gin.SetMode(gin.TestMode)
    db := testutil.NewTestDB(t)
    r := gin.New()
    // wire only the routes under test
    userRepo := user.NewRepository(db)
    userSvc  := user.NewService(userRepo, testJWTSecret, testJWTTTL)
    user.RegisterRoutes(r, user.NewHandler(userSvc))
    return r, db
}

func TestRegisterHandler_DuplicateEmail(t *testing.T) {
    r, db := setupTestRouter(t)
    testutil.MakeUser(db, "taken@example.com", "hunter2")

    body := strings.NewReader(`{"email":"taken@example.com","password":"hunter2","name":"x"}`)
    req := httptest.NewRequest(http.MethodPost, "/auth/register", body)
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    r.ServeHTTP(w, req)

    require.Equal(t, http.StatusConflict, w.Code)
}
```

Use `httptest.NewRecorder()` + `r.ServeHTTP()`. No need to actually bind a TCP port.

#### Habit integration test cases

- `POST /api/v1/habits` without Authorization header -> 401
- `POST /api/v1/habits` with JWT -> 201 + returned habit has `user_id` of caller
- `GET /api/v1/habits` returns only habits owned by caller (create two users, each with one habit, verify isolation)
- `GET /api/v1/habits/:id` with random UUID -> 404
- `GET /api/v1/habits/:id` for another user's habit -> 404 (do NOT leak existence with 403)
- `PUT /api/v1/habits/:id` updates name + category
- `DELETE /api/v1/habits/:id` soft or hard deletes per current behavior
- `POST /api/v1/habits/:id/log` creates a log, second call same day returns either 409 or idempotent 200 (whichever matches current service behavior -- read `habit/service.go` to confirm)

#### Coverage command

```bash
cd backend
go test ./internal/domain/habit/... ./internal/domain/user/... -coverprofile=coverage.out
go tool cover -func=coverage.out | tail -1  # total line
```

Phase passes if total line >= 70.0% for the two service packages.

---

### Frontend

#### `jest.config.ts` shape

```ts
import nextJest from 'next/jest.js'
const createJestConfig = nextJest({ dir: './' })
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEach: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/', '<rootDir>/e2e/'],
}
export default createJestConfig(config)
```

#### `jest.setup.ts`

```ts
import '@testing-library/jest-dom'

// Lightweight fetch mock helper -- each test overrides per-call
beforeEach(() => {
  global.fetch = jest.fn()
})
afterEach(() => {
  jest.resetAllMocks()
})
```

#### Hook test pattern (`useHabits.test.tsx`)

```tsx
import { renderHook, act, waitFor } from '@testing-library/react'
import { useHabits } from '@/lib/hooks/useHabits'

function mockFetchOnce(data: unknown, status = 200) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status < 400,
    status,
    json: async () => ({ data }),
  })
}

test('getAll loads habits', async () => {
  mockFetchOnce([{ id: '1', name: 'Run', streak: 3 }])
  const { result } = renderHook(() => useHabits())
  await waitFor(() => expect(result.current.habits).toHaveLength(1))
  expect(result.current.habits[0].name).toBe('Run')
})

test('create posts and prepends', async () => {
  mockFetchOnce([])                                 // initial load
  mockFetchOnce({ id: '2', name: 'Read' })          // create response
  const { result } = renderHook(() => useHabits())
  await waitFor(() => expect(result.current.loading).toBe(false))
  await act(async () => { await result.current.create({ name: 'Read' }) })
  expect(result.current.habits[0].name).toBe('Read')
})
```

Write similar shapes for `useAuth` (login sets user, logout clears user, register side-effects) and `useCalendar` (fetch by date range, create event).

#### Component test pattern (`HabitCard.test.tsx`)

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HabitCard } from '@/components/ui/HabitCard'

test('renders name and streak', () => {
  render(<HabitCard habit={{ id: '1', name: 'Meditate', streak: 5, loggedToday: false }} onComplete={() => {}} />)
  expect(screen.getByText('Meditate')).toBeInTheDocument()
  expect(screen.getByText(/5/)).toBeInTheDocument()
})

test('clicking checkbox fires onComplete', async () => {
  const onComplete = jest.fn()
  render(<HabitCard habit={{ id: '1', name: 'Meditate', streak: 0, loggedToday: false }} onComplete={onComplete} />)
  await userEvent.click(screen.getByRole('checkbox'))
  expect(onComplete).toHaveBeenCalledWith('1')
})
```

The backend/planner should not assume the exact prop names above -- the implementer must read the real component file and adjust. The shapes in this PRP are illustrative.

#### `CalendarEventCard.test.tsx` cases

- Renders title + time range (`09:00 - 09:30`)
- Gets class `bg-tertiary` (or equivalent) when `source: "ai"`, `bg-primary` for `"manual"`, `bg-secondary` for `"google"` (values pulled from `lib/eventColors.ts`)
- Click fires `onEdit(event)` callback

#### `ChatInput.test.tsx` cases

- Typing updates the textarea value
- Pressing Enter (without Shift) calls `onSend(text)` and clears input
- Pressing Shift+Enter inserts newline, does NOT send
- SEND button is disabled when input is empty
- SEND button is enabled when input has non-whitespace text

---

### E2E (Playwright)

#### `playwright.config.ts` shape

```ts
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
```

#### `e2e/smoke.spec.ts` flow

```ts
import { test, expect } from '@playwright/test'

test('register -> create habit -> log -> dashboard streak', async ({ page }) => {
  const email = `test-${Date.now()}@example.com`

  // 1. Register
  await page.goto('/register')
  await page.getByLabel(/name/i).fill('Smoke Tester')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill('password123')
  await page.getByRole('button', { name: /sign up|register|create/i }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  // 2. Go to habits and create one
  await page.goto('/habits')
  await page.getByRole('button', { name: /new|create|add/i }).first().click()
  await page.getByLabel(/name/i).fill('Morning run')
  await page.getByRole('button', { name: /save|create/i }).click()
  await expect(page.getByText('Morning run')).toBeVisible()

  // 3. Log completion
  await page.getByRole('checkbox').first().click()

  // 4. Dashboard shows streak = 1
  await page.goto('/dashboard')
  await expect(page.getByText(/1/)).toBeVisible()
})
```

**Important:** this test hits a real backend. For local dev it will use the developer's Supabase and create real rows. That is acceptable for Phase 10 (it is a smoke test, not CI). Phase 11 will revisit this when adding CI, and can swap in a disposable test DB at that time.

**Environment requirements for E2E:**
- Backend running on `http://localhost:8080`
- Frontend `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8080`
- Playwright spawns `next dev` on port 3000 via `webServer`

---

## Out of Scope

- **CI integration** -- Phase 11 wires tests into GitHub Actions.
- **Visual regression testing** (Percy, Chromatic, Playwright screenshots) -- not needed for submission.
- **Load / performance testing** (k6, vegeta) -- not a requirement.
- **Mutation testing** (go-mutesting, Stryker) -- overkill for a class project.
- **100% coverage** -- 70% service-layer is the bar.
- **Tests for admin, AI Coach, Google Calendar, dashboard handlers** -- these are explicitly out of scope per PHASES.md. If time permits they can be added, but not required.
- **Testcontainers / real Postgres in tests** -- in-memory SQLite is the deliberate trade-off given the deadline.
- **Storybook** -- not part of this phase.
- **Snapshot tests** -- avoid; brittle and low value.

---

## Dependencies / Ordering

```
B1 (deps) -> B2 (testutil/db) -> B4 (uuid hooks) -> B5 (habit service unit)
                              \-> B6 (user service unit)
                              \-> B3 (fixtures)      \-> B8 (user handler integ)
                                                      \-> B9 (habit handler integ)
                                                      \-> B7 (health integ)
                                                      \-> B10 (coverage check)

F1 (deps) -> F2/F3 (jest config) -> F4 (script)
                                 \-> F5/F6/F7 (hook tests)
                                 \-> F8/F9/F10 (component tests)
                                 \-> F15 (npm test green)

F11 (Playwright install) -> F12 (config) -> F13 (spec) -> F14 (script)
```

**Critical path (must finish):** B1 -> B2 -> B5 -> B6 -> B8 -> B9 -> B10 -> F1 -> F2 -> F5 -> F6 -> F7 -> F15.

**Nice-to-have (drop if time short):** F8, F9, F10 can be reduced from 3 components to 1 if needed. Playwright (F11-F14) is the single biggest cut candidate -- backend coverage + hook tests cover the PHASES.md checkboxes except for the explicit E2E line.

**Ordering rule for agents:** Backend agent can work B1-B10 entirely in parallel with frontend agent working F1-F15. No cross-stack dependencies.

---

## Verification Checklist

### Backend
- [ ] `cd backend && go test ./...` exits 0
- [ ] `go test ./internal/domain/habit/... ./internal/domain/user/... -cover` shows total >= 70.0%
- [ ] `testutil.NewTestDB` runs AutoMigrate without Postgres-only errors
- [ ] Streak calculation tests cover: no logs, today only, 3-day streak, broken streak, streak-excluding-today
- [ ] Register/Login tests cover: happy path, duplicate email, wrong password, Google-only account, expired JWT
- [ ] Habit CRUD tests cover: auth required, ownership isolation, 404 for foreign habit, duplicate log handling
- [ ] `/api/v1/health` integration test passes
- [ ] No test touches the real Supabase database

### Frontend
- [ ] `cd frontend && npm test` exits 0 with zero failures
- [ ] `useHabits`, `useAuth`, `useCalendar` each have at least one passing test per public method
- [ ] `HabitCard`, `CalendarEventCard`, `ChatInput` each have at least 2 passing tests
- [ ] `jest.config.ts` + `jest.setup.ts` committed
- [ ] `package.json` has `test` and `test:e2e` scripts

### E2E
- [ ] `cd frontend && npm run test:e2e` runs the smoke spec against a locally-running backend + frontend
- [ ] Smoke spec completes all four steps (register -> create habit -> log -> dashboard streak)
- [ ] Playwright install committed: `playwright.config.ts` + `e2e/smoke.spec.ts`

### Definition of Done
- [ ] Phase 10 checkboxes in `docs/context/PHASES.md` can be ticked
- [ ] `docs/context/CLAUDE.md` "Current Phase" updated to Phase 11 once this phase is complete
- [ ] No new lint errors introduced (`next lint`, `go vet ./...`)
- [ ] Commit messages follow `test:` prefix (e.g., `test: add unit tests for habit service`)
