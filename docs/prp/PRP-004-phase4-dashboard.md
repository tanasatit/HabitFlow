# PRP-004 -- Phase 4: Dashboard & Streaks

**Phase Goal:** Users see a real-time dashboard with overall stats (streak, completion rate, weekly summary), per-habit stats, animated progress ring, streak flame animation, and a weekly completion bar chart -- all wired to live API data.

**Status:** Planning
**Date:** 2026-03-25
**Depends on:** Phase 3 (complete -- habits CRUD, daily log, streak calculation, HabitWithStreak model)

---

## 0. Observations and Conflicts

1. **Streak calculation already exists.** `habit.Service.calculateStreak(habitID)` in `backend/internal/domain/habit/service.go` (line 226-266) computes consecutive-day streaks from `habit_logs`. The dashboard service MUST reuse this via the habit service -- not duplicate the logic. Similarly, `Service.List()` already returns `[]HabitWithStreak` with `CurrentStreak` and `CompletedToday` fields.

2. **Backend uses domain-based package layout.** The actual codebase uses `internal/domain/<feature>/` (handler.go, service.go, repository.go, model.go in one package), not the flat layout in ARCHITECTURE.md. Phase 4 will create a new `internal/domain/dashboard/` package for the dashboard-specific aggregation logic. The dashboard service depends on the habit package.

3. **Dashboard page stub already exists.** `frontend/src/app/(app)/dashboard/page.tsx` has a working page with: welcome header using `useAuth`, habit list preview (top 5), completion toggle via `logCompletion`, a placeholder 7-day calendar grid (empty boxes), loading skeleton, and empty state. Phase 4 will **replace** the placeholder calendar grid with the weekly completion chart, **add** the ProgressRing and streak flame, and **keep** the habit list section (refactored to use dashboard API data).

4. **User model uses `Name` not `DisplayName`.** The dashboard page currently reads `user?.name`. The `IUser` type in `types/api.ts` uses `name: string`. This is correct for the actual backend model.

5. **StreakBadge component already exists.** `frontend/src/components/ui/StreakBadge.tsx` displays a flame icon + streak count with color tiers. The GSAP streak flame animation will be a **new** component (`StreakFlame.tsx`) used on the dashboard hero section -- separate from the existing `StreakBadge` which remains for habit list rows.

6. **No database changes needed.** All data for the dashboard comes from aggregating existing `habits` and `habit_logs` tables. No new tables, columns, or migrations.

7. **PHASES.md says "Streak calculation logic in habit_service.go" -- already done.** The checkbox for streak calculation is checked as part of Phase 3. Phase 4 only needs to expose it via new endpoints.

8. **Response format uses generic wrapper.** The backend `pkg/response` package wraps all responses in `{"data": ..., "message": "success"}` or `{"error": "..."}`. All new endpoints follow this pattern.

9. **`habit.Repository` needs two new query methods** for aggregation: weekly logs count and total completion stats. These are needed to compute the dashboard stats efficiently (single query vs. N+1).

---

## 1. Backend: Database Changes

**None.** No new tables, columns, or migrations required. All dashboard data is derived from existing `habits` and `habit_logs` tables.

---

## 2. Backend: Files to Create or Modify

### 2.1 New Files

| File | Package | Purpose |
|---|---|---|
| `backend/internal/domain/dashboard/service.go` | `dashboard` | Aggregation logic for dashboard stats |
| `backend/internal/domain/dashboard/handler.go` | `dashboard` | HTTP handlers for dashboard endpoints |
| `backend/internal/domain/dashboard/model.go` | `dashboard` | Response DTOs for dashboard and per-habit stats |

### 2.2 Modified Files

| File | Changes |
|---|---|
| `backend/internal/domain/habit/repository.go` | Add `FindLogsByUserIDSince()`, `FindLogsByHabitIDSince()` methods |
| `backend/internal/domain/habit/service.go` | Export `CalculateStreak()` (capitalize), add `GetHabitStats()` method |
| `backend/cmd/server/main.go` | Wire dashboard domain, register dashboard routes |

---

## 3. Backend: New Repository Methods

### 3.1 habit/repository.go -- New Methods

