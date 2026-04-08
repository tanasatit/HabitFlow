# PRP-008 -- Phase 8: Google OAuth (Sign in with Google)

> **Phase goal:** Users can register and log in using their Google account via OAuth2 identity flow (`openid email profile` scopes), separate from the Phase 7 Google Calendar OAuth.

---

## Background & Context

Phase 7 added Google Calendar OAuth using `https://www.googleapis.com/auth/calendar` scope, stored in a `google_tokens` table for premium users. Phase 8 is a **completely separate OAuth flow** for authentication/identity using `openid email profile` scopes. Key distinctions:

- **Different OAuth client credentials** -- Phase 7 uses `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` for calendar access; Phase 8 uses `GOOGLE_IDENTITY_CLIENT_ID` / `GOOGLE_IDENTITY_CLIENT_SECRET` for identity
- **Different purpose** -- Phase 7 grants calendar read/write; Phase 8 grants sign-in capability
- **Different user scope** -- Phase 7 is premium-only; Phase 8 is available to everyone (free tier default)
- **Different data storage** -- Phase 7 stores OAuth tokens in `google_tokens`; Phase 8 stores a `google_id` on the `users` table

### Key decisions

1. **`google_id` column on `users` table** (nullable, unique index) -- links a Google identity to a HabitFlow user. Simpler than a separate table since it is a 1:1 relationship and we do not need to store/refresh tokens.
2. **Account linking by email** -- if a user registers with email/password first, then signs in with Google using the same email, the accounts are linked (set `google_id` on the existing user). No duplicate accounts.
3. **Password-less Google accounts** -- users who only register via Google have an empty `PasswordHash`. The local login endpoint (`POST /auth/login`) must detect this and return a clear error message ("Please sign in with Google").
4. **State token storage** -- use the same `sync.Map` in-memory approach as Phase 7's `googlecal.Service` for CSRF protection (state token with 10-minute TTL).
5. **JWT issuance** -- after Google callback, issue the same JWT format as local login (same `tokenClaims` struct, same cookie name `token`, same expiry).
6. **No auth middleware on OAuth endpoints** -- `GET /auth/google` and `GET /auth/google/callback` must be public (no JWT required) since the user is not yet authenticated.
7. **Separate domain package** -- create `internal/domain/googleauth/` to keep identity OAuth cleanly separated from `googlecal/` (calendar OAuth) and `user/` (local auth).

---

## Scope

### Backend

| # | Task | Status |
|---|---|---|
| B1 | Add `google_id` column (nullable, unique index) to `users` table via GORM model change | |
| B2 | Add `GOOGLE_IDENTITY_CLIENT_ID`, `GOOGLE_IDENTITY_CLIENT_SECRET`, `GOOGLE_IDENTITY_REDIRECT_URL` to config | |
| B3 | Create `internal/domain/googleauth/` package (service, handler) | |
| B4 | Implement `GET /auth/google` -- generate state token, redirect to Google consent | |
| B5 | Implement `GET /auth/google/callback` -- exchange code, fetch profile, upsert user, issue JWT, redirect to frontend | |
| B6 | Add `FindByGoogleID(googleID string)` to user repository | |
| B7 | Add `UpdateGoogleID(userID uuid.UUID, googleID string)` to user repository | |
| B8 | Handle account linking: existing user by email gets `google_id` set | |
| B9 | Handle new user registration: auto-create with free tier, no password | |
| B10 | Block local login for password-less Google accounts (return clear error) | |
| B11 | Register routes in `main.go` | |

### Frontend

| # | Task | Status |
|---|---|---|
| F1 | Add "Continue with Google" button to login page | |
| F2 | Add "Continue with Google" button to register page | |
| F3 | Create `GoogleSignInButton` reusable component | |
| F4 | Handle OAuth callback redirect -- frontend receives JWT cookie from backend redirect, loads `/dashboard` | |
| F5 | Show Google-linked status in settings page (avatar URL, Google email) | |
| F6 | Update `IUser` type to include optional `google_id` and `avatar_url` fields | |

---

## Technical Design

### Data Model Changes

#### Migration: add `google_id` and `avatar_url` to `users`

