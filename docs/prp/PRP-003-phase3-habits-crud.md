# PRP-003 -- Phase 3: Habits CRUD

**Phase Goal:** Users can create, view, edit, delete habits and log daily completions; free tier limit (max 3 habits) is enforced server-side.

**Status:** Planning
**Date:** 2026-03-24
**Depends on:** Phase 2 (complete -- auth endpoints, JWT middleware, User/Subscription models all working)

---

## 0. Observations and Conflicts

1. **Backend uses domain-based package layout, not flat handler/service/repository.** The actual codebase organizes code under `internal/domain/user/` (handler.go, service.go, repository.go, model.go all in one package). ARCHITECTURE.md shows a flat layout (`internal/handler/`, `internal/service/`, etc.). This PRP follows the **existing domain-based pattern** (`internal/domain/habit/`) for consistency with what was built in Phase 2. Future context docs should be updated to reflect this.

2. **User model diverges from DATABASE.md.** The implemented `User` model uses `Name` (not `DisplayName`), has a `Role` typed enum (not separate `Role` + `SubscriptionTier` fields), and lacks `AvatarURL`. The subscription tier is tracked via the `Subscription` table's `Plan` field. The PRP works with the **actual implemented model**, not the DATABASE.md spec.

3. **Frontend `IHabit` type in `types/api.ts` diverges from DATABASE.md.** The existing frontend type uses `title` (not `name`), `target_days: number[]` (not in DB schema), and `streak: number` (computed, not stored). This PRP will create a corrected `types/habit.ts` that matches the backend Habit model, and update `types/api.ts` to remove the stale `IHabit`/`IHabitLog`.

4. **Middleware `PROTECTED_PREFIXES` needs `/habits` added.** The frontend `middleware.ts` protects `/dashboard`, `/habits`, `/coach` already -- `/habits` is covered.

5. **RBAC middleware does not exist yet.** Phase 3 checklist in PHASES.md calls for `middleware/rbac.go` with `RequirePremium()` and `RequireRole()`. These are needed for premium-gated features in later phases but should be created now since the habit service needs to check the user's subscription tier for the free limit.

6. **Free tier check requires user lookup.** The habit service must query the user's role/subscription to enforce the 3-habit limit. The existing `user.Repository` has `FindByID`, which is sufficient. The habit service will import and use the user repository.

7. **Password minimum length mismatch.** Phase 2 PRP says min 6 chars, but `service.go` uses `min=8`. Not a Phase 3 concern, but noting for the record.

---

## 1. Backend: Database Changes

### 1.1 New Tables (via GORM AutoMigrate)

#### `habits` table

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` |
| `user_id` | `uuid` | NOT NULL, INDEX, FK -> users.id | -- |
| `name` | `varchar` | NOT NULL | -- |
| `category` | `varchar` | -- | `""` |
| `frequency` | `varchar` | -- | `"daily"` |
| `target_time` | `varchar` | -- | `"anytime"` |
| `description` | `text` | -- | `""` |
| `is_active` | `bool` | -- | `true` |
| `points` | `int` | -- | `10` |
| `created_at` | `timestamp` | -- | auto |
| `updated_at` | `timestamp` | -- | auto |
| `deleted_at` | `timestamp` | INDEX (soft delete) | NULL |

#### `habit_logs` table

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` |
| `habit_id` | `uuid` | NOT NULL, INDEX, FK -> habits.id | -- |
| `user_id` | `uuid` | NOT NULL, INDEX | -- |
| `completed_at` | `timestamp` | NOT NULL | -- |
| `notes` | `text` | -- | `""` |
| `created_at` | `timestamp` | -- | auto |

### 1.2 AutoMigrate Update

In `main.go`, add the new models to the AutoMigrate call:

```
database.AutoMigrate(db, &user.User{}, &user.Subscription{}, &habit.Habit{}, &habit.HabitLog{})
```

---

## 2. Backend: Files to Create or Modify

### 2.1 New Files

| File | Package | Purpose |
|---|---|---|
| `backend/internal/domain/habit/model.go` | `habit` | Habit + HabitLog GORM models |
| `backend/internal/domain/habit/repository.go` | `habit` | DB queries for habits and logs |
| `backend/internal/domain/habit/service.go` | `habit` | Business logic, free tier limit, logging |
| `backend/internal/domain/habit/handler.go` | `habit` | HTTP handlers for all habit endpoints |
| `backend/internal/middleware/rbac.go` | `middleware` | RequirePremium(), RequireRole() middleware |