```go
// FindLogsByUserIDSince returns all logs for a user since a given time.
// Used by dashboard to compute weekly completion counts.
func (r *Repository) FindLogsByUserIDSince(userID uuid.UUID, since time.Time) ([]HabitLog, error)
// SELECT * FROM habit_logs WHERE user_id = ? AND completed_at >= ? ORDER BY completed_at DESC

// FindLogsByHabitIDSince returns logs for a specific habit since a given time.
// Used by per-habit stats endpoint.
func (r *Repository) FindLogsByHabitIDSince(habitID uuid.UUID, since time.Time) ([]HabitLog, error)
// SELECT * FROM habit_logs WHERE habit_id = ? AND completed_at >= ? ORDER BY completed_at DESC
```

Note: `FindLogsByHabitID(habitID, since)` already exists in the repository but is named `FindLogsByHabitID`. We rename the new one with `Since` suffix for clarity. The existing method can stay as-is.

---

## 4. Backend: Habit Service Changes

### 4.1 Export calculateStreak

Rename `calculateStreak` to `CalculateStreak` so the dashboard service can call it:

```go
// CalculateStreak counts consecutive days with a log, starting from today or yesterday.
// Exported for use by dashboard service.
func (s *Service) CalculateStreak(habitID uuid.UUID) int
```

All internal callers (List, GetByID) update to call `s.CalculateStreak(habitID)`.

### 4.2 New Method: GetHabitStats

```go
// GetHabitStats returns detailed statistics for a single habit.
// Validates ownership. Used by GET /habits/:id/stats.
func (s *Service) GetHabitStats(userID, habitID uuid.UUID) (*HabitStats, error)
```

### 4.3 New Model: HabitStats (in habit/model.go)

```go
type HabitStats struct {
    HabitID         uuid.UUID      `json:"habit_id"`
    Name            string         `json:"name"`
    Category        string         `json:"category"`
    CurrentStreak   int            `json:"current_streak"`
    LongestStreak   int            `json:"longest_streak"`
    TotalCompleted  int            `json:"total_completed"`
    CompletionRate  float64        `json:"completion_rate"`  // 0.0 - 1.0, last 30 days
    WeeklyData      []DayCount     `json:"weekly_data"`      // last 7 days
    CompletedToday  bool           `json:"completed_today"`
}

type DayCount struct {
    Date      string `json:"date"`      // "2026-03-25"
    Completed bool   `json:"completed"`
}
```

---

## 5. Backend: Dashboard Domain

### 5.1 Dashboard Model (`backend/internal/domain/dashboard/model.go`)

```go
package dashboard

type DashboardStats struct {
    TotalHabits       int             `json:"total_habits"`
    CompletedToday    int             `json:"completed_today"`
    CompletionRate    float64         `json:"completion_rate"`    // 0.0 - 1.0, today's completions / total active habits
    OverallStreak     int             `json:"overall_streak"`     // longest current streak across all habits
    TotalPoints       int             `json:"total_points"`       // total points earned all time
    WeeklyPoints      int             `json:"weekly_points"`      // points earned this week
    WeeklySummary     []WeekDaySummary `json:"weekly_summary"`    // last 7 days
}

type WeekDaySummary struct {
    Date           string  `json:"date"`           // "2026-03-25"
    DayName        string  `json:"day_name"`       // "Tue"
    Completed      int     `json:"completed"`      // number of habits completed
    Total          int     `json:"total"`           // total active habits on that day
    CompletionRate float64 `json:"completion_rate"` // 0.0 - 1.0
}
```

### 5.2 Dashboard Service (`backend/internal/domain/dashboard/service.go`)

```go
package dashboard

import (
    "github.com/google/uuid"
    "github.com/habitflow/api/internal/domain/habit"
)

type Service struct {
    habitSvc  *habit.Service
    habitRepo *habit.Repository
}

func NewService(habitSvc *habit.Service, habitRepo *habit.Repository) *Service

// GetDashboard computes the full dashboard stats for a user.
func (s *Service) GetDashboard(userID uuid.UUID) (*DashboardStats, error)
// Implementation:
// 1. Call habitSvc.List(userID) to get all habits with streaks and today's completion status
// 2. Count completed today from the returned HabitWithStreak slice
// 3. Find max streak across all habits (overall_streak)
// 4. Fetch all logs from the last 7 days via habitRepo.FindLogsByUserIDSince()
// 5. Build WeeklySummary by grouping logs by date
// 6. Compute total points and weekly points from log counts * habit.Points
// 7. Return DashboardStats
```

