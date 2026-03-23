# ADR-001 — Use Layered Monolith for Backend Architecture

---

## TITLE

Use a Layered Monolith (Go + Gin) as the backend architecture for HabitFlow AI

---

## STATUS

Accepted

---

## CONTEXT

HabitFlow AI is a solo-developer project with a semester deadline. The system needs to handle user authentication, habit tracking, AI coaching via Google Gemini, and Google Calendar sync. We need to decide between a microservices approach and a monolithic approach for the backend. The team size is one developer, and speed of delivery is critical.

---

## DECISION

We will use a **Layered Monolith** built with Go + Gin as a single deployable binary. The monolith will be internally structured into strict layers:

- **Handler** — receives HTTP requests, validates input, calls service
- **Service** — all business logic
- **Repository** — all GORM/DB queries
- **Model** — struct definitions only

No layer may skip the one above it. The AI service module will be isolated under `internal/ai/` so it can be extracted into its own service later if needed.

---

## CONSEQUENCES

**Positive:**
- Single deployable unit → simpler CI/CD pipeline
- No inter-service networking overhead or distributed tracing needed
- Easier for a solo developer to reason about the full system
- Strict internal layering still enforces separation of concerns
- AI service isolation allows future extraction without major refactoring

**Negative:**
- As the codebase grows, a single binary may become harder to scale individual components (e.g., AI inference load vs. CRUD load)
- All features must be deployed together — no independent feature rollouts
- If the AI layer becomes a bottleneck, extracting it will require non-trivial refactoring

---

## COMPLIANCE

- All new code must follow the `Handler → Service → Repository → DB` flow — no direct DB access from handlers
- Code reviews will check that business logic does not leak into handler or repository layers
- The `internal/ai/` package must remain stateless and side-effect free (no direct DB writes — only via service layer)

---

## NOTES

- **Author:** HabitFlow team
- **Date:** 2026-03-20
- **Deciders:** Solo developer (project lead)
- **Alternatives considered:** Microservices (rejected — too much overhead for one developer), Serverless functions (rejected — poor fit for stateful SSE streaming used by AI Coach)
- **Linked docs:** `ARCHITECTURE.md`, `RULES.md`
