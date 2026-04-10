package aicoach

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type AIConversation struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null;index"                       json:"user_id"`
	Messages  datatypes.JSON `gorm:"type:jsonb"                                     json:"messages"`
	CreatedAt time.Time      `                                                      json:"created_at"`
	UpdatedAt time.Time      `                                                      json:"updated_at"`
}

// BeforeCreate generates a UUID if one is not already set.
func (a *AIConversation) BeforeCreate(tx *gorm.DB) error {
	if a.ID == (uuid.UUID{}) {
		a.ID = uuid.New()
	}
	return nil
}

type ChatRequest struct {
	Message        string  `json:"message"          binding:"required,min=1,max=2000"`
	ConversationID *string `json:"conversation_id"`
}

type SSEEvent struct {
	Type string `json:"type"` // "token", "tool_call", "calendar_update", "done", "error"
	Data string `json:"data"`
}