### 5.3 Dashboard Handler (`backend/internal/domain/dashboard/handler.go`)

```go
package dashboard

import (
    "github.com/gin-gonic/gin"
    "github.com/habitflow/api/internal/middleware"
    "github.com/habitflow/api/pkg/response"
)

type Handler struct {
    svc *Service
}

func NewHandler(svc *Service) *Handler

// GetDashboard handles GET /api/v1/dashboard
func (h *Handler) GetDashboard(c *gin.Context)
// 1. Extract userID from context via middleware.GetUserID(c)
// 2. Call s.svc.GetDashboard(userID)
// 3. Return response.Success(c, stats)
```

---

## 6. Backend: Per-Habit Stats Handler

The per-habit stats endpoint lives in the **habit handler** since it is habit-scoped.

### 6.1 New Handler Method (in `habit/handler.go`)

```go
// GetStats handles GET /api/v1/habits/:id/stats
func (h *Handler) GetStats(c *gin.Context)
// 1. Parse habit ID from URL param
// 2. Extract userID from context
// 3. Call h.svc.GetHabitStats(userID, habitID)
// 4. Return response.Success(c, stats)
// Error cases: ErrHabitNotFound -> 404, ErrNotOwner -> 403
```

---

## 7. API Contracts

### 7.1 GET /api/v1/dashboard

| Field | Value |
|---|---|
| Auth | Required (JWT) |
| Request Body | None |
| Response 200 | See below |
| Response 401 | `{"error": "unauthorized"}` |

**Response 200 body:**
```json
{
  "data": {
    "total_habits": 5,
    "completed_today": 3,
    "completion_rate": 0.6,
    "overall_streak": 12,
    "total_points": 450,
    "weekly_points": 80,
    "weekly_summary": [
      {
        "date": "2026-03-19",
        "day_name": "Thu",
        "completed": 4,
        "total": 5,
        "completion_rate": 0.8
      },
      {
        "date": "2026-03-20",
        "day_name": "Fri",
        "completed": 3,
        "total": 5,
        "completion_rate": 0.6
      },
      {
        "date": "2026-03-21",
        "day_name": "Sat",
        "completed": 2,
        "total": 5,
        "completion_rate": 0.4
      },
      {
        "date": "2026-03-22",
        "day_name": "Sun",
        "completed": 5,
        "total": 5,
        "completion_rate": 1.0
      },
      {
        "date": "2026-03-23",
        "day_name": "Mon",
        "completed": 4,
        "total": 5,
        "completion_rate": 0.8
      },
      {
        "date": "2026-03-24",
        "day_name": "Tue",
        "completed": 3,
        "total": 5,
        "completion_rate": 0.6
      },
      {
        "date": "2026-03-25",
        "day_name": "Wed",
        "completed": 3,
        "total": 5,
        "completion_rate": 0.6
      }
    ]
  },
  "message": "success"
}
```

### 7.2 GET /api/v1/habits/:id/stats

| Field | Value |
|---|---|
| Auth | Required (JWT) |
| Request Body | None |
| Response 200 | See below |
| Response 401 | `{"error": "unauthorized"}` |
| Response 403 | `{"error": "you do not own this habit"}` |
| Response 404 | `{"error": "habit not found"}` |

**Response 200 body:**
```json
{
  "data": {
    "habit_id": "uuid-here",
    "name": "Morning Run",
    "category": "health",
    "current_streak": 7,
    "longest_streak": 14,
    "total_completed": 45,
    "completion_rate": 0.83,
    "weekly_data": [
      {"date": "2026-03-19", "completed": true},
      {"date": "2026-03-20", "completed": true},
      {"date": "2026-03-21", "completed": false},
      {"date": "2026-03-22", "completed": true},
      {"date": "2026-03-23", "completed": true},
      {"date": "2026-03-24", "completed": true},
      {"date": "2026-03-25", "completed": true}
    ],
    "completed_today": true
  },
  "message": "success"
}
```

---

