# RULES.md — Coding Rules & Conventions

> Read this before writing any code, every time.

---

## General Rules

- Never commit secrets, API keys, or `.env` files
- Never write business logic in a handler
- Never write DB queries in a service
- Never trust frontend role/subscription data — always re-check server-side
- Every premium feature endpoint must check subscription tier in middleware or service
- All errors must be handled — no silent failures

---

## Go Rules

### Naming
- Exported functions/types: `PascalCase` → `CreateHabit`, `UserRepository`
- Unexported: `camelCase` → `validateInput`, `parseToken`
- Files: `snake_case` → `habit_service.go`, `auth_handler.go`
- Constants: `UPPER_SNAKE_CASE` → `MAX_FREE_HABITS = 3`

### Error Handling
```go
// Always wrap errors with context
if err != nil {
    return fmt.Errorf("habit_service.Create: %w", err)
}
```

### Handler Pattern
```go
func (h *HabitHandler) Create(c *gin.Context) {
    var req CreateHabitRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    userID := c.GetString("userID") // from JWT middleware
    habit, err := h.service.Create(userID, req)
    if err != nil {
        c.JSON(500, gin.H{"error": "internal server error"})
        return
    }
    c.JSON(201, habit)
}
```

### Repository Pattern
```go
// Always use parameterized queries via GORM
// Never concatenate strings for queries
func (r *HabitRepository) FindByUserID(userID string) ([]model.Habit, error) {
    var habits []model.Habit
    result := r.db.Where("user_id = ? AND is_active = ?", userID, true).Find(&habits)
    return habits, result.Error
}
```

### Free User Limit
```go
// Always check in service layer, never handler
const MAX_FREE_HABITS = 3

func (s *HabitService) Create(userID string, req CreateHabitRequest) (*model.Habit, error) {
    user, _ := s.userRepo.FindByID(userID)
    if user.SubscriptionTier == "free" {
        count, _ := s.habitRepo.CountByUserID(userID)
        if count >= MAX_FREE_HABITS {
            return nil, ErrFreeTierLimitReached
        }
    }
    // proceed...
}
```

---

## Angular Rules

### Naming
- Components: `PascalCase` → `HabitCardComponent`
- Files: `kebab-case` → `habit-card.component.ts`
- Services: `PascalCase` + `Service` suffix → `HabitService`
- Interfaces: `PascalCase` with `I` prefix → `IHabit`, `IUser`
- Routes/paths: `kebab-case` → `/habit-list`, `/ai-coach`

### Component Rules
```typescript
// Components never call HTTP directly
// Always go through a service

// ❌ Wrong
constructor(private http: HttpClient) {}
ngOnInit() { this.http.get('/api/habits').subscribe(...) }

// ✅ Correct
constructor(private habitService: HabitService) {}
ngOnInit() { this.habitService.getAll().subscribe(...) }
```

### Service Rules
```typescript
// All API calls live in services
// Use environment variables for base URL
@Injectable({ providedIn: 'root' })
export class HabitService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getAll(): Observable<IHabit[]> {
    return this.http.get<IHabit[]>(`${this.api}/habits`);
  }
}
```

### Route Guard Pattern
```typescript
// Always check role AND subscription tier
export const premiumGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isLoggedIn()) return inject(Router).createUrlTree(['/login']);
  if (auth.user().subscriptionTier !== 'premium') return inject(Router).createUrlTree(['/upgrade']);
  return true;
};
```

---

## Database Rules

- All table names: `snake_case`, plural → `habit_logs`, `calendar_events`
- All column names: `snake_case` → `user_id`, `created_at`
- Always use UUID for primary keys
- Always include `created_at` and `updated_at` on every table
- Never delete records permanently — use `deleted_at` (GORM soft delete)
- Never run raw SQL unless GORM cannot do it

---

## API Response Format

```json
// Success
{ "data": { ... }, "message": "success" }

// Error
{ "error": "human readable message", "code": "ERROR_CODE" }

// List
{ "data": [ ... ], "total": 42, "page": 1, "limit": 20 }
```

---

## Git Commit Format

```
feat: add AI coach chat endpoint
fix: correct streak calculation on timezone edge case
chore: update dependencies
docs: add API documentation for habits
refactor: extract habit validation to separate function
test: add unit tests for habit service
```

---

## Security Checklist (Before Every Commit)

- [ ] No hardcoded secrets or API keys
- [ ] All user inputs validated before use
- [ ] Premium endpoints check subscription server-side
- [ ] No raw SQL string concatenation
- [ ] JWT expiry set correctly
- [ ] CORS only allows frontend origin