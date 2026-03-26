# PRP-005 -- Phase 5: Admin Panel

**Phase Goal:** Admin can manage users (list, view, update subscription tier, soft-delete) and view platform-wide analytics (total users, premium count, DAU) through a dedicated admin panel, fully protected by role-based access control on both backend and frontend.

**Status:** Planning
**Date:** 2026-03-25
**Depends on:** Phase 4 (complete -- dashboard & streaks), Phase 3 (complete -- habits CRUD + RBAC middleware)

---

## 0. Observations and Conflicts

1. **Backend uses domain-based package layout.** The actual codebase uses `internal/domain/<feature>/` (handler.go, service.go, repository.go, model.go in one package), NOT the flat `internal/handler/`, `internal/service/` layout described in ARCHITECTURE.md. Phase 5 will create `internal/domain/admin/` following this pattern.

2. **RequireRole("admin") middleware already exists.** `backend/internal/middleware/rbac.go` line 30-45 implements `RequireRole(role string)` which compares `c.GetString("userRole")` to the given role. This is ready to use -- no changes needed.

3. **User.Role is a custom `Role` type, not a plain string.** `user.Role` is `type Role string` with constants `RoleFree`, `RolePremium`, `RoleAdmin`. The JWT stores `string(u.Role)`. The middleware reads it as a string via `GetUserRole(c)`.

4. **Subscription model exists but is minimal.** `user.Subscription` has: `ID`, `UserID`, `Plan` (string, "free"/"premium"), `ExpiresAt` (*time.Time), `CreatedAt`, `UpdatedAt`. It does NOT have `IsActive`, `GrantedBy`, or `StartedAt` fields that DATABASE.md describes. The PRP works with the ACTUAL model. The admin service must update BOTH `User.Role` AND the `Subscription.Plan` when changing a user's tier -- they must stay in sync.

5. **User model uses `Name` not `DisplayName`.** The actual `user.User` struct has `Name string`, not `DisplayName`. The admin list/detail endpoints will expose this `Name` field.

6. **No `SubscriptionTier` in User model.** Unlike DATABASE.md which mentions `SubscriptionTier` as a separate field, the actual model only has `Role` (which serves double duty as both role and effective tier). The `Subscription` model's `Plan` field tracks the subscription separately. This is important: the admin must update both when upgrading/downgrading.

7. **DAU (Daily Active Users) definition.** DAU = number of distinct users who logged at least one habit completion today. This can be computed from `habit_logs` table: `SELECT COUNT(DISTINCT user_id) FROM habit_logs WHERE completed_at >= today AND completed_at < tomorrow`. No new tables needed.

8. **Soft delete only.** Per RULES.md and DATABASE.md, users are never hard-deleted. The `User` model has `gorm.DeletedAt` for soft delete. GORM's `db.Delete(&user)` automatically sets `deleted_at` instead of removing the row.

9. **Frontend middleware.ts currently has no role-based checks.** It only checks for the presence of a `token` cookie. For admin routes, we need to decode the JWT on the frontend to check the role claim. Since `httpOnly` cookies cannot be read by JavaScript, the middleware must call the `/auth/me` endpoint or we must add the role to a separate non-httpOnly cookie. The simpler approach: add `/admin` to PROTECTED_PREFIXES (requires auth), and do role checking at the page/layout level by reading user data from the auth context. The `(app)/layout.tsx` already wraps everything in `AuthProvider`.

10. **response.Paginated helper exists.** `pkg/response/response.go` has `Paginated[T](c, data, total, page, limit)` which returns `{"data": [], "total": N, "page": N, "limit": N, "message": "success"}`. The admin ListUsers endpoint should use this for pagination.

11. **user.Repository only has FindByEmail, FindByID, Create.** It needs new methods: `FindAll` (paginated), `Update`, `Delete` (soft), `CountAll`, `CountByRole`. These will be added to the existing `user/repository.go`.

12. **Subscription repository does not exist.** Currently subscriptions are managed only at registration. We need `FindByUserID`, `Create`, `Update` methods. These will be added to `user/repository.go` (same package, since Subscription is defined in `user/model.go`).

---

## 1. Backend: Database Changes

**No new tables.** No new columns. No migrations.

All admin data comes from existing `users`, `subscriptions`, and `habit_logs` tables.

The admin service will:
- Query `users` table for listing/updating/deleting users
- Query/update `subscriptions` table for tier changes
- Query `habit_logs` for DAU calculation
- Count records in `users` for analytics

---

## 2. Backend: Files to Create or Modify

### 2.1 New Files

| File | Package | Purpose |
|---|---|---|
| `backend/internal/domain/admin/service.go` | `admin` | Business logic for user management and analytics |
| `backend/internal/domain/admin/handler.go` | `admin` | HTTP handlers for admin endpoints |
| `backend/internal/domain/admin/model.go` | `admin` | Request/response DTOs for admin endpoints |