```go
// backend/internal/domain/user/model.go
type User struct {
    ID           uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    Email        string         `gorm:"uniqueIndex;not null"                           json:"email"`
    PasswordHash string         `gorm:""                                               json:"-"`  // CHANGED: remove "not null" constraint
    Name         string         `gorm:"not null"                                       json:"name"`
    Role         Role           `gorm:"type:varchar(20);default:'free'"                json:"role"`
    GoogleID     *string        `gorm:"uniqueIndex"                                    json:"google_id,omitempty"`  // NEW
    AvatarURL    *string        `                                                      json:"avatar_url,omitempty"` // NEW
    CreatedAt    time.Time      `json:"created_at"`
    UpdatedAt    time.Time      `json:"updated_at"`
    DeletedAt    gorm.DeletedAt `gorm:"index"                                          json:"-"`
}
```

**Important migration note:** The current `PasswordHash` field has `gorm:"not null"`. For Google-only accounts, we need to allow empty password hashes. Change the GORM tag to remove `not null` -- GORM AutoMigrate will handle this by altering the column constraint. Alternatively, store a random non-usable hash (but this is less clean). The recommended approach is to remove the `not null` constraint and let the service layer enforce password presence for local registration only.

GORM `AutoMigrate` will:
- Add `google_id` column (nullable, with unique index)
- Add `avatar_url` column (nullable)
- Modify `password_hash` column to be nullable (if the `not null` tag is removed)

---

### API Endpoints

These endpoints live under `/api/v1/auth/` and require **NO auth middleware** (user is not yet logged in).

| Method | Path | Description | Auth Required | Request | Response |
|---|---|---|---|---|---|
| `GET` | `/api/v1/auth/google` | Initiate Google sign-in -- redirect to Google consent | No | -- | HTTP 302 to Google |
| `GET` | `/api/v1/auth/google/callback` | OAuth2 callback -- exchange code, upsert user, set JWT cookie, redirect | No | Query: `code`, `state` | HTTP 302 to `{FRONTEND_URL}/dashboard` |

**Error handling for callback:**
- Invalid/expired state token: redirect to `{FRONTEND_URL}/login?error=invalid_state`
- Code exchange failure: redirect to `{FRONTEND_URL}/login?error=google_auth_failed`
- Other errors: redirect to `{FRONTEND_URL}/login?error=server_error`

---

### OAuth Flow (Step-by-Step)

```
1. User clicks "Continue with Google" on login or register page
2. Browser navigates to: GET /api/v1/auth/google
3. Backend generates a CSRF state token, stores it in sync.Map (10min TTL)
4. Backend redirects (302) to Google OAuth2 consent URL:
   https://accounts.google.com/o/oauth2/v2/auth
     ?client_id=GOOGLE_IDENTITY_CLIENT_ID
     &redirect_uri={BACKEND_URL}/api/v1/auth/google/callback
     &response_type=code
     &scope=openid email profile
     &state={csrf_token}
     &prompt=select_account
5. User selects Google account on consent screen
6. Google redirects to: GET /api/v1/auth/google/callback?code=XXX&state=YYY
7. Backend validates state token (CSRF check) -- consume on first use
8. Backend exchanges code for tokens via:
   POST https://oauth2.googleapis.com/token
9. Backend fetches user profile via:
   GET https://www.googleapis.com/oauth2/v2/userinfo
   Returns: { id, email, name, picture }
10. Backend upserts user:
    a. Look up by google_id → if found, update name/avatar, issue JWT
    b. Look up by email → if found, link account (set google_id + avatar), issue JWT
    c. Not found → create new user (free tier, no password, google_id set), issue JWT
11. Backend sets JWT in "token" cookie (same as local login)
12. Backend redirects (302) to: {FRONTEND_URL}/dashboard
13. Frontend loads dashboard -- useAuth hook reads /auth/me to get user data
```

**Note:** We use `prompt=select_account` instead of `prompt=consent` because we do not need offline access (no refresh token needed for identity). This lets users pick which Google account to use.

---

### File-by-File Plan

#### Backend -- New Files

##### `backend/internal/domain/googleauth/service.go`