### 2.2 Modified Files

| File | Changes |
|---|---|
| `backend/cmd/server/main.go` | Wire habit domain, register habit routes, add AutoMigrate models, add RBAC middleware to route groups |

---

## 3. Backend Implementation Spec

### 3.1 Habit Model (`backend/internal/domain/habit/model.go`)

```go
package habit

import (
    "time"

    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Habit struct {
    ID          uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    UserID      uuid.UUID      `gorm:"type:uuid;not null;index"                       json:"user_id"`
    Name        string         `gorm:"not null"                                       json:"name"`
    Category    string         `gorm:"default:''"                                     json:"category"`
    Frequency   string         `gorm:"default:'daily'"                                json:"frequency"`
    TargetTime  string         `gorm:"default:'anytime'"                              json:"target_time"`
    Description string         `json:"description"`
    IsActive    bool           `gorm:"default:true"                                   json:"is_active"`
    Points      int            `gorm:"default:10"                                     json:"points"`
    CreatedAt   time.Time      `json:"created_at"`
    UpdatedAt   time.Time      `json:"updated_at"`
    DeletedAt   gorm.DeletedAt `gorm:"index"                                          json:"-"`
}

type HabitLog struct {
    ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    HabitID     uuid.UUID `gorm:"type:uuid;not null;index"                       json:"habit_id"`
    UserID      uuid.UUID `gorm:"type:uuid;not null;index"                       json:"user_id"`
    CompletedAt time.Time `gorm:"not null"                                       json:"completed_at"`
    Notes       string    `json:"notes"`
    CreatedAt   time.Time `json:"created_at"`
}
```

**Validation constants:**

```go
var VALID_CATEGORIES = []string{"health", "learning", "productivity", "mindfulness", ""}
var VALID_FREQUENCIES = []string{"daily", "weekdays", "custom"}
var VALID_TARGET_TIMES = []string{"morning", "afternoon", "evening", "anytime"}
```

**Request/Response types (in same file or separate dto section):**

```go
type CreateInput struct {
    Name        string `json:"name"        binding:"required,min=1,max=100"`
    Category    string `json:"category"    binding:"omitempty,oneof=health learning productivity mindfulness"`
    Frequency   string `json:"frequency"   binding:"omitempty,oneof=daily weekdays custom"`
    TargetTime  string `json:"target_time" binding:"omitempty,oneof=morning afternoon evening anytime"`
    Description string `json:"description" binding:"max=500"`
}

type UpdateInput struct {
    Name        *string `json:"name"        binding:"omitempty,min=1,max=100"`
    Category    *string `json:"category"    binding:"omitempty,oneof=health learning productivity mindfulness"`
    Frequency   *string `json:"frequency"   binding:"omitempty,oneof=daily weekdays custom"`
    TargetTime  *string `json:"target_time" binding:"omitempty,oneof=morning afternoon evening anytime"`
    Description *string `json:"description" binding:"omitempty,max=500"`
    IsActive    *bool   `json:"is_active"`
}

type LogInput struct {
    Notes string `json:"notes" binding:"max=500"`
}

type HabitWithStreak struct {
    Habit
    CurrentStreak int  `json:"current_streak"`
    CompletedToday bool `json:"completed_today"`
}
```

### 3.2 Habit Repository (`backend/internal/domain/habit/repository.go`)

