# PRP-002 -- Phase 2: Authentication

**Phase Goal:** Users can register, login, and logout with JWT-based authentication; protected routes enforce auth on both backend and frontend.

**Status:** Planning
**Date:** 2026-03-23
**Depends on:** Phase 1 (complete)

---

## 0. Observations and Conflicts

1. **Missing Go dependencies:** `go.mod` does not include `github.com/golang-jwt/jwt/v5`, `github.com/google/uuid`, or `golang.org/x/crypto` (for bcrypt). These must be installed before any auth code compiles. Note: `golang.org/x/crypto` is already an indirect dependency -- it needs to become a direct one.

2. **Frontend token storage mismatch:** PHASES.md says "httpOnly cookie" for token storage, but the existing `lib/api.ts` reads from `localStorage`. The PRP aligns with the **cookie approach** (set by the backend via `Set-Cookie` header). The frontend `api.ts` must be updated to use `credentials: "include"` instead of reading localStorage. This is more secure because JavaScript cannot access httpOnly cookies, preventing XSS token theft.

3. **Frontend types diverge from DATABASE.md:** The existing `types/api.ts` has `role: "free" | "pro" | "admin"` but DATABASE.md and ROLES.md use `"free" | "premium" | "admin"`. The frontend types must be corrected to use `"premium"`.

4. **Config struct is missing `JWTExpiryHours`:** The Phase 1 `config.go` has `JWTSecret` but not `JWTExpiryHours`. This field must be added.

5. **CORS required:** The backend must enable CORS with credentials support so that the frontend on `localhost:3000` can send cookies to `localhost:8080`.

---

## 1. Backend: Files to Create or Modify

### 1.1 New Files

| File | Package | Purpose |
|---|---|---|
| `backend/internal/model/user.go` | `model` | User GORM model |
| `backend/internal/model/subscription.go` | `model` | Subscription GORM model |
| `backend/internal/repository/user_repository.go` | `repository` | DB queries for users |
| `backend/internal/service/auth_service.go` | `service` | Register, login, password hashing, JWT |
| `backend/internal/handler/auth_handler.go` | `handler` | HTTP handlers for auth endpoints |
| `backend/internal/middleware/auth.go` | `middleware` | JWT validation middleware |

### 1.2 Modified Files

| File | Changes |
|---|---|
| `backend/pkg/config/config.go` | Add `JWTExpiryHours int`, `FrontendURL string` fields |
| `backend/pkg/database/supabase.go` | No changes needed (AutoMigrate already accepts variadic models) |
| `backend/cmd/server/main.go` | Wire up repositories, services, handlers, middleware, CORS, AutoMigrate |
| `backend/go.mod` | Add `golang-jwt/jwt/v5`, `google/uuid`, direct `golang.org/x/crypto` |

---

## 2. GORM Models

### 2.1 User (`backend/internal/model/user.go`)

```go
package model

import (
    "time"

    "github.com/google/uuid"
    "gorm.io/gorm"
)

type User struct {
    ID               uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    Email            string         `gorm:"uniqueIndex;not null" json:"email"`
    PasswordHash     string         `gorm:"not null" json:"-"`
    DisplayName      string         `json:"display_name"`
    Role             string         `gorm:"default:free" json:"role"`
    SubscriptionTier string         `gorm:"default:free" json:"subscription_tier"`
    AvatarURL        string         `json:"avatar_url"`
    CreatedAt        time.Time      `json:"created_at"`
    UpdatedAt        time.Time      `json:"updated_at"`
    DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}
```

Notes:
- `PasswordHash` has `json:"-"` to never leak in API responses.
- `DeletedAt` enables GORM soft delete.
- Relations (Habits, Subscription) will be added in later phases when those models exist.

### 2.2 Subscription (`backend/internal/model/subscription.go`)

```go
package model

import (
    "time"

    "github.com/google/uuid"
)

type Subscription struct {
    ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    UserID    uuid.UUID  `gorm:"type:uuid;uniqueIndex;not null" json:"user_id"`
    Tier      string     `gorm:"not null;default:free" json:"tier"`
    StartedAt time.Time  `json:"started_at"`
    ExpiresAt *time.Time `json:"expires_at"`
    IsActive  bool       `gorm:"default:true" json:"is_active"`
    GrantedBy *uuid.UUID `gorm:"type:uuid" json:"granted_by"`
    CreatedAt time.Time  `json:"created_at"`
    UpdatedAt time.Time  `json:"updated_at"`
}
```

### 2.3 Database Migration

In `main.go`, call:
```go
database.AutoMigrate(db, &model.User{}, &model.Subscription{})
```

