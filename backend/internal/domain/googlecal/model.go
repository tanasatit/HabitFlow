package googlecal

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GoogleToken struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID       uuid.UUID      `gorm:"type:uuid;uniqueIndex;not null"                 json:"user_id"`
	AccessToken  string         `gorm:"not null"                                       json:"-"`
	RefreshToken string         `gorm:"not null"                                       json:"-"`
	TokenType    string         `gorm:"default:'Bearer'"                               json:"-"`
	Expiry       time.Time      `gorm:"not null"                                       json:"-"`
	Email        string         `gorm:""                                               json:"email"`
	Scope        string         `                                                      json:"-"`
	CreatedAt    time.Time      `                                                      json:"created_at"`
	UpdatedAt    time.Time      `                                                      json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index"                                          json:"-"`
}

// BeforeCreate generates a UUID if one is not already set.
func (g *GoogleToken) BeforeCreate(tx *gorm.DB) error {
	if g.ID == (uuid.UUID{}) {
		g.ID = uuid.New()
	}
	return nil
}

type GoogleCalendarEvent struct {
	GoogleEventID   string `json:"google_event_id"`
	Title           string `json:"title"`
	Description     string `json:"description"`
	ScheduledDate   string `json:"scheduled_date"`
	StartTime       string `json:"start_time"`
	EndTime         string `json:"end_time"`
	DurationMinutes int    `json:"duration_minutes"`
	Source          string `json:"source"` // always "google"
}

type CreateGoogleEventInput struct {
	Title           string `json:"title"            binding:"required"`
	ScheduledDate   string `json:"scheduled_date"   binding:"required"`
	StartTime       string `json:"start_time"       binding:"required"`
	DurationMinutes int    `json:"duration_minutes" binding:"required,min=5,max=480"`
	Description     string `json:"description"`
}

type ConnectionStatus struct {
	Connected   bool   `json:"connected"`
	Email       string `json:"email,omitempty"`
	ConnectedAt string `json:"connected_at,omitempty"`
}

type WriteEventsRequest struct {
	Events []CreateGoogleEventInput `json:"events" binding:"required,min=1"`
}
