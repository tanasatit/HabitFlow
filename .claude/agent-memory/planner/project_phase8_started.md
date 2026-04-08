---
name: Phase 8 Google OAuth PRP created
description: Phase 8 (Sign in with Google) PRP created 2026-04-09, separate OAuth from Phase 7 calendar, google_id on users table, account linking by email
type: project
---

Phase 8 PRP (Google OAuth identity) created on 2026-04-09.

**Why:** Users need a "Sign in with Google" option separate from Phase 7's Google Calendar OAuth. Different client credentials, different scopes (openid email profile vs calendar), different storage (google_id column vs google_tokens table).

**How to apply:**
- New `internal/domain/googleauth/` package -- do NOT mix with `googlecal/` or `user/`
- `PasswordHash` constraint changed from `not null` to nullable for Google-only accounts
- `user.Service.generateToken` must be exported as `GenerateTokenForUser` for cross-package use
- OAuth routes are public (no auth middleware) under `/auth/google` and `/auth/google/callback`
- Env vars: `GOOGLE_IDENTITY_CLIENT_ID` / `GOOGLE_IDENTITY_CLIENT_SECRET` (not the Phase 7 ones)
