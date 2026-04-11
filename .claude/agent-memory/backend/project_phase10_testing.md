---
name: Phase 10 Backend Testing
description: Key decisions and outcomes from implementing Phase 10 backend test suite
type: project
---

Phase 10 backend tests implemented and passing as of 2026-04-10.

**Why:** Phase 10 required locking down core user flows with automated tests before CI/CD (Phase 11) and final submission (Phase 12, deadline April 16, 2026).

**Key decisions made:**
- Removed `default:gen_random_uuid()` from all GORM model primaryKey tags — this Postgres-specific DDL breaks SQLite AutoMigrate. `BeforeCreate` hooks handle UUID generation instead.
- `testutil.NewTestDB` only migrates `user.User`, `user.Subscription`, `habit.Habit`, `habit.HabitLog` — other models (AIConversation, GoogleToken) use `gorm:"type:jsonb"` or other Postgres-only types that cannot be migrated on SQLite.
- Coverage at 71.5% combined (habit+user packages). Service file functions average ~87%.

**How to apply:** When adding new GORM models, add a `BeforeCreate` hook for UUID generation rather than relying on `default:gen_random_uuid()` so tests can use SQLite.