```go
package habit

type Repository struct {
    db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository

func (r *Repository) Create(h *Habit) error
// db.Create(h)

func (r *Repository) FindByID(id uuid.UUID) (*Habit, error)
// db.First(&h, "id = ?", id) -- GORM soft delete auto-filters

func (r *Repository) FindByUserID(userID uuid.UUID) ([]Habit, error)
// db.Where("user_id = ? AND is_active = ?", userID, true).
//   Order("created_at DESC").Find(&habits)

func (r *Repository) CountActiveByUserID(userID uuid.UUID) (int64, error)
// db.Model(&Habit{}).Where("user_id = ? AND is_active = ?", userID, true).Count(&count)

func (r *Repository) Update(h *Habit) error
// db.Save(h)

func (r *Repository) Delete(id uuid.UUID) error
// db.Delete(&Habit{}, "id = ?", id) -- soft delete via GORM

func (r *Repository) CreateLog(log *HabitLog) error
// db.Create(log)

func (r *Repository) FindLogsByHabitID(habitID uuid.UUID, since time.Time) ([]HabitLog, error)
// db.Where("habit_id = ? AND completed_at >= ?", habitID, since).
//   Order("completed_at DESC").Find(&logs)

func (r *Repository) FindLogByHabitAndDate(habitID uuid.UUID, date time.Time) (*HabitLog, error)
// Checks if a log exists for the given habit on the given date (truncated to day).
// db.Where("habit_id = ? AND completed_at >= ? AND completed_at < ?",
//   habitID, startOfDay, startOfNextDay).First(&log)

func (r *Repository) FindTodayLogsByUserID(userID uuid.UUID) ([]HabitLog, error)
// Returns all logs for today for the user.
// today := time.Now().Truncate(24 * time.Hour)
// tomorrow := today.Add(24 * time.Hour)
// db.Where("user_id = ? AND completed_at >= ? AND completed_at < ?",
//   userID, today, tomorrow).Find(&logs)

func (r *Repository) FindLogsByHabitIDAll(habitID uuid.UUID) ([]HabitLog, error)
// All logs for a habit, ordered by completed_at DESC. Used for streak calculation.
```

### 3.3 Habit Service (`backend/internal/domain/habit/service.go`)

```go
package habit

const MAX_FREE_HABITS = 3

var (
    ErrFreeTierLimit   = errors.New("free tier limited to 3 habits")
    ErrHabitNotFound   = errors.New("habit not found")
    ErrNotOwner        = errors.New("you do not own this habit")
    ErrAlreadyLogged   = errors.New("habit already logged today")
)

type Service struct {
    repo     *Repository
    userRepo *user.Repository  // needed for free tier check
}

func NewService(repo *Repository, userRepo *user.Repository) *Service
```

**Methods:**

```go
func (s *Service) Create(userID uuid.UUID, input CreateInput) (*Habit, error)
// 1. Get user by ID to check role/subscription
// 2. If user.Role == "free":
//      count := repo.CountActiveByUserID(userID)
//      if count >= MAX_FREE_HABITS -> return ErrFreeTierLimit
// 3. Build Habit struct with uuid.New(), set defaults
// 4. repo.Create(&habit)
// 5. Return habit

func (s *Service) List(userID uuid.UUID) ([]HabitWithStreak, error)
// 1. repo.FindByUserID(userID) -> []Habit
// 2. repo.FindTodayLogsByUserID(userID) -> build set of habitIDs logged today
// 3. For each habit, calculate current streak (see streak logic below)
// 4. Return []HabitWithStreak

func (s *Service) GetByID(userID, habitID uuid.UUID) (*HabitWithStreak, error)
// 1. repo.FindByID(habitID)
// 2. Check habit.UserID == userID (return ErrNotOwner if not)
// 3. Calculate streak + completedToday
// 4. Return HabitWithStreak

func (s *Service) Update(userID, habitID uuid.UUID, input UpdateInput) (*Habit, error)
// 1. repo.FindByID(habitID)
// 2. Check ownership
// 3. Apply non-nil fields from UpdateInput to habit
// 4. repo.Update(habit)
// 5. Return updated habit

func (s *Service) Delete(userID, habitID uuid.UUID) error
// 1. repo.FindByID(habitID)
// 2. Check ownership
// 3. repo.Delete(habitID) -- soft delete

func (s *Service) LogCompletion(userID, habitID uuid.UUID, input LogInput) (*HabitLog, error)
// 1. repo.FindByID(habitID)
// 2. Check ownership
// 3. Check not already logged today: repo.FindLogByHabitAndDate(habitID, today)
//    If found -> return ErrAlreadyLogged
// 4. Create HabitLog with CompletedAt = time.Now()
// 5. repo.CreateLog(&log)
// 6. Return log

func (s *Service) calculateStreak(habitID uuid.UUID) int
// 1. repo.FindLogsByHabitIDAll(habitID) -> sorted DESC by completed_at
// 2. Walk backwards from today:
//    - If today has a log, count = 1, check yesterday, etc.
//    - If today has no log, check yesterday as the start
//    - Each consecutive day with a log increments streak
//    - First gap breaks the streak
// 3. Return count
```

