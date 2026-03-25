---
name: Phase 4 Dashboard & Streaks Planning Complete
description: Phase 4 (Dashboard & Streaks) PRP created on 2026-03-25. New dashboard domain package, reuses existing streak logic, no DB changes needed.
type: project
---

Phase 4 Dashboard & Streaks PRP created and saved to docs/prp/PRP-004-phase4-dashboard.md.

**Why:** Phase 4 adds GET /dashboard (user-level aggregate stats) and GET /habits/:id/stats (per-habit stats), plus ProgressRing, StreakFlame (GSAP), and WeeklyChart frontend components. This is the first "read-heavy" feature -- no new tables, pure aggregation over habit_logs.

**How to apply:**
- New `internal/domain/dashboard/` package for aggregation (service, handler, model). It depends on `habit.Service` and `habit.Repository`.
- `habit.Service.calculateStreak` must be exported to `CalculateStreak` for dashboard service to call it.
- Two new repo methods added to `habit.Repository`: `FindLogsByUserIDSince()` and `FindLogsByHabitIDSince()` for bulk log retrieval (avoids N+1).
- Frontend dashboard page stub at `app/(app)/dashboard/page.tsx` already has working habit list + auth -- Phase 4 replaces the placeholder weekly grid and adds stats cards.
- StreakFlame (GSAP) is a new component separate from existing StreakBadge (used in list rows).
- Deadline remains April 16, 2026. Today is day 23 of ~44. On pace per timeline (Week 2 target: Phase 3+4).