### 2.2 Modified Files

| File | Changes |
|---|---|
| `backend/internal/domain/user/repository.go` | Add `FindAll`, `FindAllPaginated`, `Update`, `SoftDelete`, `CountAll`, `CountByRole` methods |
| `backend/internal/domain/user/repository.go` | Add `FindSubscriptionByUserID`, `CreateSubscription`, `UpdateSubscription` methods |
| `backend/cmd/server/main.go` | Wire admin domain, register admin route group with `RequireRole("admin")` |

---

## 3. Backend: New Repository Methods (user/repository.go)

### 3.1 User Query Methods

```go
// FindAllPaginated returns users with pagination. Includes soft-deleted = false (GORM default).
// Supports optional search by email or name.
func (r *Repository) FindAllPaginated(page, limit int, search string) ([]User, int64, error)
// SQL: SELECT * FROM users WHERE (email ILIKE ? OR name ILIKE ?) ORDER BY created_at DESC LIMIT ? OFFSET ?
// Also: SELECT COUNT(*) FROM users WHERE ...

// CountAll returns total number of non-deleted users.
func (r *Repository) CountAll() (int64, error)
// SQL: SELECT COUNT(*) FROM users WHERE deleted_at IS NULL

// CountByRole returns the number of users with a specific role.
func (r *Repository) CountByRole(role Role) (int64, error)
// SQL: SELECT COUNT(*) FROM users WHERE role = ? AND deleted_at IS NULL

// Update saves changes to an existing user record.
func (r *Repository) Update(u *User) error
// GORM: db.Save(u)

// SoftDelete soft-deletes a user by ID.
func (r *Repository) SoftDelete(id uuid.UUID) error
// GORM: db.Delete(&User{}, "id = ?", id)
```

### 3.2 Subscription Methods

```go
// FindSubscriptionByUserID returns the subscription for a given user.
func (r *Repository) FindSubscriptionByUserID(userID uuid.UUID) (*Subscription, error)
// SQL: SELECT * FROM subscriptions WHERE user_id = ?

// CreateSubscription creates a new subscription record.
func (r *Repository) CreateSubscription(s *Subscription) error
// GORM: db.Create(s)

// UpdateSubscription saves changes to an existing subscription.
func (r *Repository) UpdateSubscription(s *Subscription) error
// GORM: db.Save(s)
```

---

## 4. Backend: Admin Domain

### 4.1 Admin Model (`backend/internal/domain/admin/model.go`)

```go
package admin

import (
    "time"
    "github.com/google/uuid"
)

// --- Request DTOs ---

type UpdateUserInput struct {
    Name *string `json:"name" binding:"omitempty,min=1,max=100"`
    Role *string `json:"role" binding:"omitempty,oneof=free premium admin"`
}

// --- Response DTOs ---

type UserDetail struct {
    ID           uuid.UUID    `json:"id"`
    Email        string       `json:"email"`
    Name         string       `json:"name"`
    Role         string       `json:"role"`
    Subscription *SubDetail   `json:"subscription"`
    CreatedAt    time.Time    `json:"created_at"`
    UpdatedAt    time.Time    `json:"updated_at"`
}

type SubDetail struct {
    ID        uuid.UUID  `json:"id"`
    Plan      string     `json:"plan"`
    ExpiresAt *time.Time `json:"expires_at"`
    CreatedAt time.Time  `json:"created_at"`
    UpdatedAt time.Time  `json:"updated_at"`
}

type AnalyticsResponse struct {
    TotalUsers   int64 `json:"total_users"`
    FreeUsers    int64 `json:"free_users"`
    PremiumUsers int64 `json:"premium_users"`
    AdminUsers   int64 `json:"admin_users"`
    DAU          int64 `json:"dau"` // distinct users with at least one habit_log today
}
```

### 4.2 Admin Service (`backend/internal/domain/admin/service.go`)

