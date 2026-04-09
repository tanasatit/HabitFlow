package dashboard

import (
	"github.com/gin-gonic/gin"

	"github.com/habitflow/api/internal/middleware"
	"github.com/habitflow/api/pkg/response"
)

// Handler holds the dashboard service and exposes HTTP handlers.
type Handler struct {
	svc *Service
}

// NewHandler creates a new dashboard Handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// GetDashboard handles GET /api/v1/dashboard.
func (h *Handler) GetDashboard(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}

	stats, err := h.svc.GetDashboard(userID)
	if err != nil {
		response.InternalError(c)
		return
	}

	response.Success(c, stats)
}
