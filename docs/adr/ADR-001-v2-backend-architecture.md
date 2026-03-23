# ADR-001 — Use Layered Monolith for Backend Architecture (v2 — Updated)

---

## TITLE

Use a Layered Monolith (Go + Gin) with an isolated AI module and Redis-backed async processing for HabitFlow AI backend

---

## STATUS

Accepted — Supersedes ADR-001-v1 (2026-03-20)

---

## CONTEXT

After reviewing ADR-001-v1, two risks were identified during architecture review:

1. **AI coaching throughput**: Google Gemini API calls are slow (2–8 seconds per response). Handling them synchronously in the same Go process blocks Gin worker threads during load, which degrades performance for all other endpoints (habit CRUD, auth).

2. **Leaderboard fan-out**: The weekly leaderboard aggregates streak scores across all premium users. Querying this live on every request is expensive. Redis was already in the stack but underutilized.

The initial decision to use a Layered Monolith remains correct for the project scale, but the internal design of the AI module and leaderboard service needs to be refined to address these bottlenecks without splitting into microservices.

---

## DECISION

We will retain the **Layered Monolith** with Go + Gin. The following targeted improvements are added:

1. **AI Coach uses SSE streaming** — instead of blocking until the full AI response is ready, the handler opens a Server-Sent Events (SSE) stream immediately. Gemini token chunks are forwarded to the client as they arrive, making latency imperceptible to users.

2. **AI fallback chain** — `internal/ai/client.go` implements a primary (Google Gemini free tier) → fallback (OpenRouter) pattern. If Gemini quota is exceeded, requests automatically reroute. No handler code changes required.

3. **Leaderboard cached in Redis** — `leaderboard_service.go` writes aggregated scores to Redis on each habit log event. `GET /api/v1/leaderboard` reads from Redis cache (TTL: 1 hour) instead of running a full aggregate query. Cache is invalidated on streak updates.

4. **AI module remains stateless** — `internal/ai/` has no direct DB access. All reads (user habits, calendar events) go through `habit_service.go` and `calendar_repository.go`. All writes (habit plan → calendar_events) are issued by the service layer after the AI responds.

Strict layer flow is unchanged:
```
Request → Middleware → Handler → Service → Repository → Database
                                    ↕
                               Redis Cache
                                    ↕
                               AI Module (stateless)
```

---

## CONSEQUENCES

**Positive:**
- SSE streaming eliminates perceived AI latency — users see partial responses immediately
- Redis caching reduces leaderboard DB load by ~90% during peak hours
- AI fallback chain prevents total feature outage when Gemini quota resets
- No new services to deploy — all improvements are internal to the single binary
- Layer contracts are still strictly enforced — easy to test each layer in isolation

**Negative:**
- SSE connections are long-lived — need to tune Gin's connection timeout settings and Railway's proxy timeout
- Redis becomes a dependency for correct leaderboard behavior — cache invalidation bugs can cause stale scores
- Two AI client implementations (`gemini`, `openrouter`) increase test surface area for the AI module

**Risks mitigated from v1:**
- AI blocking threads → resolved via SSE streaming
- Leaderboard query cost → resolved via Redis write-through cache

---

## COMPLIANCE

- `internal/ai/` must never import `repository` or `model` packages directly — all data is injected via service-layer function arguments
- All Redis keys must follow the naming convention: `habitflow:{entity}:{id}:{field}` (e.g., `habitflow:leaderboard:weekly:scores`)
- SSE handler must set `Content-Type: text/event-stream` and `Cache-Control: no-cache` headers — enforced in `ai_handler.go`
- The AI fallback must be transparent to the handler layer — switching providers must not change the handler's response contract
- Integration tests must cover: (a) Gemini quota exceeded → fallback triggers, (b) Redis miss → DB query runs → cache populated

---

## NOTES

- **Author:** HabitFlow team
- **Date:** 2026-03-20
- **Supersedes:** ADR-001-v1 (2026-03-20)
- **Deciders:** Solo developer (project lead)
- **Trigger for update:** Architecture review identified AI blocking and leaderboard query cost as pre-launch risks
- **Alternatives considered for AI async:**
  - Job queue (Redis + worker goroutine) — rejected, SSE achieves the same UX without queue complexity
  - Separate AI microservice — rejected, premature for current project scale
- **Linked docs:** `ARCHITECTURE.md`, `RULES.md`, `ADR-001-v1`
