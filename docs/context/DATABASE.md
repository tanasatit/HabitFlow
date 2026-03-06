# DATABASE.md — Schema & GORM Models

---

## Connection Setup (Supabase + GORM)

```go
// pkg/database/supabase.go
import (
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

func Connect(dsn string) (*gorm.DB, error) {
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        return nil, fmt.Errorf("database.Connect: %w", err)
    }
    return db, nil
}

func AutoMigrate(db *gorm.DB) error {
    return db.AutoMigrate(
        &model.User{},
        &model.Habit{},
        &model.HabitLog{},
        &model.CalendarEvent{},
        &model.Subscription{},
        &model.AIConversation{},
    )
}
```

---

## GORM Models

### User
```go
type User struct {
    ID               uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    Email            string         `gorm:"uniqueIndex;not null"`
    PasswordHash     string         `gorm:"not null"`
    DisplayName      string
    Role             string         `gorm:"default:free"`  // "free", "premium", "admin"
    SubscriptionTier string         `gorm:"default:free"`  // "free", "premium"
    AvatarURL        string
    CreatedAt        time.Time
    UpdatedAt        time.Time
    DeletedAt        gorm.DeletedAt `gorm:"index"`         // soft delete

    // Relations
    Habits           []Habit        `gorm:"foreignKey:UserID"`
    Subscription     *Subscription  `gorm:"foreignKey:UserID"`
}
```

### Habit
```go
type Habit struct {
    ID          uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    UserID      uuid.UUID      `gorm:"type:uuid;not null;index"`
    Name        string         `gorm:"not null"`
    Category    string         // "health", "learning", "productivity", "mindfulness"
    Frequency   string         `gorm:"default:daily"` // "daily", "weekdays", "custom"
    TargetTime  string         // "morning", "afternoon", "evening", "anytime"
    Description string
    IsActive    bool           `gorm:"default:true"`
    Points      int            `gorm:"default:10"`    // points per completion
    CreatedAt   time.Time
    UpdatedAt   time.Time
    DeletedAt   gorm.DeletedAt `gorm:"index"`

    // Relations
    User        User           `gorm:"foreignKey:UserID"`
    Logs        []HabitLog     `gorm:"foreignKey:HabitID"`
}
```

### HabitLog
```go
type HabitLog struct {
    ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    HabitID     uuid.UUID `gorm:"type:uuid;not null;index"`
    UserID      uuid.UUID `gorm:"type:uuid;not null;index"`
    CompletedAt time.Time `gorm:"not null"`
    Notes       string
    CreatedAt   time.Time

    // Relations
    Habit       Habit     `gorm:"foreignKey:HabitID"`
}
```

### CalendarEvent
```go
type CalendarEvent struct {
    ID                  uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    UserID              uuid.UUID  `gorm:"type:uuid;not null;index"`
    HabitID             *uuid.UUID `gorm:"type:uuid"`        // nullable — not all events are habits
    Title               string     `gorm:"not null"`
    ScheduledAt         time.Time  `gorm:"not null"`
    DurationMinutes     int        `gorm:"default:30"`
    Source              string     `gorm:"default:manual"`   // "ai", "manual", "google"
    GoogleEventID       string                               // for Google Calendar sync
    IsCompleted         bool       `gorm:"default:false"`
    CreatedAt           time.Time
    UpdatedAt           time.Time
}
```

### Subscription
```go
type Subscription struct {
    ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    UserID      uuid.UUID  `gorm:"type:uuid;uniqueIndex;not null"`
    Tier        string     `gorm:"not null"` // "free", "premium"
    StartedAt   time.Time
    ExpiresAt   *time.Time                   // null = never expires (admin-granted)
    IsActive    bool       `gorm:"default:true"`
    GrantedBy   *uuid.UUID `gorm:"type:uuid"` // admin user ID who upgraded
    CreatedAt   time.Time
    UpdatedAt   time.Time
}
```

### AIConversation
```go
type AIConversation struct {
    ID        uuid.UUID       `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    UserID    uuid.UUID       `gorm:"type:uuid;not null;index"`
    Messages  datatypes.JSON  `gorm:"type:jsonb"` // stores full message history
    PlanID    *uuid.UUID      `gorm:"type:uuid"`  // links to generated calendar events
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

---

## Key Business Rules

| Rule | Where Enforced |
|---|---|
| Free users max 3 habits | `habit_service.go` — check count before create |
| Premium features only for premium tier | `rbac.go` middleware + service layer |
| Soft delete only — never hard delete users | GORM `DeletedAt` on User model |
| One active subscription per user | `uniqueIndex` on `subscriptions.user_id` |
| Habit log one per day per habit | Check in `habit_service.go` before insert |

---

## Useful GORM Queries Reference

```go
// Get user with subscription
db.Preload("Subscription").First(&user, "id = ?", userID)

// Get active habits for user
db.Where("user_id = ? AND is_active = ? AND deleted_at IS NULL", userID, true).Find(&habits)

// Count habits for free tier check
db.Model(&Habit{}).Where("user_id = ? AND is_active = ? AND deleted_at IS NULL", userID, true).Count(&count)

// Get today's logs for a user
today := time.Now().Truncate(24 * time.Hour)
tomorrow := today.Add(24 * time.Hour)
db.Where("user_id = ? AND completed_at >= ? AND completed_at < ?", userID, today, tomorrow).Find(&logs)

// Leaderboard — top 20 by points this week
weekStart := /* last Monday */
db.Raw(`
    SELECT u.id, u.display_name, u.avatar_url, SUM(h.points) as total_points
    FROM habit_logs hl
    JOIN habits h ON h.id = hl.habit_id
    JOIN users u ON u.id = hl.user_id
    WHERE hl.completed_at >= ? AND u.subscription_tier = 'premium'
    GROUP BY u.id, u.display_name, u.avatar_url
    ORDER BY total_points DESC
    LIMIT 20
`, weekStart).Scan(&leaderboard)
```