```go
package admin

import (
    "errors"
    "time"

    "github.com/google/uuid"
    "gorm.io/gorm"

    "github.com/habitflow/api/internal/domain/habit"
    "github.com/habitflow/api/internal/domain/user"
)

var (
    ErrUserNotFound     = errors.New("user not found")
    ErrCannotDeleteSelf = errors.New("admin cannot delete own account")
    ErrInvalidRole      = errors.New("invalid role")
)

type Service struct {
    userRepo  *user.Repository
    habitRepo *habit.Repository
    db        *gorm.DB // needed for DAU raw query
}

func NewService(userRepo *user.Repository, habitRepo *habit.Repository, db *gorm.DB) *Service

// ListUsers returns paginated list of users with their subscriptions.
func (s *Service) ListUsers(page, limit int, search string) ([]UserDetail, int64, error)
// 1. Call userRepo.FindAllPaginated(page, limit, search)
// 2. For each user, fetch subscription via userRepo.FindSubscriptionByUserID
// 3. Map to []UserDetail
// 4. Return with total count

// GetUser returns a single user with subscription detail.
func (s *Service) GetUser(userID uuid.UUID) (*UserDetail, error)
// 1. Call userRepo.FindByID(userID)
// 2. Fetch subscription
// 3. Map to UserDetail

// UpdateUser updates a user's name and/or role+subscription tier.
// When role changes, the Subscription.Plan must also be updated to stay in sync.
func (s *Service) UpdateUser(adminID, userID uuid.UUID, input UpdateUserInput) (*UserDetail, error)
// 1. Fetch user by ID (404 if not found)
// 2. If input.Name != nil, update user.Name
// 3. If input.Role != nil:
//    a. Set user.Role = Role(*input.Role)
//    b. Determine plan: if role is "admin" or "premium" -> plan = "premium", else "free"
//    c. Find or create Subscription for user
//    d. Update Subscription.Plan
// 4. Save user
// 5. Return updated UserDetail

// DeleteUser soft-deletes a user. Admin cannot delete themselves.
func (s *Service) DeleteUser(adminID, userID uuid.UUID) error
// 1. If adminID == userID, return ErrCannotDeleteSelf
// 2. Check user exists (404 if not found)
// 3. Call userRepo.SoftDelete(userID)

// GetAnalytics returns platform-wide stats.
func (s *Service) GetAnalytics() (*AnalyticsResponse, error)
// 1. CountAll() for total_users
// 2. CountByRole("free") for free_users
// 3. CountByRole("premium") for premium_users
// 4. CountByRole("admin") for admin_users
// 5. DAU: raw query on habit_logs
//    SELECT COUNT(DISTINCT user_id) FROM habit_logs
//    WHERE completed_at >= ? AND completed_at < ?
//    (today start, tomorrow start)
// 6. Return AnalyticsResponse
```

### 4.3 Admin Handler (`backend/internal/domain/admin/handler.go`)

```go
package admin

import (
    "errors"
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"

    "github.com/habitflow/api/internal/middleware"
    "github.com/habitflow/api/pkg/response"
)

type Handler struct {
    svc *Service
}

func NewHandler(svc *Service) *Handler

// ListUsers handles GET /api/v1/admin/users
// Query params: ?page=1&limit=20&search=email_or_name
func (h *Handler) ListUsers(c *gin.Context)
// 1. Parse page (default 1), limit (default 20), search from query params
// 2. Call s.svc.ListUsers(page, limit, search)
// 3. Return response.Paginated(c, users, total, page, limit)

// GetUser handles GET /api/v1/admin/users/:id
func (h *Handler) GetUser(c *gin.Context)
// 1. Parse user ID from URL param
// 2. Call s.svc.GetUser(userID)
// 3. Return response.Success(c, user)
// Error: 404 if not found

// UpdateUser handles PUT /api/v1/admin/users/:id
func (h *Handler) UpdateUser(c *gin.Context)
// 1. Parse user ID from URL param
// 2. Bind UpdateUserInput from JSON body
// 3. Extract adminID from context via middleware.GetUserID(c)
// 4. Call s.svc.UpdateUser(adminID, userID, input)
// 5. Return response.Success(c, updatedUser)
// Error: 404 if not found, 400 for invalid input

// DeleteUser handles DELETE /api/v1/admin/users/:id
func (h *Handler) DeleteUser(c *gin.Context)
// 1. Parse user ID from URL param
// 2. Extract adminID from context via middleware.GetUserID(c)
// 3. Call s.svc.DeleteUser(adminID, userID)
// 4. Return response.Success(c, gin.H{"message": "user deleted"})
// Error: 404 if not found, 400 if trying to delete self

// Analytics handles GET /api/v1/admin/analytics
func (h *Handler) Analytics(c *gin.Context)
// 1. Call s.svc.GetAnalytics()
// 2. Return response.Success(c, analytics)
```

---

## 5. Backend: main.go Changes

Add to `cmd/server/main.go`:

```go
import "github.com/habitflow/api/internal/domain/admin"

// After existing wiring:
adminSvc := admin.NewService(userRepo, habitRepo, db)
adminHandler := admin.NewHandler(adminSvc)

// Admin route group — requires auth + admin role
adminRoutes := v1.Group("/admin")
adminRoutes.Use(middleware.Auth(cfg), middleware.RequireRole("admin"))
{
    adminRoutes.GET("/users", adminHandler.ListUsers)
    adminRoutes.GET("/users/:id", adminHandler.GetUser)
    adminRoutes.PUT("/users/:id", adminHandler.UpdateUser)
    adminRoutes.DELETE("/users/:id", adminHandler.DeleteUser)
    adminRoutes.GET("/analytics", adminHandler.Analytics)
}
```

---

## 6. Backend: Admin Seed Instructions

Seed one admin user directly in Supabase SQL editor (not via code):