### 3.4 Habit Handler (`backend/internal/domain/habit/handler.go`)

```go
package habit

type Handler struct {
    svc *Service
}

func NewHandler(svc *Service) *Handler

func (h *Handler) Create(c *gin.Context)
func (h *Handler) List(c *gin.Context)
func (h *Handler) GetByID(c *gin.Context)
func (h *Handler) Update(c *gin.Context)
func (h *Handler) Delete(c *gin.Context)
func (h *Handler) LogCompletion(c *gin.Context)
```

**Handler details:**

```go
func (h *Handler) Create(c *gin.Context)
// 1. Bind JSON to CreateInput (return 400 on error)
// 2. Extract userID from context via middleware.GetUserID(c)
// 3. Call svc.Create(userID, input)
// 4. Map errors: ErrFreeTierLimit -> 403, else 500
// 5. Return 201 with habit via response.Created()

func (h *Handler) List(c *gin.Context)
// 1. Extract userID
// 2. Call svc.List(userID)
// 3. Return 200 with []HabitWithStreak via response.Success()

func (h *Handler) GetByID(c *gin.Context)
// 1. Parse habit ID from URL param c.Param("id")
// 2. Extract userID
// 3. Call svc.GetByID(userID, habitID)
// 4. Map errors: ErrHabitNotFound -> 404, ErrNotOwner -> 403, else 500
// 5. Return 200

func (h *Handler) Update(c *gin.Context)
// 1. Parse habit ID from URL param
// 2. Bind JSON to UpdateInput
// 3. Extract userID
// 4. Call svc.Update(userID, habitID, input)
// 5. Map errors accordingly
// 6. Return 200

func (h *Handler) Delete(c *gin.Context)
// 1. Parse habit ID
// 2. Extract userID
// 3. Call svc.Delete(userID, habitID)
// 4. Return 200 with {"message": "habit deleted"}

func (h *Handler) LogCompletion(c *gin.Context)
// 1. Parse habit ID
// 2. Bind JSON to LogInput (optional body)
// 3. Extract userID
// 4. Call svc.LogCompletion(userID, habitID, input)
// 5. Map errors: ErrAlreadyLogged -> 409, ErrHabitNotFound -> 404, ErrNotOwner -> 403
// 6. Return 201 with log
```

### 3.5 RBAC Middleware (`backend/internal/middleware/rbac.go`)

```go
package middleware

func RequirePremium() gin.HandlerFunc
// 1. Get role from context via GetUserRole(c)
// 2. If role == "premium" || role == "admin" -> c.Next()
// 3. Else -> response.Error(c, 403, "premium subscription required"), c.Abort()

func RequireRole(role string) gin.HandlerFunc
// 1. Get role from context via GetUserRole(c)
// 2. If userRole == role -> c.Next()
// 3. Else -> response.Forbidden(c), c.Abort()
```

Note: In the current model, `Role` serves double-duty as both role and subscription tier (values: "free", "premium", "admin"). The RBAC middleware checks the `role` field from the JWT claims which maps to `user.Role`.

### 3.6 main.go Route Registration Changes

Add to the existing `v1` route group:

```go
// Wire habit domain
habitRepo := habit.NewRepository(db)
habitSvc := habit.NewService(habitRepo, userRepo)
habitHandler := habit.NewHandler(habitSvc)

// Habit routes (all require auth)
habits := v1.Group("/habits").Use(middleware.Auth(cfg))
{
    habits.GET("", habitHandler.List)
    habits.POST("", habitHandler.Create)
    habits.GET("/:id", habitHandler.GetByID)
    habits.PUT("/:id", habitHandler.Update)
    habits.DELETE("/:id", habitHandler.Delete)
    habits.POST("/:id/log", habitHandler.LogCompletion)
}
```

AutoMigrate update:

```go
database.AutoMigrate(db, &user.User{}, &user.Subscription{}, &habit.Habit{}, &habit.HabitLog{})
```

