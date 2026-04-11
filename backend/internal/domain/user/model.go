package user

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Role string

const (
	RoleFree    Role = "free"
	RolePremium Role = "premium"
	RoleAdmin   Role = "admin"
)

type User struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Email        string         `gorm:"uniqueIndex;not null"                           json:"email"`
	PasswordHash string         `gorm:""                                               json:"-"`
	Name         string         `gorm:"not null"                                       json:"name"`
	Role         Role           `gorm:"type:varchar(20);default:'free'"                json:"role"`
	GoogleID     *string        `gorm:"uniqueIndex"                                    json:"google_id,omitempty"`
	AvatarURL    *string        `gorm:""                                               json:"avatar_url,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index"                                          json:"-"`
}

// BeforeCreate generates a UUID if one is not already set.
// This ensures the model works with SQLite (which lacks gen_random_uuid()) as well as Postgres.
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == (uuid.UUID{}) {
		u.ID = uuid.New()
	}
	return nil
}

type Subscription struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex"                 json:"user_id"`
	Plan      string     `gorm:"type:varchar(20);default:'free'"                json:"plan"`
	ExpiresAt *time.Time `json:"expires_at"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// BeforeCreate generates a UUID if one is not already set.
func (s *Subscription) BeforeCreate(tx *gorm.DB) error {
	if s.ID == (uuid.UUID{}) {
		s.ID = uuid.New()
	}
	return nil
}