```sql
-- Run this once in Supabase SQL editor
-- First, register a normal user via the app, then promote:
UPDATE users
SET role = 'admin'
WHERE email = 'admin@habitflow.app';

-- Also ensure a subscription record exists with premium plan:
INSERT INTO subscriptions (id, user_id, plan, created_at, updated_at)
SELECT gen_random_uuid(), id, 'premium', NOW(), NOW()
FROM users WHERE email = 'admin@habitflow.app'
ON CONFLICT (user_id) DO UPDATE SET plan = 'premium', updated_at = NOW();
```

This is documented as a manual step, not automated in code. Per PHASES.md: "Seed one admin user directly in Supabase."

---

## 7. API Contracts

### 7.1 GET /api/v1/admin/users

| Field | Value |
|---|---|
| Auth | Required (JWT, role=admin) |
| Query Params | `page` (int, default 1), `limit` (int, default 20, max 100), `search` (string, optional) |
| Response 200 | Paginated user list (see below) |
| Response 401 | `{"error": "unauthorized"}` |
| Response 403 | `{"error": "forbidden"}` |

**Response 200 body:**
```json
{
  "data": [
    {
      "id": "uuid-here",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "free",
      "subscription": {
        "id": "uuid-here",
        "plan": "free",
        "expires_at": null,
        "created_at": "2026-03-20T10:00:00Z",
        "updated_at": "2026-03-20T10:00:00Z"
      },
      "created_at": "2026-03-20T10:00:00Z",
      "updated_at": "2026-03-20T10:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "message": "success"
}
```

Note: If a user has no subscription record, `subscription` will be `null` in the response.

### 7.2 GET /api/v1/admin/users/:id

| Field | Value |
|---|---|
| Auth | Required (JWT, role=admin) |
| Response 200 | Single UserDetail (same shape as list item) |
| Response 401 | `{"error": "unauthorized"}` |
| Response 403 | `{"error": "forbidden"}` |
| Response 404 | `{"error": "user not found"}` |

**Response 200 body:**
```json
{
  "data": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "premium",
    "subscription": {
      "id": "uuid-here",
      "plan": "premium",
      "expires_at": null,
      "created_at": "2026-03-20T10:00:00Z",
      "updated_at": "2026-03-25T14:00:00Z"
    },
    "created_at": "2026-03-20T10:00:00Z",
    "updated_at": "2026-03-25T14:00:00Z"
  },
  "message": "success"
}
```

### 7.3 PUT /api/v1/admin/users/:id

| Field | Value |
|---|---|
| Auth | Required (JWT, role=admin) |
| Request Body | `UpdateUserInput` (see below) |
| Response 200 | Updated UserDetail |
| Response 400 | `{"error": "..."}` (validation error) |
| Response 401 | `{"error": "unauthorized"}` |
| Response 403 | `{"error": "forbidden"}` |
| Response 404 | `{"error": "user not found"}` |

**Request body (all fields optional):**
```json
{
  "name": "New Name",
  "role": "premium"
}
```

Valid `role` values: `"free"`, `"premium"`, `"admin"`.

When `role` changes:
- `"premium"` or `"admin"` -> Subscription.Plan set to `"premium"`
- `"free"` -> Subscription.Plan set to `"free"`

**Response 200 body:** Same shape as GET /admin/users/:id.

### 7.4 DELETE /api/v1/admin/users/:id

| Field | Value |
|---|---|
| Auth | Required (JWT, role=admin) |
| Response 200 | `{"data": {"message": "user deleted"}, "message": "success"}` |
| Response 400 | `{"error": "admin cannot delete own account"}` |
| Response 401 | `{"error": "unauthorized"}` |
| Response 403 | `{"error": "forbidden"}` |
| Response 404 | `{"error": "user not found"}` |

This is a **soft delete** (sets `deleted_at`). The user row is not removed from the database.

### 7.5 GET /api/v1/admin/analytics

| Field | Value |
|---|---|
| Auth | Required (JWT, role=admin) |
| Response 200 | AnalyticsResponse (see below) |
| Response 401 | `{"error": "unauthorized"}` |
| Response 403 | `{"error": "forbidden"}` |

**Response 200 body:**
```json
{
  "data": {
    "total_users": 150,
    "free_users": 120,
    "premium_users": 25,
    "admin_users": 5,
    "dau": 42
  },
  "message": "success"
}
```

**DAU (Daily Active Users):** Count of distinct `user_id` values in `habit_logs` where `completed_at` falls within today (00:00:00 UTC to 23:59:59 UTC). This measures actual engagement -- users who actively completed at least one habit today.

---

## 8. Frontend: Files to Create or Modify

### 8.1 New Files