---

## 4. API Contracts

### 4.1 GET /api/v1/habits

| Field | Value |
|---|---|
| Auth | Required (JWT) |
| Request Body | None |
| Response 200 | `{"data": [{"id":"uuid","user_id":"uuid","name":"Morning run","category":"health","frequency":"daily","target_time":"morning","description":"","is_active":true,"points":10,"current_streak":5,"completed_today":true,"created_at":"...","updated_at":"..."}], "message": "success"}` |
| Response 401 | `{"error": "unauthorized"}` |

### 4.2 POST /api/v1/habits

| Field | Value |
|---|---|
| Auth | Required (JWT) |
| Request Body | `{"name": "Morning run", "category": "health", "frequency": "daily", "target_time": "morning", "description": "Run 5km"}` |
| Response 201 | `{"data": {habit object}, "message": "success"}` |
| Response 400 | `{"error": "validation error details"}` |
| Response 403 | `{"error": "free tier limited to 3 habits"}` |

### 4.3 GET /api/v1/habits/:id

| Field | Value |
|---|---|
| Auth | Required (JWT) |
| Response 200 | `{"data": {habit object with streak}, "message": "success"}` |
| Response 403 | `{"error": "you do not own this habit"}` |
| Response 404 | `{"error": "habit not found"}` |

### 4.4 PUT /api/v1/habits/:id

| Field | Value |
|---|---|
| Auth | Required (JWT) |
| Request Body | `{"name": "Evening run", "category": "health"}` (partial update -- only non-null fields applied) |
| Response 200 | `{"data": {updated habit}, "message": "success"}` |
| Response 400 | `{"error": "validation error"}` |
| Response 403 | `{"error": "you do not own this habit"}` |
| Response 404 | `{"error": "habit not found"}` |

### 4.5 DELETE /api/v1/habits/:id

| Field | Value |
|---|---|
| Auth | Required (JWT) |
| Response 200 | `{"data": {"message": "habit deleted"}, "message": "success"}` |
| Response 403 | `{"error": "you do not own this habit"}` |
| Response 404 | `{"error": "habit not found"}` |

### 4.6 POST /api/v1/habits/:id/log

| Field | Value |
|---|---|
| Auth | Required (JWT) |
| Request Body | `{"notes": "Felt great today!"}` (optional) |
| Response 201 | `{"data": {"id":"uuid","habit_id":"uuid","user_id":"uuid","completed_at":"...","notes":"...","created_at":"..."}, "message": "success"}` |
| Response 409 | `{"error": "habit already logged today"}` |
| Response 403 | `{"error": "you do not own this habit"}` |
| Response 404 | `{"error": "habit not found"}` |

---

## 5. Frontend: Files to Create or Modify

### 5.1 New Files

| File | Purpose |
|---|---|
| `frontend/src/types/habit.ts` | IHabit, IHabitLog, IHabitWithStreak, ICreateHabitInput, IUpdateHabitInput interfaces |
| `frontend/src/lib/hooks/useHabits.ts` | Custom hook for habit CRUD + log completion |
| `frontend/src/components/ui/HabitCard.tsx` | Reusable habit card with completion checkbox |
| `frontend/src/components/ui/StreakBadge.tsx` | Streak counter display component |
| `frontend/src/components/features/habits/HabitCreateForm.tsx` | Modal/form for creating a new habit |
| `frontend/src/components/features/habits/HabitEditForm.tsx` | Form for editing an existing habit |
| `frontend/src/app/(app)/habits/page.tsx` | Habits list page |
| `frontend/src/app/(app)/habits/[id]/page.tsx` | Single habit detail/edit page |

### 5.2 Modified Files

| File | Changes |
|---|---|
| `frontend/src/types/api.ts` | Remove stale `IHabit` and `IHabitLog` interfaces (moved to `types/habit.ts`) |
| `frontend/src/app/(app)/layout.tsx` | Add "Habits" link to sidebar nav |
| `frontend/src/app/(app)/dashboard/page.tsx` | Replace placeholder habit list with real data via `useHabits` hook |

---

## 6. Frontend Implementation Spec

### 6.1 Type Definitions (`frontend/src/types/habit.ts`)