```go
package googleauth

import (
    "context"
    "crypto/rand"
    "encoding/json"
    "fmt"
    "net/http"
    "sync"
    "time"

    "github.com/google/uuid"
    "golang.org/x/oauth2"
    "golang.org/x/oauth2/google"

    "github.com/habitflow/api/internal/domain/user"
    "github.com/habitflow/api/pkg/config"
)

// GoogleUserInfo represents the profile returned by Google's userinfo endpoint.
type GoogleUserInfo struct {
    ID      string `json:"id"`      // Google's unique user ID
    Email   string `json:"email"`
    Name    string `json:"name"`
    Picture string `json:"picture"` // avatar URL
}

type stateEntry struct {
    Expiry time.Time
}

type Service struct {
    userRepo    *user.Repository
    userSvc     *user.Service
    oauthCfg    *oauth2.Config
    frontendURL string
    stateStore  sync.Map
}

func NewService(userRepo *user.Repository, userSvc *user.Service, cfg *config.Config) *Service
func (s *Service) GenerateState() string                                           // random 16-byte hex, store with 10min TTL
func (s *Service) ValidateState(state string) bool                                 // load-and-delete, check expiry
func (s *Service) GetAuthURL(state string) string                                  // oauth2 AuthCodeURL with select_account prompt
func (s *Service) ExchangeCode(ctx context.Context, code string) (*oauth2.Token, error)
func (s *Service) FetchUserInfo(ctx context.Context, token *oauth2.Token) (*GoogleUserInfo, error) // GET userinfo endpoint
func (s *Service) UpsertUser(ctx context.Context, info *GoogleUserInfo) (*user.User, error)        // find-or-create + link logic
func (s *Service) GetFrontendURL() string
```

`UpsertUser` logic:
1. `userRepo.FindByGoogleID(info.ID)` -- if found, update Name/AvatarURL, return user
2. `userRepo.FindByEmail(info.Email)` -- if found, set GoogleID + AvatarURL, return user
3. Create new user: `{ Email: info.Email, Name: info.Name, GoogleID: &info.ID, AvatarURL: &info.Picture, Role: RoleFree, PasswordHash: "" }`

Internal cleanup goroutine (same pattern as Phase 7):
```go
func (s *Service) cleanupStateStore()  // ticker every 5 minutes, prune expired entries
```

##### `backend/internal/domain/googleauth/handler.go`

```go
package googleauth

import "github.com/gin-gonic/gin"

type Handler struct {
    svc *Service
    cfg *config.Config
}

func NewHandler(svc *Service, cfg *config.Config) *Handler

func (h *Handler) InitiateAuth(c *gin.Context)  // GET /auth/google
// 1. Generate state token
// 2. Redirect to s.svc.GetAuthURL(state)

func (h *Handler) Callback(c *gin.Context)       // GET /auth/google/callback
// 1. Validate state from query param
// 2. Exchange code for token
// 3. Fetch user info
// 4. Upsert user
// 5. Generate JWT (via user.Service.GenerateTokenForUser)
// 6. Set "token" cookie
// 7. Redirect to {FRONTEND_URL}/dashboard
```

**Note:** The handler needs to generate a JWT. Currently `user.Service.generateToken` is unexported. We need to either:
- (a) Export it as `GenerateTokenForUser(u *user.User) (string, error)` -- **recommended**
- (b) Have `googleauth.Service` duplicate the JWT generation logic

Option (a) is cleaner and avoids duplication.

#### Backend -- Modified Files

##### `backend/internal/domain/user/model.go`

Changes:
1. Remove `not null` from `PasswordHash` GORM tag
2. Add `GoogleID *string` field with `gorm:"uniqueIndex"`
3. Add `AvatarURL *string` field

```go
type User struct {
    ID           uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    Email        string         `gorm:"uniqueIndex;not null"                           json:"email"`
    PasswordHash string         `gorm:""                                               json:"-"`       // CHANGED
    Name         string         `gorm:"not null"                                       json:"name"`
    Role         Role           `gorm:"type:varchar(20);default:'free'"                json:"role"`
    GoogleID     *string        `gorm:"uniqueIndex"                                    json:"google_id,omitempty"` // NEW
    AvatarURL    *string        `                                                      json:"avatar_url,omitempty"` // NEW
    CreatedAt    time.Time      `json:"created_at"`
    UpdatedAt    time.Time      `json:"updated_at"`
    DeletedAt    gorm.DeletedAt `gorm:"index"                                          json:"-"`
}
```