## 8. Backend: main.go Changes

Add to `cmd/server/main.go`:

```go
import "github.com/habitflow/api/internal/domain/dashboard"

// After existing habit wiring:
dashboardSvc := dashboard.NewService(habitSvc, habitRepo)
dashboardHandler := dashboard.NewHandler(dashboardSvc)

// In the v1 route group, under auth middleware:
v1.GET("/dashboard", middleware.Auth(cfg), dashboardHandler.GetDashboard)

// Add to existing habits route group:
habits.GET("/:id/stats", habitHandler.GetStats)
```

The `/dashboard` route goes directly under v1 (not under `/habits`) because it is a user-level aggregate, not habit-scoped.

The `/habits/:id/stats` route goes in the existing habits group since it follows the same auth + ownership pattern.

---

## 9. Frontend: Files to Create or Modify

### 9.1 New Files

| File | Purpose |
|---|---|
| `frontend/src/types/dashboard.ts` | IDashboardStats, IWeekDaySummary, IHabitStats, IDayCount interfaces |
| `frontend/src/lib/hooks/useDashboard.ts` | Hook to fetch dashboard stats |
| `frontend/src/components/ui/ProgressRing.tsx` | Animated SVG ring component (Framer Motion) |
| `frontend/src/components/ui/StreakFlame.tsx` | Animated streak flame (GSAP) |
| `frontend/src/components/features/dashboard/WeeklyChart.tsx` | Weekly completion bar chart |
| `frontend/src/components/features/dashboard/StatsCards.tsx` | Stats card row (streak, completion rate, points) |

### 9.2 Modified Files

| File | Changes |
|---|---|
| `frontend/src/app/(app)/dashboard/page.tsx` | Replace placeholder grid with real dashboard components wired to API |
| `frontend/src/lib/hooks/useHabits.ts` | Add `getHabitStats(id)` method |
| `frontend/src/types/habit.ts` | Add `IHabitStats` and `IDayCount` interfaces |

---

## 10. Frontend: Type Definitions

### 10.1 dashboard.ts (`frontend/src/types/dashboard.ts`)

```typescript
export interface IDashboardStats {
  total_habits: number
  completed_today: number
  completion_rate: number          // 0.0 - 1.0
  overall_streak: number
  total_points: number
  weekly_points: number
  weekly_summary: IWeekDaySummary[]
}

export interface IWeekDaySummary {
  date: string                     // "2026-03-25"
  day_name: string                 // "Tue"
  completed: number
  total: number
  completion_rate: number          // 0.0 - 1.0
}
```

### 10.2 Additions to habit.ts (`frontend/src/types/habit.ts`)

```typescript
export interface IHabitStats {
  habit_id: string
  name: string
  category: string
  current_streak: number
  longest_streak: number
  total_completed: number
  completion_rate: number          // 0.0 - 1.0
  weekly_data: IDayCount[]
  completed_today: boolean
}

export interface IDayCount {
  date: string                     // "2026-03-25"
  completed: boolean
}
```

---

## 11. Frontend: Hooks

### 11.1 useDashboard (`frontend/src/lib/hooks/useDashboard.ts`)

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { IDashboardStats } from '@/types/dashboard'

