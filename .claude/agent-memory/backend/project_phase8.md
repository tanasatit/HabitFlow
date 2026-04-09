---
name: Phase 8 Google OAuth identity
description: Phase 8 Sign in with Google backend: googleauth package, user model changes, ErrGoogleOnlyAccount, GenerateTokenForUser export
type: project
---

Phase 8 adds Google OAuth2 identity flow (separate from Phase 7's calendar OAuth).

Key changes:
- `user.User` model: `PasswordHash` no longer has `not null`, added `GoogleID *string` (uniqueIndex) and `AvatarURL *string`
- `user.Repository`: added `FindByGoogleID`, `UpdateGoogleID`, `UpdateNameAndAvatar`
- `user.Service`: `generateToken` exported as `GenerateTokenForUser`; `Login` returns `ErrGoogleOnlyAccount` when `PasswordHash == ""`
- `user.Handler`: Login handles `ErrGoogleOnlyAccount` with HTTP 400
- `config.Config`: added `GoogleIdentityClientID`, `GoogleIdentityClientSecret`, `GoogleIdentityRedirectURL` (not validated — optional)
- New package `internal/domain/googleauth/`: `service.go` + `handler.go`
- Routes: `GET /api/v1/auth/google` and `GET /api/v1/auth/google/callback` (no auth middleware, in auth group)

**Why:** Separate OAuth client credentials and flow from Phase 7 calendar OAuth. Identity uses openid/email/profile scopes; calendar uses calendar scope.

**How to apply:** When touching auth or user model, remember PasswordHash is now nullable. The googleauth package depends on user.Repository and user.Service directly — do not add DB calls inside googleauth handlers or service.