##### `backend/internal/domain/user/repository.go`

Add two new methods:

```go
// FindByGoogleID looks up a user by their Google account ID.
func (r *Repository) FindByGoogleID(googleID string) (*User, error)

// UpdateGoogleID links a Google account to an existing user.
func (r *Repository) UpdateGoogleID(userID uuid.UUID, googleID string, avatarURL string) error
```

##### `backend/internal/domain/user/service.go`

Changes:
1. **Export `generateToken`** as `GenerateTokenForUser(u *User) (string, error)` -- so `googleauth` can call it
2. Update existing `generateToken` calls to use the new exported name (or keep private + add public wrapper)
3. **Update `Login`** to check for empty `PasswordHash` and return a new error:

```go
var (
    ErrEmailTaken       = errors.New("email already in use")
    ErrInvalidCreds     = errors.New("invalid email or password")
    ErrUserNotFound     = errors.New("user not found")
    ErrGoogleOnlyAccount = errors.New("this account uses Google sign-in, please use the Google button to log in") // NEW
)

func (s *Service) Login(input LoginInput) (*User, string, error) {
    u, err := s.repo.FindByEmail(input.Email)
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, "", ErrInvalidCreds
        }
        return nil, "", err
    }

    // Block local login for Google-only accounts
    if u.PasswordHash == "" {
        return nil, "", ErrGoogleOnlyAccount
    }

    if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(input.Password)); err != nil {
        return nil, "", ErrInvalidCreds
    }

    token, err := s.GenerateTokenForUser(u)
    // ...
}

// GenerateTokenForUser creates a signed JWT for the given user. Exported for use by googleauth package.
func (s *Service) GenerateTokenForUser(u *User) (string, error) {
    // same implementation as current generateToken
}
```

##### `backend/internal/domain/user/handler.go`

Update `Login` handler to handle the new `ErrGoogleOnlyAccount` error:

```go
func (h *Handler) Login(c *gin.Context) {
    // ... existing code ...
    u, token, err := h.svc.Login(input)
    if err != nil {
        if errors.Is(err, ErrInvalidCreds) {
            response.Error(c, http.StatusUnauthorized, err.Error())
            return
        }
        if errors.Is(err, ErrGoogleOnlyAccount) {
            response.Error(c, http.StatusBadRequest, err.Error())
            return
        }
        response.InternalError(c)
        return
    }
    // ...
}
```

##### `backend/pkg/config/config.go`

Add three new fields to `Config` struct:

```go
type Config struct {
    // ... existing fields ...
    GoogleIdentityClientID     string  // NEW
    GoogleIdentityClientSecret string  // NEW
    GoogleIdentityRedirectURL  string  // NEW
}
```

Add to `Load()`:

```go
GoogleIdentityClientID:     os.Getenv("GOOGLE_IDENTITY_CLIENT_ID"),
GoogleIdentityClientSecret: os.Getenv("GOOGLE_IDENTITY_CLIENT_SECRET"),
GoogleIdentityRedirectURL:  getEnv("GOOGLE_IDENTITY_REDIRECT_URL", "http://localhost:8080/api/v1/auth/google/callback"),
```

These are NOT required in `validate()` -- the app works without Google sign-in.

##### `backend/cmd/server/main.go`

Changes:
1. Wire `googleauth` dependencies
2. Register routes under the public `auth` group

```go
import "github.com/habitflow/api/internal/domain/googleauth"

// Wire dependencies (after userRepo and userSvc are created):
googleAuthSvc := googleauth.NewService(userRepo, userSvc, cfg)
googleAuthHandler := googleauth.NewHandler(googleAuthSvc, cfg)

// Register routes (in the existing auth group, NO auth middleware):
auth := v1.Group("/auth")
{
    auth.POST("/register", userHandler.Register)
    auth.POST("/login", userHandler.Login)
    auth.POST("/logout", userHandler.Logout)
    auth.GET("/me", middleware.Auth(cfg), userHandler.Me)
    auth.GET("/google", googleAuthHandler.InitiateAuth)           // NEW
    auth.GET("/google/callback", googleAuthHandler.Callback)      // NEW
}
```

##### `backend/.env.example`

Add:

