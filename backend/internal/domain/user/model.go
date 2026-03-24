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
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Email        string         `gorm:"uniqueIndex;not null"                           json:"email"`
	PasswordHash string         `gorm:"not null"                                       json:"-"`
	Name         string         `gorm:"not null"                                       json:"name"`
	Role         Role           `gorm:"type:varchar(20);default:'free'"                json:"role"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index"                                          json:"-"`
}

type Subscription struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex"                 json:"user_id"`
	Plan      string     `gorm:"type:varchar(20);default:'free'"                json:"plan"`
	ExpiresAt *time.Time `json:"expires_at"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}