---

## 3. Repository Layer

### 3.1 UserRepository (`backend/internal/repository/user_repository.go`)

```go
package repository

type UserRepository struct {
    db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository

func (r *UserRepository) Create(user *model.User) error
// Inserts user record. Returns error if email already exists.

func (r *UserRepository) FindByEmail(email string) (*model.User, error)
// Returns user by email, or gorm.ErrRecordNotFound.

func (r *UserRepository) FindByID(id uuid.UUID) (*model.User, error)
// Returns user by UUID primary key.
```

---

## 4. Service Layer

### 4.1 AuthService (`backend/internal/service/auth_service.go`)

```go
package service

type AuthService struct {
    userRepo  *repository.UserRepository
    jwtSecret string
    jwtExpiry int // hours
}

func NewAuthService(userRepo *repository.UserRepository, jwtSecret string, jwtExpiry int) *AuthService
```

**Methods:**

```go
func (s *AuthService) Register(req RegisterRequest) (*model.User, error)
// 1. Validate email format and password length (min 6 chars)
// 2. Check if email already exists (return ErrEmailTaken)
// 3. Hash password with bcrypt (cost 10)
// 4. Create user with role="free", subscription_tier="free"
// 5. Return created user (without password hash)

func (s *AuthService) Login(email, password string) (string, *model.User, error)
// 1. Find user by email (return ErrInvalidCredentials if not found)
// 2. Compare bcrypt hash (return ErrInvalidCredentials if mismatch)
// 3. Generate JWT token
// 4. Return token + user

func (s *AuthService) GetUserByID(id uuid.UUID) (*model.User, error)
// Delegates to userRepo.FindByID

func (s *AuthService) generateToken(user *model.User) (string, error)
// Creates JWT with claims: sub, email, role, subscriptionTier, exp, iat
```

**Request/Response Types (defined in the service or a shared dto package):**

```go
type RegisterRequest struct {
    Email       string `json:"email" binding:"required,email"`
    Password    string `json:"password" binding:"required,min=6"`
    DisplayName string `json:"display_name" binding:"required"`
}

type LoginRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
    Token string      `json:"token"`
    User  model.User  `json:"user"`
}
```

**Custom Errors:**

```go
var (
    ErrEmailTaken         = errors.New("email already registered")
    ErrInvalidCredentials = errors.New("invalid email or password")
)
```

**Password Hashing:**
- Use `golang.org/x/crypto/bcrypt`
- `bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)` (cost 10)
- `bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))`

---

## 5. JWT Strategy

### Claims Structure

```go
type JWTClaims struct {
    UserID           string `json:"sub"`
    Email            string `json:"email"`
    Role             string `json:"role"`
    SubscriptionTier string `json:"subscriptionTier"`
    jwt.RegisteredClaims
}
```

### Configuration

| Parameter | Value | Source |
|---|---|---|
| Signing method | `HS256` | Hardcoded |
| Secret | `JWT_SECRET` env var | `config.go` |
| Expiry | `JWT_EXPIRY_HOURS` env var (default 24) | `config.go` |
| Token delivery | `Set-Cookie` header (httpOnly, SameSite=Lax, Path=/) | `auth_handler.go` |

### Cookie Settings

```go
c.SetSameSite(http.SameSiteLaxMode)
c.SetCookie("token", tokenString, 3600*jwtExpiryHours, "/", "", false, true)
// name, value, maxAge, path, domain, secure, httpOnly
// secure=false for development (localhost is not HTTPS)
// secure=true in production (set via ENV check)
```

### Token Extraction (Middleware)

The auth middleware checks two locations in order:
1. Cookie named `token`
2. `Authorization: Bearer <token>` header (fallback for API clients/Postman)

---

## 6. Handler Layer

### 6.1 AuthHandler (`backend/internal/handler/auth_handler.go`)

```go
package handler

type AuthHandler struct {
    service *service.AuthService
    cfg     *config.Config
}

func NewAuthHandler(service *service.AuthService, cfg *config.Config) *AuthHandler

func (h *AuthHandler) Register(c *gin.Context)
func (h *AuthHandler) Login(c *gin.Context)
func (h *AuthHandler) Logout(c *gin.Context)
func (h *AuthHandler) Me(c *gin.Context)
```

### 6.2 API Contracts

#### POST /api/v1/auth/register

| Field | Value |
|---|---|
| Auth | None |
| Request Body | `{"email": "user@example.com", "password": "secret123", "display_name": "John"}` |
| Response 201 | `{"data": {"token": "jwt...", "user": {id, email, display_name, role, subscription_tier}}, "message": "success"}` |
| Response 400 | `{"error": "validation error details"}` |
| Response 409 | `{"error": "email already registered"}` |
| Side Effect | Sets `token` httpOnly cookie |