```env
# Google OAuth2 Identity (Sign in with Google)
GOOGLE_IDENTITY_CLIENT_ID=
GOOGLE_IDENTITY_CLIENT_SECRET=
GOOGLE_IDENTITY_REDIRECT_URL=http://localhost:8080/api/v1/auth/google/callback
```

#### Frontend -- New Files

##### `frontend/src/components/features/auth/GoogleSignInButton.tsx`

```typescript
'use client'

import { API_BASE } from '@/lib/api'

interface GoogleSignInButtonProps {
  label?: string  // default: "Continue with Google"
}

export function GoogleSignInButton({ label = 'Continue with Google' }: GoogleSignInButtonProps) {
    // Renders a styled button with Google "G" logo
    // onClick: window.location.href = `${API_BASE}/auth/google`
    // Plain browser navigation (not fetch) -- no auth header needed
}
```

#### Frontend -- Modified Files

##### `frontend/src/app/(auth)/login/page.tsx`

Add `GoogleSignInButton` component between the form and the "No account?" link:

```typescript
import { GoogleSignInButton } from '@/components/features/auth/GoogleSignInButton'

// After </form>, before the "No account?" paragraph:
// 1. Horizontal divider with "or" text
// 2. <GoogleSignInButton />
// 3. Handle ?error= query param from failed OAuth callback (show error message)
```

##### `frontend/src/app/(auth)/register/page.tsx`

Same pattern as login page:

```typescript
import { GoogleSignInButton } from '@/components/features/auth/GoogleSignInButton'

// After </form>, before the "Already have an account?" paragraph:
// 1. Horizontal divider with "or" text
// 2. <GoogleSignInButton label="Sign up with Google" />
```

##### `frontend/src/types/api.ts`

Update `IUser` to include new fields:

```typescript
export interface IUser {
  id: string
  email: string
  name: string
  role: 'free' | 'premium' | 'admin'
  google_id?: string      // NEW -- present if Google-linked
  avatar_url?: string     // NEW -- Google profile picture URL
  created_at: string
}
```

##### `frontend/src/app/(app)/settings/page.tsx`

Add a "Linked Accounts" section after the Account section, before Integrations:

```typescript
// New section: Linked Accounts
// Shows:
//   - Google account linked status (if user.google_id is set)
//   - Google avatar + email display
//   - If not linked, a "Link Google Account" button (same flow as sign-in)
```

##### `frontend/src/lib/hooks/useAuth.tsx`

No structural changes needed. The `useAuth` hook already calls `/auth/me` which will now return `google_id` and `avatar_url` fields. The `IUser` type update in `types/api.ts` is sufficient.

##### `frontend/src/middleware.ts`

No changes needed. The `/login` and `/register` paths are already in `AUTH_PATHS`, and the OAuth callback goes through the backend (not a frontend route). After the backend sets the cookie and redirects to `/dashboard`, the middleware will see the token and allow access.

---

## Out of Scope

- **Google account unlinking** -- once linked, users cannot unlink their Google account from HabitFlow (would require password reset flow to be safe). Can be added in a future phase.
- **Multiple Google accounts per user** -- one Google identity per HabitFlow user.
- **Google profile sync on every login** -- we update name/avatar on Google sign-in, but do not poll for changes between sign-ins.
- **Merging two separate accounts** -- if a user has both a local account (email A) and a Google account (email B, different email), they remain separate accounts. Account linking only works when the emails match.
- **Password reset for Google-linked accounts** -- Google-only accounts have no password. Setting a password requires a dedicated "set password" flow (future phase).
- **Google One Tap / Sign In With Google (YOLO mode)** -- we use the standard OAuth redirect flow, not the embedded JavaScript widget.

---

## Dependencies (Ordering)

```
B2 (config) ────────────────┐
                             │
B1 (user model change) ─────┤
                             │
B6 (FindByGoogleID repo) ───┼── B3 (googleauth service) ── B4 (initiate auth)
B7 (UpdateGoogleID repo) ───┤                                    │
                             │                                    │
B10 (block local login) ────┘                              B5 (callback + upsert)
                                                                  │
                                                           B8 (account linking in B5)
                                                           B9 (new user creation in B5)
                                                                  │
                                                           B11 (routes in main.go)

F3 (GoogleSignInButton) ── F1 (login page) ── F4 (callback redirect handling)
                        └── F2 (register page)
F6 (IUser type update) ── F5 (settings page)
```

