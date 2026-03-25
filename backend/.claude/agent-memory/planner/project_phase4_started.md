---
name: Phase 4 Dashboard & Streaks Planning Complete
description: Phase 4 PRP created 2026-03-25. Dashboard domain package aggregates habit data. No new DB tables. Streak logic reused from habit service.
type: project
---

Phase 4 PRP at docs/prp/PRP-004-phase4-dashboard.md.

**Why:** Adds GET /dashboard and GET /habits/:id/stats endpoints. First aggregation feature -- no CRUD, pure reads over existing habit_logs.

**How to apply:**
- New `internal/domain/dashboard/` package (service, handler, model) depends on habit.Service and habit.Repository.
- `calculateStreak` in habit/service.go must be exported to `CalculateStreak`.
- Two new repo methods: `FindLogsByUserIDSince()`, `FindLogsByHabitIDSince()`.
- Routes: `GET /api/v1/dashboard` (auth required), `GET /api/v1/habits/:id/stats` (auth required, ownership checked).
