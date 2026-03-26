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
	ID           uuid.UUID  `json:"id"`
	Email        string     `json:"email"`
	Name         string     `json:"name"`
	Role         string     `json:"role"`
	Subscription *SubDetail `json:"subscription"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
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