#### POST /api/v1/auth/login

| Field | Value |
|---|---|
| Auth | None |
| Request Body | `{"email": "user@example.com", "password": "secret123"}` |
| Response 200 | `{"data": {"token": "jwt...", "user": {id, email, display_name, role, subscription_tier}}, "message": "success"}` |
| Response 401 | `{"error": "invalid email or password"}` |
| Side Effect | Sets `token` httpOnly cookie |

#### POST /api/v1/auth/logout

| Field | Value |
|---|---|
| Auth | None (clears cookie regardless) |
| Request Body | None |
| Response 200 | `{"data": null, "message": "logged out"}` |
| Side Effect | Clears `token` cookie (sets MaxAge=-1) |

#### GET /api/v1/auth/me

| Field | Value |
|---|---|
| Auth | Required (JWT via cookie or header) |
| Request Body | None |
| Response 200 | `{"data": {id, email, display_name, role, subscription_tier, avatar_url, created_at}, "message": "success"}` |
| Response 401 | `{"error": "unauthorized"}` |

---

## 7. Middleware

### 7.1 AuthMiddleware (`backend/internal/middleware/auth.go`)

```go
package middleware

func AuthMiddleware(jwtSecret string) gin.HandlerFunc
// 1. Extract token from cookie "token" OR Authorization header
// 2. Parse and validate JWT with jwtSecret
// 3. Extract claims (userID, email, role, subscriptionTier)
// 4. Set on gin.Context: "userID", "email", "role", "subscriptionTier"
// 5. Call c.Next() on success, c.AbortWithStatusJSON(401) on failure

func extractToken(c *gin.Context) string
// Checks cookie first, then Authorization header ("Bearer <token>")
```

---

## 8. Config Changes

### 8.1 Updated Config struct (`backend/pkg/config/config.go`)

Add these fields:

```go
type Config struct {
    // ... existing fields ...
    JWTExpiryHours int    // new -- default 24
    FrontendURL    string // new -- for CORS, default "http://localhost:3000"
    Env            string // new -- "development" or "production"
}
```

Add to `.env.example`:

```env
JWT_EXPIRY_HOURS=24
FRONTEND_URL=http://localhost:3000
ENV=development
```

---

## 9. main.go Changes

The updated `main.go` must:

1. Load config
2. Connect to database
3. Run AutoMigrate with User and Subscription models
4. Create repository instances: `userRepo := repository.NewUserRepository(db)`
5. Create service instances: `authService := service.NewAuthService(userRepo, cfg.JWTSecret, cfg.JWTExpiryHours)`
6. Create handler instances: `authHandler := handler.NewAuthHandler(authService, cfg)`
7. Set up CORS middleware (allow `cfg.FrontendURL`, allow credentials)
8. Register public routes:
   - `POST /api/v1/auth/register` -> `authHandler.Register`
   - `POST /api/v1/auth/login` -> `authHandler.Login`
   - `POST /api/v1/auth/logout` -> `authHandler.Logout`
9. Register protected routes:
   - `GET /api/v1/auth/me` -> with `AuthMiddleware`, `authHandler.Me`
10. Keep health check as-is

### CORS Setup

```go
import "github.com/gin-contrib/cors"

r.Use(cors.New(cors.Config{
    AllowOrigins:     []string{cfg.FrontendURL},
    AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowHeaders:     []string{"Content-Type", "Authorization"},
    AllowCredentials: true,
    MaxAge:           12 * time.Hour,
}))
```

**New dependency:** `github.com/gin-contrib/cors`

---

## 10. Frontend: Files to Create or Modify

### 10.1 New Files

| File | Purpose |
|---|---|
| `frontend/src/lib/auth.ts` | Auth API calls: register(), login(), logout(), getMe() |
| `frontend/src/lib/hooks/useAuth.ts` | React hook for auth state management |
| `frontend/src/types/user.ts` | IUser interface |
| `frontend/src/components/features/auth/LoginForm.tsx` | Client component with login form logic |
| `frontend/src/components/features/auth/RegisterForm.tsx` | Client component with register form logic |
| `frontend/src/app/(app)/layout.tsx` | Protected layout with auth check |

### 10.2 Modified Files

| File | Changes |
|---|---|
| `frontend/src/lib/api.ts` | Add `credentials: "include"` to all requests; remove localStorage token logic |
| `frontend/src/types/api.ts` | Fix role type from `"pro"` to `"premium"` |
| `frontend/src/middleware.ts` | Already functional -- no changes needed (reads cookie "token") |
| `frontend/src/app/(auth)/login/page.tsx` | Import and render LoginForm component |
| `frontend/src/app/(auth)/register/page.tsx` | Import and render RegisterForm component |

