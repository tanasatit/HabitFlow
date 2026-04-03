package aicoach

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/habitflow/api/internal/middleware"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Chat handles POST /api/v1/ai/chat — SSE streaming endpoint.
func (h *Handler) Chat(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	stream := make(chan SSEEvent, 100)
	ctx := c.Request.Context()

	go func() {
		defer close(stream)
		_ = h.svc.Chat(ctx, userID, req, stream)
	}()

	w := c.Writer
	flusher, canFlush := w.(http.Flusher)

	for {
		select {
		case event, ok := <-stream:
			if !ok {
				return
			}
			data, _ := json.Marshal(event)
			_, err := w.Write([]byte("data: " + string(data) + "\n\n"))
			if err != nil {
				return
			}
			if canFlush {
				flusher.Flush()
			}
			if event.Type == "done" || event.Type == "error" {
				return
			}
		case <-ctx.Done():
			return
		}
	}
}