```typescript
export interface IHabit {
  id: string
  user_id: string
  name: string
  category: string
  frequency: 'daily' | 'weekdays' | 'custom'
  target_time: 'morning' | 'afternoon' | 'evening' | 'anytime'
  description: string
  is_active: boolean
  points: number
  created_at: string
  updated_at: string
}

export interface IHabitLog {
  id: string
  habit_id: string
  user_id: string
  completed_at: string
  notes: string
  created_at: string
}

export interface IHabitWithStreak extends IHabit {
  current_streak: number
  completed_today: boolean
}

export interface ICreateHabitInput {
  name: string
  category?: string
  frequency?: string
  target_time?: string
  description?: string
}

export interface IUpdateHabitInput {
  name?: string
  category?: string
  frequency?: string
  target_time?: string
  description?: string
  is_active?: boolean
}
```

### 6.2 Habits Hook (`frontend/src/lib/hooks/useHabits.ts`)

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { IHabitWithStreak, IHabitLog, ICreateHabitInput, IUpdateHabitInput } from '@/types/habit'

export function useHabits() {
  // State: habits[], loading, error
  // On mount: fetch all habits

  function fetchHabits(): Promise<void>
  // api.get<IHabitWithStreak[]>('/habits')

  function createHabit(input: ICreateHabitInput): Promise<{ error?: string }>
  // api.post<IHabitWithStreak>('/habits', input)
  // On success, refetch habits list
  // Return error string if 403 (free tier limit) or other error

  function updateHabit(id: string, input: IUpdateHabitInput): Promise<{ error?: string }>
  // api.put<IHabitWithStreak>(`/habits/${id}`, input)
  // On success, refetch habits list

  function deleteHabit(id: string): Promise<{ error?: string }>
  // api.delete(`/habits/${id}`)
  // On success, refetch habits list

  function logCompletion(habitId: string, notes?: string): Promise<{ error?: string }>
  // api.post<IHabitLog>(`/habits/${habitId}/log`, { notes: notes ?? '' })
  // On success, refetch habits list (to update completed_today + streak)

  return { habits, loading, error, createHabit, updateHabit, deleteHabit, logCompletion, refetch: fetchHabits }
}
```

### 6.3 HabitCard Component (`frontend/src/components/ui/HabitCard.tsx`)

```typescript
'use client'

interface HabitCardProps {
  habit: IHabitWithStreak
  onToggleComplete: (habitId: string) => void
  onEdit: (habitId: string) => void
  onDelete: (habitId: string) => void
}

// Renders:
// - Completion checkbox (circular, filled when completed_today)
// - Habit name + category badge
// - Streak badge (StreakBadge component)
// - Frequency label
// - Edit/Delete action buttons
// - Framer Motion: satisfying checkmark animation on completion toggle
//   (scale bounce + color fill from border-only to filled circle)
```

### 6.4 StreakBadge Component (`frontend/src/components/ui/StreakBadge.tsx`)

```typescript
interface StreakBadgeProps {
  streak: number
}

// Renders:
// - Flame icon + streak count
// - Different colors based on streak length (e.g., gray < 3, orange 3-7, red 7+)
// - Small component, used inside HabitCard
```

### 6.5 HabitCreateForm Component (`frontend/src/components/features/habits/HabitCreateForm.tsx`)

```typescript
'use client'

interface HabitCreateFormProps {
  onSuccess: () => void
  onCancel: () => void
}

// Form fields:
// - name (required, text input)
// - category (select: health, learning, productivity, mindfulness)
// - frequency (select: daily, weekdays, custom)
// - target_time (select: morning, afternoon, evening, anytime)
// - description (textarea, optional)
//
// On submit: calls useHabits().createHabit()
// If error is "free tier limited to 3 habits" -> show upgrade prompt
// Loading state on submit button
```

### 6.6 HabitEditForm Component (`frontend/src/components/features/habits/HabitEditForm.tsx`)

```typescript
'use client'

interface HabitEditFormProps {
  habit: IHabitWithStreak
  onSuccess: () => void
  onCancel: () => void
}

// Pre-fills all fields from existing habit
// On submit: calls useHabits().updateHabit()
// Loading state on submit button
```

### 6.7 Habits List Page (`frontend/src/app/(app)/habits/page.tsx`)

```typescript
'use client'