**Critical path:** B1 -> B6/B7 -> B2 -> B3 -> B5 -> B11 (backend) then F3 -> F1/F2 (frontend)

The backend agent should implement B1, B6, B7, B10 first (user model/repo changes), then B2 (config), then B3-B5 (googleauth package), then B11 (wiring).

The frontend agent can start F3 and F6 immediately (no backend dependency), then F1/F2 once the backend `/auth/google` endpoint exists, and F5 last.

---

## Environment Setup Required

Before implementation begins, the developer needs:

1. **Google Cloud Console project** (can reuse Phase 7's project) with:
   - **A separate OAuth2 client** (Web application type) for identity -- NOT the same client as Phase 7's calendar OAuth
   - Authorized redirect URI: `http://localhost:8080/api/v1/auth/google/callback`
   - Authorized JavaScript origins: `http://localhost:3000` (for potential future GSIS integration)
2. **Scopes:** `openid`, `email`, `profile` (these are default and do not require verification)
3. **Environment variables** set in `.env`:
   - `GOOGLE_IDENTITY_CLIENT_ID` -- different from `GOOGLE_CLIENT_ID`
   - `GOOGLE_IDENTITY_CLIENT_SECRET` -- different from `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_IDENTITY_REDIRECT_URL` (default: `http://localhost:8080/api/v1/auth/google/callback`)

---

## Verification

### Backend Testing Checklist

- [ ] `users` table has `google_id` column (nullable, unique index) after AutoMigrate
- [ ] `users` table has `avatar_url` column (nullable) after AutoMigrate
- [ ] `users.password_hash` allows empty string (nullable or no NOT NULL constraint)
- [ ] `GET /api/v1/auth/google` returns 302 redirect to Google consent screen
- [ ] State token is generated and stored with 10-minute TTL
- [ ] `GET /api/v1/auth/google/callback?code=XXX&state=YYY` validates state
- [ ] Callback with invalid/expired state redirects to `/login?error=invalid_state`
- [ ] Callback with valid code exchanges for token and fetches user profile
- [ ] **New user flow:** Google sign-in with unknown email creates new user with `role=free`, empty password, `google_id` set
- [ ] **Existing user linking:** Google sign-in with known email (existing local account) sets `google_id` on existing user without changing password
- [ ] **Returning Google user:** Google sign-in for user with existing `google_id` logs them in, updates name/avatar
- [ ] JWT cookie is set after successful Google callback (same cookie name and format as local login)
- [ ] Callback redirects to `{FRONTEND_URL}/dashboard` after success
- [ ] `POST /auth/login` with email of a Google-only account (no password) returns 400 with message about using Google sign-in
- [ ] `POST /auth/login` still works for users with both password and `google_id`
- [ ] `GET /auth/me` returns `google_id` and `avatar_url` fields for Google-linked users
- [ ] State cleanup goroutine removes expired entries

### Frontend Testing Checklist

- [ ] Login page shows "Continue with Google" button below the form with a divider
- [ ] Register page shows "Sign up with Google" button below the form with a divider
- [ ] Clicking the Google button navigates to `/api/v1/auth/google` (full browser navigation, not AJAX)
- [ ] After Google OAuth, user lands on `/dashboard` with valid session
- [ ] `useAuth` hook picks up the user data (including `google_id`, `avatar_url`) after redirect
- [ ] Login page shows error message when redirected with `?error=` query param
- [ ] Settings page shows Google-linked status for users with `google_id`
- [ ] Settings page shows Google avatar for users with `avatar_url`
- [ ] Users without Google linked do not see Google-specific UI in settings

### Integration Testing

- [ ] Full new user flow: click "Continue with Google" on register page -> consent screen -> lands on dashboard -> `/auth/me` returns user with `google_id`
- [ ] Full returning user flow: click "Continue with Google" on login page -> consent screen -> lands on dashboard
- [ ] Account linking flow: register with email/password -> logout -> click "Continue with Google" (same email) -> lands on dashboard -> user now has both password and `google_id`
- [ ] Mixed login: user with both password and Google can use either method
- [ ] Google-only user cannot use local login form (gets clear error message)
