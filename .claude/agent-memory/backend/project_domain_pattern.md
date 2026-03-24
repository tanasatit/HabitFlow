---
name: Backend domain package pattern
description: The backend uses internal/domain/<domain>/ layout (not flat handlers/services), with model.go, repository.go, service.go, handler.go per domain
type: project
---

Backend code is organized by domain under `backend/internal/domain/<domain>/` with four files per domain: model.go, repository.go, service.go, handler.go. All in the same package named after the domain (e.g., package habit, package user).

This diverges from ARCHITECTURE.md which shows a flat layout. The domain layout is what was actually built and should be followed going forward.

**Why:** Noted in PRP-003 observation #1 — the codebase was built with domain layout for consistency.

**How to apply:** When adding new features, create a new domain directory and follow the same four-file pattern. Never put handlers/services/repos in flat top-level directories.