// 1. Uses useHabits() hook to get habits list
// 2. Shows loading spinner while fetching
// 3. Shows empty state if no habits ("No habits yet -- create your first one!")
// 4. Renders HabitCard for each habit
// 5. "Add Habit" button -> opens HabitCreateForm (modal or inline)
// 6. When free user hits 3 habits, show upgrade prompt instead of add button
```

### 6.8 Habit Detail/Edit Page (`frontend/src/app/(app)/habits/[id]/page.tsx`)

```typescript
'use client'

// 1. Extract habit ID from URL params
// 2. Fetch single habit via api.get<IHabitWithStreak>(`/habits/${id}`)
// 3. Show HabitEditForm with pre-filled data
// 4. On success, redirect back to /habits
// 5. Delete button with confirmation
```

### 6.9 Layout Update (`frontend/src/app/(app)/layout.tsx`)

Add to sidebar nav:
```typescript
<a href="/habits" className="...">Habits</a>
```

### 6.10 Dashboard Update (`frontend/src/app/(app)/dashboard/page.tsx`)

Replace the hardcoded habit list with:
```typescript
// Use useHabits() to fetch real data
// Show top 3-5 habits with completion status
// "View all habits" link to /habits
// Keep the placeholder calendar grid for now (Phase 4 fills it in)
```

---

## 7. Frontend <-> Backend Contract Summary

| Frontend Action | API Call | Expected Response |
|---|---|---|
| Load habits list | `GET /habits` | `IApiResponse<IHabitWithStreak[]>` |
| Create new habit | `POST /habits` | `IApiResponse<IHabit>` (201) or `{error: "free tier limited to 3 habits"}` (403) |
| Update habit | `PUT /habits/:id` | `IApiResponse<IHabit>` |
| Delete habit | `DELETE /habits/:id` | `IApiResponse<{message: string}>` |
| Log completion | `POST /habits/:id/log` | `IApiResponse<IHabitLog>` (201) or `{error: "habit already logged today"}` (409) |
| View single habit | `GET /habits/:id` | `IApiResponse<IHabitWithStreak>` |

---

## 8. Dependency Order

### Backend Track

```
B1. Create internal/domain/habit/model.go
    (no deps -- just struct definitions)

B2. Create internal/domain/habit/repository.go
    (after B1 -- needs Habit and HabitLog models)

B3. Create internal/middleware/rbac.go
    (no deps -- uses existing middleware helpers)

B4. Create internal/domain/habit/service.go
    (after B2 -- needs Repository; imports user.Repository for free tier check)

B5. Create internal/domain/habit/handler.go
    (after B4 -- needs Service)

B6. Update cmd/server/main.go: wire habit domain, add routes, update AutoMigrate
    (after B2, B3, B4, B5 -- needs all pieces)

B7. Test all habit endpoints with curl
    (after B6)
```

### Frontend Track

```
F1. Create types/habit.ts
    (no deps)

F2. Remove stale IHabit/IHabitLog from types/api.ts
    (no deps, but coordinate with F1)

F3. Create lib/hooks/useHabits.ts
    (after F1 -- needs habit types)

F4. Create components/ui/StreakBadge.tsx
    (no deps)

F5. Create components/ui/HabitCard.tsx
    (after F1, F4 -- needs types and StreakBadge)

F6. Create components/features/habits/HabitCreateForm.tsx
    (after F3 -- needs useHabits hook)

F7. Create components/features/habits/HabitEditForm.tsx
    (after F3 -- needs useHabits hook)

F8. Create app/(app)/habits/page.tsx
    (after F3, F5, F6 -- needs hook, card, form)

F9. Create app/(app)/habits/[id]/page.tsx
    (after F3, F7 -- needs hook and edit form)

F10. Update app/(app)/layout.tsx: add Habits nav link
     (no deps)

F11. Update app/(app)/dashboard/page.tsx: use real habit data
     (after F3 -- needs useHabits hook)

F12. End-to-end test of full habit flow
     (after B7, F8, F9, F11 -- needs both tracks)