| File | Purpose |
|---|---|
| `frontend/src/types/admin.ts` | IUserDetail, ISubDetail, IAnalytics, IUpdateUserInput interfaces |
| `frontend/src/lib/hooks/useAdmin.ts` | Hook for admin API calls (listUsers, getUser, updateUser, deleteUser, getAnalytics) |
| `frontend/src/app/(app)/admin/layout.tsx` | Admin layout with sidebar navigation + role guard |
| `frontend/src/app/(app)/admin/users/page.tsx` | Users management table with search and pagination |
| `frontend/src/app/(app)/admin/users/[id]/page.tsx` | User detail view + edit subscription tier |
| `frontend/src/app/(app)/admin/analytics/page.tsx` | Platform analytics dashboard |
| `frontend/src/components/features/admin/AdminSidebar.tsx` | Admin navigation sidebar component |
| `frontend/src/components/features/admin/UserTable.tsx` | Reusable user data table |
| `frontend/src/components/features/admin/AnalyticsCards.tsx` | Stats cards for analytics page |

### 8.2 Modified Files

| File | Changes |
|---|---|
| `frontend/src/middleware.ts` | Add `/admin` to PROTECTED_PREFIXES |
| `frontend/src/app/(app)/layout.tsx` | Add admin nav link (conditionally shown when role === 'admin') |
| `frontend/src/types/api.ts` | No changes needed (IUser already has `role: 'free' \| 'premium' \| 'admin'`) |

---

## 9. Frontend: Type Definitions

### 9.1 `frontend/src/types/admin.ts`

```typescript
export interface ISubDetail {
  id: string
  plan: 'free' | 'premium'
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface IUserDetail {
  id: string
  email: string
  name: string
  role: 'free' | 'premium' | 'admin'
  subscription: ISubDetail | null
  created_at: string
  updated_at: string
}

export interface IAnalytics {
  total_users: number
  free_users: number
  premium_users: number
  admin_users: number
  dau: number
}

export interface IUpdateUserInput {
  name?: string
  role?: 'free' | 'premium' | 'admin'
}
```

---

## 10. Frontend: Hooks

### 10.1 `frontend/src/lib/hooks/useAdmin.ts`

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { IApiListResponse } from '@/types/api'
import type { IUserDetail, IAnalytics, IUpdateUserInput } from '@/types/admin'

export function useAdminUsers() {
  const [users, setUsers] = useState<IUserDetail[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })
    if (search) params.set('search', search)
    const res = await api.get<IUserDetail[]>(`/admin/users?${params}`)
    // Note: api.get returns IApiResponse<T> but list endpoint returns PaginatedResponse
    // Need to handle the paginated shape -- may need a dedicated api.list<T> or parse manually
    ...
    setLoading(false)
  }, [page, limit, search])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const updateUser = useCallback(async (id: string, input: IUpdateUserInput): Promise<IUserDetail | null> => {
    const res = await api.put<IUserDetail>(`/admin/users/${id}`, input)
    if (res.data) {
      setUsers(prev => prev.map(u => u.id === id ? res.data! : u))
    }
    return res.data ?? null
  }, [])

  const deleteUser = useCallback(async (id: string): Promise<boolean> => {
    const res = await api.delete<void>(`/admin/users/${id}`)
    if (!res.error) {
      setUsers(prev => prev.filter(u => u.id !== id))
      setTotal(prev => prev - 1)
      return true
    }
    return false
  }, [])

  return { users, total, page, setPage, search, setSearch, loading, error, refetch: fetchUsers, updateUser, deleteUser }
}

export function useAdminAnalytics() {
  const [analytics, setAnalytics] = useState<IAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await api.get<IAnalytics>('/admin/analytics')
    if (res.error) {
      setError(res.error)
    } else {
      setAnalytics(res.data ?? null)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  return { analytics, loading, error, refetch: fetchAnalytics }
}
```

**Implementation note:** The `api.get<T>` wrapper currently returns `IApiResponse<T>` which has `data?: T`. The paginated endpoint returns `PaginatedResponse` with `data: T[], total, page, limit`. The hook needs to handle this shape. Two options:
- Option A: Add an `api.list<T>` method that returns the paginated shape.
- Option B: Use a raw fetch in the hook for the paginated endpoint.

Recommend **Option A** -- add to `lib/api.ts`:
```typescript
list: <T>(path: string) => request<T[]>(path),
// But this loses total/page/limit metadata
```

Better: add a dedicated paginated request helper:
```typescript
async function paginatedRequest<T>(path: string): Promise<IApiListResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' } })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Request failed')
  return json as IApiListResponse<T>
}

export const api = {
  ...existing,
  paginated: <T>(path: string) => paginatedRequest<T>(path),
}
```

---

## 11. Frontend: Components

### 11.1 AdminSidebar (`frontend/src/components/features/admin/AdminSidebar.tsx`)

```typescript
'use client'

// Props: none (uses current pathname for active state)
// Implementation:
// - Vertical nav list with links: Users, Analytics
// - Styled to match existing sidebar (bg-gray-900, border-gray-800)
// - Active link highlighted with brand orange (#FF8243)
// - Icons for each link (Users icon, Chart icon)
// - "Back to App" link at bottom that goes to /dashboard
```

### 11.2 Admin Layout (`frontend/src/app/(app)/admin/layout.tsx`)

```typescript
'use client'

