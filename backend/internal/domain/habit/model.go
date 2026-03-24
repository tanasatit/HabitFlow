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

// CreateInput is the request body for creating a habit.
type CreateInput struct {
	Name        string `json:"name"        binding:"required,min=1,max=100"`
	Category    string `json:"category"    binding:"omitempty,oneof=health learning productivity mindfulness"`
	Frequency   string `json:"frequency"   binding:"omitempty,oneof=daily weekdays custom"`
	TargetTime  string `json:"target_time" binding:"omitempty,oneof=morning afternoon evening anytime"`
	Description string `json:"description" binding:"max=500"`
}

// UpdateInput is the request body for updating a habit (all fields optional).
type UpdateInput struct {
	Name        *string `json:"name"        binding:"omitempty,min=1,max=100"`
	Category    *string `json:"category"    binding:"omitempty,oneof=health learning productivity mindfulness"`
	Frequency   *string `json:"frequency"   binding:"omitempty,oneof=daily weekdays custom"`
	TargetTime  *string `json:"target_time" binding:"omitempty,oneof=morning afternoon evening anytime"`
	Description *string `json:"description" binding:"omitempty,max=500"`
	IsActive    *bool   `json:"is_active"`
}

// LogInput is the optional request body for logging a completion.
type LogInput struct {
	Notes string `json:"notes" binding:"max=500"`
}

// HabitWithStreak embeds Habit and adds computed streak fields.
type HabitWithStreak struct {
	Habit
	CurrentStreak  int  `json:"current_streak"`
	CompletedToday bool `json:"completed_today"`
}