---

## 11. Frontend Type Definitions

### 11.1 IUser (`frontend/src/types/user.ts`)

```typescript
export interface IUser {
  id: string;
  email: string;
  display_name: string;
  role: "free" | "premium" | "admin";
  subscription_tier: "free" | "premium";
  avatar_url: string;
  created_at: string;
}

export interface IAuthResponse {
  token: string;
  user: IUser;
}

export interface IRegisterPayload {
  email: string;
  password: string;
  display_name: string;
}

export interface ILoginPayload {
  email: string;
  password: string;
}
```

### 11.2 Fix `types/api.ts`

Change the `User` interface `role` field from `"pro"` to `"premium"`.

---

## 12. Frontend Auth Library

### 12.1 auth.ts (`frontend/src/lib/auth.ts`)

```typescript
import { api } from "./api";
import type { IUser, IAuthResponse, IRegisterPayload, ILoginPayload } from "@/types/user";

export async function register(payload: IRegisterPayload): Promise<IAuthResponse>
// Calls api.post<IAuthResponse>("/auth/register", payload)
// Cookie is set automatically by the browser from Set-Cookie header

export async function login(payload: ILoginPayload): Promise<IAuthResponse>
// Calls api.post<IAuthResponse>("/auth/login", payload)

export async function logout(): Promise<void>
// Calls api.post("/auth/logout", {})

export async function getMe(): Promise<IUser>
// Calls api.get<IUser>("/auth/me")
```

### 12.2 useAuth Hook (`frontend/src/lib/hooks/useAuth.ts`)

```typescript
"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import type { IUser } from "@/types/user";
import * as auth from "@/lib/auth";

interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>(...)

export function AuthProvider({ children }: { children: React.ReactNode })
// On mount, calls getMe() to check if user is already authenticated
// Provides user state, loading state, and auth methods

export function useAuth(): AuthContextType
// Returns useContext(AuthContext)
```

---

## 13. Frontend API Changes

### 13.1 Updated `lib/api.ts`

Key change: add `credentials: "include"` so the browser sends/receives httpOnly cookies.

```typescript
async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",  // <-- NEW: send cookies cross-origin
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  // ... rest unchanged
}
```

Remove the `localStorage.getItem("token")` line and the `Authorization` header injection.

---

## 14. Frontend Pages

### 14.1 LoginForm Component (`frontend/src/components/features/auth/LoginForm.tsx`)

```typescript
"use client";
// Client component with:
// - email, password state
// - error state for displaying validation/server errors
// - onSubmit calls useAuth().login(email, password)
// - On success, redirect to /dashboard via router.push
// - Shows loading state on submit button
```

### 14.2 RegisterForm Component (`frontend/src/components/features/auth/RegisterForm.tsx`)

```typescript
"use client";
// Client component with:
// - email, password, displayName state
// - error state
// - onSubmit calls useAuth().register(email, password, displayName)
// - On success, redirect to /dashboard via router.push
// - Shows loading state on submit button
```

### 14.3 Login Page (`frontend/src/app/(auth)/login/page.tsx`)

- Keep existing layout/styling
- Replace static `<form>` with `<LoginForm />` component

### 14.4 Register Page (`frontend/src/app/(auth)/register/page.tsx`)

- Keep existing layout/styling
- Replace static `<form>` with `<RegisterForm />` component

### 14.5 Protected Layout (`frontend/src/app/(app)/layout.tsx`)

```typescript
// Wraps children with AuthProvider
// Shows loading spinner while checking auth
// If getMe() fails (401), middleware.ts handles redirect
```

### 14.6 Root Layout (`frontend/src/app/layout.tsx`)

- Wrap the entire app with `AuthProvider` so auth state is available everywhere

---

## 15. Dependency Order (What Must Be Done Before What)

### Backend Track

```
B1. Install Go dependencies: golang-jwt/jwt/v5, google/uuid, gin-contrib/cors
    (no deps)

B2. Update config.go: add JWTExpiryHours, FrontendURL, Env fields
    (no deps)

B3. Create model/user.go and model/subscription.go
    (after B1 -- needs uuid package)

B4. Create repository/user_repository.go
    (after B3 -- needs User model)

B5. Create service/auth_service.go
    (after B4 -- needs UserRepository)

B6. Create middleware/auth.go
    (after B1 -- needs jwt package)

B7. Create handler/auth_handler.go
    (after B5, B6 -- needs AuthService, needs middleware for /me route)

B8. Update main.go: wire everything, CORS, AutoMigrate, route registration
    (after B2, B3, B4, B5, B6, B7 -- needs all pieces)

B9. Test all endpoints with curl
    (after B8)
```

