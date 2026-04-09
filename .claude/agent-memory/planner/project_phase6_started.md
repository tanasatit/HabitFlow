---
name: Phase 6 AI Coach & Calendar PRP
description: Phase 6 PRP created 2026-03-27, covers AI chat with Gemini function calling, SSE streaming, calendar CRUD, premium gating
type: project
---

Phase 6 PRP created on 2026-03-27. Covers AI Coach chat (Gemini 2.0 Flash with function calling + OpenRouter fallback), SSE streaming architecture, calendar events CRUD, and premium user gating.

**Why:** This is the flagship feature of HabitFlow -- AI reads habits/stats via function calls, generates a weekly plan, and writes it to the calendar. Due by end of week 4 (2026-03-30).

**How to apply:** Key architectural decisions: (1) AI client lives in existing `internal/domain/ai/` directory, coach orchestration in new `internal/domain/aicoach/`, (2) SSE via POST fetch (not EventSource) since body is needed, (3) `datatypes.JSON` needed for conversation messages, (4) calendar uses date strings not time.Time to avoid TZ issues on frontend grid, (5) max 5 tool-call rounds per message to prevent infinite loops.