```

Backend (B1-B7) and Frontend (F1-F11) tracks can proceed in parallel.
F12 requires both tracks complete.

---

## 9. Acceptance Criteria (Phase 3 Complete When All Pass)

### Backend -- curl/Postman Tests

- [ ] `POST /api/v1/habits` with valid JWT and body creates a habit, returns 201
- [ ] `POST /api/v1/habits` without JWT returns 401
- [ ] `POST /api/v1/habits` with invalid/missing name returns 400
- [ ] `POST /api/v1/habits` with invalid category returns 400
- [ ] `POST /api/v1/habits` when free user already has 3 active habits returns 403 with "free tier limited to 3 habits"
- [ ] `POST /api/v1/habits` when premium/admin user has 3+ habits succeeds (no limit)
- [ ] `GET /api/v1/habits` returns only the authenticated user's habits
- [ ] `GET /api/v1/habits` response includes `current_streak` and `completed_today` fields
- [ ] `GET /api/v1/habits/:id` returns the habit if owned by the user
- [ ] `GET /api/v1/habits/:id` returns 403 if habit belongs to another user
- [ ] `GET /api/v1/habits/:id` returns 404 for non-existent or soft-deleted habit
- [ ] `PUT /api/v1/habits/:id` updates only provided fields (partial update)
- [ ] `PUT /api/v1/habits/:id` returns 403 if not the owner
- [ ] `DELETE /api/v1/habits/:id` soft-deletes the habit (row remains with deleted_at set)
- [ ] `DELETE /api/v1/habits/:id` returns 403 if not the owner
- [ ] `POST /api/v1/habits/:id/log` creates a log entry with 201
- [ ] `POST /api/v1/habits/:id/log` returns 409 if already logged today
- [ ] `POST /api/v1/habits/:id/log` returns 403 if not the owner
- [ ] Streak calculation: 0 if never logged, increments for consecutive days, resets on gap
- [ ] `habits` and `habit_logs` tables created in Supabase after AutoMigrate
- [ ] Soft-deleted habits do not appear in GET /habits list
- [ ] Health check still works: `GET /api/v1/health` returns 200
- [ ] All existing auth endpoints still work

### Frontend Tests

- [ ] `/habits` page renders with loading state then habit list
- [ ] `/habits` page shows empty state when user has no habits
- [ ] "Add Habit" button opens create form
- [ ] Creating a habit adds it to the list without page reload
- [ ] Free user sees upgrade prompt when trying to create a 4th habit
- [ ] Clicking the completion checkbox calls log endpoint and shows animation
- [ ] Clicking checkbox on already-completed habit shows appropriate feedback (already logged)
- [ ] Streak badge displays correct number and updates after completion
- [ ] Edit page pre-fills form with existing habit data
- [ ] Saving edit updates the habit in the list
- [ ] Delete button removes habit from list (with confirmation)
- [ ] `/habits` link appears in sidebar navigation
- [ ] Dashboard shows real habit data instead of hardcoded placeholders
- [ ] `npm run build` completes with zero errors
- [ ] `npm run lint` passes

### Integration

- [ ] Full flow: Login -> Create 3 habits -> Try 4th (blocked for free) -> Log completion -> See streak increment -> Edit habit -> Delete habit
- [ ] Habit data persists across page refresh
- [ ] Different users see only their own habits

---

## 10. Decisions and Trade-offs

| Decision | Rationale |
|---|---|
| Domain-based package layout (`internal/domain/habit/`) | Matches existing Phase 2 pattern. Keeps related code together. |
| Streak calculated on read, not stored | Avoids stale data. Acceptable performance for a single user's habits (small N). |
| Pointer fields in UpdateInput | Allows distinguishing "not provided" from "set to zero value". Standard Go partial-update pattern. |
| Free tier check in service, not middleware | The check requires counting habits in DB, which is business logic. Middleware only checks role/subscription existence. |
| RBAC middleware created now but only used by habit routes minimally | Habit routes need auth only. RequirePremium/RequireRole are ready for Phases 5-7. |
| `completed_today` returned with habit list | Avoids frontend needing a separate API call for today's logs. Single request shows full state. |
| Soft delete for habits | Per RULES.md and DATABASE.md -- never hard delete. GORM handles this automatically with DeletedAt. |
| One log per habit per day enforced server-side | Business rule from DATABASE.md. Checked via date range query in service layer. |