### Frontend Track

```
F1. Create types/user.ts
    (no deps)

F2. Fix types/api.ts (role: "pro" -> "premium")
    (no deps)

F3. Update lib/api.ts: add credentials: "include", remove localStorage token
    (no deps)

F4. Create lib/auth.ts
    (after F1, F3 -- needs types and updated api)

F5. Create lib/hooks/useAuth.ts
    (after F4 -- needs auth lib)

F6. Create components/features/auth/LoginForm.tsx
    (after F5 -- needs useAuth hook)

F7. Create components/features/auth/RegisterForm.tsx
    (after F5 -- needs useAuth hook)

F8. Update app/(auth)/login/page.tsx to use LoginForm
    (after F6)

F9. Update app/(auth)/register/page.tsx to use RegisterForm
    (after F7)

F10. Create/update app/(app)/layout.tsx with AuthProvider
     (after F5)

F11. Wire AuthProvider into root layout
     (after F5)

F12. Test full login flow end-to-end
     (after B9, F8, F9, F10, F11 -- needs backend running)
```

Backend (B1-B9) and Frontend (F1-F11) tracks can proceed in parallel.
F12 requires both tracks complete.

---

## 16. Testing Checklist (Phase 2 Complete When All Pass)

### Backend -- curl/Postman Tests

- [ ] `POST /api/v1/auth/register` with valid payload returns 201 + user object + sets cookie
- [ ] `POST /api/v1/auth/register` with duplicate email returns 409
- [ ] `POST /api/v1/auth/register` with missing fields returns 400
- [ ] `POST /api/v1/auth/register` with short password (<6 chars) returns 400
- [ ] `POST /api/v1/auth/login` with valid credentials returns 200 + token + sets cookie
- [ ] `POST /api/v1/auth/login` with wrong password returns 401
- [ ] `POST /api/v1/auth/login` with non-existent email returns 401
- [ ] `GET /api/v1/auth/me` with valid cookie returns 200 + user object
- [ ] `GET /api/v1/auth/me` without token returns 401
- [ ] `GET /api/v1/auth/me` with expired/invalid token returns 401
- [ ] `POST /api/v1/auth/logout` clears the cookie
- [ ] Password hash is stored in DB (not plaintext)
- [ ] User response never includes password hash (json:"-" works)
- [ ] `users` and `subscriptions` tables created in Supabase after AutoMigrate
- [ ] CORS allows requests from frontend origin with credentials
- [ ] Health check still works: `GET /api/v1/health` returns 200

### Frontend Tests

- [ ] Login page renders form with email and password fields
- [ ] Register page renders form with name, email, and password fields
- [ ] Submitting login form with valid credentials redirects to /dashboard
- [ ] Submitting login form with invalid credentials shows error message
- [ ] Submitting register form with valid data redirects to /dashboard
- [ ] Submitting register form with duplicate email shows error message
- [ ] Visiting /dashboard without being logged in redirects to /login
- [ ] Visiting /login while logged in redirects to /dashboard
- [ ] After logout, visiting /dashboard redirects to /login
- [ ] `npm run build` completes with zero errors
- [ ] `npm run lint` passes

### Integration

- [ ] Full flow: Register -> auto-login -> see dashboard -> logout -> redirected to login
- [ ] Full flow: Login -> see dashboard -> refresh page -> still logged in (cookie persists)
- [ ] Token expires after configured hours (verify with short expiry in dev)

---

## 17. Decisions and Trade-offs

| Decision | Rationale |
|---|---|
| httpOnly cookie over localStorage | Prevents XSS token theft. PHASES.md specifies this approach. |
| Dual token extraction (cookie + header) | Cookie for browser; header for Postman/API testing convenience. |
| bcrypt cost 10 (DefaultCost) | Good balance of security and performance for a university project. |
| HS256 signing | Simple, single-server deployment. RS256 is overkill for this project. |
| Subscription model created now but not fully wired | Phase 2 only needs User. Subscription table is created via AutoMigrate so the schema is ready for Phase 5 (Admin). |
| AuthProvider at root layout level | Auth state available to all pages including the (auth) group for redirect logic. |
| No refresh token mechanism | Simplicity. 24-hour expiry with re-login is acceptable for a semester project. |
| CORS via gin-contrib/cors | Standard Gin CORS package. Must allow credentials for cookie transport. |