export function useDashboard() {
  const [stats, setStats] = useState<IDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    const res = await api.get<IDashboardStats>('/dashboard')
    if (res.error) {
      setError(res.error)
    } else {
      setStats(res.data ?? null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return { stats, loading, error, refetch: fetchDashboard }
}
```

### 11.2 useHabits Addition

Add to the existing `useHabits` hook:

```typescript
import type { IHabitStats } from '@/types/habit'

const getHabitStats = useCallback(async (id: string): Promise<IHabitStats | null> => {
  const res = await api.get<IHabitStats>(`/habits/${id}/stats`)
  return res.data ?? null
}, [])

// Add to return object:
return { ..., getHabitStats }
```

---

## 12. Frontend: Components

### 12.1 ProgressRing (`frontend/src/components/ui/ProgressRing.tsx`)

```typescript
'use client'

// Props:
interface ProgressRingProps {
  progress: number   // 0.0 - 1.0
  size?: number      // px, default 120
  strokeWidth?: number // px, default 8
  label?: string     // e.g. "60%"
}

// Implementation:
// - SVG circle with stroke-dasharray/stroke-dashoffset for the progress arc
// - Framer Motion `motion.circle` to animate dashoffset from 0 to target on mount
// - Background track circle (gray-800) + foreground progress circle (brand orange #FF8243)
// - Center text label showing percentage
// - Animate with spring transition, duration ~0.8s
```

### 12.2 StreakFlame (`frontend/src/components/ui/StreakFlame.tsx`)

```typescript
'use client'

// Props:
interface StreakFlameProps {
  streak: number
  size?: 'sm' | 'md' | 'lg'  // default 'md'
}

// Implementation:
// - Larger flame SVG icon (reuse the path from StreakBadge)
// - GSAP animation: subtle scaling pulse (1.0 -> 1.1 -> 1.0) on loop
// - Color glow effect based on streak magnitude (same tiers as StreakBadge)
// - If streak >= 7: orange flame with glow, GSAP flicker effect
// - If streak >= 3: yellow flame, gentler pulse
// - If streak < 3: gray, no animation
// - Display streak number below the flame
// - useRef for the flame element, useEffect with gsap.to() for animation
// - Cleanup: return gsap.killTweensOf() in useEffect cleanup
```

### 12.3 WeeklyChart (`frontend/src/components/features/dashboard/WeeklyChart.tsx`)

```typescript
'use client'

import type { IWeekDaySummary } from '@/types/dashboard'

// Props:
interface WeeklyChartProps {
  data: IWeekDaySummary[]
}

// Implementation:
// - Simple vertical bar chart with 7 bars (one per day)
// - Each bar height = completion_rate * max_height
// - Bar color: brand teal (#069494) with opacity based on completion rate
// - Today's bar highlighted with brand orange (#FF8243)
// - Day label below each bar
// - Completed/total count above each bar on hover (optional, or always shown)
// - Framer Motion: bars animate height from 0 on mount (staggered, 50ms delay each)
// - Max bar height: ~120px
// - Responsive: uses flex layout
```

### 12.4 StatsCards (`frontend/src/components/features/dashboard/StatsCards.tsx`)

```typescript
'use client'

import type { IDashboardStats } from '@/types/dashboard'

// Props:
interface StatsCardsProps {
  stats: IDashboardStats
}

// Implementation:
// - Horizontal row of 3-4 stat cards (flex, wrap on mobile)
// - Card 1: StreakFlame + overall_streak + "Day Streak" label
// - Card 2: ProgressRing showing today's completion_rate + "Today" label
// - Card 3: weekly_points + "Points This Week" label
// - Card 4 (optional): total_points + "Total Points" label
// - Each card: rounded-xl bg-gray-900 border border-gray-800 p-4
// - Numbers use Framer Motion `motion.span` with `animate` for count-up effect
```

---

## 13. Frontend: Dashboard Page Rewrite

### 13.1 Updated `app/(app)/dashboard/page.tsx`

```typescript
'use client'

// Imports:
import { useAuth } from '@/lib/hooks/useAuth'
import { useHabits } from '@/lib/hooks/useHabits'
import { useDashboard } from '@/lib/hooks/useDashboard'
import { StatsCards } from '@/components/features/dashboard/StatsCards'
import { WeeklyChart } from '@/components/features/dashboard/WeeklyChart'
import { StreakBadge } from '@/components/ui/StreakBadge'

// Page structure:
// 1. Welcome header (keep existing pattern: "Welcome back, {name}")
// 2. StatsCards row (streak flame, progress ring, points)
// 3. WeeklyChart (replaces the placeholder 7-day grid)
// 4. "Today's habits" section (keep existing pattern, uses useHabits data)
// 5. AI Coach CTA button (keep existing)

// Data flow:
// - useDashboard() -> stats for StatsCards and WeeklyChart
// - useHabits() -> habit list for the "Today's habits" section
// - useAuth() -> user info for welcome header

// Loading state:
// - Show skeleton cards while useDashboard is loading
// - Show skeleton bars for WeeklyChart while loading
// - Existing habit list skeleton remains

// Error state:
// - If dashboard API fails, show inline error with retry button
// - Habit list falls back to its own error handling
```

---

## 14. Frontend <> Backend Contract Summary

| Frontend Hook | API Call | Backend Handler | Response Type |
|---|---|---|---|
| `useDashboard().stats` | `GET /api/v1/dashboard` | `dashboard.Handler.GetDashboard` | `IDashboardStats` |
| `useHabits().getHabitStats(id)` | `GET /api/v1/habits/:id/stats` | `habit.Handler.GetStats` | `IHabitStats` |
| `useHabits().habits` | `GET /api/v1/habits` (existing) | `habit.Handler.List` | `IHabitWithStreak[]` |

---

## 15. Dependency Order (What Must Be Done Before What)

### Backend Track

```
B1. Add new repository methods to habit/repository.go
    - FindLogsByUserIDSince()
    - FindLogsByHabitIDSince()
    (no deps)

B2. Export calculateStreak -> CalculateStreak in habit/service.go
    Update all internal callers.
    (no deps)

B3. Add HabitStats model to habit/model.go
    Add DayCount model to habit/model.go
    (no deps)

B4. Add GetHabitStats() method to habit/service.go
    (after B1, B2, B3 -- needs repo methods, exported streak, and model)

B5. Add GetStats() handler method to habit/handler.go
    (after B4 -- needs service method)

B6. Create dashboard/model.go (DashboardStats, WeekDaySummary)
    (no deps)

B7. Create dashboard/service.go
    (after B1, B2, B6 -- needs habit service, repo, and dashboard models)

B8. Create dashboard/handler.go
    (after B7 -- needs dashboard service)

B9. Update main.go: wire dashboard, register routes
    (after B5, B8 -- needs all handlers)

B10. Test all endpoints with curl
    (after B9)
```

### Frontend Track

```
F1. Create types/dashboard.ts (IDashboardStats, IWeekDaySummary)
    (no deps)

F2. Add IHabitStats, IDayCount to types/habit.ts
    (no deps)

F3. Create lib/hooks/useDashboard.ts
    (after F1 -- needs dashboard types)

F4. Add getHabitStats() to lib/hooks/useHabits.ts
    (after F2 -- needs IHabitStats type)

F5. Create components/ui/ProgressRing.tsx
    (no deps -- pure UI component)

F6. Create components/ui/StreakFlame.tsx
    (no deps -- pure UI component, uses GSAP)

F7. Create components/features/dashboard/WeeklyChart.tsx
    (after F1 -- needs IWeekDaySummary type)

F8. Create components/features/dashboard/StatsCards.tsx
    (after F1, F5, F6 -- needs types, ProgressRing, StreakFlame)

F9. Rewrite app/(app)/dashboard/page.tsx
    (after F3, F4, F7, F8 -- needs all hooks and components)

F10. Test full dashboard with real API data
    (after B10, F9 -- needs backend running)
```

Backend (B1-B10) and Frontend (F1-F9) tracks can proceed in parallel.
F10 requires both tracks complete.

---

## 16. Testing Checklist (Phase 4 Complete When All Pass)

### Backend -- curl/Postman Tests

- [ ] `GET /api/v1/dashboard` with valid auth returns 200 + DashboardStats
- [ ] `GET /api/v1/dashboard` without auth returns 401
- [ ] `GET /api/v1/dashboard` returns correct `total_habits` count (matches user's active habits)
- [ ] `GET /api/v1/dashboard` returns correct `completed_today` count
- [ ] `GET /api/v1/dashboard` `completion_rate` = completed_today / total_habits (or 0 if no habits)
- [ ] `GET /api/v1/dashboard` `overall_streak` = max streak across all user's habits
- [ ] `GET /api/v1/dashboard` `weekly_summary` contains exactly 7 entries (last 7 days including today)
- [ ] `GET /api/v1/dashboard` `weekly_summary` dates are in ascending chronological order
- [ ] `GET /api/v1/dashboard` `weekly_points` matches sum of (completed logs * habit points) for this week
- [ ] `GET /api/v1/habits/:id/stats` with valid auth + own habit returns 200 + HabitStats
- [ ] `GET /api/v1/habits/:id/stats` returns correct `current_streak`
- [ ] `GET /api/v1/habits/:id/stats` returns correct `longest_streak`
- [ ] `GET /api/v1/habits/:id/stats` returns correct `total_completed` count
- [ ] `GET /api/v1/habits/:id/stats` `completion_rate` is calculated over last 30 days
- [ ] `GET /api/v1/habits/:id/stats` `weekly_data` contains 7 entries with correct completed booleans
- [ ] `GET /api/v1/habits/:id/stats` with another user's habit returns 403
- [ ] `GET /api/v1/habits/:id/stats` with non-existent habit returns 404
- [ ] `GET /api/v1/habits/:id/stats` without auth returns 401
- [ ] Existing endpoints still work (habits CRUD, auth, health)

### Frontend Tests

- [ ] Dashboard page loads and shows loading skeleton
- [ ] Dashboard page displays stats cards with correct numbers from API
- [ ] ProgressRing animates from 0 to completion_rate on mount
- [ ] StreakFlame displays correct streak count
- [ ] StreakFlame animates (pulse/flicker) when streak >= 3
- [ ] WeeklyChart shows 7 bars with correct heights
- [ ] WeeklyChart today's bar is highlighted in orange
- [ ] WeeklyChart bars animate on mount (staggered)
- [ ] "Today's habits" section still shows habit list with toggle
- [ ] Completing a habit via toggle updates both the habit list AND triggers dashboard refetch
- [ ] Empty state: new user with no habits sees appropriate messaging
- [ ] Error state: if dashboard API fails, error message + retry button shown
- [ ] `npm run build` completes with zero errors
- [ ] `npm run lint` passes

### Integration

- [ ] Full flow: Login -> Dashboard shows real stats -> Complete a habit -> Stats update
- [ ] Dashboard weekly summary matches actual habit log data in database
- [ ] Per-habit stats page (accessible from habit detail or dashboard) shows correct data

---

## 17. Acceptance Criteria

1. **Dashboard loads with real data** -- No placeholder/mock data. All numbers come from the API.
2. **Streak is correct** -- Calculated using existing `CalculateStreak` logic. Not duplicated.
3. **Weekly chart shows last 7 days** -- Including today. Each bar proportional to completion rate.
4. **ProgressRing animates** -- Smooth SVG arc animation from 0% to current completion rate.
5. **Streak flame uses GSAP** -- Not Framer Motion. Pulse/flicker animation for streaks >= 3.
6. **Dashboard updates after habit completion** -- Completing a habit on the dashboard page triggers a refetch of dashboard stats.
7. **Per-habit stats endpoint works** -- Returns streak, longest streak, completion rate, and weekly data.
8. **No N+1 queries** -- Dashboard service fetches logs in bulk, not one-by-one per habit.
9. **Response format consistent** -- All endpoints use `pkg/response` wrapper: `{"data": ..., "message": "success"}`.
10. **No new database tables** -- All data derived from existing tables.

---

## 18. Decisions and Trade-offs

| Decision | Rationale |
|---|---|
| Separate `dashboard` domain package | Dashboard aggregates across habits. Keeps habit package focused on CRUD. Dashboard service depends on habit service/repo. |
| Export `CalculateStreak` instead of duplicating | Single source of truth for streak logic. Avoids drift between list view and dashboard. |
| `overall_streak` = max across habits, not sum | Summing streaks makes no sense (a 3-day streak on 5 habits is not a 15-day streak). Max is the most meaningful "headline" number. |
| StreakFlame as new component (not modifying StreakBadge) | StreakBadge is compact for list rows. StreakFlame is a larger, animated hero element. Different use cases. |
| Weekly summary = last 7 calendar days | Not "this week Mon-Sun". Last 7 days is always full and meaningful regardless of what day it is. |
| Completion rate (30 days) for per-habit stats | 7 days is too volatile. 30 days gives a more stable metric. |
| No caching for dashboard endpoint | Dashboard is user-specific and changes frequently (after each habit completion). Caching adds complexity without much benefit at this scale. Can add Redis caching in a later phase if needed. |
| Bar chart built with divs, not a chart library | Keeps bundle small. 7 bars with Framer Motion is trivial to build. No need for Chart.js/Recharts for this. |
| `FindLogsByUserIDSince` as bulk query | Avoids N+1 by fetching all logs for a user in one query, then grouping in Go. |