// Implementation:
// - Uses useAuth() to get current user
// - If user.role !== 'admin', redirect to /dashboard (or show forbidden message)
// - Renders AdminSidebar + children in a flex layout
// - Loading state while auth is checking
// - This is the SECOND layer of protection (first is backend RequireRole middleware)
```

### 11.3 UserTable (`frontend/src/components/features/admin/UserTable.tsx`)

```typescript
'use client'

import type { IUserDetail } from '@/types/admin'

interface UserTableProps {
  users: IUserDetail[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

// Implementation:
// - HTML table with columns: Name, Email, Role, Subscription Plan, Created, Actions
// - Role displayed as colored badge (green=premium, gray=free, red=admin)
// - Actions column: "View/Edit" link + "Delete" button
// - Delete button shows confirmation dialog before calling onDelete
// - Responsive: horizontal scroll on mobile
// - Empty state when no users
```

### 11.4 AnalyticsCards (`frontend/src/components/features/admin/AnalyticsCards.tsx`)

```typescript
'use client'

import type { IAnalytics } from '@/types/admin'

interface AnalyticsCardsProps {
  analytics: IAnalytics
}

// Implementation:
// - Grid of stat cards (2x2 or responsive)
// - Card 1: Total Users (total_users) with users icon
// - Card 2: Premium Users (premium_users) with crown icon
// - Card 3: Free Users (free_users) with user icon
// - Card 4: Daily Active Users (dau) with activity/chart icon
// - Each card: rounded-xl bg-gray-900 border border-gray-800 p-6
// - Numbers in large font, labels below in gray-400
// - Optional: Framer Motion count-up animation on mount
```

---

## 12. Frontend: Pages

### 12.1 Users List Page (`frontend/src/app/(app)/admin/users/page.tsx`)

```typescript
'use client'

// Implementation:
// - Uses useAdminUsers() hook
// - Search input at top (debounced, updates search param)
// - UserTable component for the data
// - Pagination controls at bottom (Previous / Next buttons, page indicator)
// - Loading skeleton while fetching
// - Error state with retry button
// - Click "View/Edit" navigates to /admin/users/[id]
// - Click "Delete" shows confirmation, then calls deleteUser
```

### 12.2 User Detail/Edit Page (`frontend/src/app/(app)/admin/users/[id]/page.tsx`)

```typescript
'use client'

// Implementation:
// - Fetches single user via api.get<IUserDetail>(`/admin/users/${id}`)
// - Displays user info: email, name, role, subscription details, created date
// - Editable fields:
//   - Name: text input
//   - Role: dropdown select (free / premium / admin)
// - "Save Changes" button calls updateUser API
// - Shows subscription details (plan, expires_at) as read-only info
//   (plan updates automatically when role changes)
// - "Back to Users" link
// - Success toast/message on save
// - Loading skeleton while fetching
```

### 12.3 Analytics Page (`frontend/src/app/(app)/admin/analytics/page.tsx`)

```typescript
'use client'

// Implementation:
// - Uses useAdminAnalytics() hook
// - AnalyticsCards component showing all stats
// - Title: "Platform Analytics"
// - Loading skeleton while fetching
// - Error state with retry button
// - Refresh button to re-fetch analytics
```

---

## 13. Frontend: Middleware and Layout Changes

### 13.1 middleware.ts Changes

Add `/admin` to `PROTECTED_PREFIXES`:

```typescript
const PROTECTED_PREFIXES = ["/dashboard", "/habits", "/coach", "/admin"];
```

This ensures unauthenticated users are redirected to `/login` when accessing `/admin/*`. The role check happens at the layout level (see 11.2).

**Why not decode JWT in middleware?** The token is httpOnly, so JavaScript cannot read it. The Next.js middleware CAN read httpOnly cookies, but decoding JWT in edge middleware requires the JWT secret (which should not be in the frontend). Instead, the role guard lives in the admin layout component which uses `useAuth()` (which calls `/auth/me`).

### 13.2 App Layout Changes (`frontend/src/app/(app)/layout.tsx`)

Add a conditional admin link to the sidebar navigation:

```typescript
// After existing nav links (Dashboard, Habits), add:
// If user?.role === 'admin', show:
// <a href="/admin/users">Admin Panel</a>
// with a shield/gear icon
```

This requires making the layout a client component (add `'use client'`) or passing user data from a server component. Since `useAuth()` is already available in child components, the simplest approach is to extract the nav into a client component that reads auth context.

---

## 14. Frontend <> Backend Contract Summary

| Frontend Hook/Call | API Call | Backend Handler | Response Type |
|---|---|---|---|
| `useAdminUsers().users` | `GET /api/v1/admin/users?page=&limit=&search=` | `admin.Handler.ListUsers` | `PaginatedResponse<UserDetail>` |
| `api.get('/admin/users/:id')` | `GET /api/v1/admin/users/:id` | `admin.Handler.GetUser` | `APIResponse<UserDetail>` |
| `useAdminUsers().updateUser(id, input)` | `PUT /api/v1/admin/users/:id` | `admin.Handler.UpdateUser` | `APIResponse<UserDetail>` |
| `useAdminUsers().deleteUser(id)` | `DELETE /api/v1/admin/users/:id` | `admin.Handler.DeleteUser` | `APIResponse<{message: string}>` |
| `useAdminAnalytics().analytics` | `GET /api/v1/admin/analytics` | `admin.Handler.Analytics` | `APIResponse<AnalyticsResponse>` |

---

## 15. Dependency Order (What Must Be Done Before What)

### Backend Track

```
B1. Add new repository methods to user/repository.go
    - FindAllPaginated, CountAll, CountByRole, Update, SoftDelete
    - FindSubscriptionByUserID, CreateSubscription, UpdateSubscription
    (no deps)

B2. Create admin/model.go (UpdateUserInput, UserDetail, SubDetail, AnalyticsResponse)
    (no deps)

B3. Create admin/service.go
    (after B1, B2 -- needs repo methods and model types)

B4. Create admin/handler.go
    (after B3 -- needs service)

B5. Update main.go: wire admin domain, register admin route group
    (after B4 -- needs handler)

B6. Seed admin user in Supabase
    (after B5 -- need running server to test)

B7. Test all admin endpoints with curl
    (after B5, B6)
```

### Frontend Track

```
F1. Create types/admin.ts (IUserDetail, ISubDetail, IAnalytics, IUpdateUserInput)
    (no deps)

F2. Update lib/api.ts: add paginated request helper
    (no deps)

F3. Create lib/hooks/useAdmin.ts
    (after F1, F2 -- needs types and api helper)

F4. Update middleware.ts: add "/admin" to PROTECTED_PREFIXES
    (no deps)

F5. Create components/features/admin/AdminSidebar.tsx
    (no deps -- pure UI)

F6. Create components/features/admin/UserTable.tsx
    (after F1 -- needs IUserDetail type)

F7. Create components/features/admin/AnalyticsCards.tsx
    (after F1 -- needs IAnalytics type)

F8. Create app/(app)/admin/layout.tsx (role guard + sidebar)
    (after F5 -- needs AdminSidebar)

F9. Create app/(app)/admin/users/page.tsx
    (after F3, F6, F8 -- needs hook, table, layout)

F10. Create app/(app)/admin/users/[id]/page.tsx
    (after F3, F8 -- needs hook, layout)

F11. Create app/(app)/admin/analytics/page.tsx
    (after F3, F7, F8 -- needs hook, cards, layout)

F12. Update app/(app)/layout.tsx: add admin nav link
    (no deps)

F13. Test full admin panel with real API data
    (after B7, F9, F10, F11 -- needs backend running)
```

Backend (B1-B7) and Frontend (F1-F12) tracks can proceed in parallel.
F13 requires both tracks complete.

---

## 16. Testing Checklist (Phase 5 Complete When All Pass)

### Backend -- curl/Postman Tests

**Auth/RBAC:**
- [ ] `GET /api/v1/admin/users` without auth returns 401
- [ ] `GET /api/v1/admin/users` with free user token returns 403
- [ ] `GET /api/v1/admin/users` with premium user token returns 403
- [ ] `GET /api/v1/admin/users` with admin user token returns 200

**List Users:**
- [ ] `GET /api/v1/admin/users` returns paginated list with correct structure
- [ ] `GET /api/v1/admin/users?page=1&limit=5` respects pagination params
- [ ] `GET /api/v1/admin/users?search=test@` filters by email substring
- [ ] `GET /api/v1/admin/users?search=John` filters by name substring
- [ ] Response includes subscription data for each user (or null if none)
- [ ] Total count matches actual user count in database

**Get User:**
- [ ] `GET /api/v1/admin/users/:id` returns single user with subscription detail
- [ ] `GET /api/v1/admin/users/:nonexistent-id` returns 404

**Update User:**
- [ ] `PUT /api/v1/admin/users/:id` with `{"role": "premium"}` updates user role to premium
- [ ] After role update to premium, user's Subscription.Plan is also set to "premium"
- [ ] `PUT /api/v1/admin/users/:id` with `{"role": "free"}` downgrades user
- [ ] After role update to free, user's Subscription.Plan is also set to "free"
- [ ] `PUT /api/v1/admin/users/:id` with `{"name": "New Name"}` updates only name
- [ ] `PUT /api/v1/admin/users/:id` with `{"role": "invalid"}` returns 400
- [ ] Updated user can login and has correct new role in JWT

**Delete User:**
- [ ] `DELETE /api/v1/admin/users/:id` soft-deletes user (sets deleted_at)
- [ ] After delete, user no longer appears in GET /admin/users list
- [ ] After delete, user cannot login (findByEmail skips soft-deleted records)
- [ ] Admin cannot delete themselves: `DELETE /api/v1/admin/users/:own-id` returns 400

**Analytics:**
- [ ] `GET /api/v1/admin/analytics` returns correct total_users count
- [ ] `GET /api/v1/admin/analytics` returns correct free_users count
- [ ] `GET /api/v1/admin/analytics` returns correct premium_users count
- [ ] `GET /api/v1/admin/analytics` returns correct admin_users count
- [ ] `GET /api/v1/admin/analytics` returns correct DAU (matches distinct users with logs today)
- [ ] DAU = 0 when no habit logs exist for today

**Existing endpoints:**
- [ ] All existing endpoints (auth, habits, dashboard) still work unchanged

### Frontend Tests

- [ ] `/admin/users` redirects to `/login` when not authenticated
- [ ] `/admin/users` shows "forbidden" or redirects to `/dashboard` when logged in as free user
- [ ] `/admin/users` loads correctly when logged in as admin
- [ ] Users table displays list of all users with correct columns
- [ ] Search input filters users (debounced)
- [ ] Pagination works: next/previous buttons, page indicator
- [ ] Click "View/Edit" navigates to `/admin/users/[id]`
- [ ] User detail page shows user info and subscription
- [ ] Role dropdown change + save updates user via API
- [ ] Success feedback shown after save
- [ ] Delete button shows confirmation dialog
- [ ] After confirming delete, user removed from table
- [ ] Analytics page shows all 4 stat cards with correct numbers
- [ ] Admin nav link visible in main sidebar only for admin users
- [ ] Admin nav link NOT visible for free/premium users
- [ ] Admin sidebar shows Users and Analytics links with active state
- [ ] `npm run build` completes with zero errors
- [ ] `npm run lint` passes

### Integration

- [ ] Full flow: Login as admin -> Users list -> Edit a user's role to premium -> Verify user can now access premium features
- [ ] Full flow: Login as admin -> Delete a user -> Verify user can no longer login
- [ ] Analytics numbers match actual database state
- [ ] Non-admin users see no admin UI elements and get 403 from admin APIs

---

## 17. Acceptance Criteria

1. **Admin routes fully protected.** Backend: `RequireRole("admin")` middleware on all `/admin/*` routes. Frontend: role check in admin layout + middleware auth check.
2. **User management works end-to-end.** Admin can list, search, view, edit role, and soft-delete users.
3. **Subscription tier stays in sync with role.** When admin changes a user's role, both `User.Role` and `Subscription.Plan` are updated atomically.
4. **DAU is correctly calculated.** COUNT(DISTINCT user_id) from habit_logs for today. Not based on login count or session data.
5. **Soft delete only.** DELETE endpoint sets `deleted_at`, never removes the row. Soft-deleted users excluded from all queries.
6. **Admin cannot delete themselves.** Explicit guard in service layer.
7. **No new database tables or migrations.** All data from existing tables.
8. **Response format consistent.** All endpoints use `pkg/response` helpers (Success, Paginated, Error, etc.).
9. **Dual-layer frontend protection.** middleware.ts requires auth token for `/admin/*`. Admin layout component checks `role === 'admin'` via useAuth().
10. **Admin sidebar navigation.** Dedicated admin sidebar with Users and Analytics links. Conditional admin link in main app sidebar.

---

## 18. Decisions and Trade-offs

| Decision | Rationale |
|---|---|
| Admin as separate domain package (`internal/domain/admin/`) | Follows established pattern. Admin logic is distinct from user auth logic. Prevents bloating the user package. |
| Pass raw `*gorm.DB` to admin service for DAU query | DAU requires a raw query across habit_logs. The admin service doesn't own the habit_logs table, so using raw DB for this cross-cutting analytics query is acceptable. Alternative: add a method to habit.Repository, but DAU is admin-specific. |
| Role guard in frontend layout, not middleware.ts | httpOnly cookies cannot be decoded in client-side JS. Next.js edge middleware CAN read cookies but would need the JWT secret (security risk for frontend). Layout-level guard via useAuth() is simpler and secure (backend is the real gate). |
| Update both User.Role and Subscription.Plan on role change | The actual codebase has both fields. They must stay in sync. Service layer handles this atomically. |
| No hard delete ever | Per RULES.md and DATABASE.md. Admin delete = soft delete. Consistent with the rest of the system. |
| Paginated list endpoint for users | At scale, loading all users is expensive. response.Paginated helper already exists. Default 20 per page. |
| Search by email OR name (ILIKE) | Simple but effective for admin use case. No full-text search needed at this scale. |
| DAU from habit_logs, not login/session data | The app does not track login events or sessions. habit_logs is the best available proxy for "active user" -- it means the user actually did something meaningful. |
