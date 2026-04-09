package aicoach

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type AIConversation struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null;index"                       json:"user_id"`
	Messages  datatypes.JSON `gorm:"type:jsonb"                                     json:"messages"`
	CreatedAt time.Time      `                                                      json:"created_at"`
	UpdatedAt time.Time      `                                                      json:"updated_at"`
}

type ChatRequest struct {
	Message        string  `json:"message"          binding:"required,min=1,max=2000"`
	ConversationID *string `json:"conversation_id"`
}

type SSEEvent struct {
	Type string `json:"type"` // "token", "tool_call", "calendar_update", "done", "error"
	Data string `json:"data"`
}
