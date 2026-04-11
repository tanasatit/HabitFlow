package calendar

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CalendarEvent struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	UserID          uuid.UUID  `gorm:"type:uuid;not null;index"                       json:"user_id"`
	HabitID         *uuid.UUID `gorm:"type:uuid;index"                                json:"habit_id"`
	Title           string     `gorm:"not null"                                       json:"title"`
	Description     string     `                                                      json:"description"`
	ScheduledDate   string     `gorm:"not null"                                       json:"scheduled_date"`
	StartTime       string     `gorm:"not null"                                       json:"start_time"`
	DurationMinutes int        `gorm:"default:30"                                     json:"duration_minutes"`
	Source          string     `gorm:"default:'manual'"                               json:"source"`
	Color           string     `gorm:"default:'#14b8a6'"                              json:"color"`
	IsCompleted     bool       `gorm:"default:false"                                  json:"is_completed"`
	GoogleEventID   string     `gorm:"index"                                          json:"google_event_id"`
	CreatedAt       time.Time  `                                                      json:"created_at"`
	UpdatedAt       time.Time  `                                                      json:"updated_at"`
}

// BeforeCreate generates a UUID if one is not already set.
func (e *CalendarEvent) BeforeCreate(tx *gorm.DB) error {
	if e.ID == (uuid.UUID{}) {
		e.ID = uuid.New()
	}
	return nil
}

type CreateEventInput struct {
	HabitID         *string `json:"habit_id"`
	Title           string  `json:"title"            binding:"required,min=1,max=200"`
	Description     string  `json:"description"      binding:"max=500"`
	ScheduledDate   string  `json:"scheduled_date"   binding:"required"`
	StartTime       string  `json:"start_time"       binding:"required"`
	DurationMinutes int     `json:"duration_minutes" binding:"omitempty,min=5,max=480"`
	GoogleEventID   string  `json:"google_event_id"`
}

type UpdateEventInput struct {
	Title         string `json:"title"`
	Description   string `json:"description"`
	ScheduledDate string `json:"scheduled_date"`
	StartTime     string `json:"start_time"`
	DurationMinutes int  `json:"duration_minutes"`
	Color         string `json:"color"`
}

type EventFilter struct {
	StartDate string
	EndDate   string
}
